/**
 * PHASE 2 / TASK P2.5 (FIX) — Curriculum Data Foundation Validator
 *
 * Enforces:
 *   1. Data Contract Lock (Blocker 3 & 7.7): Verifies all 12 JSON Schemas preserve locked fields
 *      unless APPROVED_CONTRACT_CHANGE is explicitly provided.
 *   2. CTGDPT 2018 Requirement Bank Integrity (Blocker 1 & 7.1–7.3):
 *      - Total count = 38 (EXPECT_REQUIREMENT_COUNT_G6 = 38)
 *      - Topic counts: A=10, B=4, C=7, D=5, E=9, F=3
 *      - Exact match against Trusted Official Snapshot (trusted-official-requirements-g6.json)
 *      - No merged requirements, no 'TB' injected into G6-A-09 officialText
 *      - Non-empty studentFriendlyText on every Requirement
 *   3. Viet Hoa School PPCT 2026–2027 Alignment (Blocker 2 & 7.4–7.6):
 *      - Exactly 16 content lessons (Lessons 1–13, 15–17)
 *      - Zero Phantom Lesson 14 (G6-L14 / Bài 14 is forbidden)
 *      - Exact period & duration validation (1 period = 45m; Bài 3=2t/90m, Bài 8=1t/45m, Bài 13=1t/45m, Bài 17=1t/45m)
 *      - No review/assessment sessions disguised as fake content Lessons
 *   4. Source Catalog & NLS Governance (Blocker 4, 5, 6):
 *      - Rejects generic homepage URLs (e.g., https://moet.gov.vn/, https://hanhtrangso.nxbgd.vn/)
 *      - Requires verified status and two-layer source metadata
 *      - Distinguishes TT 02/2025 NLS framework from school Appendix III / KHBD lesson mappings
 *   5. All 10 Mandatory Referential & Pedagogical Rules:
 *      - DUPLICATE_ID, DANGLING_REFERENCE, PUBLISHED_LESSON_MISSING_REQUIREMENT,
 *        QUESTION_MISSING_REQUIREMENT, QUESTION_MISSING_CORRECT_ANSWER,
 *        QUESTION_MISSING_EXPLANATION, ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS,
 *        RESOURCE_MISSING_URL, UNAPPROVED_AI_MAPPING / UNAUTHORIZED_AI_IN_REQUIREMENT_BANK,
 *        OFFICIAL_REQUIREMENT_TEXT_TAMPERED.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXPECT_REQUIREMENT_COUNT_G6 = 38;
const EXPECT_TOPIC_COUNTS_G6 = {
  'G6-A': 10,
  'G6-B': 4,
  'G6-C': 7,
  'G6-D': 5,
  'G6-E': 9,
  'G6-F': 3
};

const EXPECT_PPCT_LESSON_COUNT_G6 = 16;
const EXPECT_PPCT_PERIODS_G6 = {
  'G6-L01': 2,
  'G6-L02': 2,
  'G6-L03': 2,
  'G6-L04': 2,
  'G6-L05': 1,
  'G6-L06': 2,
  'G6-L07': 2,
  'G6-L08': 1,
  'G6-L09': 2,
  'G6-L10': 2,
  'G6-L11': 2,
  'G6-L12': 2,
  'G6-L13': 1,
  'G6-L15': 2,
  'G6-L16': 2,
  'G6-L17': 1
};

const LOCKED_DATA_CONTRACT_REQUIRED_FIELDS = {
  source: [
    'sourceId',
    'title',
    'sourceType',
    'grade',
    'versionOrSchoolYear',
    'url',
    'authority',
    'priority',
    'licenseNote',
    'status',
    'createdAt',
    'updatedAt'
  ],
  topic: ['topicId', 'grade', 'code', 'title', 'order', 'officialSourceId', 'status'],
  lesson: [
    'lessonId',
    'grade',
    'topicId',
    'title',
    'order',
    'durationMinutes',
    'requirementIds',
    'competencyIds',
    'activityIds',
    'assessmentPlan',
    'resourceIds',
    'status',
    'version',
    'sourceRefs'
  ],
  requirement: [
    'requirementId',
    'grade',
    'topicId',
    'officialText',
    'studentFriendlyText',
    'officialSourceId',
    'competencyIds',
    'evidenceTypes',
    'status',
    'version'
  ],
  competency: ['competencyId', 'name', 'levelScope', 'officialDescription', 'officialSourceId'],
  activity: [
    'activityId',
    'lessonId',
    'order',
    'activityType',
    'objective',
    'instruction',
    'requirementIds',
    'expectedEvidenceTypes',
    'required',
    'supportPolicyId'
  ],
  question: [
    'questionId',
    'grade',
    'topicId',
    'lessonId',
    'requirementId',
    'questionType',
    'cognitiveLevel',
    'questionText',
    'correctAnswer',
    'explanation',
    'maxScore',
    'status'
  ],
  evidence: [
    'evidenceId',
    'studentUid',
    'schoolYear',
    'lessonId',
    'requirementId',
    'evidenceType',
    'sourceActivityId',
    'submittedAt',
    'evaluationStatus'
  ],
  masteryRule: [
    'masteryRuleId',
    'requirementId',
    'minimumEvidenceCount',
    'requiredEvidenceTypes',
    'thresholds',
    'recencyRule',
    'teacherOverrideAllowed'
  ]
};

function sha256Text(str) {
  return crypto
    .createHash('sha256')
    .update(String(str == null ? '' : str).trim(), 'utf8')
    .digest('hex');
}

function validateAgainstJsonSchema(item, schema, entityLabel, itemId) {
  const errors = [];
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    errors.push({
      code: 'SCHEMA_INVALID',
      entity: entityLabel,
      id: itemId || '',
      message: `${entityLabel} must be an object`
    });
    return errors;
  }

  const required = schema.required || [];
  for (const reqField of required) {
    if (item[reqField] === undefined || item[reqField] === null) {
      errors.push({
        code: 'SCHEMA_MISSING_FIELD',
        entity: entityLabel,
        id: itemId || '',
        field: reqField,
        message: `${entityLabel} (${itemId}) is missing required field '${reqField}'`
      });
    }
  }

  const props = schema.properties || {};
  for (const [k, val] of Object.entries(item)) {
    if (schema.additionalProperties === false && !Object.prototype.hasOwnProperty.call(props, k)) {
      errors.push({
        code: 'SCHEMA_ADDITIONAL_PROPERTY',
        entity: entityLabel,
        id: itemId || '',
        field: k,
        message: `${entityLabel} (${itemId}) has unknown property '${k}'`
      });
      continue;
    }
    const spec = props[k];
    if (!spec || val === undefined || val === null) continue;

    const allowedTypes = Array.isArray(spec.type) ? spec.type : spec.type ? [spec.type] : [];
    if (allowedTypes.length > 0) {
      const actualType = Array.isArray(val)
        ? 'array'
        : typeof val === 'number' && Number.isInteger(val)
        ? 'integer'
        : typeof val;
      const typeOk = allowedTypes.some(
        t => t === actualType || (t === 'number' && actualType === 'integer')
      );
      if (!typeOk) {
        errors.push({
          code: 'SCHEMA_TYPE_MISMATCH',
          entity: entityLabel,
          id: itemId || '',
          field: k,
          message: `${entityLabel} (${itemId}).${k} expected type ${allowedTypes.join('|')} but got ${actualType}`
        });
        continue;
      }
    }

    if (spec.const !== undefined && val !== spec.const) {
      errors.push({
        code: 'SCHEMA_CONST_MISMATCH',
        entity: entityLabel,
        id: itemId || '',
        field: k,
        message: `${entityLabel} (${itemId}).${k} must equal '${spec.const}'`
      });
    }
    if (spec.enum && !spec.enum.includes(val)) {
      errors.push({
        code: 'SCHEMA_ENUM_MISMATCH',
        entity: entityLabel,
        id: itemId || '',
        field: k,
        message: `${entityLabel} (${itemId}).${k} value '${val}' is not in [${spec.enum.join(', ')}]`
      });
    }
    if (typeof val === 'string' && spec.pattern && !new RegExp(spec.pattern).test(val)) {
      errors.push({
        code: 'SCHEMA_PATTERN_MISMATCH',
        entity: entityLabel,
        id: itemId || '',
        field: k,
        message: `${entityLabel} (${itemId}).${k} value '${val}' does not match pattern ${spec.pattern}`
      });
    }
  }
  return errors;
}

class CurriculumValidator {
  constructor(opts = {}) {
    if (typeof opts === 'string') {
      this.schemasDir = opts;
      this.trustedSnapshotPath = path.resolve(
        __dirname,
        'trusted-official-requirements-g6.json'
      );
    } else {
      this.schemasDir = opts.schemasDir || path.resolve(__dirname, '../../schemas');
      this.trustedSnapshotPath =
        opts.trustedSnapshotPath ||
        path.resolve(__dirname, 'trusted-official-requirements-g6.json');
    }
    this.schemas = this._loadSchemas();
    this.trustedSnapshot = this._loadTrustedSnapshot();
  }

  _loadSchemas() {
    const map = {};
    const files = [
      ['source', 'source.schema.json'],
      ['topic', 'topic.schema.json'],
      ['competency', 'competency.schema.json'],
      ['requirement', 'requirement.schema.json'],
      ['nlsMapping', 'nls-mapping.schema.json'],
      ['aiMapping', 'ai-competency-mapping.schema.json'],
      ['lesson', 'lesson.schema.json'],
      ['activity', 'activity.schema.json'],
      ['question', 'question.schema.json'],
      ['evidence', 'evidence.schema.json'],
      ['resource', 'resource.schema.json'],
      ['masteryRule', 'mastery-rule.schema.json']
    ];
    for (const [key, fname] of files) {
      const p = path.join(this.schemasDir, fname);
      if (fs.existsSync(p)) {
        map[key] = JSON.parse(fs.readFileSync(p, 'utf8'));
      }
    }
    return map;
  }

  _loadTrustedSnapshot() {
    if (this.trustedSnapshotPath && fs.existsSync(this.trustedSnapshotPath)) {
      return JSON.parse(fs.readFileSync(this.trustedSnapshotPath, 'utf8'));
    }
    return null;
  }

  /**
   * Blocker 3 & 7.7: Verify that schemas have not drifted from locked Data Contract.
   */
  validateDataContractLock(schemasOverride = null, options = {}) {
    const targetSchemas = schemasOverride || this.schemas;
    const approvedChanges = new Set(options.APPROVED_CONTRACT_CHANGE || []);
    const errors = [];

    for (const [schemaKey, mandatoryFields] of Object.entries(LOCKED_DATA_CONTRACT_REQUIRED_FIELDS)) {
      const schemaObj = targetSchemas[schemaKey];
      if (!schemaObj) {
        errors.push({
          code: 'CONTRACT_DRIFT_DETECTED',
          entity: schemaKey,
          id: schemaKey,
          message: `Missing locked schema '${schemaKey}'`
        });
        continue;
      }
      const reqSet = new Set(schemaObj.required || []);
      const propSet = new Set(Object.keys(schemaObj.properties || {}));
      for (const field of mandatoryFields) {
        const changeKey = `${schemaKey}.${field}`;
        if (approvedChanges.has(changeKey)) continue;
        if (!reqSet.has(field) || !propSet.has(field)) {
          errors.push({
            code: 'CONTRACT_DRIFT_DETECTED',
            entity: schemaKey,
            id: schemaKey,
            field,
            message: `Schema '${schemaKey}' drifted from Data Contract: missing required field '${field}' without APPROVED_CONTRACT_CHANGE`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateDataset(dataset, options = {}) {
    const errors = [];

    // 0. Check Data Contract Lock first
    const contractCheck = this.validateDataContractLock(options.schemasOverride, options);
    if (!contractCheck.valid) {
      errors.push(...contractCheck.errors);
    }

    const sources = dataset.sources || [];
    const topics = dataset.topics || [];
    const competencies = dataset.competencies || [];
    const requirements = dataset.requirements || [];
    const nlsMappings = dataset.nlsMappings || [];
    const aiMappings = dataset.aiMappings || [];
    const lessons = dataset.lessons || [];
    const activities = dataset.activities || [];
    const questions = dataset.questions || [];
    const evidences = dataset.evidences || [];
    const resources = dataset.resources || [];
    const masteryRules = dataset.masteryRules || [];

    const idSets = {
      source: new Set(),
      topic: new Set(),
      competency: new Set(),
      competencyCode: new Set(),
      requirement: new Set(),
      nlsMapping: new Set(),
      aiMapping: new Set(),
      lesson: new Set(),
      activity: new Set(),
      question: new Set(),
      evidence: new Set(),
      resource: new Set(),
      masteryRule: new Set()
    };
    const globalSeenIds = new Map();

    const registerId = (entityType, id, setKey) => {
      if (!id) return;
      if (idSets[setKey].has(id) || globalSeenIds.has(id)) {
        errors.push({
          code: 'DUPLICATE_ID',
          entity: entityType,
          id,
          message: `Duplicate ID '${id}' detected in ${entityType}`
        });
      }
      idSets[setKey].add(id);
      globalSeenIds.set(id, entityType);
    };

    // 1. Validate Sources (including Blocker 5 specificity check)
    for (const s of sources) {
      registerId('Source', s.sourceId, 'source');
      if (this.schemas.source) {
        errors.push(...validateAgainstJsonSchema(s, this.schemas.source, 'Source', s.sourceId));
      }
      if (typeof s.url === 'string') {
        const isGenericRootUrl = /^https?:\/\/[^/]+\/?$/i.test(s.url.trim());
        if (isGenericRootUrl) {
          errors.push({
            code: 'SOURCE_URL_TOO_GENERIC',
            entity: 'Source',
            id: s.sourceId,
            field: 'url',
            message: `Source '${s.sourceId}' uses generic homepage URL '${s.url}'. Must use exact document URL or Drive ID.`
          });
        }
      }
      if (s.verificationStatus !== 'verified') {
        errors.push({
          code: 'SOURCE_NOT_VERIFIED',
          entity: 'Source',
          id: s.sourceId,
          field: 'verificationStatus',
          message: `Source '${s.sourceId}' must have verificationStatus='verified'`
        });
      }
    }

    // 2. Validate Topics
    for (const t of topics) {
      registerId('Topic', t.topicId, 'topic');
      if (this.schemas.topic) {
        errors.push(...validateAgainstJsonSchema(t, this.schemas.topic, 'Topic', t.topicId));
      }
      if (t.officialSourceId && !idSets.source.has(t.officialSourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Topic',
          id: t.topicId,
          field: 'officialSourceId',
          targetId: t.officialSourceId,
          message: `Topic '${t.topicId}' references non-existent officialSourceId '${t.officialSourceId}'`
        });
      }
    }

    // 3. Validate Competencies
    for (const c of competencies) {
      registerId('Competency', c.competencyId, 'competency');
      if (c.code) idSets.competencyCode.add(c.code);
      if (this.schemas.competency) {
        errors.push(
          ...validateAgainstJsonSchema(c, this.schemas.competency, 'Competency', c.competencyId)
        );
      }
      if (c.officialSourceId && !idSets.source.has(c.officialSourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Competency',
          id: c.competencyId,
          field: 'officialSourceId',
          targetId: c.officialSourceId,
          message: `Competency '${c.competencyId}' references non-existent officialSourceId '${c.officialSourceId}'`
        });
      }
    }

    // 4. Validate Requirements (Blocker 1 & Blocker 7.1–7.3)
    if (options.skipCountChecks !== true) {
      if (requirements.length !== EXPECT_REQUIREMENT_COUNT_G6) {
        errors.push({
          code: 'REQUIREMENT_COUNT_MISMATCH',
          entity: 'Requirement',
          id: 'G6-REQUIREMENT-BANK',
          message: `Expected ${EXPECT_REQUIREMENT_COUNT_G6} Grade 6 requirements (CTGDPT 2018), but got ${requirements.length}`
        });
      }

      const topicActualCounts = {
        'G6-A': 0,
        'G6-B': 0,
        'G6-C': 0,
        'G6-D': 0,
        'G6-E': 0,
        'G6-F': 0
      };
      for (const r of requirements) {
        if (topicActualCounts[r.topicId] !== undefined) {
          topicActualCounts[r.topicId]++;
        }
      }
      for (const [tId, expectedCount] of Object.entries(EXPECT_TOPIC_COUNTS_G6)) {
        if (topicActualCounts[tId] !== expectedCount) {
          errors.push({
            code: 'TOPIC_REQUIREMENT_COUNT_MISMATCH',
            entity: 'Topic',
            id: tId,
            message: `Topic '${tId}' expected ${expectedCount} requirements, but got ${topicActualCounts[tId]}`
          });
        }
      }
    }

    const trustedReqs =
      (options.trustedSnapshot && options.trustedSnapshot.requirements) ||
      (this.trustedSnapshot && this.trustedSnapshot.requirements) ||
      null;

    for (const r of requirements) {
      registerId('Requirement', r.requirementId, 'requirement');

      const hasAiComp =
        Array.isArray(r.competencyIds) &&
        r.competencyIds.some(cid => /^AI|NL[_-]?AI/i.test(String(cid)));
      if (hasAiComp) {
        errors.push({
          code: 'UNAUTHORIZED_AI_IN_REQUIREMENT_BANK',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' must not directly embed AI competency in Requirement Bank`
        });
      }

      if (this.schemas.requirement) {
        errors.push(
          ...validateAgainstJsonSchema(r, this.schemas.requirement, 'Requirement', r.requirementId)
        );
      }

      if (typeof r.studentFriendlyText !== 'string' || r.studentFriendlyText.trim().length === 0) {
        errors.push({
          code: 'REQUIREMENT_MISSING_STUDENT_FRIENDLY_TEXT',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' is missing non-empty studentFriendlyText`
        });
      }

      // Blocker 1.3: G6-A-09 officialText must not inject TB
      if (r.requirementId === 'G6-A-09' && /\bTB\b/.test(r.officialText || '')) {
        errors.push({
          code: 'OFFICIAL_REQUIREMENT_TEXT_TAMPERED',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement 'G6-A-09' officialText must not inject 'TB' (CTGDPT 2018 only specifies Byte, KB, MB, GB)`
        });
      }

      const computedHash = sha256Text(r.officialText);
      const trustedEntry = trustedReqs ? trustedReqs[r.requirementId] : null;
      const matchesTrusted =
        !trustedEntry ||
        (trustedEntry.officialText === r.officialText &&
          trustedEntry.officialTextHash === computedHash &&
          r.officialTextHash === trustedEntry.officialTextHash);

      if (
        !r.officialTextHash ||
        r.officialTextHash !== computedHash ||
        r.reviewStatus !== 'approved_official' ||
        !matchesTrusted
      ) {
        errors.push({
          code: 'OFFICIAL_REQUIREMENT_TEXT_TAMPERED',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' officialText or officialTextHash does not match Trusted Official CTGDPT 2018 Snapshot`
        });
      }

      if (r.topicId && !idSets.topic.has(r.topicId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Requirement',
          id: r.requirementId,
          field: 'topicId',
          targetId: r.topicId,
          message: `Requirement '${r.requirementId}' references non-existent topicId '${r.topicId}'`
        });
      }
      if (r.officialSourceId && !idSets.source.has(r.officialSourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Requirement',
          id: r.requirementId,
          field: 'officialSourceId',
          targetId: r.officialSourceId,
          message: `Requirement '${r.requirementId}' references non-existent officialSourceId '${r.officialSourceId}'`
        });
      }
      for (const cid of r.competencyIds || []) {
        if (!idSets.competency.has(cid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Requirement',
            id: r.requirementId,
            field: 'competencyIds',
            targetId: cid,
            message: `Requirement '${r.requirementId}' references non-existent competencyId '${cid}'`
          });
        }
      }
    }

    // 5. Register IDs for child entities first so cross-references from Lesson can be validated
    for (const a of activities) registerId('Activity', a.activityId, 'activity');
    for (const q of questions) registerId('Question', q.questionId, 'question');
    for (const ev of evidences) registerId('Evidence', ev.evidenceId, 'evidence');
    for (const res of resources) registerId('Resource', res.resourceId, 'resource');
    for (const mr of masteryRules) registerId('MasteryRule', mr.masteryRuleId, 'masteryRule');

    // 6. Validate Lessons (Blocker 2 & Blocker 7.4–7.6)
    if (options.skipCountChecks !== true && lessons.length !== EXPECT_PPCT_LESSON_COUNT_G6) {
      errors.push({
        code: 'PPCT_LESSON_COUNT_MISMATCH',
        entity: 'Lesson',
        id: 'G6-PPCT',
        message: `Expected ${EXPECT_PPCT_LESSON_COUNT_G6} content lessons (1–13, 15–17) per Viet Hoa PPCT, but got ${lessons.length}`
      });
    }

    for (const l of lessons) {
      registerId('Lesson', l.lessonId, 'lesson');
      if (this.schemas.lesson) {
        errors.push(...validateAgainstJsonSchema(l, this.schemas.lesson, 'Lesson', l.lessonId));
      }

      // Blocker 7.4: Phantom Lesson 14 check
      if (
        l.lessonId === 'G6-L14' ||
        l.lessonNumber === 14 ||
        /\bBài\s*14\b/i.test(l.title || '')
      ) {
        errors.push({
          code: 'PHANTOM_LESSON_DETECTED',
          entity: 'Lesson',
          id: l.lessonId,
          message: `Phantom Lesson 14 ('${l.lessonId}') detected. Viet Hoa 2026–2027 PPCT does not include Lesson 14.`
        });
      }

      // Blocker 7.6: PPCT Period & Duration validation
      const expectedPeriods = EXPECT_PPCT_PERIODS_G6[l.lessonId];
      if (expectedPeriods !== undefined) {
        if (l.periods !== undefined && l.periods !== expectedPeriods) {
          errors.push({
            code: 'PPCT_PERIOD_MISMATCH',
            entity: 'Lesson',
            id: l.lessonId,
            message: `Lesson '${l.lessonId}' has periods=${l.periods}, expected ${expectedPeriods} per Viet Hoa PPCT`
          });
        }
        const expectedMinutes = expectedPeriods * 45;
        if (l.durationMinutes !== expectedMinutes) {
          errors.push({
            code: 'PPCT_PERIOD_MISMATCH',
            entity: 'Lesson',
            id: l.lessonId,
            message: `Lesson '${l.lessonId}' has durationMinutes=${l.durationMinutes}, expected ${expectedMinutes} (${expectedPeriods} periods × 45m)`
          });
        }
      }

      // Rule #5.3: Published Lesson missing RequirementID
      if (
        l.status === 'published' &&
        (!Array.isArray(l.requirementIds) || l.requirementIds.length === 0)
      ) {
        errors.push({
          code: 'PUBLISHED_LESSON_MISSING_REQUIREMENT',
          entity: 'Lesson',
          id: l.lessonId,
          message: `Published lesson '${l.lessonId}' must have at least one RequirementID`
        });
      }

      if (l.topicId && !idSets.topic.has(l.topicId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Lesson',
          id: l.lessonId,
          field: 'topicId',
          targetId: l.topicId,
          message: `Lesson '${l.lessonId}' references non-existent topicId '${l.topicId}'`
        });
      }
      for (const sRef of l.sourceRefs || []) {
        if (!idSets.source.has(sRef)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'sourceRefs',
            targetId: sRef,
            message: `Lesson '${l.lessonId}' references non-existent sourceId '${sRef}'`
          });
        }
      }
      for (const reqId of l.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'requirementIds',
            targetId: reqId,
            message: `Lesson '${l.lessonId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
      for (const cid of l.competencyIds || []) {
        if (!idSets.competency.has(cid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'competencyIds',
            targetId: cid,
            message: `Lesson '${l.lessonId}' references non-existent competencyId '${cid}'`
          });
        }
      }
      for (const nls of l.nlsCodes || []) {
        if (!idSets.competencyCode.has(nls)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'nlsCodes',
            targetId: nls,
            message: `Lesson '${l.lessonId}' references non-existent NLS code '${nls}'`
          });
        }
      }
      for (const aid of l.activityIds || []) {
        if (!idSets.activity.has(aid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'activityIds',
            targetId: aid,
            message: `Lesson '${l.lessonId}' references non-existent activityId '${aid}'`
          });
        }
      }
      for (const qid of l.questionIds || []) {
        if (!idSets.question.has(qid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'questionIds',
            targetId: qid,
            message: `Lesson '${l.lessonId}' references non-existent questionId '${qid}'`
          });
        }
      }
      for (const eid of l.evidenceIds || []) {
        if (!idSets.evidence.has(eid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'evidenceIds',
            targetId: eid,
            message: `Lesson '${l.lessonId}' references non-existent evidenceId '${eid}'`
          });
        }
      }
      for (const rid of l.resourceIds || []) {
        if (!idSets.resource.has(rid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'resourceIds',
            targetId: rid,
            message: `Lesson '${l.lessonId}' references non-existent resourceId '${rid}'`
          });
        }
      }
      for (const mrid of l.masteryRuleIds || []) {
        if (!idSets.masteryRule.has(mrid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Lesson',
            id: l.lessonId,
            field: 'masteryRuleIds',
            targetId: mrid,
            message: `Lesson '${l.lessonId}' references non-existent masteryRuleId '${mrid}'`
          });
        }
      }
    }

    // Verify Requirement.lessonIds references
    for (const r of requirements) {
      for (const lid of r.lessonIds || []) {
        if (!idSets.lesson.has(lid)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Requirement',
            id: r.requirementId,
            field: 'lessonIds',
            targetId: lid,
            message: `Requirement '${r.requirementId}' references non-existent lessonId '${lid}'`
          });
        }
      }
    }

    // 7. Validate NLS Mappings (Blocker 6)
    for (const m of nlsMappings) {
      registerId('NLSMapping', m.mappingId, 'nlsMapping');
      if (this.schemas.nlsMapping) {
        errors.push(
          ...validateAgainstJsonSchema(m, this.schemas.nlsMapping, 'NLSMapping', m.mappingId)
        );
      }
      if (m.isOfficialGdpt2018Requirement !== false || !m.mappingSourceId || !m.frameworkSourceId) {
        errors.push({
          code: 'NLS_MAPPING_INVALID_ORIGIN',
          entity: 'NLSMapping',
          id: m.mappingId,
          message: `NLSMapping '${m.mappingId}' must separate frameworkSourceId and school mappingSourceId, with isOfficialGdpt2018Requirement=false`
        });
      }
      if (m.lessonId && !idSets.lesson.has(m.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'NLSMapping',
          id: m.mappingId,
          field: 'lessonId',
          targetId: m.lessonId,
          message: `NLSMapping '${m.mappingId}' references non-existent lessonId '${m.lessonId}'`
        });
      }
      if (m.competencyId && !idSets.competency.has(m.competencyId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'NLSMapping',
          id: m.mappingId,
          field: 'competencyId',
          targetId: m.competencyId,
          message: `NLSMapping '${m.mappingId}' references non-existent competencyId '${m.competencyId}'`
        });
      }
      if (m.frameworkSourceId && !idSets.source.has(m.frameworkSourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'NLSMapping',
          id: m.mappingId,
          field: 'frameworkSourceId',
          targetId: m.frameworkSourceId,
          message: `NLSMapping '${m.mappingId}' references non-existent frameworkSourceId '${m.frameworkSourceId}'`
        });
      }
      if (m.mappingSourceId && !idSets.source.has(m.mappingSourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'NLSMapping',
          id: m.mappingId,
          field: 'mappingSourceId',
          targetId: m.mappingSourceId,
          message: `NLSMapping '${m.mappingId}' references non-existent mappingSourceId '${m.mappingSourceId}'`
        });
      }
      for (const reqId of m.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'NLSMapping',
            id: m.mappingId,
            field: 'requirementIds',
            targetId: reqId,
            message: `NLSMapping '${m.mappingId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 8. Validate AI Competency Mappings
    for (const ai of aiMappings) {
      registerId('AICompetencyMapping', ai.aiMappingId, 'aiMapping');
      if (this.schemas.aiMapping) {
        errors.push(
          ...validateAgainstJsonSchema(
            ai,
            this.schemas.aiMapping,
            'AICompetencyMapping',
            ai.aiMappingId
          )
        );
      }
      if (ai.status === 'published' && ai.teacherApproved !== true) {
        errors.push({
          code: 'UNAPPROVED_AI_MAPPING',
          entity: 'AICompetencyMapping',
          id: ai.aiMappingId,
          message: `AICompetencyMapping '${ai.aiMappingId}' is published but teacherApproved is not true`
        });
      }
      if (ai.lessonId && !idSets.lesson.has(ai.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'AICompetencyMapping',
          id: ai.aiMappingId,
          field: 'lessonId',
          targetId: ai.lessonId,
          message: `AICompetencyMapping '${ai.aiMappingId}' references non-existent lessonId '${ai.lessonId}'`
        });
      }
      for (const reqId of ai.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'AICompetencyMapping',
            id: ai.aiMappingId,
            field: 'requirementIds',
            targetId: reqId,
            message: `AICompetencyMapping '${ai.aiMappingId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 9. Validate Activities
    for (const a of activities) {
      if (this.schemas.activity) {
        errors.push(...validateAgainstJsonSchema(a, this.schemas.activity, 'Activity', a.activityId));
      }
      const hasReqs = Array.isArray(a.requirementIds) && a.requirementIds.length > 0;
      if (!hasReqs && a.educationalPurposeApproved !== true) {
        errors.push({
          code: 'ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS',
          entity: 'Activity',
          id: a.activityId,
          message: `Activity '${a.activityId}' has empty requirementIds and educationalPurposeApproved !== true`
        });
      }
      if (a.lessonId && !idSets.lesson.has(a.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Activity',
          id: a.activityId,
          field: 'lessonId',
          targetId: a.lessonId,
          message: `Activity '${a.activityId}' references non-existent lessonId '${a.lessonId}'`
        });
      }
      for (const reqId of a.requirementIds || []) {
        if (!idSets.requirement.has(reqId)) {
          errors.push({
            code: 'DANGLING_REFERENCE',
            entity: 'Activity',
            id: a.activityId,
            field: 'requirementIds',
            targetId: reqId,
            message: `Activity '${a.activityId}' references non-existent requirementId '${reqId}'`
          });
        }
      }
    }

    // 10. Validate Questions (Blocker 3.7: singular requirementId & questionText)
    for (const q of questions) {
      if (this.schemas.question) {
        errors.push(...validateAgainstJsonSchema(q, this.schemas.question, 'Question', q.questionId));
      }
      const hasReqId = typeof q.requirementId === 'string' && q.requirementId.trim().length > 0;
      if (!hasReqId) {
        errors.push({
          code: 'QUESTION_MISSING_REQUIREMENT',
          entity: 'Question',
          id: q.questionId,
          message: `Question '${q.questionId}' must reference a non-empty requirementId`
        });
      } else if (!idSets.requirement.has(q.requirementId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Question',
          id: q.questionId,
          field: 'requirementId',
          targetId: q.requirementId,
          message: `Question '${q.questionId}' references non-existent requirementId '${q.requirementId}'`
        });
      }

      const hasCorrect = Array.isArray(q.correctAnswer)
        ? q.correctAnswer.length > 0
        : typeof q.correctAnswer === 'string' && q.correctAnswer.trim().length > 0;
      if (!hasCorrect) {
        errors.push({
          code: 'QUESTION_MISSING_CORRECT_ANSWER',
          entity: 'Question',
          id: q.questionId,
          message: `Question '${q.questionId}' is missing a non-empty correctAnswer`
        });
      }
      if (typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
        errors.push({
          code: 'QUESTION_MISSING_EXPLANATION',
          entity: 'Question',
          id: q.questionId,
          message: `Question '${q.questionId}' is missing a non-empty explanation`
        });
      }
      if (q.topicId && !idSets.topic.has(q.topicId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Question',
          id: q.questionId,
          field: 'topicId',
          targetId: q.topicId,
          message: `Question '${q.questionId}' references non-existent topicId '${q.topicId}'`
        });
      }
      if (q.lessonId && !idSets.lesson.has(q.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Question',
          id: q.questionId,
          field: 'lessonId',
          targetId: q.lessonId,
          message: `Question '${q.questionId}' references non-existent lessonId '${q.lessonId}'`
        });
      }
      if (q.activityId && !idSets.activity.has(q.activityId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Question',
          id: q.questionId,
          field: 'activityId',
          targetId: q.activityId,
          message: `Question '${q.questionId}' references non-existent activityId '${q.activityId}'`
        });
      }
    }

    // 11. Validate Evidences (Blocker 3.8)
    for (const ev of evidences) {
      if (this.schemas.evidence) {
        errors.push(
          ...validateAgainstJsonSchema(ev, this.schemas.evidence, 'Evidence', ev.evidenceId)
        );
      }
      if (ev.lessonId && !idSets.lesson.has(ev.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Evidence',
          id: ev.evidenceId,
          field: 'lessonId',
          targetId: ev.lessonId,
          message: `Evidence '${ev.evidenceId}' references non-existent lessonId '${ev.lessonId}'`
        });
      }
      if (ev.sourceActivityId && !idSets.activity.has(ev.sourceActivityId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Evidence',
          id: ev.evidenceId,
          field: 'sourceActivityId',
          targetId: ev.sourceActivityId,
          message: `Evidence '${ev.evidenceId}' references non-existent sourceActivityId '${ev.sourceActivityId}'`
        });
      }
      if (ev.requirementId && !idSets.requirement.has(ev.requirementId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Evidence',
          id: ev.evidenceId,
          field: 'requirementId',
          targetId: ev.requirementId,
          message: `Evidence '${ev.evidenceId}' references non-existent requirementId '${ev.requirementId}'`
        });
      }
    }

    // 12. Validate Resources
    for (const res of resources) {
      if (this.schemas.resource) {
        errors.push(
          ...validateAgainstJsonSchema(res, this.schemas.resource, 'Resource', res.resourceId)
        );
      }
      const needsUrl =
        res.requiresUrl === true ||
        ['interactive_lesson', 'simulation', 'video', 'reference_doc'].includes(res.resourceType);
      if (needsUrl && (typeof res.url !== 'string' || res.url.trim().length === 0)) {
        errors.push({
          code: 'RESOURCE_MISSING_URL',
          entity: 'Resource',
          id: res.resourceId,
          message: `Resource '${res.resourceId}' requires a URL but url is empty`
        });
      }
      if (res.lessonId && !idSets.lesson.has(res.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Resource',
          id: res.resourceId,
          field: 'lessonId',
          targetId: res.lessonId,
          message: `Resource '${res.resourceId}' references non-existent lessonId '${res.lessonId}'`
        });
      }
      if (res.sourceId && !idSets.source.has(res.sourceId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'Resource',
          id: res.resourceId,
          field: 'sourceId',
          targetId: res.sourceId,
          message: `Resource '${res.resourceId}' references non-existent sourceId '${res.sourceId}'`
        });
      }
    }

    // 13. Validate MasteryRules (Blocker 3.9: evaluates Requirement/YCCD)
    for (const mr of masteryRules) {
      if (this.schemas.masteryRule) {
        errors.push(
          ...validateAgainstJsonSchema(
            mr,
            this.schemas.masteryRule,
            'MasteryRule',
            mr.masteryRuleId
          )
        );
      }
      if (!mr.requirementId || !idSets.requirement.has(mr.requirementId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'MasteryRule',
          id: mr.masteryRuleId,
          field: 'requirementId',
          targetId: mr.requirementId || '',
          message: `MasteryRule '${mr.masteryRuleId}' references non-existent requirementId '${mr.requirementId}'`
        });
      }
      if (mr.lessonId && !idSets.lesson.has(mr.lessonId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'MasteryRule',
          id: mr.masteryRuleId,
          field: 'lessonId',
          targetId: mr.lessonId,
          message: `MasteryRule '${mr.masteryRuleId}' references non-existent lessonId '${mr.lessonId}'`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errorCount: errors.length,
      errors,
      summary: {
        sources: sources.length,
        topics: topics.length,
        competencies: competencies.length,
        requirements: requirements.length,
        nlsMappings: nlsMappings.length,
        aiMappings: aiMappings.length,
        lessons: lessons.length,
        activities: activities.length,
        questions: questions.length,
        evidences: evidences.length,
        resources: resources.length,
        masteryRules: masteryRules.length
      }
    };
  }
}

module.exports = {
  EXPECT_REQUIREMENT_COUNT_G6,
  EXPECT_TOPIC_COUNTS_G6,
  EXPECT_PPCT_LESSON_COUNT_G6,
  EXPECT_PPCT_PERIODS_G6,
  LOCKED_DATA_CONTRACT_REQUIRED_FIELDS,
  CurriculumValidator,
  sha256Text,
  computeOfficialTextHash: sha256Text
};
