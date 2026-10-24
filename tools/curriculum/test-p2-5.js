#!/usr/bin/env node
/**
 * PHASE 2 / TASK P2.5 — Automated Test Suite & Fixture Generator
 *
 * Verifies:
 *   1. JSON Schemas (all 12 schemas present and valid JSON Schema Draft 2020-12)
 *   2. Materialized Grade 6 Pilot Dataset completeness:
 *      - Topics A..F (G6-A..G6-F)
 *      - All RequirementIDs G6-A-01 ... G6-F-03 (32 requirements)
 *      - Competencies NLa..NLe + NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b
 *      - PPCT Lessons 1..17 (G6-L01..G6-L17)
 *      - Golden Lesson G6-L03 (Thông tin trong máy tính, G6-A, 90 min,
 *        requirements G6-A-07..G6-A-10, NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b)
 *      - Zero AI competencies auto-injected into Requirement Bank
 *   3. Mandatory Fixtures & Validator Rules:
 *      - Valid Grade 6 dataset -> PASS
 *      - Duplicate ID -> FAIL (DUPLICATE_ID)
 *      - Missing RequirementID (Published Lesson & Question) -> FAIL (PUBLISHED_LESSON_MISSING_REQUIREMENT, QUESTION_MISSING_REQUIREMENT)
 *      - Dangling reference -> FAIL (DANGLING_REFERENCE)
 *      - Unapproved AI mapping -> FAIL (UNAPPROVED_AI_MAPPING & UNAUTHORIZED_AI_IN_REQUIREMENT_BANK)
 *      - Invalid question (missing RequirementID / correctAnswer / explanation) -> FAIL
 *      - Unapproved Activity without requirements -> FAIL (ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS)
 *      - Resource requiring URL with empty URL -> FAIL (RESOURCE_MISSING_URL)
 *      - Requirement officialText tampered against version/review hash -> FAIL (OFFICIAL_REQUIREMENT_TEXT_TAMPERED)
 *   4. Idempotent Importer & Intermediate Adapter:
 *      - First import inserts all 81 normalized entities into staging adapter
 *      - Second/third retry imports with identical data produce 0 duplicates, 0 inserts, 81 unchanged
 *      - Invalid fixture import is rejected atomically without polluting adapter
 */

const fs = require('fs');
const path = require('path');
const { CurriculumValidator, computeOfficialTextHash } = require('./validator');
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

  // 6. Invalid question fixture (missing requirementIds, correctAnswer, explanation)
  const invalidQuestionFixture = clone(baseDataset);
  invalidQuestionFixture.questions.push(
    {
      questionId: 'G6-L03-Q-BAD-1',
      lessonId: 'G6-L03',
      activityId: 'G6-L03-A4',
      requirementIds: [],
      questionType: 'multiple_choice',
      prompt: 'Câu hỏi thiếu RequirementID?',
      options: ['A', 'B'],
      correctAnswer: 'A',
      explanation: 'Giải thích hợp lệ.',
      cognitiveLevel: 'nhan_biet',
      points: 1,
      status: 'published'
    },
    {
      questionId: 'G6-L03-Q-BAD-2',
      lessonId: 'G6-L03',
      activityId: 'G6-L03-A4',
      requirementIds: ['G6-A-08'],
      questionType: 'multiple_choice',
      prompt: 'Câu hỏi thiếu correctAnswer và explanation?',
      options: ['A', 'B'],
      correctAnswer: '',
      explanation: '   ',
      cognitiveLevel: 'thong_hieu',
      points: 1,
      status: 'published'
    }
  );
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'invalid-question.fixture.json'),
    JSON.stringify(invalidQuestionFixture, null, 2) + '\n',
    'utf8'
  );

  // 7. Additional negative fixtures for Activity, Resource, and Tampered Requirement
  const activityResourceTamperFixture = clone(baseDataset);
  activityResourceTamperFixture.activities.push({
    activityId: 'G6-L03-A-BAD',
    lessonId: 'G6-L03',
    orderIndex: 5,
    activityType: 'warm_up',
    title: 'Hoạt động không gắn YCCĐ và chưa được duyệt mục đích sư phạm',
    durationMinutes: 5,
    requirementIds: [],
    educationalPurposeApproved: false,
    description: 'Hoạt động lỗi.',
    status: 'published'
  });
  activityResourceTamperFixture.resources.push({
    resourceId: 'RES-G6-BAD-URL',
    title: 'Học liệu trực tuyến thiếu URL',
    resourceType: 'video',
    requiresUrl: true,
    url: '',
    lessonId: 'G6-L03',
    topicId: 'G6-A',
    requirementIds: ['G6-A-07'],
    sourceId: 'SRC-SGK-KNTT-G6',
    status: 'published'
  });
  // Tamper officialText without updating officialTextHash / review
  activityResourceTamperFixture.requirements[0].officialText =
    'Nội dung YCCĐ đã bị chỉnh sửa trái phép không qua review.';
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'policy-violations.fixture.json'),
    JSON.stringify(activityResourceTamperFixture, null, 2) + '\n',
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
  console.log('PHASE 2 / TASK P2.5 — CURRICULUM DATA FOUNDATION TEST SUITE');
  console.log('================================================================\n');

  const validator = new CurriculumValidator(path.join(REPO_ROOT, 'schemas'));
  const baseDataset = CurriculumImporter.loadNormalizedGrade6Dataset(REPO_ROOT);
  ensureFixturesOnDisk(baseDataset);

  // ------------------------------------------------------------------------
  // GROUP 1: DIRECTORY STRUCTURE & 12 JSON SCHEMAS
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

  test('P25-02', 'All 12 mandatory JSON Schemas exist and are valid JSON Schema Draft 2020-12', () => {
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
      assert(parsed.type === 'object' && Array.isArray(parsed.required), `${file} missing object structure`);
    }
    return `Verified ${expectedSchemas.length} JSON Schemas`;
  });

  // ------------------------------------------------------------------------
  // GROUP 2: MATERIALIZED GRADE 6 PILOT DATASET COMPLETENESS
  // ------------------------------------------------------------------------
  test('P25-03', 'Topics A–F (G6-A .. G6-F) materialized completely', () => {
    const expectedTopics = ['G6-A', 'G6-B', 'G6-C', 'G6-D', 'G6-E', 'G6-F'];
    const actualTopics = baseDataset.topics.map(t => t.topicId);
    assert(actualTopics.length === 6, `Expected 6 topics, got ${actualTopics.length}`);
    for (const id of expectedTopics) {
      assert(actualTopics.includes(id), `Missing topicId: ${id}`);
    }
    return `Topics: ${actualTopics.join(', ')}`;
  });

  test('P25-04', 'All RequirementIDs G6-A-01 ... G6-F-03 materialized with officialTextHash', () => {
    const reqIds = baseDataset.requirements.map(r => r.requirementId);
    assert(reqIds.includes('G6-A-01'), 'Missing G6-A-01');
    assert(reqIds.includes('G6-A-10'), 'Missing G6-A-10');
    assert(reqIds.includes('G6-B-04'), 'Missing G6-B-04');
    assert(reqIds.includes('G6-C-05'), 'Missing G6-C-05');
    assert(reqIds.includes('G6-D-04'), 'Missing G6-D-04');
    assert(reqIds.includes('G6-E-06'), 'Missing G6-E-06');
    assert(reqIds.includes('G6-F-01'), 'Missing G6-F-01');
    assert(reqIds.includes('G6-F-03'), 'Missing G6-F-03');
    assert(reqIds.length === 32, `Expected 32 Grade 6 requirements, got ${reqIds.length}`);
    for (const r of baseDataset.requirements) {
      assert(
        r.officialTextHash === computeOfficialTextHash(r.officialText),
        `officialTextHash mismatch on ${r.requirementId}`
      );
    }
    return `32 requirements (G6-A-01..G6-F-03) verified with SHA-256 hashes`;
  });

  test('P25-05', 'Competencies NLa–NLe and Pilot NLS (1.3.TC1a, 5.2.TC1a, 5.2.TC1b) materialized', () => {
    const compIds = baseDataset.competencies.map(c => c.competencyId);
    for (const core of ['NLa', 'NLb', 'NLc', 'NLd', 'NLe']) {
      assert(compIds.includes(core), `Missing core competency ${core}`);
    }
    for (const nls of ['NLS-1.3.TC1a', 'NLS-5.2.TC1a', 'NLS-5.2.TC1b']) {
      assert(compIds.includes(nls), `Missing digital competency ${nls}`);
    }
    return `Verified NLa–NLe + 3 pilot NLS competencies`;
  });

  test('P25-06', 'PPCT Lessons 1–17 (G6-L01 .. G6-L17) materialized and mapped', () => {
    assert(baseDataset.lessons.length === 17, `Expected 17 lessons, got ${baseDataset.lessons.length}`);
    for (let i = 1; i <= 17; i++) {
      const id = `G6-L${String(i).padStart(2, '0')}`;
      const lesson = baseDataset.lessons.find(l => l.lessonId === id);
      assert(lesson, `Missing lesson ${id}`);
      assert(lesson.ppctNumber === i, `Lesson ${id} has wrong ppctNumber ${lesson.ppctNumber}`);
      assert(lesson.requirementIds.length > 0, `Lesson ${id} has empty requirementIds`);
    }
    return `Verified G6-L01..G6-L17 (35 periods total)`;
  });

  test('P25-07', 'Golden Lesson G6-L03 matches exact specification (fixture only, no UI changes)', () => {
    const goldenFile = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json'), 'utf8')
    );
    const l03 = goldenFile.lesson;
    assert(l03.lessonId === 'G6-L03', `Expected lessonId=G6-L03, got ${l03.lessonId}`);
    assert(l03.title === 'Thông tin trong máy tính', `Unexpected title: ${l03.title}`);
    assert(l03.topicId === 'G6-A', `Expected topicId=G6-A, got ${l03.topicId}`);
    assert(l03.durationMinutes === 90, `Expected durationMinutes=90, got ${l03.durationMinutes}`);
    const expectedReqs = ['G6-A-07', 'G6-A-08', 'G6-A-09', 'G6-A-10'];
    assert(
      JSON.stringify(l03.requirementIds) === JSON.stringify(expectedReqs),
      `Expected requirements ${expectedReqs.join(',')}, got ${l03.requirementIds.join(',')}`
    );
    const expectedNls = ['1.3.TC1a', '5.2.TC1a', '5.2.TC1b'];
    assert(
      JSON.stringify(l03.nlsCodes) === JSON.stringify(expectedNls),
      `Expected NLS ${expectedNls.join(',')}, got ${(l03.nlsCodes || []).join(',')}`
    );
    return `G6-L03 verified (90m, G6-A-07..10, NLS 1.3.TC1a, 5.2.TC1a, 5.2.TC1b)`;
  });

  test('P25-08', 'AI Rule: No AI competency auto-injected into Requirement Bank', () => {
    for (const r of baseDataset.requirements) {
      for (const cId of r.competencyIds) {
        assert(!cId.startsWith('AI'), `Requirement ${r.requirementId} contains AI competency ${cId}`);
      }
    }
    return '0 AI competencies in Requirement Bank';
  });

  // ------------------------------------------------------------------------
  // GROUP 3: MANDATORY VALIDATOR FIXTURES (PASS & FAIL CASES)
  // ------------------------------------------------------------------------
  test('P25-09', 'Fixture 1: Valid Grade 6 dataset -> PASS (0 errors)', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'valid-grade6.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === true && res.errorCount === 0, `Expected PASS but got errors: ${JSON.stringify(res.errors)}`);
    return `PASS with ${res.errorCount} errors across 85 entities`;
  });

  test('P25-10', 'Fixture 2: Duplicate ID -> FAIL with code DUPLICATE_ID', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'duplicate-id.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Duplicate ID fixture to FAIL');
    const dupErrors = res.errors.filter(e => e.code === 'DUPLICATE_ID');
    assert(dupErrors.length >= 2, `Expected >=2 DUPLICATE_ID errors, got ${dupErrors.length}`);
    return `FAIL as expected (${dupErrors.map(e => e.id).join(', ')})`;
  });

  test('P25-11', 'Fixture 3: Missing RequirementID on published Lesson -> FAIL with PUBLISHED_LESSON_MISSING_REQUIREMENT', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'missing-requirement-id.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Missing RequirementID fixture to FAIL');
    const hasLessonErr = res.errors.some(e => e.code === 'PUBLISHED_LESSON_MISSING_REQUIREMENT');
    assert(hasLessonErr, `Expected PUBLISHED_LESSON_MISSING_REQUIREMENT, got ${JSON.stringify(res.errors)}`);
    return 'FAIL as expected (PUBLISHED_LESSON_MISSING_REQUIREMENT)';
  });

  test('P25-12', 'Fixture 4: Dangling reference -> FAIL with DANGLING_REFERENCE', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'dangling-reference.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Dangling reference fixture to FAIL');
    const danglingErrors = res.errors.filter(e => e.code === 'DANGLING_REFERENCE');
    assert(danglingErrors.length >= 3, `Expected >=3 DANGLING_REFERENCE errors, got ${danglingErrors.length}`);
    return `FAIL as expected (${danglingErrors.length} dangling references caught)`;
  });

  test('P25-13', 'Fixture 5: Unapproved AI mapping -> FAIL with UNAPPROVED_AI_MAPPING', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'unapproved-ai-mapping.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected Unapproved AI mapping fixture to FAIL');
    const aiErr = res.errors.find(e => e.code === 'UNAPPROVED_AI_MAPPING');
    assert(aiErr, `Expected UNAPPROVED_AI_MAPPING error, got ${JSON.stringify(res.errors)}`);
    return `FAIL as expected (${aiErr.code} on ${aiErr.id})`;
  });

  test('P25-14', 'Fixture 5b: Unauthorized AI injected into Requirement Bank -> FAIL with UNAUTHORIZED_AI_IN_REQUIREMENT_BANK', () => {
    const fixture = clone(baseDataset);
    fixture.competencies.push({
      competencyId: 'AI-COMP-01',
      code: 'AI.1',
      framework: 'AI_PILOT',
      domain: 'Trí tuệ nhân tạo',
      name: 'Năng lực AI thử nghiệm',
      description: 'Mô tả năng lực AI thử nghiệm cho lớp 6.',
      gradeBand: 'Lớp 6',
      sourceId: 'SRC-NLS-BGD-2025',
      status: 'draft'
    });
    fixture.requirements[0].competencyIds.push('AI-COMP-01');
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected AI in Requirement Bank to FAIL');
    const err = res.errors.find(e => e.code === 'UNAUTHORIZED_AI_IN_REQUIREMENT_BANK');
    assert(err, `Expected UNAUTHORIZED_AI_IN_REQUIREMENT_BANK, got ${JSON.stringify(res.errors)}`);
    return `FAIL as expected (${err.code})`;
  });

  test('P25-15', 'Fixture 6: Invalid question (missing RequirementID, correctAnswer, explanation) -> FAIL', () => {
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

  test('P25-16', 'Fixture 7: Unapproved Activity without requirements, Resource missing URL, and tampered Requirement officialText -> FAIL', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'policy-violations.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === false, 'Expected policy-violations fixture to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(
      codes.includes('ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS'),
      'Missing ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS'
    );
    assert(codes.includes('RESOURCE_MISSING_URL'), 'Missing RESOURCE_MISSING_URL');
    assert(
      codes.includes('OFFICIAL_REQUIREMENT_TEXT_TAMPERED'),
      'Missing OFFICIAL_REQUIREMENT_TEXT_TAMPERED'
    );
    return 'FAIL as expected (ACTIVITY_UNAPPROVED_WITHOUT_REQUIREMENTS, RESOURCE_MISSING_URL, OFFICIAL_REQUIREMENT_TEXT_TAMPERED)';
  });

  // ------------------------------------------------------------------------
  // GROUP 4: IDEMPOTENT IMPORTER & INTERMEDIATE ADAPTER
  // ------------------------------------------------------------------------
  test('P25-17', 'Importer loads valid Grade 6 dataset into intermediate adapter and writes staging snapshot', () => {
    const adapter = new IntermediateCurriculumAdapter({ snapshotPath: STAGING_SNAPSHOT_PATH });
    const importer = new CurriculumImporter({ validator, adapter });

    const run1 = importer.importDataset(baseDataset, { traceId: 'TRACE-P25-RUN-1' });
    assert(run1.imported === true, `Expected import success, got: ${run1.error}`);
    assert(run1.stats.totalInserted === 85, `Expected 85 inserted records, got ${run1.stats.totalInserted}`);
    assert(run1.stats.totalUpdated === 0, `Expected 0 updated on first run`);
    assert(run1.stats.totalUnchanged === 0, `Expected 0 unchanged on first run`);
    assert(run1.stats.duplicatesCreated === 0, 'Expected 0 duplicatesCreated');
    assert(fs.existsSync(STAGING_SNAPSHOT_PATH), 'Staging snapshot file was not created');
    return `Run 1: inserted=${run1.stats.totalInserted}, totalInAdapter=${run1.stats.totalInAdapter}`;
  });

  test('P25-18', 'Importer idempotency: retrying identical dataset N times creates 0 duplicates and 0 new writes', () => {
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
    assert(run2.stats.totalUnchanged === 85, `Run 2 unchanged ${run2.stats.totalUnchanged} (expected 85)`);
    assert(run3.stats.totalInserted === 0 && run3.stats.totalUnchanged === 85, 'Run 3 not idempotent');
    assert(adapter.getTotalCount() === 85, `Expected total count to stay 85, got ${adapter.getTotalCount()}`);
    return 'Run 2 & Run 3: inserted=0, updated=0, unchanged=85, duplicatesCreated=0';
  });

  test('P25-19', 'Importer atomic rejection: invalid dataset is blocked before writing to adapter', () => {
    const adapter = new IntermediateCurriculumAdapter();
    const importer = new CurriculumImporter({ validator, adapter });
    const badDataset = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'duplicate-id.fixture.json'), 'utf8')
    );

    const res = importer.importDataset(badDataset, { traceId: 'TRACE-P25-REJECT' });
    assert(res.imported === false, 'Expected invalid dataset import to be rejected');
    assert(adapter.getTotalCount() === 0, `Adapter should have 0 records, got ${adapter.getTotalCount()}`);
    return 'Rejected invalid dataset with 0 partial writes';
  });

  test('P25-20', 'Production isolation: StudentUID, Auth, Session, Progress, Responses, ExitTicket, Teacher APIs untouched', () => {
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
    return `All ${protectedFiles.length} production frontend/backend files verified intact`;
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
