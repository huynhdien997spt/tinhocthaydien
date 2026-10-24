/**
 * PHASE 2 / TASK P2.5 (FIX ROUND 2) — Curriculum Data Foundation Validator
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
  'G6-L05': 2,
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

const EXPECT_TOTAL_LESSON_PERIODS_G6 = 29;
const EXPECT_TOTAL_REVIEW_PERIODS_G6 = 2;
const EXPECT_TOTAL_ASSESSMENT_PERIODS_G6 = 4;
const EXPECT_GRAND_TOTAL_PERIODS_G6 = 35;

const FORBIDDEN_INTERMEDIATE_DRIVE_IDS = [
  '15pCBhBLdg077Q1XizVBVxyPSpM1Q0TAiU8jYVnY2zBw',
  '1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U'
];

const REQUIRED_SOURCE_DRIVE_IDS = {
  'SRC-GDPT-2018-TIN6': '13o_7GOH_en10qIrlgLTyqrIlJSgCZxma',
  'SRC-PPCT-VIETHOA-TIN6-2026': '1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM',
  'SRC-SGK-KNTT-TIN6': '1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj',
  'SRC-PHULUC3-TIN6-VIETHOA-2026': '1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC',
  'SRC-KHBD-TIN6-BAI3-VIETHOA': '1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp'
};

// Immutable semantic signatures for RequirementIDs (Section 4 & Section 9)
const IMMUTABLE_REQUIREMENT_SIGNATURES = {
  'G6-A-05': /máy tính là công cụ hiệu quả để thu thập,\s*lưu trữ,\s*xử lí và truyền thông tin/i,
  'G6-A-06': /các bước cơ bản trong xử lí thông tin/i,
  'G6-A-09': /1 KB xấp xỉ 1 ngàn byte,\s*1 MB xấp xỉ 1 triệu byte,\s*1 GB xấp xỉ 1 tỉ byte/i,
  'G6-B-02': /mạng không dây tiện dụng hơn mạng có dây/i,
  'G6-B-03': /máy tính,\s*cáp nối,\s*Switch,\s*Access Point/i,
  'G6-C-01': /^Trình bày được sơ lược về các khái niệm WWW,\s*website,\s*địa chỉ của website,\s*trình duyệt\.$/,
  'G6-C-07': /đăng nhập tài khoản email,\s*soạn và gửi email,\s*thoát ra/i,
  'G6-D-01': /Giới thiệu được sơ lược một số tác hại và nguy cơ bị hại khi tham gia Internet/i,
  'G6-D-03': /Bảo vệ được thông tin và tài khoản cá nhân với sự hỗ trợ của người lớn/i,
  'G6-D-05': /^Nhận diện được một số thông điệp lừa đảo hoặc mang nội dung xấu\.$/,
  'G6-E-01': /tác dụng của một số công cụ căn lề,\s*định dạng,\s*tìm kiếm,\s*thay thế/i,
  'G6-E-02': /Thực hiện được việc định dạng văn bản,\s*trình bày trang văn bản và in/i,
  'G6-E-03': /Sử dụng được công cụ tìm kiếm và thay thế của phần mềm soạn thảo văn bản/i,
  'G6-E-04': /Trình bày được thông tin ở dạng bảng bằng phần mềm soạn thảo văn bản/i,
  'G6-E-05': /Soạn thảo được văn bản phục vụ học tập và sinh hoạt hàng ngày/i,
  'G6-E-06': /Nêu được các chức năng đặc trưng của những phần mềm soạn thảo văn bản/i,
  'G6-E-07': /Sắp xếp được một cách lôgic và trình bày được dưới dạng sơ đồ tư duy/i,
  'G6-E-08': /Giải thích được lợi ích của sơ đồ tư duy,\s*nêu được nhu cầu sử dụng phần mềm sơ đồ tư duy/i,
  'G6-E-09': /Sử dụng được phần mềm để tạo sơ đồ tư duy đơn giản/i
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

  /**
   * Section 6: Verify Trusted Snapshot has full provenance pointing to true CTGDPT source.
   */
  validateTrustedSnapshotProvenance(snapshot = this.trustedSnapshot) {
    const errors = [];
    if (!snapshot) {
      errors.push({
        code: 'TRUSTED_SNAPSHOT_MISSING_PROVENANCE',
        entity: 'TrustedSnapshot',
        id: 'NONE',
        message: 'Trusted Official Snapshot is missing'
      });
      return { valid: false, errors };
    }
    if (
      !snapshot.sourceId ||
      snapshot.sourceDocumentDriveId !== '13o_7GOH_en10qIrlgLTyqrIlJSgCZxma' ||
      !snapshot.sourceOfficialUrl ||
      !snapshot.sourceOfficialUrl.includes('ItemID=146721') ||
      !snapshot.sourceSection ||
      !snapshot.verifiedAt
    ) {
      errors.push({
        code: 'TRUSTED_SNAPSHOT_MISSING_PROVENANCE',
        entity: 'TrustedSnapshot',
        id: snapshot.snapshotId || 'SNAPSHOT',
        message:
          'Trusted Snapshot is missing valid provenance (sourceId, sourceDocumentDriveId=13o_7GOH_en10qIrlgLTyqrIlJSgCZxma, sourceOfficialUrl with ItemID=146721, sourceSection, verifiedAt)'
      });
    }
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Section 1 & 9: Validate 35-period PPCT distribution (29 lesson + 2 review + 4 assessment = 35).
   */
  validatePpctDistribution(ppctDist, lessons = []) {
    const errors = [];
    if (!ppctDist || typeof ppctDist !== 'object') {
      errors.push({
        code: 'PPCT_DISTRIBUTION_MISSING',
        entity: 'PPCTDistribution',
        id: 'G6-PPCT-DIST',
        message: 'Missing ppct-distribution-g6.json object'
      });
      return { valid: false, errors };
    }

    if (ppctDist.sourceDriveId !== '1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM') {
      errors.push({
        code: 'FORBIDDEN_INTERMEDIATE_DRIVE_ID',
        entity: 'PPCTDistribution',
        id: 'G6-PPCT-DIST',
        message: `PPCT distribution must reference official Drive ID '1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM'`
      });
    }

    const nonLessons = ppctDist.nonLessonSessions || [];
    for (const s of nonLessons) {
      if (/Ôn tập giữa học kì I|Ôn tập giữa HKI/i.test(s.title || '') || s.sessionId === 'G6-REV-GK1') {
        errors.push({
          code: 'PHANTOM_REVIEW_SESSION_DETECTED',
          entity: 'PPCTDistribution',
          id: s.sessionId || 'REV-GK1',
          message: `Phantom session '${s.title}' detected. Viet Hoa PPCT has no 'Ôn tập giữa học kì I'.`
        });
      }
    }

    const lessonPeriodsSum = lessons.reduce((acc, l) => acc + (l.periods || 0), 0);
    const reviewPeriodsSum = nonLessons
      .filter(s => s.sessionType === 'review')
      .reduce((acc, s) => acc + (s.periods || 0), 0);
    const assessmentPeriodsSum = nonLessons
      .filter(s => s.sessionType === 'assessment')
      .reduce((acc, s) => acc + (s.periods || 0), 0);

    if (
      lessonPeriodsSum !== EXPECT_TOTAL_LESSON_PERIODS_G6 ||
      reviewPeriodsSum !== EXPECT_TOTAL_REVIEW_PERIODS_G6 ||
      assessmentPeriodsSum !== EXPECT_TOTAL_ASSESSMENT_PERIODS_G6 ||
      lessonPeriodsSum + reviewPeriodsSum + assessmentPeriodsSum !== EXPECT_GRAND_TOTAL_PERIODS_G6
    ) {
      errors.push({
        code: 'PPCT_TOTAL_PERIODS_MISMATCH',
        entity: 'PPCTDistribution',
        id: 'G6-PPCT-DIST',
        message: `Expected 29 lesson + 2 review + 4 assessment = 35 periods, but got ${lessonPeriodsSum} + ${reviewPeriodsSum} + ${assessmentPeriodsSum}`
      });
    }

    const schedule = ppctDist.periodSchedule || [];
    if (schedule.length !== 35) {
      errors.push({
        code: 'PPCT_SCHEDULE_INVALID',
        entity: 'PPCTDistribution',
        id: 'periodSchedule',
        message: `Expected 35 periodSchedule entries (1..35), got ${schedule.length}`
      });
    } else {
      // Check key interleaving points from Viet Hoa PPCT (Section 1)
      const p7 = schedule.find(x => x.periodNumber === 7);
      const p8 = schedule.find(x => x.periodNumber === 8);
      const p9 = schedule.find(x => x.periodNumber === 9);
      const p17 = schedule.find(x => x.periodNumber === 17);
      const p18 = schedule.find(x => x.periodNumber === 18);
      const p25 = schedule.find(x => x.periodNumber === 25);
      const p26 = schedule.find(x => x.periodNumber === 26);
      const p27 = schedule.find(x => x.periodNumber === 27);
      const p34 = schedule.find(x => x.periodNumber === 34);
      const p35 = schedule.find(x => x.periodNumber === 35);

      if (
        !p7 || p7.refId !== 'G6-L04' ||
        !p8 || p8.sessionType !== 'assessment' ||
        !p9 || p9.refId !== 'G6-L04' ||
        !p17 || p17.sessionType !== 'review' ||
        !p18 || p18.sessionType !== 'assessment' ||
        !p25 || p25.refId !== 'G6-L12' ||
        !p26 || p26.sessionType !== 'assessment' ||
        !p27 || p27.refId !== 'G6-L12' ||
        !p34 || p34.sessionType !== 'review' ||
        !p35 || p35.sessionType !== 'assessment'
      ) {
        errors.push({
          code: 'PPCT_SCHEDULE_ORDER_MISMATCH',
          entity: 'PPCTDistribution',
          id: 'periodSchedule',
          message: 'periodSchedule 1..35 does not match actual Viet Hoa interleaving (Periods 7-9, 17-18, 25-27, 34-35)'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateDataset(dataset, options = {}) {
    const errors = [];

    // 0. Check Data Contract Lock & Trusted Snapshot Provenance
    const contractCheck = this.validateDataContractLock(options.schemasOverride, options);
    if (!contractCheck.valid) {
      errors.push(...contractCheck.errors);
    }

    const activeSnapshot = options.trustedSnapshotOverride || options.trustedSnapshot || this.trustedSnapshot;
    const provCheck = this.validateTrustedSnapshotProvenance(activeSnapshot);
    if (!provCheck.valid) {
      errors.push(...provCheck.errors);
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

    // 1. Validate Sources (Sections 2, 3, 7, 9)
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
        if (s.sourceId === 'SRC-GDPT-2018-TIN6' && s.url.includes('134517')) {
          errors.push({
            code: 'INVALID_OFFICIAL_URL_ITEM_ID',
            entity: 'Source',
            id: s.sourceId,
            field: 'url',
            message: `Source '${s.sourceId}' must use VBPL ItemID=146721, not 134517`
          });
        }
      }

      // Section 2 & 9: Reject intermediate ChatGPT Drive IDs
      const driveIdStr = String(s.driveId || '');
      const urlStr = String(s.url || '');
      if (
        FORBIDDEN_INTERMEDIATE_DRIVE_IDS.some(
          badId => driveIdStr.includes(badId) || urlStr.includes(badId)
        )
      ) {
        errors.push({
          code: 'FORBIDDEN_INTERMEDIATE_DRIVE_ID',
          entity: 'Source',
          id: s.sourceId,
          field: 'driveId',
          message: `Source '${s.sourceId}' uses intermediate ChatGPT doc ID instead of true teacher source Drive ID`
        });
      }

      if (
        REQUIRED_SOURCE_DRIVE_IDS[s.sourceId] &&
        s.driveId !== REQUIRED_SOURCE_DRIVE_IDS[s.sourceId]
      ) {
        errors.push({
          code: 'SOURCE_DRIVE_ID_MISMATCH',
          entity: 'Source',
          id: s.sourceId,
          field: 'driveId',
          message: `Source '${s.sourceId}' has driveId='${s.driveId}', expected '${REQUIRED_SOURCE_DRIVE_IDS[s.sourceId]}'`
        });
      }

      // Section 7: Prevent overclaiming external verification when externalVerificationStatus is pending
      if (
        s.externalVerificationStatus === 'pending' &&
        (s.verificationStatus === 'both_verified' || s.verificationStatus === 'official_internet_verified')
      ) {
        errors.push({
          code: 'SOURCE_OVERCLAIMED_VERIFICATION',
          entity: 'Source',
          id: s.sourceId,
          field: 'verificationStatus',
          message: `Source '${s.sourceId}' has externalVerificationStatus='pending' and must not claim '${s.verificationStatus}'`
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

    // 4. Validate Requirements (Sections 4, 5, 6, 9)
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

    const trustedReqs = (activeSnapshot && activeSnapshot.requirements) || null;

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

      // Section 4 & 9: Immutable RequirementID & exact wording checks
      const sigRegex = IMMUTABLE_REQUIREMENT_SIGNATURES[r.requirementId];
      if (sigRegex && !sigRegex.test(r.officialText || '')) {
        errors.push({
          code: 'REQUIREMENT_STABLE_ID_DRIFT',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement '${r.requirementId}' does not match its immutable CTGDPT 2018 semantic/wording signature`
        });
      }

      if (r.requirementId === 'G6-A-09' && /\bTB\b/.test(r.officialText || '')) {
        errors.push({
          code: 'OFFICIAL_REQUIREMENT_TEXT_TAMPERED',
          entity: 'Requirement',
          id: r.requirementId,
          message: `Requirement 'G6-A-09' officialText must not inject 'TB'`
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

    // 6. Validate Lessons (Section 1 & Section 9)
    if (options.skipCountChecks !== true) {
      if (lessons.length !== EXPECT_PPCT_LESSON_COUNT_G6) {
        errors.push({
          code: 'PPCT_LESSON_COUNT_MISMATCH',
          entity: 'Lesson',
          id: 'G6-PPCT',
          message: `Expected ${EXPECT_PPCT_LESSON_COUNT_G6} content lessons (1–13, 15–17) per Viet Hoa PPCT, but got ${lessons.length}`
        });
      }
      const totalLessonPeriods = lessons.reduce((acc, l) => acc + (l.periods || 0), 0);
      if (totalLessonPeriods !== EXPECT_TOTAL_LESSON_PERIODS_G6) {
        errors.push({
          code: 'PPCT_TOTAL_PERIODS_MISMATCH',
          entity: 'Lesson',
          id: 'G6-PPCT',
          message: `Expected ${EXPECT_TOTAL_LESSON_PERIODS_G6} total lesson periods across 16 content lessons, got ${totalLessonPeriods}`
        });
      }
    }

    for (const l of lessons) {
      registerId('Lesson', l.lessonId, 'lesson');
      if (this.schemas.lesson) {
        errors.push(...validateAgainstJsonSchema(l, this.schemas.lesson, 'Lesson', l.lessonId));
      }

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

    // 7. Validate NLS Mappings (Section 8)
    for (const m of nlsMappings) {
      registerId('NLSMapping', m.mappingId, 'nlsMapping');
      if (this.schemas.nlsMapping) {
        errors.push(
          ...validateAgainstJsonSchema(m, this.schemas.nlsMapping, 'NLSMapping', m.mappingId)
        );
      }
      if (
        m.isOfficialGdpt2018Requirement !== false ||
        m.mappingSourceId !== 'SRC-PHULUC3-TIN6-VIETHOA-2026' ||
        m.mappingDriveId !== '1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC' ||
        m.frameworkSourceId !== 'SRC-TT02-2025-NLS'
      ) {
        errors.push({
          code: 'NLS_MAPPING_INVALID_ORIGIN',
          entity: 'NLSMapping',
          id: m.mappingId,
          message: `NLSMapping '${m.mappingId}' must cite SRC-TT02-2025-NLS and SRC-PHULUC3-TIN6-VIETHOA-2026 (Drive ID 1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC)`
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
      if (
        m.supplementaryLessonPlanSourceId &&
        !idSets.source.has(m.supplementaryLessonPlanSourceId)
      ) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          entity: 'NLSMapping',
          id: m.mappingId,
          field: 'supplementaryLessonPlanSourceId',
          targetId: m.supplementaryLessonPlanSourceId,
          message: `NLSMapping '${m.mappingId}' references non-existent supplementaryLessonPlanSourceId '${m.supplementaryLessonPlanSourceId}'`
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

    // 10. Validate Questions
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

    // 11. Validate Evidences
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

    // 13. Validate MasteryRules
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

    // 14. Validate PPCT Distribution & 35-period schedule if provided
    if (dataset.ppctDistribution && options.skipCountChecks !== true) {
      const ppctRes = this.validatePpctDistribution(dataset.ppctDistribution, lessons);
      if (!ppctRes.valid) {
        errors.push(...ppctRes.errors);
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
  EXPECT_TOTAL_LESSON_PERIODS_G6,
  EXPECT_TOTAL_REVIEW_PERIODS_G6,
  EXPECT_TOTAL_ASSESSMENT_PERIODS_G6,
  EXPECT_GRAND_TOTAL_PERIODS_G6,
  FORBIDDEN_INTERMEDIATE_DRIVE_IDS,
  REQUIRED_SOURCE_DRIVE_IDS,
  IMMUTABLE_REQUIREMENT_SIGNATURES,
  LOCKED_DATA_CONTRACT_REQUIRED_FIELDS,
  CurriculumValidator,
  sha256Text,
  computeOfficialTextHash: sha256Text
};
