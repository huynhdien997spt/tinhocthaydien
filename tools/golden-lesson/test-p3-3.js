#!/usr/bin/env node
/**
 * PHASE 3 / TASK P3.3 (FIX ROUND 1) — Golden Lesson G6-L03 Automated Test & Mock Integration Suite
 * Verifies:
 *   - P3-01 through P3-20
 *   - P3-FIX-01 through P3-FIX-10 (Negative & Governance Tests)
 *   - Realistic UI-like Student Flow (Student A -> Student B shared device -> Student A Resume)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const { CurriculumValidator } = require('../curriculum/validator');
const { CurriculumImporter } = require('../curriculum/importer');
const { runAuditCli } = require('../curriculum/audit-requirement-text');
const GoldenLessonRenderer = require('../../assets/js/golden-lesson-renderer');

// ============================================================================
// MOCK GAS SANDBOX & FRONTEND CLIENT FOR INTEGRATION TESTS
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
      getName() {
        return this._name;
      },
      setName(newName) {
        delete sheets[this._name];
        this._name = newName;
        sheets[newName] = this;
      },
      getLastRow() {
        return data.length;
      },
      getLastColumn() {
        return data.reduce((m, r) => Math.max(m, r.length), 0);
      },
      getMaxRows() {
        return Math.max(1000, data.length);
      },
      setFrozenRows() {},
      appendRow(row) {
        data.push(row.map(v => (v === undefined ? '' : v)));
      },
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
          setNumberFormat() {
            return this;
          }
        };
      }
    };
  }

  const ss = {
    getSheetByName(name) {
      return sheets[name] || null;
    },
    insertSheet(name) {
      const s = makeSheet(name);
      sheets[name] = s;
      return s;
    }
  };

  const sandbox = {
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
    parseInt,
    parseFloat,
    isFinite,
    isNaN,
    Logger: { log() {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput(str) {
        return {
          _text: str,
          setMimeType() {
            return this;
          },
          getContent() {
            return this._text;
          }
        };
      }
    },
    PropertiesService: {
      getScriptProperties() {
        return {
          getProperty(k) {
            return scriptProps[k] || null;
          },
          setProperty(k, v) {
            scriptProps[k] = String(v);
          }
        };
      }
    },
    CacheService: {
      getScriptCache() {
        return {
          get(k) {
            const e = cacheStore[k];
            if (!e) return null;
            if (Date.now() > e.exp) {
              delete cacheStore[k];
              return null;
            }
            return e.val;
          },
          put(k, v, sec) {
            cacheStore[k] = { val: String(v), exp: Date.now() + (sec || 30) * 1000 };
          }
        };
      }
    },
    LockService: {
      getScriptLock() {
        return {
          waitLock() {
            if (lockBusy) throw new Error('Lock timeout');
            lockBusy = true;
          },
          releaseLock() {
            lockBusy = false;
          }
        };
      }
    },
    SpreadsheetApp: {
      getActiveSpreadsheet() {
        return ss;
      },
      openById() {
        return ss;
      },
      getUi() {
        return {
          createMenu() {
            return {
              addItem() {
                return this;
              },
              addToUi() {}
            };
          }
        };
      }
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'SHA_256' },
      getUuid() {
        return crypto.randomUUID();
      },
      newBlob(str) {
        const buf = Buffer.from(String(str), 'utf8');
        return {
          getBytes() {
            return Array.from(buf).map(b => (b > 127 ? b - 256 : b));
          }
        };
      },
      base64Encode(bytes) {
        return Buffer.from(bytes.map(b => b & 0xff)).toString('base64');
      },
      base64EncodeWebSafe(bytes) {
        return Buffer.from(bytes.map(b => b & 0xff))
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
      },
      base64Decode(str) {
        const norm = String(str).replace(/-/g, '+').replace(/_/g, '/');
        return Array.from(Buffer.from(norm, 'base64')).map(b => (b > 127 ? b - 256 : b));
      },
      computeHmacSha256Signature(value, key) {
        const vBuf = Array.isArray(value)
          ? Buffer.from(value.map(b => b & 0xff))
          : Buffer.from(String(value), 'utf8');
        const kBuf = Array.isArray(key)
          ? Buffer.from(key.map(b => b & 0xff))
          : Buffer.from(String(key), 'utf8');
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

function createFrontendLessonClient(gasSandbox, sharedLocalStorage = null) {
  const ls = sharedLocalStorage || {};
  const ss = {};
  let online = true;

  const localStorageMock = new Proxy(ls, {
    get(target, prop) {
      if (prop === 'getItem')
        return k => (Object.prototype.hasOwnProperty.call(target, k) ? target[k] : null);
      if (prop === 'setItem')
        return (k, v) => {
          target[k] = String(v);
        };
      if (prop === 'removeItem')
        return k => {
          delete target[k];
        };
      if (prop === 'clear')
        return () => {
          Object.keys(target).forEach(k => delete target[k]);
        };
      return target[prop];
    }
  });

  const sessionStorageMock = {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(ss, k) ? ss[k] : null;
    },
    setItem(k, v) {
      ss[k] = String(v);
    },
    removeItem(k) {
      delete ss[k];
    }
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
    AbortController: class {
      abort() {}
    },
    crypto: { randomUUID: () => crypto.randomUUID() },
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    navigator: {
      userAgent: 'TestAgent/1.0',
      get onLine() {
        return online;
      }
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
      createElement() {
        return { click() {}, remove() {}, setAttribute() {} };
      }
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
    _setOnline(v) {
      online = v;
    },
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
// RUN P3.3 TEST SUITE (P3-01 .. P3-20 + P3-FIX-01 .. P3-FIX-10)
// ============================================================================
async function runP3Suite() {
  const results = [];
  let passed = 0;
  let failed = 0;

  async function test(id, name, fn) {
    try {
      const detail = await fn();
      passed++;
      results.push({ id, name, status: 'PASS', detail: detail || 'OK' });
      console.log(`✅ [PASS] ${id}: ${name}`);
    } catch (err) {
      failed++;
      results.push({ id, name, status: 'FAIL', detail: err.message });
      console.error(`❌ [FAIL] ${id}: ${name} -> ${err.message}`);
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg);
  }

  console.log('================================================================');
  console.log('PHASE 3 / TASK P3.3 (FIX ROUND 1) — GOLDEN LESSON G6-L03 TEST SUITE');
  console.log('================================================================\n');

  const goldenRaw = fs.readFileSync(
    path.join(REPO_ROOT, 'data/lessons/G6-L03.golden.json'),
    'utf8'
  );
  const goldenData = JSON.parse(goldenRaw);
  const rendererRaw = fs.readFileSync(
    path.join(REPO_ROOT, 'assets/js/golden-lesson-renderer.js'),
    'utf8'
  );
  const validator = new CurriculumValidator(path.join(REPO_ROOT, 'schemas'));
  const fullDataset = CurriculumImporter.loadNormalizedGrade6Dataset(REPO_ROOT);

  // Set up shared GAS sandbox for mock integration tests
  const gas = createGasSandbox();
  gas.setupAuth();
  gas._sheets.IMPORT.appendRow(['6A1-01', 'Nguyễn Văn A', '6A1', 6, 'THCS', '2026-2027', 'student', '']);
  gas._sheets.IMPORT.appendRow(['6A1-02', 'Trần Thị B', '6A1', 6, 'THCS', '2026-2027', 'student', '']);
  gas._sheets.IMPORT.appendRow(['GV-01', 'Huỳnh Văn Diễn', '', '', '', '2026-2027', 'teacher', '']);
  gas.importUsers();
  const newAccs = gas._sheets.NEW_ACCOUNTS._data.slice(1);
  const tempPw = {};
  newAccs.forEach(r => {
    tempPw[r[1]] = r[5];
  });
  gas.clearNewAccounts();
  gas.setupV2();
  gas.migrateV1_1ToV2();
  gas.setupV3();
  gas._sheets.TEACHER_ASSIGNMENTS.appendRow(['', '', '2026-2027', '6A1', 'Tin học', 'TRUE', 'GV-01']);
  gas.migrateV2ToV3();

  // Change temporary passwords for 6A1-01, 6A1-02, and GV-01
  const lA = gas.callPost({ action: 'login', username: '6A1-01', password: tempPw['6A1-01'] });
  gas.callPost({
    action: 'changePassword',
    token: lA.data.sessionToken,
    currentPassword: tempPw['6A1-01'],
    newPassword: 'StudentA#2026'
  });
  const lB = gas.callPost({ action: 'login', username: '6A1-02', password: tempPw['6A1-02'] });
  gas.callPost({
    action: 'changePassword',
    token: lB.data.sessionToken,
    currentPassword: tempPw['6A1-02'],
    newPassword: 'StudentB#2026'
  });
  const lGV = gas.callPost({ action: 'login', username: 'GV-01', password: tempPw['GV-01'] });
  const cGV = gas.callPost({
    action: 'changePassword',
    token: lGV.data.sessionToken,
    currentPassword: tempPw['GV-01'],
    newPassword: 'TeacherGV#2026'
  });
  const gvToken = cGV.data.sessionToken;

  const sharedStorage = {};
  const clientA1 = createFrontendLessonClient(gas, sharedStorage);
  await clientA1.Auth.login('6A1-01', 'StudentA#2026');
  const ctrlA1 = clientA1.GoldenLessonRenderer.createController({
    goldenData,
    bridge: clientA1.LessonBridge
  });

  // --------------------------------------------------------------------------
  // P3-01: Golden Lesson schema valid
  // --------------------------------------------------------------------------
  await test('P3-01', 'Golden Lesson schema valid (lesson, activities, questions, resources pass JSON Schema & Data Contract)', () => {
    assert(goldenData.lesson && typeof goldenData.lesson === 'object', 'Missing goldenData.lesson');
    assert(Array.isArray(goldenData.activities), 'Missing goldenData.activities');
    assert(Array.isArray(goldenData.questions), 'Missing goldenData.questions');
    assert(Array.isArray(goldenData.resources), 'Missing goldenData.resources');
    assert(goldenData.lesson.lessonId === 'G6-L03', 'Canonical lessonId must be G6-L03');
    assert(goldenData.lesson.legacyLessonId === 'G6-B3', 'legacyLessonId must be G6-B3');

    const res = validator.validateDataset(fullDataset);
    assert(res.valid === true && res.errorCount === 0, `Schema validation errors: ${JSON.stringify(res.errors)}`);
    return `Valid: 1 lesson, ${goldenData.activities.length} activities, ${goldenData.questions.length} questions, ${goldenData.resources.length} resources`;
  });

  // --------------------------------------------------------------------------
  // P3-02: no isFixtureOnly in production lesson
  // --------------------------------------------------------------------------
  await test('P3-02', 'No isFixtureOnly, fixtureMetadata, fixtureNote, [Fixture], or approvedForProductionUI=false in production lesson', () => {
    assert(!/isFixtureOnly/i.test(goldenRaw), 'Found forbidden isFixtureOnly in G6-L03.golden.json');
    assert(!/fixtureMetadata/i.test(goldenRaw), 'Found forbidden fixtureMetadata in G6-L03.golden.json');
    assert(!/fixtureNote/i.test(goldenRaw), 'Found forbidden fixtureNote in G6-L03.golden.json');
    assert(!/\[Fixture\]/i.test(goldenRaw), 'Found forbidden [Fixture] label in G6-L03.golden.json');
    assert(!/approvedForProductionUI/i.test(goldenRaw), 'Found forbidden approvedForProductionUI in G6-L03.golden.json');
    return '0 fixture flags or test-only metadata in G6-L03.golden.json';
  });

  // --------------------------------------------------------------------------
  // P3-03: no fake StudentUID evidence in production lesson
  // --------------------------------------------------------------------------
  await test('P3-03', 'No fake StudentUID evidence in production lesson data', () => {
    assert(!/STD-FIXTURE-SAMPLE/i.test(goldenRaw), 'Found fake STD-FIXTURE-SAMPLE in G6-L03.golden.json');
    assert(goldenData.evidences === undefined, 'Production G6-L03.golden.json must not embed static student evidences array');
    assert(
      Array.isArray(goldenData.lesson.evidenceIds) && goldenData.lesson.evidenceIds.length === 0,
      'lesson.evidenceIds must be empty [] in static lesson definition'
    );
    assert(
      Array.isArray(goldenData.lesson.masteryRuleIds) && goldenData.lesson.masteryRuleIds.length === 0,
      'lesson.masteryRuleIds must be empty [] in Phase 3 (evidence collection only)'
    );
    return '0 fake student evidences in G6-L03.golden.json';
  });

  // --------------------------------------------------------------------------
  // P3-04: exactly 8 required activities
  // --------------------------------------------------------------------------
  await test('P3-04', 'Exactly 8 required activities (G6-L03-A01 .. G6-L03-A08)', () => {
    const expectedIds = [
      'G6-L03-A01',
      'G6-L03-A02',
      'G6-L03-A03',
      'G6-L03-A04',
      'G6-L03-A05',
      'G6-L03-A06',
      'G6-L03-A07',
      'G6-L03-A08'
    ];
    const actualIds = goldenData.activities.map(a => a.activityId);
    assert(actualIds.length === 8, `Expected 8 activities, got ${actualIds.length}`);
    assert(JSON.stringify(actualIds) === JSON.stringify(expectedIds), `Unexpected activityIds: ${actualIds.join(', ')}`);
    assert(goldenData.activities.every(a => a.required === true), 'All 8 activities must have required=true');
    return `8 required activities: ${actualIds.join(', ')}`;
  });

  // --------------------------------------------------------------------------
  // P3-05: duration A01–A04 = 45 minutes
  // --------------------------------------------------------------------------
  await test('P3-05', 'Duration of Period 1 activities (A01–A04) = 45 minutes (5 + 18 + 12 + 10)', () => {
    const p1Acts = goldenData.activities.slice(0, 4);
    const mins = p1Acts.map(a => a.estimatedMinutes);
    const sum = mins.reduce((s, n) => s + n, 0);
    assert(JSON.stringify(mins) === JSON.stringify([5, 18, 12, 10]), `Expected [5,18,12,10], got ${JSON.stringify(mins)}`);
    assert(sum === 45, `Expected Period 1 sum = 45 minutes, got ${sum}`);
    return `A01=5m, A02=18m, A03=12m, A04=10m -> Total Period 1 = ${sum} minutes`;
  });

  // --------------------------------------------------------------------------
  // P3-06: duration A05–A08 = 45 minutes
  // --------------------------------------------------------------------------
  await test('P3-06', 'Duration of Period 2 activities (A05–A08) = 45 minutes (15 + 20 + 5 + 5)', () => {
    const p2Acts = goldenData.activities.slice(4, 8);
    const mins = p2Acts.map(a => a.estimatedMinutes);
    const sum = mins.reduce((s, n) => s + n, 0);
    assert(JSON.stringify(mins) === JSON.stringify([15, 20, 5, 5]), `Expected [15,20,5,5], got ${JSON.stringify(mins)}`);
    assert(sum === 45, `Expected Period 2 sum = 45 minutes, got ${sum}`);
    return `A05=15m, A06=20m, A07=5m, A08=5m -> Total Period 2 = ${sum} minutes`;
  });

  // --------------------------------------------------------------------------
  // P3-07: total = 90 minutes
  // --------------------------------------------------------------------------
  await test('P3-07', 'Total duration across A01–A08 = 90 minutes (2 periods)', () => {
    const total = goldenData.activities.reduce((s, a) => s + a.estimatedMinutes, 0);
    assert(total === 90, `Expected 90 minutes, got ${total}`);
    assert(goldenData.lesson.durationMinutes === 90 && goldenData.lesson.periods === 2, 'lesson metadata must be 2 periods / 90m');
    return `45 + 45 = ${total} minutes (2 periods)`;
  });

  // --------------------------------------------------------------------------
  // P3-08: Realistic UI Student Flow for Period 1 (A01–A04) + Evidence Gates + Period 2 Lock
  // --------------------------------------------------------------------------
  await test('P3-08', 'Student A Period 1 flow: evidence gates block premature completeActivity, Period 2 is locked before A04, and completing A01–A04 reaches 50%', async () => {
    const initRes = await ctrlA1.init();
    assert(initRes.authenticated === true && initRes.resumed.percentComplete === 0, 'New student must start at 0% / A01');
    assert(initRes.resumed.firstIncompleteActivityId === 'G6-L03-A01', 'New student firstIncomplete must be G6-L03-A01');

    // Try opening Period 2 before A01–A04 completed -> LOCKED
    const lockCheck = ctrlA1.switchPeriod(2);
    assert(
      lockCheck.locked === true &&
        lockCheck.switched === false &&
        ctrlA1.state.activePeriod === 1 &&
        lockCheck.message === 'Hoàn thành Checkpoint Tiết 1 để mở Tiết 2.',
      'Period 2 must be locked before Checkpoint Tiết 1'
    );

    // A01: try completing before answering Q001 -> BLOCKED
    const tryA01Empty = ctrlA1.completeActivity('G6-L03-A01');
    assert(tryA01Empty.blocked === true && tryA01Empty.ok === false, 'A01 must be BLOCKED before Q001 is answered');
    assert(tryA01Empty.message.includes('Câu Q001'), 'A01 gate message must list Câu Q001');

    // Answer Q001 -> complete A01 -> PASS
    ctrlA1.submitQuestion('G6-L03-Q001', 'B');
    const doneA01 = ctrlA1.completeActivity('G6-L03-A01');
    assert(doneA01.ok === true && doneA01.blocked === false, 'A01 must complete after Q001');

    // A02: try completing before Product 1 & Q002 -> BLOCKED
    const tryA02Empty = ctrlA1.completeActivity('G6-L03-A02');
    assert(
      tryA02Empty.blocked === true &&
        tryA02Empty.missingCodes.includes('G6-L03-PROD-01') &&
        tryA02Empty.missingCodes.includes('G6-L03-Q002'),
      'A02 must be BLOCKED when PROD-01 and Q002 are missing'
    );

    // Submit Product 1 -> still blocked until Q002 is answered
    const prod1Res = ctrlA1.submitPixelProduct(
      '1111010001000100',
      'Số 0 biểu diễn ô trắng và số 1 biểu diễn ô được tô màu trên lưới 4×4.'
    );
    assert(prod1Res.ok === true && prod1Res.submitted === true, 'Product 1 submission failed');
    assert(
      prod1Res.isCorrect === null && prod1Res.score === null && prod1Res.evaluationStatus === 'needs_teacher_review',
      'Product 1 open explanation must NOT auto-assign isCorrect=true or full score'
    );

    const tryA02NoQ002 = ctrlA1.completeActivity('G6-L03-A02');
    assert(tryA02NoQ002.blocked === true && tryA02NoQ002.missingCodes.includes('G6-L03-Q002'), 'A02 must still be BLOCKED without Q002');

    // Answer Q002 -> complete A02 -> PASS
    ctrlA1.submitQuestion('G6-L03-Q002', '1111010001000100');
    const doneA02 = ctrlA1.completeActivity('G6-L03-A02');
    assert(doneA02.ok === true && doneA02.blocked === false, 'A02 must complete after PROD-01 + Q002');

    // A03: try completing without Q003 -> BLOCKED; answer Q003 -> PASS
    assert(ctrlA1.completeActivity('G6-L03-A03').blocked === true, 'A03 must be BLOCKED before Q003');
    ctrlA1.submitQuestion('G6-L03-Q003', 'A');
    assert(ctrlA1.completeActivity('G6-L03-A03').ok === true, 'A03 must complete after Q003');

    // A04: try completing without Q004/Q005 -> BLOCKED; answer Q004 + Q005 -> PASS
    assert(ctrlA1.completeActivity('G6-L03-A04').blocked === true, 'A04 must be BLOCKED before Q004 & Q005');
    ctrlA1.submitQuestion('G6-L03-Q004', 'A');
    assert(ctrlA1.completeActivity('G6-L03-A04').blocked === true, 'A04 must be BLOCKED when Q005 is still missing');
    ctrlA1.submitQuestion('G6-L03-Q005', 'bit');
    const p1Boundary = ctrlA1.completeActivity('G6-L03-A04');

    assert(p1Boundary.ok === true && p1Boundary.percentComplete === 50, `Expected 50%, got ${p1Boundary.percentComplete}`);
    assert(p1Boundary.status === 'in_progress', `Expected in_progress, got ${p1Boundary.status}`);
    assert(p1Boundary.nextActivityId === 'G6-L03-A05', `Expected nextActivityId=G6-L03-A05, got ${p1Boundary.nextActivityId}`);
    assert(p1Boundary.period1BoundaryReached === true, 'Must flag period1BoundaryReached=true');
    assert(p1Boundary.period2Unlocked === true, 'Period 2 must become unlocked after A04');
    assert(p1Boundary.endedSessionWithCompletedFalse === true, 'Must call endLearningSession(false)');
    assert(p1Boundary.completeLessonCalled === false, 'Must NOT call completeLesson() at end of Period 1');
    assert(
      p1Boundary.bannerText.includes('Em đã hoàn thành Tiết 1.') &&
        p1Boundary.bannerText.includes('Lần sau em sẽ tiếp tục từ Nhiệm vụ A05.'),
      'Missing mandatory Period 1 completion message'
    );
    assert(ctrlA1.state.activePeriod === 1, 'Must stay on Period 1 completion screen and NOT auto-jump to Period 2');

    await clientA1.LessonBridge.syncNow();
    const sessionRow = gas._sheets.LEARNING_SESSIONS._data[1];
    assert(sessionRow[6] !== '' && String(sessionRow[9]) === 'FALSE', 'Backend LEARNING_SESSIONS must record EndedAt and Completed=FALSE');
    return 'A01–A04 gated by evidence -> 50%, status=in_progress, next=A05, Period 2 unlocked, endLearningSession(false)';
  });

  // --------------------------------------------------------------------------
  // P3-09: four YCCD all covered
  // --------------------------------------------------------------------------
  await test('P3-09', 'All four YCCĐ (G6-A-07, G6-A-08, G6-A-09, G6-A-10) covered across activities and questions', () => {
    const reqs = ['G6-A-07', 'G6-A-08', 'G6-A-09', 'G6-A-10'];
    for (const rId of reqs) {
      const inActs = goldenData.activities.some(a => a.requirementIds.includes(rId));
      const inQs = goldenData.questions.some(q => q.requirementId === rId);
      assert(inActs && inQs, `YCCĐ ${rId} missing in activities or questions`);
    }
    return 'All 4 YCCĐ (G6-A-07, G6-A-08, G6-A-09, G6-A-10) covered in both activities and questions';
  });

  // --------------------------------------------------------------------------
  // P3-10: every required activity has RequirementID + evidence type
  // --------------------------------------------------------------------------
  await test('P3-10', 'Every required activity has non-empty requirementIds and expectedEvidenceTypes', () => {
    for (const a of goldenData.activities) {
      assert(Array.isArray(a.requirementIds) && a.requirementIds.length > 0, `${a.activityId} missing requirementIds`);
      assert(
        Array.isArray(a.expectedEvidenceTypes) && a.expectedEvidenceTypes.length > 0,
        `${a.activityId} missing expectedEvidenceTypes`
      );
    }
    return '8/8 activities have requirementIds and expectedEvidenceTypes';
  });

  // --------------------------------------------------------------------------
  // P3-11: every question has exactly one RequirementID + feedback/retry policy
  // --------------------------------------------------------------------------
  await test('P3-11', 'Every question (Q001–Q010) has exactly one RequirementID, hides answer before first attempt, and supports retry on wrong attempt', () => {
    assert(goldenData.questions.length === 10, `Expected 10 questions, got ${goldenData.questions.length}`);
    for (const q of goldenData.questions) {
      assert(
        typeof q.requirementId === 'string' && /^G6-A-(07|08|09|10)$/.test(q.requirementId),
        `${q.questionId} must have exactly one valid string requirementId`
      );
      assert(q.correctAnswer && q.explanation && q.maxScore > 0 && q.cognitiveLevel && q.status === 'published', `${q.questionId} missing required fields`);
    }

    // Verify Q006 hides explanation before first submission
    const beforeAttempt = ctrlA1.getQuestionVisibleFeedback('G6-L03-Q006');
    assert(beforeAttempt.attempted === false && beforeAttempt.showExplanation === false && beforeAttempt.explanation === null, 'Answer/explanation must be hidden before first submission');

    // Submit wrong answer first -> shows explanation and allows retry
    const wrongAttempt = ctrlA1.submitQuestion('G6-L03-Q006', 'A');
    assert(wrongAttempt.isCorrect === false && wrongAttempt.canRetry === true && wrongAttempt.attemptNumber === 1, 'Wrong attempt must allow retry');
    const afterWrong = ctrlA1.getQuestionVisibleFeedback('G6-L03-Q006');
    assert(afterWrong.showExplanation === true && afterWrong.canRetry === true, 'Explanation must be visible after wrong attempt');

    // Retry with correct answer -> attemptNumber increments to 2
    const rightAttempt = ctrlA1.submitQuestion('G6-L03-Q006', 'C');
    assert(rightAttempt.isCorrect === true && rightAttempt.attemptNumber === 2, 'Retry must increment attemptNumber to 2');
    return '10/10 questions have single RequirementID; pre-submit hiding & wrong-answer retry verified';
  });

  // --------------------------------------------------------------------------
  // P3-12: A05 uses decimal approximation, no mandatory 1024 rule
  // --------------------------------------------------------------------------
  await test('P3-12', 'A05 uses CTGDPT decimal approximation (1 KB ≈ 1000 byte, 1 MB ≈ 1000 KB, 1 GB ≈ 1000 MB) and no mandatory 1024 rule', () => {
    const a05 = goldenData.activities.find(a => a.activityId === 'G6-L03-A05');
    const q006 = goldenData.questions.find(q => q.questionId === 'G6-L03-Q006');
    const q007 = goldenData.questions.find(q => q.questionId === 'G6-L03-Q007');
    assert(a05.instruction.includes('1000'), 'A05 instruction must use decimal 1000 approximation');
    assert(q006.correctAnswer === 'C' && q007.correctAnswer === '3000', 'Q006/Q007 must use 1000 decimal conversion');
    for (const q of goldenData.questions) {
      assert(!/1024/.test(q.questionText) && !/1024/.test(String(q.correctAnswer)), `Question ${q.questionId} must not require 1024`);
    }
    const compA05 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A05'];
    assert(compA05.capacityScale.supplementaryKnowledge.includes('TB'), 'TB must be placed only in supplementaryKnowledge');
    return 'Decimal approximation (1000) verified; 0 mandatory 1024 rules; TB only in supplementaryKnowledge';
  });

  // --------------------------------------------------------------------------
  // P3-13: A06 contains 1.3.TC1a + 5.2.TC1a + 5.2.TC1b flow & 3-tier support on A02, A05, A06
  // --------------------------------------------------------------------------
  await test('P3-13', 'A06 contains NLS (1.3.TC1a, 5.2.TC1a, 5.2.TC1b) 5-step WebQuest flow, Product 2 (PHIẾU TƯ VẤN LƯU TRỮ), and 3-tier support on A02/A05/A06', () => {
    const compA06 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A06'];
    assert(
      JSON.stringify(compA06.nlsCodes) === JSON.stringify(['1.3.TC1a', '5.2.TC1a', '5.2.TC1b']),
      'A06 must include 1.3.TC1a, 5.2.TC1a, 5.2.TC1b'
    );
    assert(compA06.webquest.steps.length === 5, 'A06 WebQuest must have 5 steps');
    assert(compA06.webquest.productTitle.includes('PHIẾU TƯ VẤN LƯU TRỮ'), 'Missing PHIẾU TƯ VẤN LƯU TRỮ');

    for (const actId of ['G6-L03-A02', 'G6-L03-A05', 'G6-L03-A06']) {
      const comp = goldenData.goldenLessonBlueprint.activityComponents[actId];
      assert(comp.support3Tier && comp.support3Tier.buttonLabel === 'Em chưa làm được', `${actId} missing 'Em chưa làm được' button`);
      assert(comp.support3Tier.tiers.length === 3, `${actId} must have 3 support tiers (Hint, Similar example, Guided steps)`);
      const t1 = ctrlA1.revealNextSupportTier(actId);
      const t2 = ctrlA1.revealNextSupportTier(actId);
      const t3 = ctrlA1.revealNextSupportTier(actId);
      assert(t1.length === 1 && t2.length === 2 && t3.length === 3, `${actId} progressive 3-tier support reveal failed`);
    }
    return 'A06 5-step WebQuest + NLS (1.3.TC1a, 5.2.TC1a, 5.2.TC1b) + 3-tier support on A02, A05, A06 verified';
  });

  // --------------------------------------------------------------------------
  // P3-14: A08 requires Exit Ticket & A07 supports REAL_DEVICE + SIMULATION
  // --------------------------------------------------------------------------
  await test('P3-14', 'A08 requires Exit Ticket with 6 GB application question & A07 supports REAL_DEVICE and SIMULATION modes', () => {
    const a08 = goldenData.activities.find(a => a.activityId === 'G6-L03-A08');
    assert(
      JSON.stringify(a08.requirementIds) === JSON.stringify(['G6-A-10']) &&
        a08.expectedEvidenceTypes.includes('exit_ticket_reflection'),
      'A08 must map to G6-A-10 and exit_ticket_reflection'
    );
    const compA08 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A08'];
    assert(
      compA08.exitTicketConfig.applicationPrompt ===
        'Nếu em cần lưu khoảng 6 GB dữ liệu, em sẽ chọn thiết bị nào và vì sao?',
      'A08 Exit Ticket application prompt mismatch'
    );
    const compA07 = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A07'];
    assert(
      JSON.stringify(compA07.modes) === JSON.stringify(['REAL_DEVICE', 'SIMULATION']) &&
        compA07.simulationCards.length >= 4,
      'A07 must support REAL_DEVICE and SIMULATION cards'
    );
    return 'A08 Exit Ticket (6 GB prompt) & A07 REAL_DEVICE/SIMULATION modes verified';
  });

  // --------------------------------------------------------------------------
  // P3-16: Student B shared device isolation (0%) & Student A resume 1 week later at 50% -> A05
  // --------------------------------------------------------------------------
  await test('P3-16', 'Student B on same device starts at 0% (no leak); Student A resume at 50% unlocks Period 2 and selects G6-L03-A05', async () => {
    await clientA1.LessonBridge.syncNow();
    // Student A logs out on shared device; Student B logs in on the SAME device
    await clientA1.Auth.logout();
    await clientA1.Auth.login('6A1-02', 'StudentB#2026');
    const ctrlB = clientA1.GoldenLessonRenderer.createController({
      goldenData,
      bridge: clientA1.LessonBridge
    });
    const initB = await ctrlB.init();
    assert(
      initB.resumed.percentComplete === 0 &&
        initB.resumed.completedActivityIds.length === 0 &&
        initB.resumed.firstIncompleteActivityId === 'G6-L03-A01' &&
        Object.keys(initB.resumed.responses).length === 0 &&
        ctrlB.isPeriod2Unlocked() === false,
      'Shared device isolation failed: Student B must see 0% / A01 and Period 2 locked'
    );

    // Student A logs in a week later -> restores 50% from cloud, Period 2 unlocked, A05 selected
    const clientA2 = createFrontendLessonClient(gas);
    await clientA2.Auth.login('6A1-01', 'StudentA#2026');
    const ctrlA2 = clientA2.GoldenLessonRenderer.createController({
      goldenData,
      bridge: clientA2.LessonBridge
    });
    const initA2 = await ctrlA2.init();
    assert(initA2.resumed.percentComplete === 50, `Expected restored percentComplete=50, got ${initA2.resumed.percentComplete}`);
    assert(
      initA2.resumed.firstIncompleteActivityId === 'G6-L03-A05',
      `Expected firstIncompleteActivityId=G6-L03-A05, got ${initA2.resumed.firstIncompleteActivityId}`
    );
    assert(ctrlA2.isPeriod2Unlocked() === true && initA2.resumed.activePeriod === 2, 'Period 2 must be unlocked and selected on resume at 50%');
    assert(
      initA2.resumed.resumeBannerText &&
        initA2.resumed.resumeBannerText.includes('Tiếp tục Tiết 2') &&
        initA2.resumed.resumeBannerText.includes('50%') &&
        initA2.resumed.resumeBannerText.includes('Bắt đầu từ A05'),
      'Missing resume banner text for Period 2 (50% / A05)'
    );
    clientA2.__ctrlA2 = ctrlA2;
    global.__testClientA2 = clientA2;
    return 'Student B isolated at 0%; Student A resumed at 50% -> Period 2 unlocked & A05 selected';
  });

  // --------------------------------------------------------------------------
  // P3-15: Student A Period 2 flow (A05–A08) + completeLesson() gate
  // --------------------------------------------------------------------------
  await test('P3-15', 'Student A Period 2 flow: A05/A06/A07/A08 evidence gates, wrong worksheet feedback & retry, and completeLesson() gate', async () => {
    const clientA2 = global.__testClientA2;
    const ctrlA2 = clientA2.__ctrlA2;

    // A05: try completing without worksheet -> BLOCKED
    const tryA05Empty = ctrlA2.completeActivity('G6-L03-A05');
    assert(
      tryA05Empty.blocked === true && tryA05Empty.missingCodes.includes('G6-L03-WS-01'),
      'A05 must be BLOCKED when worksheet is not completed'
    );

    // A05: enter wrong worksheet values -> feedback + retry, still BLOCKED
    const wsWrong = ctrlA2.submitCapacityWorksheet({
      '1KB_in_byte': '500',
      '1MB_in_KB': '1024',
      '1GB_in_MB': '100'
    });
    assert(
      wsWrong.ok === false &&
        wsWrong.isCorrect === false &&
        wsWrong.canRetry === true &&
        wsWrong.feedback === 'Chưa chính xác.\nEm hãy xem lại thang dung lượng và thử lại.',
      'Wrong worksheet input must return retry feedback'
    );
    assert(ctrlA2.completeActivity('G6-L03-A05').blocked === true, 'A05 must remain BLOCKED when worksheet is wrong');

    // A05: enter correct worksheet values + Q006 + Q007 -> complete A05 PASS
    const wsRight = ctrlA2.submitCapacityWorksheet({
      '1KB_in_byte': '1000',
      '1MB_in_KB': '1000',
      '1GB_in_MB': '1000'
    });
    assert(wsRight.ok === true && wsRight.isCorrect === true, 'Correct worksheet input must pass');
    ctrlA2.submitQuestion('G6-L03-Q006', 'C');
    ctrlA2.submitQuestion('G6-L03-Q007', '3000');
    const doneA05 = ctrlA2.completeActivity('G6-L03-A05');
    assert(doneA05.ok === true && doneA05.blocked === false, 'A05 must complete after valid worksheet + Q006 + Q007');

    // A06: try completing without PROD-02 or Q009 -> BLOCKED with missing list
    ctrlA2.submitQuestion('G6-L03-Q008', 'B');
    const tryA06Partial = ctrlA2.completeActivity('G6-L03-A06');
    assert(
      tryA06Partial.blocked === true &&
        tryA06Partial.message.includes('Còn thiếu:') &&
        tryA06Partial.message.includes('- Phiếu tư vấn lưu trữ') &&
        tryA06Partial.message.includes('- Câu Q009'),
      `Expected missing message for PROD-02 and Q009, got: ${tryA06Partial.message}`
    );

    // Submit PROD-02 + Q009 -> complete A06 PASS
    const prod2Res = ctrlA2.submitStorageAdvisoryProduct({
      need: 'Mang khoảng 6 GB dữ liệu học tập sang máy tính ở trường',
      estimatedCapacity: '6 GB (≈ 6000 MB)',
      selectedDevice: 'USB 16 GB',
      reason: 'USB 16 GB có dung lượng lớn hơn 6 GB (16 GB > 6 GB) và nhỏ gọn dễ mang theo.'
    });
    assert(
      prod2Res.ok === true &&
        prod2Res.submitted === true &&
        prod2Res.isCorrect === null &&
        prod2Res.score === null &&
        prod2Res.evaluationStatus === 'needs_teacher_review',
      'Product 2 must save for teacher evaluation without auto full score'
    );
    ctrlA2.submitQuestion('G6-L03-Q009', 'C');
    const doneA06 = ctrlA2.completeActivity('G6-L03-A06');
    assert(doneA06.ok === true && doneA06.blocked === false, 'A06 must complete after PROD-02 + Q008 + Q009');

    // A07: try without Q010 -> BLOCKED; answer Q010 -> PASS
    assert(ctrlA2.completeActivity('G6-L03-A07').blocked === true, 'A07 must be BLOCKED before Q010');
    ctrlA2.setDeviceInspectMode('SIMULATION');
    ctrlA2.submitQuestion('G6-L03-Q010', 'B');
    assert(ctrlA2.completeActivity('G6-L03-A07').ok === true, 'A07 must complete after Q010');

    // A08: try completing without Exit Ticket -> BLOCKED; finishLesson() -> BLOCKED
    assert(ctrlA2.completeActivity('G6-L03-A08').blocked === true, 'A08 must be BLOCKED before Exit Ticket');
    const blockedNoExit = await ctrlA2.finishLesson();
    assert(
      blockedNoExit.completed === false &&
        Array.isArray(blockedNoExit.missing) &&
        (blockedNoExit.missing.includes('G6-L03-A08') || blockedNoExit.missing.includes('exit_ticket')),
      `Expected completeLesson() to be blocked before A08 + Exit Ticket, got: ${JSON.stringify(blockedNoExit)}`
    );

    // Submit Exit Ticket -> completes A08 -> finishLesson() succeeds!
    const etRes = await ctrlA2.submitExitTicketAndCompleteA08({
      understandingLevel: 'clear',
      keyLearning: 'Hiểu biểu diễn nhị phân 0–1, đơn vị bit, quy đổi xấp xỉ Byte/KB/MB/GB và chọn thiết bị nhớ.',
      stillConfused: 'Không còn',
      applicationAnswer: 'Em chọn USB 16 GB hoặc thẻ nhớ 32 GB vì dung lượng lớn hơn 6 GB (CD 700 MB và USB 4 GB không đủ).',
      selfAssessment: 'good'
    });
    assert(etRes.submitted === true, 'Exit ticket submission failed');

    const completedOk = await ctrlA2.finishLesson();
    assert(
      completedOk.completed === true && completedOk.missing.length === 0,
      `Expected completeLesson() to succeed after A01-A08 + Exit Ticket, got: ${JSON.stringify(completedOk)}`
    );
    return 'Period 2 flow verified: A05/A06/A07/A08 evidence gates + Exit Ticket + completeLesson() = PASS';
  });

  // --------------------------------------------------------------------------
  // P3-17: index.html contains no hard-coded lesson questions
  // --------------------------------------------------------------------------
  await test('P3-17', 'lessons/grade6/bai3/index.html is a pure shell/host and contains no hard-coded lesson questions', () => {
    const html = fs.readFileSync(path.join(REPO_ROOT, 'lessons/grade6/bai3/index.html'), 'utf8');
    assert(html.includes('data-lesson-id="G6-L03"'), 'index.html must use canonical data-lesson-id="G6-L03"');
    assert(html.includes('id="lesson-root"'), 'index.html must contain #lesson-root');
    assert(html.includes('golden-lesson-renderer.js'), 'index.html must load golden-lesson-renderer.js');
    assert(!/1 byte gồm bao nhiêu bit/i.test(html), 'index.html still has legacy hardcoded quiz text');
    assert(!/G6-L03-Q001|Máy tính dùng hai kí hiệu nào/i.test(html), 'index.html must not hardcode question text');
    assert(!/<input\s+type="radio"/i.test(html), 'index.html must not hardcode radio inputs');
    return 'lessons/grade6/bai3/index.html verified as pure shell/host with 0 hardcoded questions';
  });

  // --------------------------------------------------------------------------
  // P3-18: frontend/backend completion rules match
  // --------------------------------------------------------------------------
  await test('P3-18', 'Frontend (data/lessons.js & G6-L03.golden.json) and Backend (backend/StudentV2.gs LESSON_RULES) completion rules match', () => {
    const expectedActs = [
      'G6-L03-A01',
      'G6-L03-A02',
      'G6-L03-A03',
      'G6-L03-A04',
      'G6-L03-A05',
      'G6-L03-A06',
      'G6-L03-A07',
      'G6-L03-A08'
    ];
    const goldenActs = goldenData.lesson.assessmentPlan.requiredActivities;
    const goldenExit = goldenData.lesson.assessmentPlan.requireExitTicket;

    const lessonsJsCtx = { window: {} };
    vm.createContext(lessonsJsCtx);
    vm.runInContext(fs.readFileSync(path.join(REPO_ROOT, 'data/lessons.js'), 'utf8'), lessonsJsCtx);
    const feLesson = lessonsJsCtx.window.LESSONS.find(l => l.lessonId === 'G6-L03');
    assert(feLesson, 'G6-L03 missing in data/lessons.js');

    const studentV2Code = fs.readFileSync(path.join(REPO_ROOT, 'backend/StudentV2.gs'), 'utf8');
    assert(studentV2Code.includes('"G6-L03"'), 'G6-L03 missing in backend/StudentV2.gs LESSON_RULES');

    assert(
      JSON.stringify(goldenActs) === JSON.stringify(expectedActs) &&
        JSON.stringify(feLesson.completion.requiredActivities) === JSON.stringify(expectedActs) &&
        goldenExit === true &&
        feLesson.completion.requireExitTicket === true,
      'Frontend and Golden Lesson completion rules do not match expected G6-L03 rule'
    );
    return 'Frontend & Backend LESSON_RULES["G6-L03"] match (G6-L03-A01..A08 + requireExitTicket=true)';
  });

  // --------------------------------------------------------------------------
  // P3-19: no direct lesson → Apps Script fetch & Teacher Dashboard evidence compatibility
  // --------------------------------------------------------------------------
  await test('P3-19', 'No direct lesson -> Apps Script fetch; all G6-L03 evidence readable by Teacher Dashboard V3 APIs', () => {
    const htmlCode = fs.readFileSync(
      path.join(REPO_ROOT, 'lessons/grade6/bai3/index.html'),
      'utf8'
    );
    assert(!/script\.google\.com\/macros/i.test(rendererRaw), 'Renderer must not hardcode Apps Script URL');
    assert(!/script\.google\.com\/macros/i.test(htmlCode), 'HTML must not hardcode Apps Script URL');
    assert(!/ApiClient\.authenticatedRequest/i.test(rendererRaw), 'Renderer must go through LessonBridge, not call ApiClient directly');

    // Verify Teacher V3 APIs read G6-L03 progress, responses (including Product 1 & Product 2), Exit Ticket, and session time
    const overview = gas.callPost({
      action: 'getClassOverview',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027',
      force: true
    });
    assert(overview.success && overview.data.completed === 1, 'Teacher getClassOverview must show 1 completed student for G6-L03');

    const responses = gas.callPost({
      action: 'getClassResponses',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027'
    });
    const qIds = responses.data.rows.map(r => r.questionId);
    assert(qIds.includes('G6-L03-PROD-01'), 'Teacher responses must include Bit Product (G6-L03-PROD-01)');
    assert(qIds.includes('G6-L03-PROD-02'), 'Teacher responses must include Storage Advisory Product (G6-L03-PROD-02)');
    assert(qIds.includes('G6-L03-Q006'), 'Teacher responses must include Q006 with attempt count');

    const prod1Row = responses.data.rows.find(r => r.questionId === 'G6-L03-PROD-01');
    const prod2Row = responses.data.rows.find(r => r.questionId === 'G6-L03-PROD-02');
    assert(prod1Row.isCorrect === null && prod1Row.score === null, 'Teacher V3 must see Product 1 as pending evaluation (isCorrect=null, score=null)');
    assert(prod2Row.isCorrect === null && prod2Row.score === null, 'Teacher V3 must see Product 2 as pending evaluation (isCorrect=null, score=null)');

    const exitTickets = gas.callPost({
      action: 'getClassExitTickets',
      token: gvToken,
      classId: '6A1',
      lessonId: 'G6-L03',
      schoolYear: '2026-2027'
    });
    assert(exitTickets.success && exitTickets.data.summary.hieu_ro === 1, 'Teacher getClassExitTickets must read G6-L03 Exit Ticket');
    return 'All writes routed via LessonBridge; Teacher Dashboard V3 reads progress, Product 1/2 (pending teacher eval), responses & Exit Ticket';
  });

  // --------------------------------------------------------------------------
  // P3-20: Phase 2 validator regression PASS
  // --------------------------------------------------------------------------
  await test('P3-20', 'Phase 2 validator & Requirement Text Audit (38/38) regression PASS', () => {
    const auditRes = runAuditCli({ syncRequirements: false });
    assert(auditRes.matchCount === 38 && auditRes.mismatchCount === 0, '38/38 audit failed');
    const valRes = validator.validateDataset(fullDataset);
    assert(valRes.valid === true && valRes.errorCount === 0, 'CurriculumValidator failed on normalized Grade 6 dataset');
    return '38/38 officialText audit = TRUE; CurriculumValidator 0 errors across 94 entities';
  });

  // ==========================================================================
  // NEGATIVE & FIX VERIFICATION TESTS (P3-FIX-01 .. P3-FIX-10)
  // ==========================================================================
  function makeIsolatedController() {
    const fakeBridge = {
      getStudent: () => ({
        studentUid: 'STD-TEST-01',
        studentId: '6A1-99',
        fullName: 'Học sinh Kiểm thử',
        classId: '6A1',
        grade: 6,
        schoolLevel: 'THCS',
        schoolYear: '2026-2027'
      }),
      getProgress: async () => ({
        lessonId: 'G6-L03',
        status: 'not_started',
        currentActivityId: 'G6-L03-A01',
        percentComplete: 0,
        completedActivityIds: [],
        responses: {},
        exitTicket: null
      }),
      startLesson: () => {},
      startLearningSession: () => {},
      endLearningSession: () => {},
      saveProgress: () => {},
      markActivityCompleted: () => {},
      saveResponse: () => ({ eventId: 'ev_1', attemptNumber: 1 }),
      submitExitTicket: async () => ({ submitted: true }),
      completeLesson: async () => ({ completed: true, missing: [] })
    };
    return GoldenLessonRenderer.createController({ goldenData, bridge: fakeBridge });
  }

  // P3-FIX-01: FAIL nếu A05 handler chứa hard-coded 1000 / 1000 / 1000 thay vì đọc student input
  await test('P3-FIX-01', 'A05 worksheet handler reads student input (no hard-coded 1000/1000/1000 in handler or input defaults)', () => {
    assert(
      !/submitCapacityWorksheet\s*\(\s*\{\s*["']1KB_in_byte["']\s*:\s*["']1000["']/s.test(rendererRaw),
      'Found forbidden hard-coded submitCapacityWorksheet({ "1KB_in_byte": "1000", ... }) in golden-lesson-renderer.js'
    );
    assert(
      !/const\s+payload\s*=\s*rowsData\s*\|\|\s*\{\s*["']1KB_in_byte["']\s*:\s*["']1000["']/s.test(rendererRaw),
      'Found forbidden default 1000 fallback inside submitCapacityWorksheet'
    );
    assert(
      rendererRaw.includes('id="ws-kb-byte"') &&
        rendererRaw.includes('id="ws-mb-kb"') &&
        rendererRaw.includes('id="ws-gb-mb"'),
      'A05 must render 3 real student input boxes (#ws-kb-byte, #ws-mb-kb, #ws-gb-mb)'
    );

    const ctrl = makeIsolatedController();
    const emptyCall = ctrl.submitCapacityWorksheet();
    assert(emptyCall.ok === false && emptyCall.isCorrect === false, 'Calling submitCapacityWorksheet() with no student input must FAIL');
    const wrongCall = ctrl.submitCapacityWorksheet({ '1KB_in_byte': '100', '1MB_in_KB': '1000', '1GB_in_MB': '1000' });
    assert(
      wrongCall.ok === false &&
        wrongCall.isCorrect === false &&
        wrongCall.feedback === 'Chưa chính xác.\nEm hãy xem lại thang dung lượng và thử lại.',
      'Wrong student input in A05 must return exact retry feedback'
    );
    return 'A05 renders 3 empty inputs and reads student input without hard-coded 1000';
  });

  // P3-FIX-02: FAIL nếu A06 estimatedCapacity có đáp án mặc định
  await test('P3-FIX-02', 'A06 estimatedCapacity has no prefilled default answer in JSON blueprint or renderer', () => {
    const fields = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A06'].webquest.fields;
    const capField = fields.find(f => f.key === 'estimatedCapacity');
    assert(capField && (!capField.defaultValue || capField.defaultValue === ''), 'G6-L03.golden.json estimatedCapacity must have empty defaultValue');
    assert(
      !/savedProd2\.estimatedCapacity\s*\|\|\s*["'][^"']+["']/.test(rendererRaw),
      'golden-lesson-renderer.js must not prefill estimatedCapacity with a non-empty fallback string'
    );
    return 'A06 estimatedCapacity default value is empty ("")';
  });

  // P3-FIX-03: FAIL nếu A06 selectedDevice có đáp án đúng mặc định
  await test('P3-FIX-03', 'A06 selectedDevice has no prefilled default answer in JSON blueprint or renderer', () => {
    const fields = goldenData.goldenLessonBlueprint.activityComponents['G6-L03-A06'].webquest.fields;
    const devField = fields.find(f => f.key === 'selectedDevice');
    assert(devField && (!devField.defaultValue || devField.defaultValue === ''), 'G6-L03.golden.json selectedDevice must have empty defaultValue');
    assert(
      JSON.stringify(devField.options) ===
        JSON.stringify(['CD 700 MB', 'USB 4 GB', 'USB 16 GB', 'Thẻ nhớ 32 GB', 'Ổ cứng 500 GB']),
      'A06 selectedDevice options must include distractor and valid devices'
    );
    assert(
      !/savedProd2\.selectedDevice\s*\|\|\s*["'][^"']+["']/.test(rendererRaw),
      'golden-lesson-renderer.js must not prefill selectedDevice with a non-empty fallback string'
    );
    return 'A06 selectedDevice has no default selection and includes full device options';
  });

  // P3-FIX-04: FAIL nếu open product tự isCorrect=true/full score chỉ vì non-empty
  await test('P3-FIX-04', 'Open products (PROD-01 and PROD-02) do NOT auto-assign isCorrect=true or full score', () => {
    const ctrl = makeIsolatedController();
    const p1 = ctrl.submitPixelProduct('1111010001000100', 'Giải thích của học sinh chờ giáo viên chấm.');
    assert(p1.ok === true && p1.submitted === true, 'PROD-01 should be accepted as valid submission');
    assert(p1.isCorrect !== true && p1.isCorrect === null, `PROD-01 must have isCorrect=null, got ${p1.isCorrect}`);
    assert(p1.score === null, `PROD-01 must have score=null (not auto full score), got ${p1.score}`);
    assert(p1.evaluationStatus === 'needs_teacher_review', 'PROD-01 must set evaluationStatus=needs_teacher_review');

    const p2 = ctrl.submitStorageAdvisoryProduct({
      need: 'Mang 6 GB dữ liệu học tập',
      estimatedCapacity: '6 GB',
      selectedDevice: 'USB 16 GB',
      reason: 'Vì 16 GB lớn hơn 6 GB và dễ mang đi học.'
    });
    assert(p2.ok === true && p2.submitted === true, 'PROD-02 should be accepted as valid submission');
    assert(p2.isCorrect !== true && p2.isCorrect === null, `PROD-02 must have isCorrect=null, got ${p2.isCorrect}`);
    assert(p2.score === null, `PROD-02 must have score=null (not auto full score 2/2), got ${p2.score}`);
    assert(p2.evaluationStatus === 'needs_teacher_review', 'PROD-02 must set evaluationStatus=needs_teacher_review');
    return 'submission valid != answer correct: PROD-01 & PROD-02 saved with isCorrect=null, score=null, evaluationStatus=needs_teacher_review';
  });

  // P3-FIX-05: FAIL nếu completeActivity(A02) thành công mà PROD-01 hoặc Q002 chưa có
  await test('P3-FIX-05', 'completeActivity(G6-L03-A02) is BLOCKED if PROD-01 or Q002 is missing', () => {
    const ctrl = makeIsolatedController();
    // Neither PROD-01 nor Q002
    const r1 = ctrl.completeActivity('G6-L03-A02');
    assert(r1.ok === false && r1.blocked === true, 'A02 must fail when both PROD-01 and Q002 are missing');

    // Only Q002, no PROD-01
    ctrl.submitQuestion('G6-L03-Q002', '1111010001000100');
    const r2 = ctrl.completeActivity('G6-L03-A02');
    assert(r2.ok === false && r2.blocked === true && r2.missingCodes.includes('G6-L03-PROD-01'), 'A02 must fail when PROD-01 is missing');

    // Only PROD-01, no Q002
    const ctrl2 = makeIsolatedController();
    ctrl2.submitPixelProduct('1111010001000100', 'Số 0 là ô trắng, số 1 là ô tô màu.');
    const r3 = ctrl2.completeActivity('G6-L03-A02');
    assert(r3.ok === false && r3.blocked === true && r3.missingCodes.includes('G6-L03-Q002'), 'A02 must fail when Q002 is missing');
    return 'A02 completion strictly requires both PROD-01 and Q002';
  });

  // P3-FIX-06: FAIL nếu completeActivity(A05) thành công mà worksheet/Q006/Q007 chưa có
  await test('P3-FIX-06', 'completeActivity(G6-L03-A05) is BLOCKED if worksheet, Q006, or Q007 is missing', () => {
    const ctrl = makeIsolatedController();
    // Unlock Period 1 first
    ctrl.submitQuestion('G6-L03-Q001', 'B');
    ctrl.completeActivity('G6-L03-A01');
    ctrl.submitPixelProduct('1111010001000100', 'Số 0 là ô trắng, số 1 là ô tô màu.');
    ctrl.submitQuestion('G6-L03-Q002', '1111010001000100');
    ctrl.completeActivity('G6-L03-A02');
    ctrl.submitQuestion('G6-L03-Q003', 'A');
    ctrl.completeActivity('G6-L03-A03');
    ctrl.submitQuestion('G6-L03-Q004', 'A');
    ctrl.submitQuestion('G6-L03-Q005', 'bit');
    ctrl.completeActivity('G6-L03-A04');

    // Missing all 3 in A05
    assert(ctrl.completeActivity('G6-L03-A05').blocked === true, 'A05 must be blocked when worksheet/Q006/Q007 missing');
    // Only worksheet + Q006, missing Q007
    ctrl.submitCapacityWorksheet({ '1KB_in_byte': '1000', '1MB_in_KB': '1000', '1GB_in_MB': '1000' });
    ctrl.submitQuestion('G6-L03-Q006', 'C');
    const rMissingQ007 = ctrl.completeActivity('G6-L03-A05');
    assert(rMissingQ007.blocked === true && rMissingQ007.missingCodes.includes('G6-L03-Q007'), 'A05 must be blocked when Q007 is missing');
    return 'A05 completion strictly requires valid worksheet + Q006 + Q007';
  });

  // P3-FIX-07: FAIL nếu completeActivity(A06) thành công mà PROD-02/Q008/Q009 chưa có
  await test('P3-FIX-07', 'completeActivity(G6-L03-A06) is BLOCKED if PROD-02, Q008, or Q009 is missing', () => {
    const ctrl = makeIsolatedController();
    ctrl.submitQuestion('G6-L03-Q001', 'B');
    ctrl.completeActivity('G6-L03-A01');
    ctrl.submitPixelProduct('1111010001000100', 'Số 0 là ô trắng, số 1 là ô tô màu.');
    ctrl.submitQuestion('G6-L03-Q002', '1111010001000100');
    ctrl.completeActivity('G6-L03-A02');
    ctrl.submitQuestion('G6-L03-Q003', 'A');
    ctrl.completeActivity('G6-L03-A03');
    ctrl.submitQuestion('G6-L03-Q004', 'A');
    ctrl.submitQuestion('G6-L03-Q005', 'bit');
    ctrl.completeActivity('G6-L03-A04');

    ctrl.submitQuestion('G6-L03-Q008', 'B');
    const r = ctrl.completeActivity('G6-L03-A06');
    assert(
      r.blocked === true &&
        r.missingCodes.includes('G6-L03-PROD-02') &&
        r.missingCodes.includes('G6-L03-Q009') &&
        r.message === 'Còn thiếu:\n- Phiếu tư vấn lưu trữ\n- Câu Q009',
      `Unexpected A06 gate result: ${JSON.stringify(r)}`
    );
    return 'A06 completion strictly requires PROD-02 + Q008 + Q009 with exact missing notice';
  });

  // P3-FIX-08: FAIL nếu student có thể mở Tiết 2 trước A01–A04
  await test('P3-FIX-08', 'Student cannot open Period 2 before A01–A04 are all completed, and Period 1 completion does not auto-open Period 2', () => {
    const ctrl = makeIsolatedController();
    assert(ctrl.isPeriod2Unlocked() === false, 'Period 2 must start locked');
    const s1 = ctrl.switchPeriod(2);
    assert(s1.locked === true && s1.switched === false && ctrl.state.activePeriod === 1, 'switchPeriod(2) must be blocked before A01–A04');
    const e1 = ctrl.enterPeriod2Explicitly();
    assert(e1.locked === true && e1.switched === false && ctrl.state.activePeriod === 1, 'enterPeriod2Explicitly() must be blocked before A01–A04');

    // Complete A01..A04
    ctrl.submitQuestion('G6-L03-Q001', 'B');
    ctrl.completeActivity('G6-L03-A01');
    ctrl.submitPixelProduct('1111010001000100', 'Số 0 là ô trắng, số 1 là ô tô màu.');
    ctrl.submitQuestion('G6-L03-Q002', '1111010001000100');
    ctrl.completeActivity('G6-L03-A02');
    ctrl.submitQuestion('G6-L03-Q003', 'A');
    ctrl.completeActivity('G6-L03-A03');
    ctrl.submitQuestion('G6-L03-Q004', 'A');
    ctrl.submitQuestion('G6-L03-Q005', 'bit');
    ctrl.completeActivity('G6-L03-A04');

    assert(ctrl.isPeriod2Unlocked() === true, 'Period 2 must be unlocked after A01–A04');
    assert(ctrl.state.activePeriod === 1 && ctrl.state.period1CompletedScreenVisible === true, 'Must stay on Period 1 completion screen until student clicks Tiếp tục Tiết 2');

    const e2 = ctrl.enterPeriod2Explicitly();
    assert(e2.switched === true && e2.activePeriod === 2 && ctrl.state.currentActivityId === 'G6-L03-A05', 'Clicking Tiếp tục Tiết 2 must open Period 2 at A05');
    return 'Period 2 lock before A01–A04 and explicit transition to A05 verified';
  });

  // P3-FIX-09: FAIL nếu traceability SourceID không tồn tại trong sources-g6.json
  await test('P3-FIX-09', 'Every SourceID in PHASE3_TRACEABILITY_REPORT.md exists in data/curriculum/sources-g6.json', () => {
    const sourcesData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data/curriculum/sources-g6.json'), 'utf8'));
    const validSourceIds = new Set(sourcesData.map(s => s.sourceId));
    const traceReport = fs.readFileSync(path.join(REPO_ROOT, 'PHASE3_TRACEABILITY_REPORT.md'), 'utf8');
    const matchedIds = traceReport.match(/SRC-[A-Z0-9-]+/g) || [];
    assert(matchedIds.length > 0, 'No SRC-* IDs found in PHASE3_TRACEABILITY_REPORT.md');
    const invalidIds = Array.from(new Set(matchedIds)).filter(id => !validSourceIds.has(id));
    assert(
      invalidIds.length === 0,
      `Found unapproved SourceIDs in PHASE3_TRACEABILITY_REPORT.md not in sources-g6.json: ${invalidIds.join(', ')}`
    );
    return `All ${new Set(matchedIds).size} SourceIDs in PHASE3_TRACEABILITY_REPORT.md exist in sources-g6.json`;
  });

  // P3-FIX-10: FAIL nếu officialText trong traceability khác requirements-g6.json
  await test('P3-FIX-10', 'Every officialText in PHASE3_TRACEABILITY_REPORT.md matches data/requirements/requirements-g6.json verbatim', () => {
    const reqsData = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'data/requirements/requirements-g6.json'), 'utf8'));
    const reqMap = new Map(reqsData.map(r => [r.requirementId, r.officialText]));
    const traceReport = fs.readFileSync(path.join(REPO_ROOT, 'PHASE3_TRACEABILITY_REPORT.md'), 'utf8');

    for (const rId of ['G6-A-07', 'G6-A-08', 'G6-A-09', 'G6-A-10']) {
      const expectedText = reqMap.get(rId);
      assert(expectedText, `Missing ${rId} in requirements-g6.json`);
      const escapedId = rId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rowRegex = new RegExp(`\\|\\s*\`${escapedId}\`\\s*\\|\\s*([^|]+?)\\s*\\|\\s*\`G6-L03-A`, 'm');
      const m = traceReport.match(rowRegex);
      assert(m && m[1], `Could not find officialText table row for ${rId} in PHASE3_TRACEABILITY_REPORT.md`);
      const actualText = m[1].trim();
      assert(
        actualText === expectedText,
        `officialText mismatch for ${rId} in PHASE3_TRACEABILITY_REPORT.md:\n  Expected: "${expectedText}"\n  Actual:   "${actualText}"`
      );
    }
    return 'All 4 officialText entries (G6-A-07..10) in PHASE3_TRACEABILITY_REPORT.md match requirements-g6.json verbatim';
  });

  console.log('\n================================================================');
  console.log(`PHASE 3 / P3.3 SUMMARY: ${passed}/${passed + failed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runP3Suite();
}

module.exports = { runP3Suite };
