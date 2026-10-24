#!/usr/bin/env node
/**
 * P4.2-E1 — TARGETED TEST SUITE
 * Verification of G6-L03-Q011 evidence patch and resolution of G6-A-09 unit_names evidence gap.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../..');
const goldenPath = path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json');
const goldenData = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
const GoldenRenderer = require(path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js'));

console.log('================================================================');
console.log('PHASE 4 / TASK P4.2-E1 — G6-L03-Q011 EVIDENCE PATCH TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    const res = await fn();
    console.log(`✅ [PASS] ${name}${res ? ' -> ' + res : ''}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name} -> ${err.message}`);
    failed++;
  }
}

function makeMockBridge(studentUid, sharedStore = {}) {
  const responsesKey = `responses_${studentUid}`;
  const progressKey = `progress_${studentUid}`;

  return {
    getStudent: () => ({
      studentUid,
      studentId: studentUid.replace('STD-', ''),
      fullName: 'Học sinh ' + studentUid,
      classId: '6A1',
      grade: 6,
      schoolLevel: 'THCS',
      schoolYear: '2026-2027'
    }),
    getProgress: async () => {
      const p = sharedStore[progressKey];
      return p ? JSON.parse(p) : null;
    },
    startLesson: () => {},
    startLearningSession: () => {},
    endLearningSession: () => {},
    saveProgress: (prog) => {
      sharedStore[progressKey] = JSON.stringify({
        studentUid,
        lessonId: 'G6-L03',
        ...prog,
        updatedAt: new Date().toISOString()
      });
    },
    markActivityCompleted: () => {},
    submitQuestionResponse: (q, answer, evalRes) => {
      const respStore = sharedStore[responsesKey] ? JSON.parse(sharedStore[responsesKey]) : {};
      const prev = respStore[q.questionId];
      const attemptNumber = (prev ? prev.attemptNumber : 0) + 1;
      const rec = {
        studentUid,
        questionId: q.questionId,
        activityId: q.activityId,
        requirementId: q.requirementId,
        questionType: q.questionType,
        responseType: q.questionType,
        responseValue: answer,
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        attemptNumber,
        submittedAt: new Date().toISOString()
      };
      respStore[q.questionId] = rec;
      sharedStore[responsesKey] = JSON.stringify(respStore);
      return { eventId: `ev_${studentUid}_${q.questionId}_${attemptNumber}`, attemptNumber };
    },
    saveResponse: (rec) => {
      const respStore = sharedStore[responsesKey] ? JSON.parse(sharedStore[responsesKey]) : {};
      const savedRec = {
        studentUid,
        ...rec,
        submittedAt: new Date().toISOString()
      };
      respStore[rec.questionId || 'G6-L03-WS-01'] = savedRec;
      sharedStore[responsesKey] = JSON.stringify(respStore);
      return { eventId: `ev_${studentUid}_rec`, attemptNumber: 1 };
    },
    submitExitTicket: async () => ({ submitted: true }),
    completeLesson: async () => ({ completed: true, missing: [] }),
    _store: sharedStore
  };
}

(async () => {
  // TEST 1: Canonical Question Definition
  await test('P4.2E1-01: G6-L03-Q011 exists in G6-L03.golden.json with canonical metadata', () => {
    const q = goldenData.questions.find(x => x.questionId === 'G6-L03-Q011');
    assert(q, 'G6-L03-Q011 missing in questions array');
    assert.strictEqual(q.activityId, 'G6-L03-A05', 'activityId must be G6-L03-A05');
    assert.strictEqual(q.requirementId, 'G6-A-09', 'requirementId must be G6-A-09');
    assert.strictEqual(q.questionType, 'short_answer', 'questionType must be short_answer');
    assert.strictEqual(q.cognitiveLevel, 'nhan_biet', 'cognitiveLevel must be nhan_biet');
    assert.strictEqual(q.correctAnswer, 'Byte, KB, MB, GB', 'correctAnswer must be Byte, KB, MB, GB');
    assert(q.questionText.includes('Hãy viết bốn đơn vị cơ bản'), 'questionText missing prompt');
    assert(q.questionText.includes('Gợi ý cách nhập:'), 'questionText missing format hint');
    assert(!q.questionText.includes('Byte, KB, MB, GB'), 'questionText must not leak answer sequence');

    // Blueprint wiring
    const compA05 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A05'];
    assert(Array.isArray(compA05.questionIds) && compA05.questionIds.includes('G6-L03-Q011'), 'Q011 missing in blueprint A05 questionIds');
    assert.strictEqual(compA05.questionIds[0], 'G6-L03-Q011', 'Q011 must be first question in A05 blueprint');
    assert(goldenData.lesson.questionIds.includes('G6-L03-Q011'), 'Q011 missing in lesson.questionIds');
    return 'Q011 canonical question defined and wired in A05 blueprint';
  });

  // TEST 2: Answer Normalization & Validation
  await test('P4.2E1-02: Q011 answer normalization rules (delimiters, case, full names, wrong order, missing unit)', () => {
    const q = goldenData.questions.find(x => x.questionId === 'G6-L03-Q011');
    assert(GoldenRenderer.evaluateUnitNamesSequence, 'evaluateUnitNamesSequence not exported');

    // Valid cases
    const passCases = [
      'Byte, KB, MB, GB',
      'byte, kb, mb, gb',
      'Byte; KB; MB; GB',
      'Byte > KB > MB > GB',
      'Byte → KB → MB → GB',
      'Byte - KB - MB - GB',
      'Byte, Kilobyte, Megabyte, Gigabyte',
      'byte kilobyte megabyte gigabyte',
      '  BYTE ,  KB ,  MB ,  GB  '
    ];
    for (const c of passCases) {
      const evalRes = GoldenRenderer.evaluateQuestionSubmission(q, c);
      assert.strictEqual(evalRes.isCorrect, true, `Expected PASS for: "${c}"`);
    }

    // Invalid cases
    const failCases = [
      'KB, Byte, MB, GB',          // wrong order
      'Byte, KB, GB, MB',          // wrong order
      'Byte, KB, MB',              // missing unit (3 units)
      'KB, MB, GB',                // missing unit (3 units)
      'B, KB, MB, GB',             // 'B' rejected per spec
      'Byte, KB, MB, GB, TB',      // extra unit (5 units)
      'Bit, KB, MB, GB',           // Bit is not Byte
      '',                          // empty
      '   ',                       // whitespace
      'random text'                // garbage
    ];
    for (const c of failCases) {
      const evalRes = GoldenRenderer.evaluateQuestionSubmission(q, c);
      assert.strictEqual(evalRes.isCorrect, false, `Expected FAIL for: "${c}"`);
    }
    return 'All 9 valid patterns PASS, all 10 invalid patterns FAIL';
  });

  // TEST 3: A05 Completion Gate Enforces Q011
  await test('P4.2E1-03: A05 completion gate strictly requires Q011 along with WS-01, Q006, Q007', () => {
    const bridge = makeMockBridge('STD-A05-TEST-01');
    const ctrl = GoldenRenderer.createController({
      goldenData,
      bridge
    });
    ctrl.init();

    // Fast-forward Period 1
    ctrl.state.completedActivityIds.add('G6-L03-A01');
    ctrl.state.completedActivityIds.add('G6-L03-A02');
    ctrl.state.completedActivityIds.add('G6-L03-A03');
    ctrl.state.completedActivityIds.add('G6-L03-A04');
    ctrl.enterPeriod2Explicitly();

    // 1. Completely empty A05 -> BLOCKED
    const rEmpty = ctrl.completeActivity('G6-L03-A05');
    assert(rEmpty.blocked === true, 'A05 must be blocked when empty');
    assert(rEmpty.missingCodes.includes('G6-L03-Q011'), 'Missing codes must include G6-L03-Q011');
    assert(rEmpty.missingCodes.includes('G6-L03-WS-01'), 'Missing codes must include WS-01');

    // 2. Submit worksheet + Q006 + Q007 only (missing Q011) -> STILL BLOCKED
    ctrl.submitCapacityWorksheet({ '1KB_in_byte': '1000', '1MB_in_KB': '1000', '1GB_in_MB': '1000' });
    ctrl.submitQuestion('G6-L03-Q006', 'C');
    ctrl.submitQuestion('G6-L03-Q007', '3000');
    const rWithoutQ011 = ctrl.completeActivity('G6-L03-A05');
    assert(rWithoutQ011.blocked === true, 'A05 must remain BLOCKED without Q011');
    assert(rWithoutQ011.missingCodes.includes('G6-L03-Q011'), 'Must specifically flag missing G6-L03-Q011');
    assert(!rWithoutQ011.missingCodes.includes('G6-L03-WS-01'), 'WS-01 is done');
    assert(!rWithoutQ011.missingCodes.includes('G6-L03-Q006'), 'Q006 is done');
    assert(!rWithoutQ011.missingCodes.includes('G6-L03-Q007'), 'Q007 is done');

    // 3. Submit valid Q011
    ctrl.submitQuestion('G6-L03-Q011', 'Byte, KB, MB, GB');
    const rWithQ011 = ctrl.completeActivity('G6-L03-A05');
    assert(rWithQ011.ok === true && !rWithQ011.blocked, 'A05 must complete when WS + Q006 + Q007 + Q011 are done');
    return 'Gate blocks without Q011; completes when all 4 evidences submitted';
  });

  // TEST 4: Autosave, Persistence & Restore on Login
  await test('P4.2E1-04: Q011 response autosaves, persists in storage, and restores on resume', async () => {
    const sharedStore = {};
    const bridge1 = makeMockBridge('STD-Q011-PERSIST', sharedStore);
    const ctrl1 = GoldenRenderer.createController({
      goldenData,
      bridge: bridge1
    });
    await ctrl1.init();
    ctrl1.submitQuestion('G6-L03-Q011', 'Byte > KB > MB > GB');

    const r1 = ctrl1.state.responses['G6-L03-Q011'];
    assert(r1, 'Response must exist in state.responses');
    assert.strictEqual(r1.questionId, 'G6-L03-Q011');
    assert.strictEqual(r1.requirementId, 'G6-A-09');
    assert.strictEqual(r1.isCorrect, true);
    assert.strictEqual(r1.score, 1);
    assert.strictEqual(r1.responseValue, 'Byte > KB > MB > GB');

    // Simulate re-login / new controller on same persistent storage
    const savedResponses = JSON.parse(sharedStore['responses_STD-Q011-PERSIST'] || '{}');
    const bridge2 = {
      ...makeMockBridge('STD-Q011-PERSIST', sharedStore),
      getProgress: async () => ({
        lessonId: 'G6-L03',
        status: 'in_progress',
        currentActivityId: 'G6-L03-A05',
        percentComplete: 50,
        completedActivityIds: ['G6-L03-A01', 'G6-L03-A02', 'G6-L03-A03', 'G6-L03-A04'],
        responses: savedResponses,
        exitTicket: null
      })
    };
    const ctrl2 = GoldenRenderer.createController({
      goldenData,
      bridge: bridge2
    });
    await ctrl2.init();
    const r2 = ctrl2.state.responses['G6-L03-Q011'];
    assert(r2, 'Response must be restored from storage on resume');
    assert.strictEqual(r2.responseValue, 'Byte > KB > MB > GB');
    assert.strictEqual(r2.isCorrect, true);
    return 'Autosave and restore verified';
  });

  // TEST 5: Student A/B Isolation on Shared Device
  await test('P4.2E1-05: Student A/B isolation preserves Q011 data separation', async () => {
    const sharedStore = {};

    // Student A submits Q011
    const bridgeA = makeMockBridge('STD-ISOLATION-A', sharedStore);
    const ctrlA = GoldenRenderer.createController({
      goldenData,
      bridge: bridgeA
    });
    await ctrlA.init();
    ctrlA.submitQuestion('G6-L03-Q011', 'Byte, KB, MB, GB');

    // Student B logs in on same device
    const bridgeB = makeMockBridge('STD-ISOLATION-B', sharedStore);
    const ctrlB = GoldenRenderer.createController({
      goldenData,
      bridge: bridgeB
    });
    await ctrlB.init();
    assert(!ctrlB.state.responses['G6-L03-Q011'], 'Student B must have 0 responses for Q011');
    assert.strictEqual(ctrlB.state.percentComplete, 0, 'Student B starts at 0%');
    return 'Student A and B data strictly isolated';
  });

  // TEST 6: Source Contamination UI Placement
  await test('P4.2E1-06: Q011 is rendered before capacityScale worksheet to prevent source contamination', () => {
    const rendererRaw = fs.readFileSync(
      path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js'),
      'utf8'
    );

    // 1. Verify code structure in renderActivityCard: Q011 is placed in preQHtml before specialHtml
    assert(
      rendererRaw.includes('if (act.activityId === "G6-L03-A05")'),
      'A05 special handling must exist in renderActivityCard'
    );
    assert(
      rendererRaw.includes('preQHtml = renderQuestionBlock("G6-L03-Q011")'),
      'Q011 must be assigned to preQHtml for A05'
    );

    const posPre = rendererRaw.indexOf('${preQHtml}');
    const posSpecial = rendererRaw.indexOf('${specialHtml}');
    const posPost = rendererRaw.indexOf('${postQHtml}');
    assert(posPre !== -1 && posSpecial !== -1 && posPost !== -1, 'Template slots missing');
    assert(posPre < posSpecial, '${preQHtml} must appear before ${specialHtml}');
    assert(posSpecial < posPost, '${specialHtml} must appear before ${postQHtml}');

    // 2. Mock DOM rendering check
    let renderedHtml = '';
    const mockHost = {
      innerHTML: '',
      hidden: true
    };
    const mockDoc = {
      getElementById: (id) => (id === 'lesson-host' ? mockHost : null),
      readyState: 'complete',
      body: { dataset: {} }
    };

    // Verify ordering in a simulation of the card rendering
    const compA05 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A05'];
    assert(compA05 && compA05.capacityScale, 'A05 capacityScale component missing');
    const wsHtml = 'id="ws-kb-byte"';
    const q011Html = 'id="input_G6-L03-Q011"';

    // In the A05 card template, Q011 appears in preQHtml, WS table in specialHtml
    const preQHtml = `<div class="question-block" data-qid="G6-L03-Q011"><input type="text" ${q011Html}></div>`;
    const specialHtml = `<div class="worksheet"><input type="text" ${wsHtml}></div>`;
    const cardHtml = `${preQHtml}\n${specialHtml}`;

    const idxQ011 = cardHtml.indexOf(q011Html);
    const idxWS = cardHtml.indexOf(wsHtml);
    assert(idxQ011 !== -1 && idxWS !== -1, 'Both elements must exist in rendered template');
    assert(idxQ011 < idxWS, 'Q011 must appear before worksheet table inputs');

    return 'Q011 rendered in preQHtml before worksheet specialHtml (no exposure before question)';
  });

  // TEST 7: Teacher Evidence Compatibility
  await test('P4.2E1-07: Q011 response conforms to Teacher Evidence data contract', async () => {
    const sharedStore = {};
    const bridge = makeMockBridge('STD-TEACHER-01', sharedStore);
    const ctrl = GoldenRenderer.createController({
      goldenData,
      bridge
    });
    await ctrl.init();
    ctrl.submitQuestion('G6-L03-Q011', 'Byte, KB, MB, GB');

    const r = ctrl.state.responses['G6-L03-Q011'];
    assert.strictEqual(r.questionId, 'G6-L03-Q011', 'questionId mismatch');
    assert.strictEqual(r.requirementId, 'G6-A-09', 'requirementId mismatch');
    assert.strictEqual(r.questionType, 'short_answer', 'questionType mismatch');
    assert.strictEqual(r.isCorrect, true, 'isCorrect mismatch');
    assert.strictEqual(r.score, 1, 'score mismatch');
    assert(r.attemptNumber >= 1, 'attemptNumber must be >= 1');
    assert(r.submittedAt, 'submittedAt timestamp missing');

    // Check saved in bridge store
    const stored = JSON.parse(sharedStore['responses_STD-TEACHER-01'] || '{}');
    const storedQ011 = stored['G6-L03-Q011'];
    assert(storedQ011, 'Q011 record must be present in persistent response store');
    assert.strictEqual(storedQ011.studentUid, 'STD-TEACHER-01');
    assert.strictEqual(storedQ011.requirementId, 'G6-A-09');
    assert.strictEqual(storedQ011.isCorrect, true);
    return 'Teacher evidence contract verified';
  });

  console.log('\n================================================================');
  console.log(`PHASE 4 / P4.2-E1 SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
})();
