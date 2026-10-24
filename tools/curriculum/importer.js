/**
 * PHASE 2 / TASK P2.5 — Idempotent Curriculum Importer & Intermediate Adapter
 *
 * Imports normalized Grade 6 Curriculum JSON data into an isolated intermediate adapter
 * without writing to or modifying the production database / Google Sheets.
 *
 * Key Guarantees:
 *   1. Validates dataset via CurriculumValidator BEFORE writing any record.
 *   2. Upserts by deterministic Primary Key per table (sourceId, topicId, competencyId,
 *      requirementId, mappingId, aiMappingId, lessonId, activityId, questionId,
 *      evidenceId, resourceId, masteryRuleId).
 *   3. Computes canonical SHA-256 contentHash for every record:
 *      - New PK -> INSERTED
 *      - Existing PK with identical contentHash -> UNCHANGED (no duplicate created, version preserved)
 *      - Existing PK with changed contentHash -> UPDATED (version incremented, updatedAt refreshed)
 *   4. Retrying the exact same dataset N times produces 0 duplicates and 0 extra writes.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CurriculumValidator, computeOfficialTextHash } = require('./validator');

const TABLE_PK_MAP = {
  sources: 'sourceId',
  topics: 'topicId',
  competencies: 'competencyId',
  requirements: 'requirementId',
  nlsMappings: 'mappingId',
  aiMappings: 'aiMappingId',
  lessons: 'lessonId',
  activities: 'activityId',
  questions: 'questionId',
  evidences: 'evidenceId',
  resources: 'resourceId',
  masteryRules: 'masteryRuleId'
};

/**
 * Deterministic JSON serialization with sorted keys for stable SHA-256 hashing.
 */
function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const sortedKeys = Object.keys(value).sort();
  const parts = sortedKeys.map(k => JSON.stringify(k) + ':' + canonicalJson(value[k]));
  return '{' + parts.join(',') + '}';
}

function computeContentHash(record) {
  return crypto.createHash('sha256').update(canonicalJson(record), 'utf8').digest('hex');
}

/**
 * Intermediate Staging Adapter (In-Memory + Optional Local JSON Snapshot).
 * Completely isolated from production Google Sheets and V1/V2/V3 student tables.
 */
class IntermediateCurriculumAdapter {
  constructor(options = {}) {
    this.snapshotPath = options.snapshotPath || null;
    this.tables = {};
    this.importHistory = [];
    this.reset();
    if (this.snapshotPath && fs.existsSync(this.snapshotPath) && options.autoload) {
      this.loadSnapshot();
    }
  }

  reset() {
    for (const table of Object.keys(TABLE_PK_MAP)) {
      this.tables[table] = new Map();
    }
    this.importHistory = [];
  }

  /**
   * Upsert a single record into a staging table by primary key.
   * Returns: 'inserted' | 'updated' | 'unchanged'
   */
  upsertRecord(tableName, record, traceId = 'TRACE-P2-5') {
    const pkField = TABLE_PK_MAP[tableName];
    if (!pkField) {
      throw new Error(`Unknown curriculum staging table: ${tableName}`);
    }
    const pkValue = record[pkField];
    if (!pkValue) {
      throw new Error(`Missing primary key '${pkField}' in table '${tableName}'`);
    }

    const tableMap = this.tables[tableName];
    const cleanRecord = JSON.parse(JSON.stringify(record));
    const contentHash = computeContentHash(cleanRecord);
    const nowIso = new Date().toISOString();

    if (!tableMap.has(pkValue)) {
      tableMap.set(pkValue, {
        pk: pkValue,
        data: cleanRecord,
        contentHash,
        revision: 1,
        firstImportedAt: nowIso,
        lastUpdatedAt: nowIso,
        lastTraceId: traceId
      });
      return 'inserted';
    }

    const existing = tableMap.get(pkValue);
    if (existing.contentHash === contentHash) {
      // Idempotent no-op: retry with identical payload does not duplicate or mutate revision
      return 'unchanged';
    }

    tableMap.set(pkValue, {
      pk: pkValue,
      data: cleanRecord,
      contentHash,
      revision: existing.revision + 1,
      firstImportedAt: existing.firstImportedAt,
      lastUpdatedAt: nowIso,
      lastTraceId: traceId
    });
    return 'updated';
  }

  getTableRecords(tableName) {
    const tableMap = this.tables[tableName];
    if (!tableMap) return [];
    return Array.from(tableMap.values()).map(entry => entry.data);
  }

  getTableCount(tableName) {
    const tableMap = this.tables[tableName];
    return tableMap ? tableMap.size : 0;
  }

  getTotalCount() {
    return Object.keys(TABLE_PK_MAP).reduce((acc, t) => acc + this.getTableCount(t), 0);
  }

  getSummaryCounts() {
    const counts = {};
    for (const t of Object.keys(TABLE_PK_MAP)) {
      counts[t] = this.getTableCount(t);
    }
    return counts;
  }

  saveSnapshot(targetPath = this.snapshotPath) {
    if (!targetPath) return null;
    const serialized = {
      adapterType: 'IntermediateCurriculumAdapter',
      productionWrite: false,
      exportedAt: new Date().toISOString(),
      counts: this.getSummaryCounts(),
      tables: {},
      importHistory: this.importHistory
    };
    for (const t of Object.keys(TABLE_PK_MAP)) {
      serialized.tables[t] = Array.from(this.tables[t].values());
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(serialized, null, 2) + '\n', 'utf8');
    return targetPath;
  }

  loadSnapshot(sourcePath = this.snapshotPath) {
    if (!sourcePath || !fs.existsSync(sourcePath)) return false;
    const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    this.reset();
    for (const t of Object.keys(TABLE_PK_MAP)) {
      const entries = (raw.tables && raw.tables[t]) || [];
      for (const entry of entries) {
        this.tables[t].set(entry.pk, entry);
      }
    }
    this.importHistory = raw.importHistory || [];
    return true;
  }
}

/**
 * Curriculum Importer
 * Loads normalized Grade 6 files (or an in-memory dataset), validates them with
 * CurriculumValidator, and performs atomic idempotent import into IntermediateCurriculumAdapter.
 */
class CurriculumImporter {
  constructor(options = {}) {
    this.validator = options.validator || new CurriculumValidator(options.schemasDir);
    this.adapter = options.adapter || new IntermediateCurriculumAdapter(options);
  }

  /**
   * Load the canonical Grade 6 normalized dataset from disk (`data/`).
   */
  static loadNormalizedGrade6Dataset(repoRoot = path.resolve(__dirname, '../..')) {
    const readJson = relPath =>
      JSON.parse(fs.readFileSync(path.join(repoRoot, relPath), 'utf8'));

    const sources = readJson('data/curriculum/sources-g6.json');
    const topics = readJson('data/curriculum/topics-g6.json');
    const competencies = readJson('data/competencies/competencies-g6.json');
    const requirements = readJson('data/requirements/requirements-g6.json');
    const nlsMappings = readJson('data/competencies/nls-mappings-g6.json');
    const aiMappings = readJson('data/competencies/ai-mappings-g6.json');
    const lessons = readJson('data/lessons/lessons-g6-ppct.json');
    const ppctDistribution = readJson('data/curriculum/ppct-distribution-g6.json');
    const resourcesCatalog = readJson('data/resources/resources-g6.json');
    const goldenL03 = readJson('data/lessons/G6-L03.golden.json');

    // Merge resources from catalog and golden lesson without duplicating by resourceId
    const resourceMap = new Map();
    for (const r of resourcesCatalog) {
      resourceMap.set(r.resourceId, r);
    }
    for (const r of goldenL03.resources || []) {
      if (!resourceMap.has(r.resourceId)) {
        resourceMap.set(r.resourceId, r);
      }
    }

    const masteryRules = goldenL03.masteryRules
      ? goldenL03.masteryRules
      : goldenL03.masteryRule
      ? [goldenL03.masteryRule]
      : [];

    return {
      sources,
      topics,
      competencies,
      requirements,
      nlsMappings,
      aiMappings,
      lessons,
      ppctDistribution,
      activities: goldenL03.activities || [],
      questions: goldenL03.questions || [],
      evidences: goldenL03.evidences || [],
      resources: Array.from(resourceMap.values()),
      masteryRules
    };
  }

  /**
   * Validate and import a dataset into the intermediate adapter.
   * Refuses to write any record if validation fails.
   */
  importDataset(dataset, options = {}) {
    const traceId = options.traceId || `IMP-${Date.now()}`;
    const validation = this.validator.validateDataset(dataset, {
      trustedRequirementHashes: options.trustedRequirementHashes
    });

    if (!validation.valid) {
      return {
        imported: false,
        traceId,
        validation,
        stats: null,
        error: `Validation failed with ${validation.errorCount} error(s). Import aborted.`
      };
    }

    const tableStats = {};
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalUnchanged = 0;

    for (const tableName of Object.keys(TABLE_PK_MAP)) {
      const records = dataset[tableName] || [];
      let inserted = 0;
      let updated = 0;
      let unchanged = 0;

      for (const rec of records) {
        const outcome = this.adapter.upsertRecord(tableName, rec, traceId);
        if (outcome === 'inserted') {
          inserted++;
          totalInserted++;
        } else if (outcome === 'updated') {
          updated++;
          totalUpdated++;
        } else {
          unchanged++;
          totalUnchanged++;
        }
      }

      tableStats[tableName] = {
        processed: records.length,
        inserted,
        updated,
        unchanged,
        totalInStore: this.adapter.getTableCount(tableName)
      };
    }

    const runSummary = {
      traceId,
      timestamp: new Date().toISOString(),
      totalProcessed: totalInserted + totalUpdated + totalUnchanged,
      totalInserted,
      totalUpdated,
      totalUnchanged,
      duplicatesCreated: 0,
      totalInAdapter: this.adapter.getTotalCount(),
      tableStats
    };

    this.adapter.importHistory.push(runSummary);

    if (options.saveSnapshot !== false && this.adapter.snapshotPath) {
      this.adapter.saveSnapshot();
    }

    return {
      imported: true,
      traceId,
      validation,
      stats: runSummary
    };
  }
}

module.exports = {
  TABLE_PK_MAP,
  IntermediateCurriculumAdapter,
  CurriculumImporter,
  computeContentHash,
  computeOfficialTextHash
};
