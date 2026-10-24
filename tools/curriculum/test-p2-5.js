#!/usr/bin/env node
/**
 * PHASE 2 / TASK P2.5 (FIX) — Automated Test Suite & Fixture Generator
 */

const fs = require('fs');
const path = require('path');
const {
  EXPECT_REQUIREMENT_COUNT_G6,
  EXPECT_TOPIC_COUNTS_G6,
  EXPECT_PPCT_LESSON_COUNT_G6,
  EXPECT_PPCT_PERIODS_G6,
  CurriculumValidator,
  computeOfficialTextHash
} = require('./validator');
const { CurriculumImporter, IntermediateCurriculumAdapter } = require('./importer');

const REPO_ROOT = path.resolve(__dirname, '../..');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const STAGING_SNAPSHOT_PATH = path.join(__dirname, 'staging-store.json');

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureFixturesOnDisk(baseDataset) {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  // 1. Valid Grade 6 dataset fixture
  const validFixture = clone(baseDataset);
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'valid-grade6.fixture.json'),
    JSON.stringify(validFixture, null, 2) + '\n',
    'utf8'
  );

  // 2. Duplicate ID fixture
  const duplicateIdFixture = clone(baseDataset);
  duplicateIdFixture.requirements.push(clone(duplicateIdFixture.requirements[0])); // Duplicate G6-A-01
  duplicateIdFixture.lessons.push(clone(duplicateIdFixture.lessons[2])); // Duplicate G6-L03
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'duplicate-id.fixture.json'),
    JSON.stringify(duplicateIdFixture, null, 2) + '\n',
    'utf8'
  );

  // 3. Missing RequirementID fixture (Published Lesson without requirementIds)
  const missingReqFixture = clone(baseDataset);
  const l03 = missingReqFixture.lessons.find(l => l.lessonId === 'G6-L03');
  l03.status = 'published';
  l03.requirementIds = [];
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'missing-requirement-id.fixture.json'),
    JSON.stringify(missingReqFixture, null, 2) + '\n',
    'utf8'
  );

  // 4. Dangling reference fixture
  const danglingRefFixture = clone(baseDataset);
  danglingRefFixture.lessons[0].topicId = 'G6-NON-EXISTENT-TOPIC';
  danglingRefFixture.lessons[0].requirementIds.push('G6-Z-99');
  danglingRefFixture.questions[0].lessonId = 'G6-L999';
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'dangling-reference.fixture.json'),
    JSON.stringify(danglingRefFixture, null, 2) + '\n',
    'utf8'
  );

  // 5. Unapproved AI mapping fixture
  const unapprovedAiFixture = clone(baseDataset);
  unapprovedAiFixture.aiMappings.push({
    aiMappingId: 'AI-MAP-G6-L03-UNAPPROVED',
    lessonId: 'G6-L03',
    requirementIds: ['G6-A-07'],
    aiCompetencyCode: 'AI-6.1-PILOT',
    rationale: 'Thử nghiệm liên hệ biểu diễn nhị phân với dữ liệu huấn luyện AI.',
    teacherApproved: false,
    approvedBy: null,
    approvedAt: null,
    status: 'published'
  });
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'unapproved-ai-mapping.fixture.json'),
    JSON.stringify(unapprovedAiFixture, null, 2) + '\n',
    'utf8'
  );

  // 6. Invalid question fixture (missing requirementId, correctAnswer, explanation)
  const invalidQuestionFixture = clone(baseDataset);
  invalidQuestionFixture.questions.push(
    {
      questionId: 'G6-L03-Q-BAD-1',
      grade: 6,
      topicId: 'G6-A',
      lessonId: 'G6-L03',
      activityId: 'G6-L03-A4',
      requirementId: '',
      questionType: 'multiple_choice',
      cognitiveLevel: 'nhan_biet',
      questionText: 'Câu hỏi thiếu RequirementID?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      explanation: 'Giải thích hợp lệ.',
      maxScore: 1,
      status: 'published'
    },
    {
      questionId: 'G6-L03-Q-BAD-2',
      grade: 6,
      topicId: 'G6-A',
      lessonId: 'G6-L03',
      activityId: 'G6-L03-A4',
      requirementId: 'G6-A-08',
      questionType: 'multiple_choice',
      cognitiveLevel: 'thong_hieu',
      questionText: 'Câu hỏi thiếu correctAnswer và explanation?',
      options: ['A', 'B'],
      correctAnswer: '',
      explanation: '   ',
      maxScore: 1,
      status: 'published'
    }
  );
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'invalid-question.fixture.json'),
    JSON.stringify(invalidQuestionFixture, null, 2) + '\n',
    'utf8'
  );

  // 7. Policy violations fixture (Activity, Resource, and Tampered Requirement with recomputed self-hash)
  const policyViolationsFixture = clone(baseDataset);
  policyViolationsFixture.activities.push({
    activityId: 'G6-L03-A-BAD',
    lessonId: 'G6-L03',
    order: 5,
    activityType: 'warm_up',
    title: 'Hoạt động không gắn YCCĐ và chưa được duyệt mục đích sư phạm',
    objective: 'Khởi động tự do',
    instruction: 'Thảo luận tự do',
    requirementIds: [],
    expectedEvidenceTypes: ['quiz_response'],
    required: false,
    supportPolicyId: 'SP-G6-DEFAULT-HINT',
    educationalPurposeApproved: false,
    status: 'published'
  });
  policyViolationsFixture.resources.push({
    resourceId: 'RES-G6-BAD-URL',
    lessonId: 'G6-L03',
    topicId: 'G6-A',
    requirementIds: ['G6-A-07'],
    title: 'Học liệu trực tuyến thiếu URL',
    resourceType: 'video',
    requiresUrl: true,
    url: '',
    sourceId: 'SRC-SGK-KNTT-TIN6',
    status: 'published'
  });
  // Even if attacker recomputes officialTextHash on tampered text, Trusted Snapshot comparison catches it!
  const tamperedText = 'Nội dung YCCĐ đã bị chỉnh sửa trái phép và tự tính lại hash.';
  policyViolationsFixture.requirements[0].officialText = tamperedText;
  policyViolationsFixture.requirements[0].officialTextHash = computeOfficialTextHash(tamperedText);
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'policy-violations.fixture.json'),
    JSON.stringify(policyViolationsFixture, null, 2) + '\n',
    'utf8'
  );
}

function runSuite() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function test(id, name, fn) {
    try {
      const detail = fn();
      passed++;
      results.push({ id, name, status: 'PASS', detail: detail || 'OK' });
      console.log(`✅ [PASS] ${id}: ${name}`);
    } catch (err) {
      failed++;
      results.push({ id, name, status: 'FAIL', detail: err.message });
      console.error(`❌ [FAIL] ${id}: ${name} -> ${err.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  console.log('================================================================');
  console.log('PHASE 2 / TASK P2.5 (FIX) — CURRICULUM DATA FOUNDATION TEST SUITE');
  console.log('================================================================\n');

  const validator = new CurriculumValidator(path.join(REPO_ROOT, 'schemas'));
  const baseDataset = CurriculumImporter.loadNormalizedGrade6Dataset(REPO_ROOT);
  ensureFixturesOnDisk(baseDataset);

  // ------------------------------------------------------------------------
  // GROUP 1: DIRECTORY STRUCTURE & LOCKED DATA CONTRACT SCHEMAS
  // ------------------------------------------------------------------------
  test('P25-01', 'Mandatory directories exist (data/*, schemas/, tools/curriculum/)', () => {
    const requiredDirs = [
      'data/curriculum',
      'data/requirements',
      'data/competencies',
      'data/lessons',
      'data/resources',
      'schemas',
      'tools/curriculum'
    ];
    for (const d of requiredDirs) {
      const full = path.join(REPO_ROOT, d);
      assert(fs.existsSync(full) && fs.statSync(full).isDirectory(), `Missing directory: ${d}`);
    }
    return `Verified ${requiredDirs.length} directories`;
  });

  test('P25-02', 'All 12 JSON Schemas exist and pass Locked Data Contract Drift Verification (Blocker 3 & 7.7)', () => {
    const expectedSchemas = [
      'source.schema.json',
      'topic.schema.json',
      'lesson.schema.json',
      'requirement.schema.json',
      'competency.schema.json',
      'nls-mapping.schema.json',
      'ai-competency-mapping.schema.json',
      'activity.schema.json',
      'question.schema.json',
      'evidence.schema.json',
      'resource.schema.json',
      'mastery-rule.schema.json'
    ];
    for (const file of expectedSchemas) {
      const full = path.join(REPO_ROOT, 'schemas', file);
      assert(fs.existsSync(full), `Missing schema file: schemas/${file}`);
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      assert(parsed.$schema && parsed.$schema.includes('2020-12'), `${file} missing Draft 2020-12 $schema`);
    }
    const lockRes = validator.validateDataContractLock();
    assert(lockRes.valid === true, `Data Contract Drift detected: ${JSON.stringify(lockRes.errors)}`);
    return '12 schemas verified with 0 Data Contract drift';
  });

  // ------------------------------------------------------------------------
  // GROUP 2: CTGDPT 2018 REQUIREMENT BANK & VIET HOA PPCT ALIGNMENT
  // ------------------------------------------------------------------------
  test('P25-03', 'Topics A–F (G6-A .. G6-F) materialized with officialSourceId and order', () => {
    const expectedTopics = ['G6-A', 'G6-B', 'G6-C', 'G6-D', 'G6-E', 'G6-F'];
    const actualTopics = baseDataset.topics.map(t => t.topicId);
    assert(actualTopics.length === 6, `Expected 6 topics, got ${actualTopics.length}`);
    for (const id of expectedTopics) {
      assert(actualTopics.includes(id), `Missing topicId: ${id}`);
    }
    return `Topics: ${actualTopics.join(', ')}`;
  });

  test('P25-04', 'Requirement Bank has exactly 38 requirements (A=10, B=4, C=7, D=5, E=9, F=3) (Blocker 1.1, 7.1, 7.2)', () => {
    assert(
      baseDataset.requirements.length === EXPECT_REQUIREMENT_COUNT_G6,
      `Expected ${EXPECT_REQUIREMENT_COUNT_G6} requirements, got ${baseDataset.requirements.length}`
    );
    const counts = { 'G6-A': 0, 'G6-B': 0, 'G6-C': 0, 'G6-D': 0, 'G6-E': 0, 'G6-F': 0 };
    for (const r of baseDataset.requirements) {
      counts[r.topicId] = (counts[r.topicId] || 0) + 1;
    }
    for (const [topicId, exp] of Object.entries(EXPECT_TOPIC_COUNTS_G6)) {
      assert(counts[topicId] === exp, `Topic ${topicId}: expected ${exp}, got ${counts[topicId]}`);
    }
    return `Total=38 (A=10, B=4, C=7, D=5, E=9, F=3)`;
  });

  test('P25-05', 'Trusted Official Text Snapshot, studentFriendlyText, and no TB in G6-A-09 officialText (Blocker 1.3–1.5, 7.3)', () => {
    const g6a09 = baseDataset.requirements.find(r => r.requirementId === 'G6-A-09');
    assert(g6a09, 'Missing G6-A-09');
    assert(!/\bTB\b/.test(g6a09.officialText), 'G6-A-09 officialText must not contain TB');
    assert(
      g6a09.officialText.includes('Byte, KB, MB, GB'),
      'G6-A-09 officialText must contain Byte, KB, MB, GB'
    );
    for (const r of baseDataset.requirements) {
      assert(r.studentFriendlyText && r.studentFriendlyText.length > 10, `Missing studentFriendlyText on ${r.requirementId}`);
      assert(r.reviewStatus === 'approved_official', `Invalid reviewStatus on ${r.requirementId}`);
      const trusted = validator.trustedSnapshot.requirements[r.requirementId];
      assert(trusted, `Requirement ${r.requirementId} missing from trusted snapshot`);
      assert(
        r.officialText === trusted.officialText && r.officialTextHash === trusted.officialTextHash,
        `Requirement ${r.requirementId} does not match trusted snapshot`
      );
    }
    return 'All 38 requirements match Trusted Official Snapshot with studentFriendlyText';
  });

  test('P25-06', 'Viet Hoa 2026–2027 PPCT: 16 content lessons (1–13, 15–17), NO Lesson 14, exact periods & 35-period year plan (Blocker 2, 7.4–7.6)', () => {
    assert(
      baseDataset.lessons.length === EXPECT_PPCT_LESSON_COUNT_G6,
      `Expected ${EXPECT_PPCT_LESSON_COUNT_G6} lessons, got ${baseDataset.lessons.length}`
    );
    assert(
      !baseDataset.lessons.some(l => l.lessonId === 'G6-L14' || l.lessonNumber === 14),
      'Phantom Lesson 14 must not exist in PPCT'
    );
    const l03 = baseDataset.lessons.find(l => l.lessonId === 'G6-L03');
    const l08 = baseDataset.lessons.find(l => l.lessonId === 'G6-L08');
    const l13 = baseDataset.lessons.find(l => l.lessonId === 'G6-L13');
    const l17 = baseDataset.lessons.find(l => l.lessonId === 'G6-L17');
    assert(l03.periods === 2 && l03.durationMinutes === 90, 'G6-L03 must be 2 periods / 90m');
    assert(l08.periods === 1 && l08.durationMinutes === 45, 'G6-L08 must be 1 period / 45m');
    assert(l13.periods === 1 && l13.durationMinutes === 45, 'G6-L13 must be 1 period / 45m');
    assert(l17.periods === 1 && l17.durationMinutes === 45, 'G6-L17 must be 1 period / 45m');

    const dist = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'data/curriculum/ppct-distribution-g6.json'), 'utf8')
    );
    const lessonPeriodsSum = baseDataset.lessons.reduce((s, l) => s + l.periods, 0);
    const nonLessonPeriodsSum = dist.nonLessonSessions.reduce((s, x) => s + x.periods, 0);
    assert(
      lessonPeriodsSum + nonLessonPeriodsSum === 35,
      `Expected 35 total periods (${lessonPeriodsSum} lesson + ${nonLessonPeriodsSum} review/assessment)`
    );
    return `16 content lessons (${lessonPeriodsSum} periods) + ${nonLessonPeriodsSum} review/assessment periods = 35 periods/year`;
  });

  test('P25-07', 'Source Catalog specificity & two-layer verification (Blocker 4 & 5)', () => {
    assert(baseDataset.sources.length >= 5, 'Expected >= 5 verified sources');
    for (const s of baseDataset.sources) {
      assert(!/^https?:\/\/[^/]+\/?$/i.test(s.url), `Source ${s.sourceId} uses generic root URL ${s.url}`);
      assert(s.verificationStatus === 'verified', `Source ${s.sourceId} not verified`);
      assert(s.verifiedAt && s.accessedAt && s.scopeUsed, `Source ${s.sourceId} missing verification metadata`);
    }
    return `Verified ${baseDataset.sources.length} sources with exact document URLs/Drive IDs`;
  });

  test('P25-08', 'NLS Framework vs School Mapping separation & AI prohibition in Requirement Bank (Blocker 6)', () => {
    for (const m of baseDataset.nlsMappings) {
      assert(m.frameworkSourceId === 'SRC-TT02-2025-NLS', 'NLS mapping must cite TT 02/2025 framework');
      assert(
        m.mappingSourceId === 'SRC-PHULUC3-KHBD-VIETHOA-2026',
        'NLS mapping must cite Viet Hoa Appendix III / KHBD'
      );
      assert(m.isOfficialGdpt2018Requirement === false, 'NLS mapping must not claim to be official GDPT 2018 YCCĐ');
    }
    for (const r of baseDataset.requirements) {
      for (const cId of r.competencyIds) {
        assert(!cId.startsWith('AI'), `Requirement ${r.requirementId} contains AI competency ${cId}`);
      }
    }
    return 'NLS 2-layer separation verified; 0 AI competencies in Requirement Bank';
  });

  test('P25-09', 'Golden Lesson G6-L03 fixture matches specification and is marked isFixtureOnly=true (Blocker 7.8 & 8)', () => {
    const goldenFile = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json'), 'utf8')
    );
    const l03 = goldenFile.lesson;
    assert(l03.lessonId === 'G6-L03', `Expected lessonId=G6-L03, got ${l03.lessonId}`);
    assert(l03.title === 'Thông tin trong máy tính', `Unexpected title: ${l03.title}`);
    assert(l03.topicId === 'G6-A', `Expected topicId=G6-A, got ${l03.topicId}`);
    assert(l03.periods === 2 && l03.durationMinutes === 90, 'Expected 2 periods / 90 minutes');
    assert(l03.isFixtureOnly === true && goldenFile.fixtureMetadata.isFixtureOnly === true, 'Must be marked isFixtureOnly=true');
    const expectedReqs = ['G6-A-07', 'G6-A-08', 'G6-A-09', 'G6-A-10'];
    assert(
      JSON.stringify(l03.requirementIds) === JSON.stringify(expectedReqs),
      `Expected requirements ${expectedReqs.join(',')}`
    );
    return 'G6-L03 fixture verified (2 periods, 90m, G6-A-07..10, isFixtureOnly=true)';
  });

  // ------------------------------------------------------------------------
  // GROUP 3: MANDATORY VALIDATOR FIXTURES & CONTENT QUALITY NEGATIVE TESTS
  // ------------------------------------------------------------------------
  test('P25-10', 'Fixture 1: Valid Grade 6 dataset -> PASS (0 errors across 94 entities)', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'valid-grade6.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === true && res.errorCount === 0, `Expected PASS but got errors: ${JSON.stringify(res.errors)}`);
    return `PASS with 0 errors across 94 entities`;
  });

  test('P25-11', 'Fixture 2: Duplicate ID -> FAIL with code DUPLICATE_ID', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'duplicate-id.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Duplicate ID fixture to FAIL');
    const dupErrors = res.errors.filter(e => e.code === 'DUPLICATE_ID');
    assert(dupErrors.length >= 2, `Expected >=2 DUPLICATE_ID errors, got ${dupErrors.length}`);
    return `FAIL as expected (${dupErrors.map(e => e.id).join(', ')})`;
  });

  test('P25-12', 'Fixture 3: Missing RequirementID on published Lesson -> FAIL with PUBLISHED_LESSON_MISSING_REQUIREMENT', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'missing-requirement-id.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Missing RequirementID fixture to FAIL');
    const hasLessonErr = res.errors.some(e => e.code === 'PUBLISHED_LESSON_MISSING_REQUIREMENT');
    assert(hasLessonErr, `Expected PUBLISHED_LESSON_MISSING_REQUIREMENT`);
    return 'FAIL as expected (PUBLISHED_LESSON_MISSING_REQUIREMENT)';
  });

  test('P25-13', 'Fixture 4: Dangling reference -> FAIL with DANGLING_REFERENCE', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'dangling-reference.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Dangling reference fixture to FAIL');
    const danglingErrors = res.errors.filter(e => e.code === 'DANGLING_REFERENCE');
    assert(danglingErrors.length >= 3, `Expected >=3 DANGLING_REFERENCE errors, got ${danglingErrors.length}`);
    return `FAIL as expected (${danglingErrors.length} dangling references caught)`;
  });

  test('P25-14', 'Fixture 5: Unapproved AI mapping & Unauthorized AI in Requirement Bank -> FAIL', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'unapproved-ai-mapping.fixture.json'), 'utf8')
    );
    fixture.requirements[0].competencyIds.push('AI-COMP-01');
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Unapproved AI fixture to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(codes.includes('UNAPPROVED_AI_MAPPING'), 'Missing UNAPPROVED_AI_MAPPING');
    assert(codes.includes('UNAUTHORIZED_AI_IN_REQUIREMENT_BANK'), 'Missing UNAUTHORIZED_AI_IN_REQUIREMENT_BANK');
    return 'FAIL as expected (UNAPPROVED_AI_MAPPING & UNAUTHORIZED_AI_IN_REQUIREMENT_BANK)';
  });

  test('P25-15', 'Fixture 6: Invalid question (missing requirementId, correctAnswer, explanation) -> FAIL', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'invalid-question.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Invalid question fixture to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(codes.includes('QUESTION_MISSING_REQUIREMENT'), 'Missing QUESTION_MISSING_REQUIREMENT');
    assert(codes.includes('QUESTION_MISSING_CORRECT_ANSWER'), 'Missing QUESTION_MISSING_CORRECT_ANSWER');
    assert(codes.includes('QUESTION_MISSING_EXPLANATION'), 'Missing QUESTION_MISSING_EXPLANATION');
    return 'FAIL as expected (QUESTION_MISSING_REQUIREMENT, QUESTION_MISSING_CORRECT_ANSWER, QUESTION_MISSING_EXPLANATION)';
  });

  test('P25-16', 'Fixture 7: Unapproved Activity, Resource missing URL, and tampered officialText (even with recomputed self-hash) -> FAIL', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'policy-violations.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected policy-violations fixture to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(codes.includes('ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS'), 'Missing ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS');
    assert(codes.includes('RESOURCE_MISSING_URL'), 'Missing RESOURCE_MISSING_URL');
    assert(codes.includes('OFFICIAL_REQUIREMENT_TEXT_TAMPERED'), 'Missing OFFICIAL_REQUIREMENT_TEXT_TAMPERED');
    return 'FAIL as expected (Trusted Snapshot caught recomputed hash tampering)';
  });

  test('P25-17', 'Blocker 7 Content Quality Negative Tests (32 reqs, Phantom Lesson 14, Wrong PPCT periods, Generic Source URL, Contract Drift) -> FAIL', () => {
    const bad = clone(baseDataset);
    // 1. Remove a requirement -> triggers REQUIREMENT_COUNT_MISMATCH & TOPIC_REQUIREMENT_COUNT_MISMATCH
    bad.requirements.pop();
    // 2. Add Phantom Lesson 14 -> triggers PHANTOM_LESSON_DETECTED
    bad.lessons.push({
      ...clone(bad.lessons[0]),
      lessonId: 'G6-L14',
      lessonNumber: 14,
      title: 'Bài 14. Thực hành tổng hợp: Hoàn thiện sổ lưu niệm'
    });
    // 3. Corrupt Lesson 8 period to 2 (90m) -> triggers PPCT_PERIOD_MISMATCH
    const l08 = bad.lessons.find(l => l.lessonId === 'G6-L08');
    l08.periods = 2;
    l08.durationMinutes = 90;
    // 4. Generic homepage URL on Source -> triggers SOURCE_URL_TOO_GENERIC
    bad.sources[0].url = 'https://moet.gov.vn/';
    // 5. Drift Question schema by dropping requirementId without APPROVED_CONTRACT_CHANGE
    const driftedSchemas = clone(validator.schemas);
    driftedSchemas.question.required = driftedSchemas.question.required.filter(
      f => f !== 'requirementId'
    );

    const res = validator.validateDataset(bad, { schemasOverride: driftedSchemas });
    assert(res.valid === false, 'Expected negative content quality dataset to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(codes.includes('REQUIREMENT_COUNT_MISMATCH'), 'Missing REQUIREMENT_COUNT_MISMATCH');
    assert(codes.includes('TOPIC_REQUIREMENT_COUNT_MISMATCH'), 'Missing TOPIC_REQUIREMENT_COUNT_MISMATCH');
    assert(codes.includes('PHANTOM_LESSON_DETECTED'), 'Missing PHANTOM_LESSON_DETECTED');
    assert(codes.includes('PPCT_PERIOD_MISMATCH'), 'Missing PPCT_PERIOD_MISMATCH');
    assert(codes.includes('SOURCE_URL_TOO_GENERIC'), 'Missing SOURCE_URL_TOO_GENERIC');
    assert(codes.includes('CONTRACT_DRIFT_DETECTED'), 'Missing CONTRACT_DRIFT_DETECTED');
    return 'Caught all 6 domain/contract violations (REQUIREMENT_COUNT_MISMATCH, TOPIC_REQUIREMENT_COUNT_MISMATCH, PHANTOM_LESSON_DETECTED, PPCT_PERIOD_MISMATCH, SOURCE_URL_TOO_GENERIC, CONTRACT_DRIFT_DETECTED)';
  });

  // ------------------------------------------------------------------------
  // GROUP 4: IDEMPOTENT IMPORTER & INTERMEDIATE ADAPTER
  // ------------------------------------------------------------------------
  test('P25-18', 'Importer loads valid Grade 6 dataset (94 entities) into intermediate adapter and writes staging snapshot', () => {
    const adapter = new IntermediateCurriculumAdapter({ snapshotPath: STAGING_SNAPSHOT_PATH });
    const importer = new CurriculumImporter({ validator, adapter });

    const run1 = importer.importDataset(baseDataset, { traceId: 'TRACE-P25-RUN-1' });
    assert(run1.imported === true, `Expected import success, got: ${run1.error}`);
    assert(run1.stats.totalInserted === 94, `Expected 94 inserted records, got ${run1.stats.totalInserted}`);
    assert(run1.stats.totalUpdated === 0, 'Expected 0 updated on first run');
    assert(run1.stats.totalUnchanged === 0, 'Expected 0 unchanged on first run');
    assert(run1.stats.duplicatesCreated === 0, 'Expected 0 duplicatesCreated');
    assert(fs.existsSync(STAGING_SNAPSHOT_PATH), 'Staging snapshot file was not created');
    return `Run 1: inserted=${run1.stats.totalInserted}, totalInAdapter=${run1.stats.totalInAdapter}`;
  });

  test('P25-19', 'Importer idempotency: retrying identical dataset N times creates 0 duplicates and 0 new writes', () => {
    const adapter = new IntermediateCurriculumAdapter({
      snapshotPath: STAGING_SNAPSHOT_PATH,
      autoload: true
    });
    const importer = new CurriculumImporter({ validator, adapter });

    const run2 = importer.importDataset(baseDataset, { traceId: 'TRACE-P25-RUN-2' });
    const run3 = importer.importDataset(baseDataset, { traceId: 'TRACE-P25-RUN-3' });

    assert(run2.imported === true && run3.imported === true, 'Retry runs failed');
    assert(run2.stats.totalInserted === 0, `Run 2 inserted ${run2.stats.totalInserted} (expected 0)`);
    assert(run2.stats.totalUpdated === 0, `Run 2 updated ${run2.stats.totalUpdated} (expected 0)`);
    assert(run2.stats.totalUnchanged === 94, `Run 2 unchanged ${run2.stats.totalUnchanged} (expected 94)`);
    assert(run3.stats.totalInserted === 0 && run3.stats.totalUnchanged === 94, 'Run 3 not idempotent');
    assert(adapter.getTotalCount() === 94, `Expected total count to stay 94, got ${adapter.getTotalCount()}`);
    return 'Run 2 & Run 3: inserted=0, updated=0, unchanged=94, duplicatesCreated=0';
  });

  test('P25-20', 'Importer atomic rejection & Production isolation check', () => {
    const adapter = new IntermediateCurriculumAdapter();
    const importer = new CurriculumImporter({ validator, adapter });
    const badDataset = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'duplicate-id.fixture.json'), 'utf8')
    );

    const res = importer.importDataset(badDataset, { traceId: 'TRACE-P25-REJECT' });
    assert(res.imported === false, 'Expected invalid dataset import to be rejected');
    assert(adapter.getTotalCount() === 0, `Adapter should have 0 records, got ${adapter.getTotalCount()}`);

    const protectedFiles = [
      'index.html',
      'teacher/index.html',
      'assets/js/api-client.js',
      'assets/js/auth.js',
      'assets/js/auth-api.js',
      'assets/js/session.js',
      'assets/js/storage.js',
      'assets/js/progress-service.js',
      'assets/js/response-service.js',
      'assets/js/teacher.js',
      'assets/js/teacher-api.js',
      'assets/js/teacher-dashboard.js',
      'backend/StudentV2.gs',
      'backend/Teacher.gs',
      'data/lessons.js',
      'data/students.js',
      'data/classes.js',
      'data/grades.js',
      'data/school-levels.js'
    ];
    for (const rel of protectedFiles) {
      const full = path.join(REPO_ROOT, rel);
      assert(fs.existsSync(full), `Protected file missing: ${rel}`);
    }
    return `Rejected invalid dataset with 0 partial writes; ${protectedFiles.length} production files intact`;
  });

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runSuite();
}

module.exports = { runSuite };
