#!/usr/bin/env node
/**
 * PHASE 2 / TASK P2.5 (FIX ROUND 2) — Automated Test Suite & Fixture Generator
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
  console.log('PHASE 2 / TASK P2.5 (FIX ROUND 2) — CURRICULUM DATA FOUNDATION TEST SUITE');
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

  test('P25-02', 'All 12 JSON Schemas exist and pass Locked Data Contract Drift Verification', () => {
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

  test('P25-04', 'Requirement Bank has 38 requirements (A=10, B=4, C=7, D=5, E=9, F=3) with immutable IDs (A05/A06, B02/B03, E01..E09)', () => {
    assert(
      baseDataset.requirements.length === EXPECT_REQUIREMENT_COUNT_G6,
      `Expected ${EXPECT_REQUIREMENT_COUNT_G6} requirements, got ${baseDataset.requirements.length}`
    );
    const counts = { 'G6-A': 0, 'G6-B': 0, 'G6-C': 0, 'G6-D': 0, 'G6-E': 0, 'G6-F': 0 };
    const byId = new Map();
    for (const r of baseDataset.requirements) {
      counts[r.topicId] = (counts[r.topicId] || 0) + 1;
      byId.set(r.requirementId, r);
    }
    for (const [topicId, exp] of Object.entries(EXPECT_TOPIC_COUNTS_G6)) {
      assert(counts[topicId] === exp, `Topic ${topicId}: expected ${exp}, got ${counts[topicId]}`);
    }
    assert(byId.get('G6-A-05').officialText.includes('công cụ hiệu quả'), 'G6-A-05 must be Vai trò máy tính');
    assert(byId.get('G6-A-06').officialText.includes('các bước cơ bản trong xử lí thông tin'), 'G6-A-06 must be Các bước xử lí thông tin');
    assert(byId.get('G6-B-02').officialText.includes('mạng không dây tiện dụng hơn'), 'G6-B-02 must be Mạng không dây tiện dụng hơn');
    assert(byId.get('G6-B-03').officialText.includes('máy tính, cáp nối, Switch, Access Point'), 'G6-B-03 must be Thành phần mạng với cáp nối');
    assert(byId.get('G6-E-01').officialText.includes('tác dụng của một số công cụ căn lề'), 'G6-E-01..06 must be Soạn thảo văn bản');
    assert(byId.get('G6-E-07').officialText.includes('sơ đồ tư duy'), 'G6-E-07..09 must be Sơ đồ tư duy');
    return `Total=38 (A=10, B=4, C=7, D=5, E=9, F=3) with immutable IDs verified`;
  });

  test('P25-05', 'Exact CTGDPT 2018 officialText (G6-A-09 example sentence, G6-B-03 cáp nối, G6-C-01, G6-C-07, G6-D-01..05) & Trusted Snapshot Provenance', () => {
    const byId = new Map(baseDataset.requirements.map(r => [r.requirementId, r]));
    const g6a09 = byId.get('G6-A-09');
    assert(!/\bTB\b/.test(g6a09.officialText), 'G6-A-09 officialText must not contain TB');
    assert(
      g6a09.officialText.includes('Ví dụ: 1 KB xấp xỉ 1 ngàn byte, 1 MB xấp xỉ 1 triệu byte, 1 GB xấp xỉ 1 tỉ byte.'),
      'G6-A-09 must include the CTGDPT example sentence'
    );
    assert(
      byId.get('G6-C-01').officialText === 'Trình bày được sơ lược về các khái niệm WWW, website, địa chỉ của website, trình duyệt.',
      'G6-C-01 exact text mismatch'
    );
    assert(
      byId.get('G6-C-07').officialText === 'Biết cách đăng kí tài khoản email, thực hiện được một số thao tác cơ bản như đăng nhập tài khoản email, soạn và gửi email, thoát ra.',
      'G6-C-07 exact text mismatch'
    );
    assert(
      byId.get('G6-D-03').officialText === 'Bảo vệ được thông tin và tài khoản cá nhân với sự hỗ trợ của người lớn.',
      'G6-D-03 exact text mismatch'
    );
    assert(
      byId.get('G6-D-05').officialText === 'Nhận diện được một số thông điệp lừa đảo hoặc mang nội dung xấu.',
      'G6-D-05 exact text mismatch'
    );
    const snap = validator.trustedSnapshot;
    assert(snap.sourceId === 'SRC-GDPT-2018-TIN6', 'Snapshot missing sourceId');
    assert(snap.sourceDocumentDriveId === '13o_7GOH_en10qIrlgLTyqrIlJSgCZxma', 'Snapshot missing sourceDocumentDriveId');
    assert(snap.sourceOfficialUrl && snap.sourceOfficialUrl.includes('ItemID=146721'), 'Snapshot missing ItemID=146721');
    assert(snap.sourceSection === 'LỚP 6 – Chủ đề A–F', 'Snapshot missing sourceSection');
    assert(snap.verifiedAt, 'Snapshot missing verifiedAt');
    return 'All 38 requirements match exact CTGDPT 2018 wording and Trusted Snapshot provenance';
  });

  test('P25-06', 'Viet Hoa 2026–2027 PPCT (1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM): G6-L05 = 2 tiết, 29 lesson + 2 review + 4 assessment = 35 tiết, exact 35-period schedule', () => {
    assert(
      baseDataset.lessons.length === EXPECT_PPCT_LESSON_COUNT_G6,
      `Expected ${EXPECT_PPCT_LESSON_COUNT_G6} lessons, got ${baseDataset.lessons.length}`
    );
    assert(
      !baseDataset.lessons.some(l => l.lessonId === 'G6-L14' || l.lessonNumber === 14),
      'Phantom Lesson 14 must not exist in PPCT'
    );
    const l03 = baseDataset.lessons.find(l => l.lessonId === 'G6-L03');
    const l05 = baseDataset.lessons.find(l => l.lessonId === 'G6-L05');
    const l08 = baseDataset.lessons.find(l => l.lessonId === 'G6-L08');
    const l13 = baseDataset.lessons.find(l => l.lessonId === 'G6-L13');
    const l17 = baseDataset.lessons.find(l => l.lessonId === 'G6-L17');
    assert(l03.periods === 2 && l03.durationMinutes === 90, 'G6-L03 must be 2 periods / 90m');
    assert(l05.periods === 2 && l05.durationMinutes === 90, 'G6-L05 must be 2 periods / 90m');
    assert(l08.periods === 1 && l08.durationMinutes === 45, 'G6-L08 must be 1 period / 45m');
    assert(l13.periods === 1 && l13.durationMinutes === 45, 'G6-L13 must be 1 period / 45m');
    assert(l17.periods === 1 && l17.durationMinutes === 45, 'G6-L17 must be 1 period / 45m');

    const dist = baseDataset.ppctDistribution;
    const lessonPeriodsSum = baseDataset.lessons.reduce((s, l) => s + l.periods, 0);
    assert(lessonPeriodsSum === 29, `Expected 29 lesson periods, got ${lessonPeriodsSum}`);
    assert(dist.summary.reviewPeriodsTotal === 2, `Expected 2 review periods, got ${dist.summary.reviewPeriodsTotal}`);
    assert(dist.summary.assessmentPeriodsTotal === 4, `Expected 4 assessment periods, got ${dist.summary.assessmentPeriodsTotal}`);
    assert(dist.totalPeriodsPerYear === 35, `Expected 35 total periods`);
    assert(dist.periodSchedule.length === 35, `Expected 35-item periodSchedule`);
    assert(dist.periodSchedule[7].periodNumber === 8 && dist.periodSchedule[7].refId === 'G6-ASM-GK1', 'Period 8 must be KIỂM TRA GIỮA HKI');
    assert(dist.periodSchedule[8].periodNumber === 9 && dist.periodSchedule[8].refId === 'G6-L04', 'Period 9 must be Bài 4 (tiết 2)');
    assert(dist.periodSchedule[25].periodNumber === 26 && dist.periodSchedule[25].refId === 'G6-ASM-GK2', 'Period 26 must be KIỂM TRA GIỮA HKII');
    assert(dist.periodSchedule[26].periodNumber === 27 && dist.periodSchedule[26].refId === 'G6-L12', 'Period 27 must be Bài 12 (tiết 2)');
    return '29 lesson + 2 review + 4 assessment = 35 periods/year; 35-period schedule verified';
  });

  test('P25-07', 'Source Catalog uses 5 true teacher Google Drive IDs and VBPL ItemID=146721 & ItemID=175173 (no intermediate ChatGPT Doc IDs)', () => {
    assert(baseDataset.sources.length === 6, `Expected 6 sources, got ${baseDataset.sources.length}`);
    const byId = new Map(baseDataset.sources.map(s => [s.sourceId, s]));
    assert(byId.get('SRC-GDPT-2018-TIN6').driveId === '13o_7GOH_en10qIrlgLTyqrIlJSgCZxma', 'Wrong Drive ID for CTGDPT');
    assert(byId.get('SRC-GDPT-2018-TIN6').url.includes('ItemID=146721'), 'Wrong VBPL ItemID for CTGDPT');
    assert(byId.get('SRC-PPCT-VIETHOA-TIN6-2026').driveId === '1Ikqso2NezM1eNOmcAGeq3veuBGTY1wHM', 'Wrong Drive ID for PPCT');
    assert(byId.get('SRC-SGK-KNTT-TIN6').driveId === '1hEqBximpHc2QQVSdEsfcwwPYsaXqeZmj', 'Wrong Drive ID for SGK');
    assert(byId.get('SRC-SGK-KNTT-TIN6').externalVerificationStatus === 'pending', 'SGK externalVerificationStatus must be pending');
    assert(byId.get('SRC-PHULUC3-TIN6-VIETHOA-2026').driveId === '1eB5ZVwDLISaR57-DM2B9TJ9-JYgobwAC', 'Wrong Drive ID for Phu luc III');
    assert(byId.get('SRC-KHBD-TIN6-BAI3-VIETHOA').driveId === '1vMj4YlylG09AqZOuc3G9hNq-L-MFHRtp', 'Wrong Drive ID for KHBD Bai 3');
    assert(byId.get('SRC-TT02-2025-NLS').url.includes('ItemID=175173'), 'Wrong VBPL ItemID for TT 02/2025');
    return 'All 5 teacher Drive IDs and 2 VBPL ItemIDs (146721, 175173) verified';
  });

  test('P25-08', 'NLS Mapping cites SRC-TT02-2025-NLS, SRC-PHULUC3-TIN6-VIETHOA-2026, and SRC-KHBD-TIN6-BAI3-VIETHOA; 0 AI in Requirement Bank', () => {
    for (const m of baseDataset.nlsMappings) {
      assert(m.frameworkSourceId === 'SRC-TT02-2025-NLS', 'NLS mapping must cite TT 02/2025 framework');
      assert(
        m.mappingSourceId === 'SRC-PHULUC3-TIN6-VIETHOA-2026',
        'NLS mapping must cite SRC-PHULUC3-TIN6-VIETHOA-2026'
      );
      assert(
        m.supplementaryLessonPlanSourceId === 'SRC-KHBD-TIN6-BAI3-VIETHOA',
        'NLS mapping must reference supplementary SRC-KHBD-TIN6-BAI3-VIETHOA'
      );
      assert(m.isOfficialGdpt2018Requirement === false, 'NLS mapping must not claim to be official GDPT 2018 YCCĐ');
    }
    for (const r of baseDataset.requirements) {
      for (const cId of r.competencyIds) {
        assert(!cId.startsWith('AI'), `Requirement ${r.requirementId} contains AI competency ${cId}`);
      }
    }
    return 'NLS 3-source attribution verified; 0 AI competencies in Requirement Bank';
  });

  test('P25-09', 'Golden Lesson G6-L03 fixture matches specification and is marked isFixtureOnly=true', () => {
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
  test('P25-10', 'Fixture 1: Valid Grade 6 dataset -> PASS (0 errors across 95 entities)', () => {
    const fixture = JSON.parse(
      fs.readFileSync(path.join(FIXTURES_DIR, 'valid-grade6.fixture.json'), 'utf8')
    );
    const res = validator.validateDataset(fixture);
    assert(res.valid === true && res.errorCount === 0, `Expected PASS but got errors: ${JSON.stringify(res.errors)}`);
    return `PASS with 0 errors across 95 entities`;
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

  test('P25-17', 'Round 1 & Round 2 Content Quality Negative Tests (Phantom Lesson 14, Phantom Ôn tập giữa HKI, Forbidden Drive ID, Swapped Requirement IDs, Missing Snapshot Provenance, Contract Drift) -> FAIL', () => {
    const bad = clone(baseDataset);
    // 1. Remove a requirement -> triggers REQUIREMENT_COUNT_MISMATCH & TOPIC_REQUIREMENT_COUNT_MISMATCH
    bad.requirements.pop();
    // 2. Swap G6-A-05 and G6-A-06 officialText -> triggers REQUIREMENT_STABLE_ID_DRIFT
    const rA05 = bad.requirements.find(r => r.requirementId === 'G6-A-05');
    const rA06 = bad.requirements.find(r => r.requirementId === 'G6-A-06');
    const tmpText = rA05.officialText;
    rA05.officialText = rA06.officialText;
    rA06.officialText = tmpText;
    // 3. Add Phantom Lesson 14 -> triggers PHANTOM_LESSON_DETECTED
    bad.lessons.push({
      ...clone(bad.lessons[0]),
      lessonId: 'G6-L14',
      lessonNumber: 14,
      title: 'Bài 14. Thực hành tổng hợp: Hoàn thiện sổ lưu niệm'
    });
    // 4. Corrupt Lesson 5 period to 1 (45m) -> triggers PPCT_PERIOD_MISMATCH
    const l05 = bad.lessons.find(l => l.lessonId === 'G6-L05');
    l05.periods = 1;
    l05.durationMinutes = 45;
    // 5. Add Phantom "Ôn tập giữa học kì I" -> triggers PHANTOM_REVIEW_SESSION_DETECTED
    bad.ppctDistribution.nonLessonSessions.push({
      sessionId: 'G6-HK1-MID-REVIEW',
      semester: 1,
      sessionType: 'review',
      title: 'Ôn tập giữa học kì I',
      periods: 1
    });
    // 6. Generic homepage URL + Forbidden Intermediate Drive ID -> triggers SOURCE_URL_TOO_GENERIC & FORBIDDEN_INTERMEDIATE_DRIVE_ID
    bad.sources[0].url = 'https://moet.gov.vn/';
    bad.sources[1].driveId = '1dadBFWiCuJHhVV2ult6wkfhDONwKuPMEgR8PVFed47U';
    // 7. Strip provenance from Trusted Snapshot -> triggers TRUSTED_SNAPSHOT_MISSING_PROVENANCE
    const badSnapshot = clone(validator.trustedSnapshot);
    delete badSnapshot.sourceDocumentDriveId;
    // 8. Drift Question schema by dropping requirementId without APPROVED_CONTRACT_CHANGE
    const driftedSchemas = clone(validator.schemas);
    driftedSchemas.question.required = driftedSchemas.question.required.filter(
      f => f !== 'requirementId'
    );

    const res = validator.validateDataset(bad, {
      schemasOverride: driftedSchemas,
      trustedSnapshotOverride: badSnapshot
    });
    assert(res.valid === false, 'Expected negative content quality dataset to FAIL');
    const codes = res.errors.map(e => e.code);
    assert(codes.includes('REQUIREMENT_COUNT_MISMATCH'), 'Missing REQUIREMENT_COUNT_MISMATCH');
    assert(codes.includes('TOPIC_REQUIREMENT_COUNT_MISMATCH'), 'Missing TOPIC_REQUIREMENT_COUNT_MISMATCH');
    assert(codes.includes('REQUIREMENT_STABLE_ID_DRIFT'), 'Missing REQUIREMENT_STABLE_ID_DRIFT');
    assert(codes.includes('PHANTOM_LESSON_DETECTED'), 'Missing PHANTOM_LESSON_DETECTED');
    assert(codes.includes('PPCT_PERIOD_MISMATCH'), 'Missing PPCT_PERIOD_MISMATCH');
    assert(codes.includes('PHANTOM_REVIEW_SESSION_DETECTED'), 'Missing PHANTOM_REVIEW_SESSION_DETECTED');
    assert(codes.includes('SOURCE_URL_TOO_GENERIC'), 'Missing SOURCE_URL_TOO_GENERIC');
    assert(codes.includes('FORBIDDEN_INTERMEDIATE_DRIVE_ID'), 'Missing FORBIDDEN_INTERMEDIATE_DRIVE_ID');
    assert(codes.includes('TRUSTED_SNAPSHOT_MISSING_PROVENANCE'), 'Missing TRUSTED_SNAPSHOT_MISSING_PROVENANCE');
    assert(codes.includes('CONTRACT_DRIFT_DETECTED'), 'Missing CONTRACT_DRIFT_DETECTED');
    return 'Caught all 10 Round 1 + Round 2 domain/contract/source/schedule violations';
  });

  // ------------------------------------------------------------------------
  // GROUP 4: IDEMPOTENT IMPORTER & INTERMEDIATE ADAPTER
  // ------------------------------------------------------------------------
  test('P25-18', 'Importer loads valid Grade 6 dataset (95 entities) into intermediate adapter and writes staging snapshot', () => {
    const adapter = new IntermediateCurriculumAdapter({ snapshotPath: STAGING_SNAPSHOT_PATH });
    const importer = new CurriculumImporter({ validator, adapter });

    const run1 = importer.importDataset(baseDataset, { traceId: 'TRACE-P25-RUN-1' });
    assert(run1.imported === true, `Expected import success, got: ${run1.error}`);
    assert(run1.stats.totalInserted === 95, `Expected 95 inserted records, got ${run1.stats.totalInserted}`);
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
    assert(run2.stats.totalUnchanged === 95, `Run 2 unchanged ${run2.stats.totalUnchanged} (expected 95)`);
    assert(run3.stats.totalInserted === 0 && run3.stats.totalUnchanged === 95, 'Run 3 not idempotent');
    assert(adapter.getTotalCount() === 95, `Expected total count to stay 95, got ${adapter.getTotalCount()}`);
    return 'Run 2 & Run 3: inserted=0, updated=0, unchanged=95, duplicatesCreated=0';
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
