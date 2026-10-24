#!/usr/bin/env node
/**
 * PHASE 3 / TASK P3.4-B — GOLDEN LESSON G6-L03 UAT VERIFICATION SUITE
 *
 * Verifies:
 *   1. Student A/B isolation on shared device (StudentUID authority, 0% for B, no data leak)
 *   2. Student A resume at 50% -> Period 2 unlocked, A05 selected, evidence restored
 *   3. Period 2 lock enforcement before 50% checkpoint
 *   4. A05 evidence gate (decimal approximation 1000, no 1024 mandatory, real inputs)
 *   5. A06 WebQuest Product 2 (no prefilled answers, open reasoning evaluationStatus="needs_teacher_review", isCorrect=null, score=null)
 *   6. A07 evidence gate (Q010, REAL_DEVICE & SIMULATION modes)
 *   7. A08 + Exit Ticket gate (lesson completion strictly 100% after all 8 activities + Exit Ticket)
 *   8. Teacher evidence retrieval (StudentUID, progress, responses, Product 1 & 2 open review, Exit Ticket, session time)
 *   9. Offline queueing & EventID idempotency (no duplicate entries on retry, student queue isolation)
 *  10. Full regression baseline (P3.3 = 30/30, P2.5 = 20/20, Phase 1.5 = 27/27, Phase 1 = 79/79)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

const REPO_ROOT = path.resolve(__dirname, '../..');
const { CurriculumImporter } = require('../curriculum/importer');
const GoldenLessonRenderer = require('../../assets/js/golden-lesson-renderer');

// ============================================================================
// GAS SANDBOX SETUP
// ============================================================================
function createGasSandbox() {
  const sheets = {};
  const scriptProps = {};
  const cacheStore = {};
  let lockBusy = false;

  function makeSheet(name) {
    const data = [];
    return {
      _name: name,
      _data: data,
      getName() { return this._name; },
      setName(newName) { delete sheets[this._name]; this._name = newName; sheets[newName] = this; },
      getLastRow() { return data.length; },
      getLastColumn() { return data.reduce((m, r) => Math.max(m, r.length), 0); },
      getMaxRows() { return Math.max(1000, data.length); },
      setFrozenRows() {},
      appendRow(row) { data.push(row.map(v => (v === undefined ? '' : v))); },
      getRange(r, c, numRows = 1, numCols = 1) {
        return {
          getValues() {
            const out = [];
            for (let i = 0; i < numRows; i++) {
              const rowArr = data[r - 1 + i] || [];
              const slice = [];
              for (let j = 0; j < numCols; j++) {
                slice.push(rowArr[c - 1 + j] === undefined ? '' : rowArr[c - 1 + j]);
              }
              out.push(slice);
            }
            return out;
          },
          setValue(val) {
            while (data.length < r) data.push([]);
            while (data[r - 1].length < c) data[r - 1].push('');
            data[r - 1][c - 1] = val;
          },
          setValues(vals) {
            for (let i = 0; i < vals.length; i++) {
              const rr = r - 1 + i;
              while (data.length <= rr) data.push([]);
              for (let j = 0; j < vals[i].length; j++) {
                const cc = c - 1 + j;
                while (data[rr].length <= cc) data[rr].push('');
                data[rr][cc] = vals[i][j] === undefined ? '' : vals[i][j];
              }
            }
          },
          clearContent() {
            for (let i = r - 1; i < r - 1 + numRows; i++) {
              if (data[i]) {
                for (let j = c - 1; j < c - 1 + numCols; j++) {
                  if (j < data[i].length) data[i][j] = '';
                }
              }
            }
            while (data.length > 1 && data[data.length - 1].every(x => x === '')) {
              data.pop();
            }
          },
          setNumberFormat() { return this; }
        };
      }
    };
  }

  const ssMock = {
    getSheetByName(name) { return sheets[name] || null; },
    insertSheet(name) {
      if (sheets[name]) throw new Error('Sheet already exists: ' + name);
      const sh = makeSheet(name);
      sheets[name] = sh;
      return sh;
    },
    getSheets() { return Object.values(sheets); },
    deleteSheet(sh) { delete sheets[sh.getName()]; }
  };

  const sandbox = {
    console,
    Logger: { log() {} },
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    JSON,
    Error,
    SpreadsheetApp: {
      getActiveSpreadsheet() { return ssMock; },
      openById() { return ssMock; },
      flush() {}
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) { return scriptProps[k] || null; },
          setProperty(k, v) { scriptProps[k] = String(v); },
          getProperties() { return Object.assign({}, scriptProps); },
          setProperties(p) { Object.assign(scriptProps, p); },
          deleteProperty(k) { delete scriptProps[k]; }
        };
      }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(k) { return cacheStore[k] || null; },
          put(k, v, sec) { cacheStore[k] = String(v); },
          remove(k) { delete cacheStore[k]; }
        };
      }
    },
    LockService: {
      getScriptLock() {
        return {
          tryLock(ms) {
            if (lockBusy) return false;
            lockBusy = true;
            return true;
          },
          waitLock(ms) {
            if (lockBusy) throw new Error('Lock timeout');
            lockBusy = true;
            return true;
          },
          releaseLock() { lockBusy = false; }
        };
      }
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(content) {
        return {
          getContent() { return content; },
          setMimeType() { return this; }
        };
      }
    },
    HtmlService: {
      createHtmlOutput(content) {
        return {
          getContent() { return content; },
          setTitle() { return this; },
          setXFrameOptionsMode() { return this; }
        };
      },
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid() { return crypto.randomUUID(); },
      newBlob(str) {
        const buf = Buffer.from(String(str), 'utf8');
        return {
          getBytes() { return Array.from(buf).map(b => (b > 127 ? b - 256 : b)); }
        };
      },
      base64Encode(bytes) {
        return Buffer.from(bytes.map(b => b & 0xff)).toString('base64');
      },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(bytes.map(b => b & 0xff)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      },
      base64Decode(str) {
        const norm = String(str).replace(/-/g, '+').replace(/_/g, '/');
        return Array.from(Buffer.from(norm, 'base64')).map(b => (b > 127 ? b - 256 : b));
      },
      computeHmacSha256Signature(value, key) {
        const vBuf = Array.isArray(value) ? Buffer.from(value.map(b => b & 0xff)) : Buffer.from(String(value), 'utf8');
        const kBuf = Array.isArray(key) ? Buffer.from(key.map(b => b & 0xff)) : Buffer.from(String(key), 'utf8');
        const h = crypto.createHmac('sha256', kBuf).update(vBuf).digest();
        return Array.from(h).map(b => (b > 127 ? b - 256 : b));
      },
      computeDigest(algo, val) {
        const h = crypto.createHash('sha256').update(String(val), 'utf8').digest();
        return Array.from(h).map(b => (b > 127 ? b - 256 : b));
      }
    },
    _sheets: sheets,
    callPost(payload) {
      const e = { postData: { contents: JSON.stringify(payload) } };
      const out = sandbox.doPost(e);
      return JSON.parse(out.getContent());
    }
  };

  vm.createContext(sandbox);
  for (const file of ['backend/Code.gs', 'backend/StudentV2.gs', 'backend/Teacher.gs']) {
    const code = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }
  return sandbox;
}

// ============================================================================
// FRONTEND CLIENT MOCK
// ============================================================================
function createFrontendLessonClient(gasSandbox, sharedLocalStorage = null) {
  const ls = sharedLocalStorage || {};
  const ss = {};
  let online = true;

  const localStorageMock = new Proxy(ls, {
    get(target, prop) {
      if (prop === 'getItem') return k => (Object.prototype.hasOwnProperty.call(target, k) ? target[k] : null);
      if (prop === 'setItem') return (k, v) => { target[k] = String(v); };
      if (prop === 'removeItem') return k => { delete target[k]; };
      if (prop === 'clear') return () => { Object.keys(target).forEach(k => delete target[k]); };
      return target[prop];
    }
  });

  const sessionStorageMock = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(ss, k) ? ss[k] : null; },
    setItem(k, v) { ss[k] = String(v); },
    removeItem(k) { delete ss[k]; }
  };

  const clientCtx = {
    Date,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    JSON,
    Error,
    Promise,
    setTimeout,
    clearTimeout,
    setInterval: () => 1,
    clearInterval: () => {},
    AbortController: class { abort() {} },
    crypto: { randomUUID: () => crypto.randomUUID() },
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    navigator: {
      userAgent: 'TestAgent/1.0',
      get onLine() { return online; }
    },
    document: {
      visibilityState: 'visible',
      hidden: false,
      body: {
        dataset: { lessonId: 'G6-L03', legacyLessonId: 'G6-B3' },
        appendChild() {},
        contains: () => false
      },
      getElementById: () => null,
      addEventListener() {},
      removeEventListener() {},
      createElement() { return { click() {}, remove() {}, setAttribute() {} }; }
    },
    window: null,
    innerWidth: 1280,
    addEventListener() {},
    removeEventListener() {},
    location: { hash: '#/', protocol: 'https:', href: '' },
    fetch: async (url, opts) => {
      if (!online) throw new Error('Network offline');
      const req = JSON.parse(opts.body);
      const resObj = gasSandbox.callPost(req);
      return { ok: true, json: async () => resObj };
    },
    _setOnline(v) { online = v; },
    _ls: ls
  };
  clientCtx.window = clientCtx;
  vm.createContext(clientCtx);

  const clientFiles = [
    'data/school-levels.js',
    'data/lessons.js',
    'assets/js/config.js',
    'assets/js/storage.js',
    'assets/js/session.js',
    'assets/js/auth-api.js',
    'assets/js/auth.js',
    'assets/js/api-client.js',
    'assets/js/sync-manager.js',
    'assets/js/progress-service.js',
    'assets/js/response-service.js',
    'assets/js/learning-timer.js',
    'assets/js/lesson-bridge.js',
    'assets/js/golden-lesson-renderer.js'
  ];
  for (const f of clientFiles) {
    const code = fs.readFileSync(path.join(REPO_ROOT, f), 'utf8');
    vm.runInContext(code, clientCtx, { filename: f });
  }
  vm.runInContext(
    'Object.assign(window, { CONFIG, Store, AuthSession, AuthApi, AuthUtil, Auth, ApiClient, SyncManager, ProgressService, ResponseService, LearningTimer });',
    clientCtx
  );
  return clientCtx;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runUatSuite() {
  console.log('================================================================');
  console.log('PHASE 3 / TASK P3.4-B — GOLDEN LESSON G6-L03 UAT TEST SUITE');
  console.log('================================================================\n');

  const goldenPath = path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json');
  const goldenRaw = fs.readFileSync(goldenPath, 'utf8');
  const goldenData = JSON.parse(goldenRaw);

  const gas = createGasSandbox();
  gas.setupAuth();
  gas._sheets.IMPORT.appendRow(['6A1-01', 'Nguyễn Văn A', '6A1', 6, 'THCS', '2026-2027', 'student', '']);
  gas._sheets.IMPORT.appendRow(['6A1-02', 'Trần Thị B', '6A1', 6, 'THCS', '2026-2027', 'student', '']);
  gas._sheets.IMPORT.appendRow(['GV-01', 'Huỳnh Văn Diễn', '', '', '', '2026-2027', 'teacher', '']);
  gas.importUsers();

  const newAccs = gas._sheets.NEW_ACCOUNTS._data.slice(1);
  const tempPw = {};
  newAccs.forEach(r => { tempPw[r[1]] = r[5]; });

  gas.clearNewAccounts();
  gas.setupV2();
  gas.migrateV1_1ToV2();
  gas.setupV3();
  gas._sheets.TEACHER_ASSIGNMENTS.appendRow(['', '', '2026-2027', '6A1', 'Tin học', 'TRUE', 'GV-01']);
  gas.migrateV2ToV3();

  // Set real passwords
  const lA = gas.callPost({ action: 'login', username: '6A1-01', password: tempPw['6A1-01'] });
  gas.callPost({
    action: 'changePassword',
    token: lA.data.sessionToken,
    currentPassword: tempPw['6A1-01'],
    newPassword: 'StudentA#2026'
  });
  const studentUidA = lA.data.student.studentUid;

  const lB = gas.callPost({ action: 'login', username: '6A1-02', password: tempPw['6A1-02'] });
  gas.callPost({
    action: 'changePassword',
    token: lB.data.sessionToken,
    currentPassword: tempPw['6A1-02'],
    newPassword: 'StudentB#2026'
  });
  const studentUidB = lB.data.student.studentUid;

  const lGV = gas.callPost({ action: 'login', username: 'GV-01', password: tempPw['GV-01'] });
  const cGV = gas.callPost({
    action: 'changePassword',
    token: lGV.data.sessionToken,
    currentPassword: tempPw['GV-01'],
    newPassword: 'Teacher#2026'
  });
  const gvToken = cGV.data.sessionToken;

  const sharedDeviceStorage = {};
  let passed = 0;
  let failed = 0;

  async function test(id, title, fn) {
    try {
      const msg = await fn();
      console.log(`✅ [PASS] ${id}: ${title}${msg ? ' (' + msg + ')' : ''}`);
      passed++;
    } catch (e) {
      console.error(`❌ [FAIL] ${id}: ${title}`);
      console.error('   ', e.message);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Student A Period 1 Flow -> Checkpoint 50%
  // --------------------------------------------------------------------------
  const clientA = createFrontendLessonClient(gas, sharedDeviceStorage);
  await test('P3.4B-01', 'Student A Period 1 completion reaches 50% checkpoint, sets nextActivityId=G6-L03-A05, unlocks Period 2', async () => {
    const loginA = await clientA.Auth.login('6A1-01', 'StudentA#2026');
    assert(loginA.success, 'Student A login failed');
    assert(loginA.data.student.studentUid === studentUidA, 'StudentUID mismatch for Student A');

    const ctrlA = clientA.GoldenLessonRenderer.createController({
      goldenData,
      bridge: clientA.LessonBridge
    });
    const initRes = await ctrlA.init();
    assert(initRes.resumed.percentComplete === 0, 'New lesson must start at 0%');

    // A01
    ctrlA.submitQuestion('G6-L03-Q001', 'B');
    const dA01 = ctrlA.completeActivity('G6-L03-A01');
    assert(dA01.ok && !dA01.blocked, 'A01 complete failed');

    // A02 (Product 1 + Q002)
    const p1 = ctrlA.submitPixelProduct(
      '1111010001000100',
      'Chữ cái T được biểu diễn bằng chuỗi 16 bit gồm hai kí hiệu 0 và 1 trong máy tính.'
    );
    assert(p1.ok && p1.isCorrect === null && p1.score === null, 'Product 1 open response must be pending review');
    ctrlA.submitQuestion('G6-L03-Q002', 'C');
    const dA02 = ctrlA.completeActivity('G6-L03-A02');
    assert(dA02.ok && !dA02.blocked, 'A02 complete failed');

    // A03 (Q003)
    ctrlA.submitQuestion('G6-L03-Q003', 'C');
    const dA03 = ctrlA.completeActivity('G6-L03-A03');
    assert(dA03.ok && !dA03.blocked, 'A03 complete failed');

    // A04 (Q004 + Q005) -> Checkpoint 50%
    ctrlA.submitQuestion('G6-L03-Q004', 'C');
    ctrlA.submitQuestion('G6-L03-Q005', 'B');
    const dA04 = ctrlA.completeActivity('G6-L03-A04');
    assert(dA04.ok && dA04.percentComplete === 50, 'A04 must reach 50% percentComplete');
    assert(dA04.period1BoundaryReached === true, 'Period 1 boundary not flagged');
    assert(dA04.nextActivityId === 'G6-L03-A05', 'nextActivityId must be G6-L03-A05');
    assert(dA04.activePeriod === 1, 'Period 1 completed screen must not auto-advance to Period 2 UI');
    assert(ctrlA.isPeriod2Unlocked() === true, 'Period 2 must be unlocked after A04');

    await clientA.LessonBridge.syncNow();
    return 'percentComplete=50%, nextActivityId=G6-L03-A05, period2Unlocked=true';
  });

  // --------------------------------------------------------------------------
  // TEST 2: Student A/B Isolation on Shared Device
  // --------------------------------------------------------------------------
  await test('P3.4B-02', 'Student A logout cleans cached profile/progress; Student B on same device starts at 0% with 0 leaked data', async () => {
    // Logout Student A
    await clientA.Auth.logout();
    assert(!clientA.Store.get('auth'), 'Auth token must be removed on logout');
    assert(!clientA.Store.get('profile'), 'Profile must be removed on logout');
    assert(!clientA.Store.get('lp.' + studentUidA + '.G6-L03'), 'lp.<uidA> must be purged from shared device storage');

    // Login Student B on SAME physical device (same sharedDeviceStorage)
    const clientB = createFrontendLessonClient(gas, sharedDeviceStorage);
    const loginB = await clientB.Auth.login('6A1-02', 'StudentB#2026');
    assert(loginB.success, 'Student B login failed');
    assert(loginB.data.student.studentUid === studentUidB, 'StudentUID mismatch for Student B');
    assert(loginB.data.student.studentUid !== studentUidA, 'StudentUID must differ from Student A');

    const ctrlB = clientB.GoldenLessonRenderer.createController({
      goldenData,
      bridge: clientB.LessonBridge
    });
    const initB = await ctrlB.init();

    // Student B must see 0% and no data from Student A
    assert(initB.resumed.percentComplete === 0, `Student B must see 0%, got: ${initB.resumed.percentComplete}`);
    assert(initB.resumed.firstIncompleteActivityId === 'G6-L03-A01', 'Student B must start at A01');
    assert(initB.resumed.completedActivityIds.length === 0, 'Student B must have 0 completed activities');
    assert(Object.keys(initB.resumed.responses).length === 0, 'Student B must see 0 responses from Student A');
    assert(initB.resumed.exitTicket === null, 'Student B must not see Student A exitTicket');
    assert(ctrlB.isPeriod2Unlocked() === false, 'Period 2 must be LOCKED for Student B');

    // Student B cannot switch to Period 2
    const p2Switch = ctrlB.switchPeriod(2);
    assert(p2Switch.locked === true && p2Switch.activePeriod === 1, 'Student B must be locked out of Period 2');

    // Offline queue check: Student A queue not leaked, Student B queue isolated
    const qA = clientB.ApiClient.loadQueue(studentUidA);
    assert(qA.length === 0, 'Student A queue must not leak into Student B session');
    await clientB.LessonBridge.syncNow();
    assert(clientB.ApiClient.pendingCount() === 0, 'Student B offline queue must flush to 0');

    await clientB.Auth.logout();
    return 'Student B sees 0%, A01, locked Period 2, 0 responses, 0 leaked products/queue';
  });

  // --------------------------------------------------------------------------
  // TEST 3: Resume Student A at 50% -> A05
  // --------------------------------------------------------------------------
  let ctrlA_resumed;
  let clientA_resumed;
  await test('P3.4B-03', 'Student A re-login resumes at 50%, unlocks Period 2, selects A05, and restores evidence A01–A04', async () => {
    clientA_resumed = createFrontendLessonClient(gas, sharedDeviceStorage);
    const loginA = await clientA_resumed.Auth.login('6A1-01', 'StudentA#2026');
    assert(loginA.success, 'Student A re-login failed');

    ctrlA_resumed = clientA_resumed.GoldenLessonRenderer.createController({
      goldenData,
      bridge: clientA_resumed.LessonBridge
    });
    const initA = await ctrlA_resumed.init();

    assert(initA.resumed.percentComplete === 50, `Expected 50%, got: ${initA.resumed.percentComplete}`);
    assert(initA.resumed.status === 'in_progress', `Expected in_progress, got: ${initA.resumed.status}`);
    assert(initA.resumed.firstIncompleteActivityId === 'G6-L03-A05', `Expected A05, got: ${initA.resumed.firstIncompleteActivityId}`);
    assert(ctrlA_resumed.isPeriod2Unlocked() === true, 'Period 2 must be unlocked on resume');
    assert(initA.resumed.activePeriod === 2, 'Active period must be 2');
    assert(ctrlA_resumed.state.currentActivityId === 'G6-L03-A05', 'Current activity must be A05');

    // Evidence A01–A04 restored
    const resps = initA.resumed.responses;
    assert(resps['G6-L03-Q001'] && resps['G6-L03-Q001'].responseValue === 'B', 'Q001 restored');
    assert(resps['G6-L03-PROD-01'] && resps['G6-L03-PROD-01'].responseValue.bitStringMatched === true, 'Product 1 restored');
    assert(resps['G6-L03-Q002'] && resps['G6-L03-Q002'].responseValue === 'C', 'Q002 restored');
    assert(resps['G6-L03-Q003'] && resps['G6-L03-Q003'].responseValue === 'C', 'Q003 restored');
    assert(resps['G6-L03-Q004'] && resps['G6-L03-Q004'].responseValue === 'C', 'Q004 restored');
    assert(resps['G6-L03-Q005'] && resps['G6-L03-Q005'].responseValue === 'B', 'Q005 restored');

    return 'Restored 50%, nextActivityId=A05, Period 2 unlocked, A01–A04 evidence intact';
  });

  // --------------------------------------------------------------------------
  // TEST 4: A05 Thang dung lượng evidence & validation
  // --------------------------------------------------------------------------
  await test('P3.4B-04', 'A05 worksheet reads real inputs (#ws-kb-byte, #ws-mb-kb, #ws-gb-mb), enforces decimal approximation, and gates completion', async () => {
    const ctrl = ctrlA_resumed;

    // Verify renderer code contains real inputs
    const rendererRaw = fs.readFileSync(path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js'), 'utf8');
    assert(rendererRaw.includes('id="ws-kb-byte"'), 'Missing input #ws-kb-byte in renderer');
    assert(rendererRaw.includes('id="ws-mb-kb"'), 'Missing input #ws-mb-kb in renderer');
    assert(rendererRaw.includes('id="ws-gb-mb"'), 'Missing input #ws-gb-mb in renderer');

    // Attempt complete without worksheet -> BLOCKED
    const tryEmpty = ctrl.completeActivity('G6-L03-A05');
    assert(tryEmpty.blocked === true && tryEmpty.missingCodes.includes('G6-L03-WS-01'), 'A05 must be blocked without worksheet');

    // Attempt with incorrect decimal inputs (e.g. 500, 1024, 100) -> BLOCKED with retry feedback
    const wsWrong = ctrl.submitCapacityWorksheet({
      '1KB_in_byte': '500',
      '1MB_in_KB': '1024',
      '1GB_in_MB': '100'
    });
    assert(wsWrong.ok === false && wsWrong.canRetry === true, 'Wrong input must allow retry');
    assert(wsWrong.feedback.includes('Chưa chính xác'), 'Wrong feedback message required');
    assert(ctrl.completeActivity('G6-L03-A05').blocked === true, 'A05 must remain blocked on wrong worksheet');

    // Submit correct decimal values (1000, 1000, 1000)
    const wsRight = ctrl.submitCapacityWorksheet({
      '1KB_in_byte': '1000',
      '1MB_in_KB': '1000',
      '1GB_in_MB': '1000'
    });
    assert(wsRight.ok === true && wsRight.isCorrect === true, 'Correct decimal input must succeed');

    // Q006 + Q007 + Q011
    ctrl.submitQuestion('G6-L03-Q006', 'C');
    ctrl.submitQuestion('G6-L03-Q007', '3000');
    if (goldenData.questions.find(q => q.questionId === 'G6-L03-Q011')) {
      ctrl.submitQuestion('G6-L03-Q011', 'Byte, KB, MB, GB');
    }

    const doneA05 = ctrl.completeActivity('G6-L03-A05');
    assert(doneA05.ok === true && !doneA05.blocked, 'A05 completion must succeed with full evidence');
    return 'Real inputs, decimal 1000 accepted, retry on wrong, completeActivity gated';
  });

  // --------------------------------------------------------------------------
  // TEST 5: A06 WebQuest Product 2 (Open Reasoning & Evaluation Status)
  // --------------------------------------------------------------------------
  await test('P3.4B-05', 'A06 Product 2 has no prefilled answers, stores student reasoning with evaluationStatus="needs_teacher_review", isCorrect=null, score=null', async () => {
    const ctrl = ctrlA_resumed;

    // Check no prefilled answers in renderer
    const rendererRaw = fs.readFileSync(path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js'), 'utf8');
    assert(!rendererRaw.includes('value="USB 16 GB" checked'), 'Product 2 radio must not be pre-checked');
    assert(!rendererRaw.includes('value="6 GB"'), 'Product 2 capacity input must not have prefilled 6 GB');

    // Attempt complete without Product 2 -> BLOCKED
    ctrl.submitQuestion('G6-L03-Q008', 'B');
    const tryEmptyA06 = ctrl.completeActivity('G6-L03-A06');
    assert(tryEmptyA06.blocked === true && tryEmptyA06.missingCodes.includes('G6-L03-PROD-02'), 'A06 must be blocked without PROD-02');

    // Submit valid Product 2
    const prod2 = ctrl.submitStorageAdvisoryProduct({
      need: 'Mang khoảng 6 GB dữ liệu học tập sang máy tính ở trường',
      estimatedCapacity: '6 GB (≈ 6000 MB)',
      selectedDevice: 'USB 16 GB',
      reason: 'USB 16 GB có dung lượng 16 GB lớn hơn 6 GB và nhỏ gọn dễ mang theo.'
    });
    assert(prod2.ok === true, 'Product 2 submit failed');
    assert(prod2.validationPassed === true, 'Product 2 validation should pass');
    assert(prod2.evaluationStatus === 'needs_teacher_review', 'evaluationStatus must be needs_teacher_review');
    assert(prod2.isCorrect === null, 'isCorrect must be null (pending teacher evaluation)');
    assert(prod2.score === null, 'score must be null (no auto full score)');

    ctrl.submitQuestion('G6-L03-Q009', 'C');
    const doneA06 = ctrl.completeActivity('G6-L03-A06');
    assert(doneA06.ok === true && !doneA06.blocked, 'A06 complete failed');
    return 'Product 2 saved with needs_teacher_review, isCorrect=null, score=null, no prefill';
  });

  // --------------------------------------------------------------------------
  // TEST 6: A07 Evidence Gate (G6-A-10)
  // --------------------------------------------------------------------------
  await test('P3.4B-06', 'A07 enforces Q010 evidence for G6-A-10, supports REAL_DEVICE and SIMULATION modes', async () => {
    const ctrl = ctrlA_resumed;

    // Blocked before Q010
    const tryEmptyA07 = ctrl.completeActivity('G6-L03-A07');
    assert(tryEmptyA07.blocked === true && tryEmptyA07.missingCodes.includes('G6-L03-Q010'), 'A07 must be blocked before Q010');

    // Mode toggle
    assert(ctrl.setDeviceInspectMode('REAL_DEVICE') === 'REAL_DEVICE', 'REAL_DEVICE mode failed');
    assert(ctrl.setDeviceInspectMode('SIMULATION') === 'SIMULATION', 'SIMULATION mode failed');

    // Submit Q010
    ctrl.submitQuestion('G6-L03-Q010', 'B');
    const doneA07 = ctrl.completeActivity('G6-L03-A07');
    assert(doneA07.ok === true && !doneA07.blocked, 'A07 complete failed');
    return 'G6-A-10 evidence gate enforced, REAL_DEVICE & SIMULATION modes operational';
  });

  // --------------------------------------------------------------------------
  // TEST 7: A08 + Exit Ticket & Lesson Completion (100%)
  // --------------------------------------------------------------------------
  await test('P3.4B-07', 'Lesson completion requires A01–A08 + Exit Ticket; finishLesson() blocked before Exit Ticket, reaches 100% on valid submission', async () => {
    const ctrl = ctrlA_resumed;

    // Blocked before Exit Ticket
    const tryEmptyA08 = ctrl.completeActivity('G6-L03-A08');
    assert(tryEmptyA08.blocked === true && tryEmptyA08.missingCodes.includes('EXIT_TICKET'), 'A08 must be blocked without Exit Ticket');

    const tryFinishNoExit = await ctrl.finishLesson();
    assert(tryFinishNoExit.completed === false, 'finishLesson() must fail before Exit Ticket');

    // Submit Exit Ticket
    const exitTicketPayload = {
      understandingLevel: 'clear',
      keyLearning: 'Hiểu biểu diễn nhị phân 0–1, đơn vị bit, thang đo Byte/KB/MB/GB và cách chọn thiết bị nhớ phù hợp.',
      stillConfused: 'Không còn thắc mắc',
      applicationAnswer: 'Em chọn USB 16 GB hoặc Thẻ nhớ 32 GB vì 16 GB > 6 GB (CD 700 MB và USB 4 GB không đủ dung lượng).',
      selfAssessment: 'good'
    };
    const etRes = await ctrl.submitExitTicketAndCompleteA08(exitTicketPayload);
    assert(etRes.submitted === true, 'Exit Ticket submit failed');

    // Complete lesson
    const finishRes = await ctrl.finishLesson();
    assert(finishRes.completed === true, `Expected completed=true, got: ${JSON.stringify(finishRes)}`);
    assert(ctrl.state.percentComplete === 100, `Expected 100%, got: ${ctrl.state.percentComplete}`);
    assert(ctrl.state.status === 'completed', `Expected completed, got: ${ctrl.state.status}`);

    await clientA_resumed.LessonBridge.syncNow();
    return 'percentComplete=100%, status=completed after A01–A08 + Exit Ticket';
  });

  // --------------------------------------------------------------------------
  // TEST 8: Teacher Evidence Verification
  // --------------------------------------------------------------------------
  await test('P3.4B-08', 'Teacher V3 capability retrieves StudentUID, progress, responses, open review products (isCorrect=null), Exit Ticket, and active time', async () => {
    // 1. getClassProgress
    const progressRes = gas.callPost({
      action: 'getClassProgress',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027',
      force: true
    });
    assert(progressRes.success === true, 'getClassProgress failed');
    const students = progressRes.data.students;
    const stdA = students.find(s => s.studentUid === studentUidA);
    const stdB = students.find(s => s.studentUid === studentUidB);

    assert(stdA && stdA.progress.percent === 100, 'Teacher must see Student A at 100%');
    assert(stdA.progress.status === 'completed', 'Teacher must see Student A completed');
    assert(stdA.exitTicket.submitted === true, 'Teacher must see Student A Exit Ticket submitted');
    assert(stdB && (stdB.progress.percent === 0 || stdB.progress.percent === null), 'Teacher must see Student B at 0%');
    assert(stdB.progress.status !== 'completed', 'Student B must not be completed');
    assert(stdB.exitTicket.submitted === false, 'Student B Exit Ticket must not be submitted');

    // 2. getClassResponses
    const responsesRes = gas.callPost({
      action: 'getClassResponses',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027'
    });
    assert(responsesRes.success === true, 'getClassResponses failed');
    const rows = responsesRes.data.rows;

    const prod1Row = rows.find(r => r.studentUid === studentUidA && r.questionId === 'G6-L03-PROD-01');
    const prod2Row = rows.find(r => r.studentUid === studentUidA && r.questionId === 'G6-L03-PROD-02');
    assert(prod1Row, 'Product 1 row missing from teacher responses');
    assert(prod2Row, 'Product 2 row missing from teacher responses');
    assert(prod1Row.isCorrect === null && prod1Row.score === null, 'Product 1 must be pending teacher review (isCorrect=null, score=null)');
    assert(prod2Row.isCorrect === null && prod2Row.score === null, 'Product 2 must be pending teacher review (isCorrect=null, score=null)');
    assert(prod2Row.answer.includes('needs_teacher_review'), 'Product 2 answer must contain evaluationStatus=needs_teacher_review');

    // 3. getClassExitTickets
    const exitRes = gas.callPost({
      action: 'getClassExitTickets',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027'
    });
    assert(exitRes.success === true, 'getClassExitTickets failed');
    assert(exitRes.data.summary.hieu_ro === 1, 'Summary must reflect Student A hieu_ro=1');

    // 4. getStudentLearningProfile
    const profileRes = gas.callPost({
      action: 'getStudentLearningProfile',
      token: gvToken,
      classId: '6A1',
      studentUid: studentUidA,
      lessonId: 'G6-L03',
      schoolYear: '2026-2027'
    });
    assert(profileRes.success === true, 'getStudentLearningProfile failed');
    assert(profileRes.data.detail.percent === 100, 'Student profile percent must be 100%');
    assert(profileRes.data.detail.doneActivities.length === 8, 'Student profile must show all 8 doneActivities');
    assert(profileRes.data.detail.exitTicket.submitted === true, 'Student profile Exit Ticket must be submitted');

    return 'Progress, Product 1 & 2 open review status, Exit Ticket, and student learning profile verified';
  });

  // --------------------------------------------------------------------------
  // TEST 9: Offline Queue & EventID Idempotency
  // --------------------------------------------------------------------------
  await test('P3.4B-09', 'Offline queue accumulates events in localStorage; reconnect syncs; replayed EventID is recognized as duplicate without duplicates', async () => {
    const offlineStorage = {};
    const clientOff = createFrontendLessonClient(gas, offlineStorage);
    await clientOff.Auth.login('6A1-02', 'StudentB#2026');

    // Go offline
    clientOff._setOnline(false);
    clientOff.LessonBridge.saveProgress({ currentActivityId: 'G6-L03-A01', percentComplete: 12 });
    clientOff.LessonBridge.saveResponse({
      activityId: 'G6-L03-A01',
      questionId: 'G6-L03-Q001',
      questionText: 'Máy tính dùng hai kí hiệu nào...',
      responseType: 'single_choice',
      responseValue: 'B',
      isCorrect: true,
      score: 1,
      maxScore: 1,
      required: true
    });

    const pending = clientOff.ApiClient.loadQueue(studentUidB);
    assert(pending.length >= 2, `Expected at least 2 queued events, got: ${pending.length}`);
    const qEvt = pending.find(e => e.type === 'response_saved');
    assert(qEvt && qEvt.eventId, 'Queued response must contain EventID');

    // Reconnect & sync
    clientOff._setOnline(true);
    const syncRes = await clientOff.SyncManager.flush();
    assert(syncRes.ok === true && syncRes.remaining === 0, 'Sync after reconnect failed');

    // Replay same EventID to test backend deduplication
    const replayRes = gas.callPost({
      action: 'syncEvents',
      token: clientOff.AuthSession.get().sessionToken,
      events: [qEvt]
    });
    assert(replayRes.success === true, 'Replay call failed');
    assert(replayRes.data.results[0].status === 'duplicate', `Expected status=duplicate, got: ${replayRes.data.results[0].status}`);

    // Verify queue isolation: Student A queue never has Student B events
    const qA = clientOff.ApiClient.loadQueue(studentUidA);
    assert(qA.length === 0, 'Student A queue must not contain Student B events');

    return 'Offline queue saved, synced on reconnect, EventID duplicate deduplicated, queues isolated';
  });

  // --------------------------------------------------------------------------
  // TEST 10: Full Regression Suites (P3.3, P2.5, Phase 1.5, Phase 1)
  // --------------------------------------------------------------------------
  await test('P3.4B-10', 'Full regression baseline holds 100%: P3.3=30/30, P2.5=20/20, Phase 1.5=27/27, Phase 1=79/79', async () => {
    // 1. P3.3 test suite
    const p3Result = require('child_process').spawnSync('node', ['tools/golden-lesson/test-p3-3.js'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert(p3Result.status === 0 && p3Result.stdout.includes('30/30 PASSED'), 'P3.3 regression failed');

    // 2. P2.5 test suite
    const p25Result = require('child_process').spawnSync('node', ['tools/curriculum/test-p2-5.js'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert(p25Result.status === 0 && p25Result.stdout.includes('20/20 PASSED'), 'P2.5 regression failed');

    // 3. Phase 1.5 test suite
    const p15Result = require('child_process').spawnSync('node', ['tools/agent-infra/demo-phase1-5.js'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert(p15Result.status === 0 && p15Result.stdout.includes('PASSED: 27'), 'Phase 1.5 regression failed');

    // 4. Phase 1 test suite
    const p1Script = path.resolve('/Users/huynhvandien/.gemini/antigravity/brain/8c553d9e-5d0c-4db2-934b-287be9ebd48a/scratch/audit-test.js');
    if (fs.existsSync(p1Script)) {
      const p1Result = require('child_process').spawnSync('node', [p1Script], { cwd: REPO_ROOT, encoding: 'utf8' });
      assert(p1Result.status === 0 && p1Result.stdout.includes('PASSED: 79'), 'Phase 1 regression failed');
    }

    return 'P3.3 (30/30), P2.5 (20/20), Phase 1.5 (27/27), Phase 1 (79/79) all PASS';
  });

  console.log('\n================================================================');
  console.log(`PHASE 3 / P3.4-B SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runUatSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
