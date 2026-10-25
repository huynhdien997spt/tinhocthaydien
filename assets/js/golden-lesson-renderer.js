// golden-lesson-renderer.js – Reference Renderer cho Golden Lesson G6-L03 (Phase 3 / P3.3).
// KHÔNG phải generic Learning Engine của Phase 5.
// Mọi thao tác đọc/ghi tiến độ, câu trả lời, sản phẩm học tập, Exit Ticket và phiên học
// đều đi qua LessonBridge -> ProgressService / ResponseService / LearningTimer -> ApiClient.
// Tuyệt đối không gọi trực tiếp Google Apps Script URL từ bài học.

(function () {
  const PERIOD1_ACTIVITIES = ["G6-L03-A01", "G6-L03-A02", "G6-L03-A03", "G6-L03-A04"];
  const PERIOD2_ACTIVITIES = ["G6-L03-A05", "G6-L03-A06", "G6-L03-A07", "G6-L03-A08"];
  const ALL_REQUIRED_ACTIVITIES = PERIOD1_ACTIVITIES.concat(PERIOD2_ACTIVITIES);
  const PERIOD2_LOCK_NOTICE = "Hoàn thành Checkpoint Tiết 1 để mở Tiết 2.";
  const WORKSHEET_WRONG_FEEDBACK = "Chưa chính xác.\nEm hãy xem lại thang dung lượng và thử lại.";

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeTextAnswer(v) {
    return String(v == null ? "" : v)
      .trim()
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  /**
   * Chuẩn hóa map responses từ getLessonProgress() (có thể là Array hoặc Object).
   */
  function normalizeResponsesMap(rawResponses) {
    const map = {};
    if (!rawResponses) return map;
    if (Array.isArray(rawResponses)) {
      rawResponses.forEach(r => {
        if (r && r.questionId) map[r.questionId] = r;
      });
      return map;
    }
    if (typeof rawResponses === "object") {
      Object.keys(rawResponses).forEach(k => {
        if (rawResponses[k]) map[k] = rawResponses[k];
      });
    }
    return map;
  }

  /**
   * Tính toán trạng thái khôi phục (resume logic) từ dữ liệu getLessonProgress().
   */
  function resolveResumeState(progressObj, goldenData) {
    const reqActs =
      (goldenData &&
        goldenData.lesson &&
        goldenData.lesson.assessmentPlan &&
        goldenData.lesson.assessmentPlan.requiredActivities) ||
      ALL_REQUIRED_ACTIVITIES;

    const doneSet = new Set((progressObj && progressObj.completedActivityIds) || []);
    const completedList = reqActs.filter(id => doneSet.has(id));
    const firstIncompleteActivityId = reqActs.find(id => !doneSet.has(id)) || null;
    const period1Done = PERIOD1_ACTIVITIES.every(id => doneSet.has(id));
    const allActivitiesDone = reqActs.every(id => doneSet.has(id));

    let percentComplete = Math.round((completedList.length / reqActs.length) * 100);
    if (progressObj && progressObj.status === "completed") {
      percentComplete = 100;
    } else if (period1Done && completedList.length === 4) {
      percentComplete = 50;
    }

    // Khi resume từ tiến độ đã lưu có A01–A04 hoàn thành: Tiết 2 được mở và chọn A05.
    const activePeriod = period1Done && firstIncompleteActivityId ? 2 : 1;
    const isResumingAtPeriod2Start =
      period1Done && firstIncompleteActivityId === "G6-L03-A05";

    return {
      status: (progressObj && progressObj.status) || (completedList.length > 0 ? "in_progress" : "not_started"),
      completedActivityIds: completedList,
      percentComplete,
      firstIncompleteActivityId: firstIncompleteActivityId || "G6-L03-A08",
      currentActivityId: firstIncompleteActivityId || (progressObj && progressObj.currentActivityId) || "G6-L03-A01",
      activePeriod,
      period1Done,
      period2Locked: !period1Done,
      allActivitiesDone,
      isResumingAtPeriod2Start,
      resumeBannerText: isResumingAtPeriod2Start
        ? "Tiếp tục Tiết 2 · Tiến độ: 50% · Bắt đầu từ A05"
        : null,
      responses: normalizeResponsesMap(progressObj && progressObj.responses),
      exitTicket: (progressObj && progressObj.exitTicket) || null
    };
  }

  /**
   * Chuẩn hóa và chấm chuỗi 4 đơn vị cơ bản theo thứ tự từ nhỏ đến lớn cho G6-L03-Q011 (G6-A-09).
   * Chấp nhận các dấu phân tách: phẩy, chấm phẩy, >, →, gạch nối, khoảng trắng.
   * Chấp nhận tên viết tắt chuẩn hoặc tên đầy đủ (tiếng Anh/Việt).
   * Bắt buộc đúng đủ 4 đơn vị và đúng thứ tự: Byte -> KB -> MB -> GB.
   * Không chấp nhận "B, KB, MB, GB".
   */
  function evaluateUnitNamesSequence(raw) {
    const norm = String(raw == null ? "" : raw).toLowerCase().trim();
    const tokens = norm.split(/[,;>→\->\s]+/).filter(Boolean);
    if (tokens.length !== 4) return false;
    const isU1 = tokens[0] === "byte";
    const isU2 = tokens[1] === "kb" || tokens[1] === "kilobyte";
    const isU3 = tokens[2] === "mb" || tokens[2] === "megabyte";
    const isU4 = tokens[3] === "gb" || tokens[3] === "gigabyte";
    return isU1 && isU2 && isU3 && isU4;
  }

  /**
   * Làm sạch văn bản giải thích phản hồi khi hiển thị cho học sinh, loại bỏ các mã kĩ thuật nội bộ (G6-A-xx, G6-L03-Qxx).
   */
  function formatStudentExplanation(raw) {
    if (!raw) return "";
    let text = String(raw);
    text = text.replace(/Theo YCCĐ\s+G6-A-\d+(?:\s*\([^)]*\))?,\s*/gi, "");
    text = text.replace(/\s*\([^)]*G6-A-\d+[^)]*\)/gi, "");
    text = text.replace(/\b(?:G6-A-\d+|G6-L03-Q\d+|G6-L03-A\d+)\b/gi, "");
    text = text.trim();
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1);
    }
    return text;
  }

  /**
   * Làm sạch hướng dẫn hoặc mục tiêu hoạt động khi hiển thị cho học sinh.
   */
  function formatStudentText(str) {
    if (!str) return "";
    let text = String(str);
    text = text.replace(/\s*\([^)]*G6-A-\d+[^)]*\)/gi, "");
    text = text.replace(/\s*(?:không phải\s+)?tiêu chí bắt buộc của\s*G6-A-\d+/gi, "");
    text = text.replace(/\s*(?:yêu cầu cần đạt của Tiết 1|yêu cầu cần đạt|YCCĐ:?)\s*G6-A-\d+/gi, "");
    text = text.replace(/\bG6-A-\d+\b/gi, "");
    text = text.replace(/câu hỏi\s+khởi động\s+G6-L03-Q\d+/gi, "câu hỏi khởi động");
    text = text.replace(/câu hỏi\s+G6-L03-Q\d+\s*,\s*G6-L03-Q\d+/gi, "các câu hỏi");
    text = text.replace(/câu hỏi\s+G6-L03-Q\d+\s+và\s+câu hỏi\s+G6-L03-Q\d+/gi, "các câu hỏi");
    text = text.replace(/câu hỏi\s+G6-L03-Q\d+\s+và\s+G6-L03-Q\d+/gi, "các câu hỏi");
    text = text.replace(/câu hỏi\s+G6-L03-Q\d+/gi, "câu hỏi");
    text = text.replace(/\s*\(G6-L03-Q\d+\)/gi, "");
    text = text.replace(/G6-L03-Q\d+\s*/gi, "");
    text = text.replace(/\s{2,}/g, " ").trim();
    return text;
  }

  /**
   * Chấm câu trả lời của một Question đóng (single_choice / short_answer) trong G6-L03.
   * Không tiết lộ đáp án đúng trước lần nộp đầu tiên.
   */
  function evaluateQuestionSubmission(questionObj, submittedValue) {
    if (!questionObj) {
      throw new Error("Missing questionObj");
    }
    const qType = questionObj.questionType;
    let isCorrect = false;
    if (qType === "single_choice") {
      isCorrect = String(submittedValue == null ? "" : submittedValue).trim() === String(questionObj.correctAnswer).trim();
    } else if (qType === "short_answer") {
      if (questionObj.questionId === "G6-L03-Q011") {
        isCorrect = evaluateUnitNamesSequence(submittedValue);
      } else {
        isCorrect = normalizeTextAnswer(submittedValue) === normalizeTextAnswer(questionObj.correctAnswer);
      }
    } else {
      isCorrect = String(submittedValue == null ? "" : submittedValue).trim() === String(questionObj.correctAnswer).trim();
    }
    const maxScore = Number(questionObj.maxScore) || 1;
    const score = isCorrect ? maxScore : 0;
    return {
      questionId: questionObj.questionId,
      requirementId: questionObj.requirementId,
      isCorrect,
      score,
      maxScore,
      explanation: questionObj.explanation
    };
  }

  /**
   * Kiểm tra tính hợp lí của dung lượng ước lượng & thiết bị lưu trữ trong A06 ( ~6 GB ).
   */
  function validateStorageAdvisoryLogic(need, estimatedCapacity, selectedDevice, reason) {
    if (!need || !estimatedCapacity || !selectedDevice || reason.length < 5) {
      return {
        valid: false,
        error: "Em hãy điền đầy đủ Nhu cầu, Dung lượng ước lượng, Thiết bị chọn và Lí do trong Phiếu tư vấn lưu trữ."
      };
    }

    // Kiểm tra dung lượng ước lượng có hợp lí với bài toán ~6 GB (≈ 6000 MB) không
    const capNorm = estimatedCapacity.toLowerCase().replace(/\s+/g, "");
    const plausibleCap =
      /^(khoảng|xấpxỉ|~|≈)?(6gb|6000mb|6gb\(≈6000mb\)|6000mb\(≈6gb\)|[5-8]gb|[5-8]000mb)/.test(capNorm) ||
      /\b(6\s*gb|6\.?000\s*mb|6\s*000\s*mb)\b/i.test(estimatedCapacity);
    if (!plausibleCap) {
      return {
        valid: false,
        error: "Dung lượng ước lượng chưa hợp lí so với tình huống (khoảng 6 GB hay 6000 MB). Em hãy quy đổi và ước lượng lại."
      };
    }

    // Kiểm tra thiết bị được chọn có đủ dung lượng >= 6 GB không (CD 700 MB và USB 4 GB không đủ lưu 6 GB)
    const devNorm = selectedDevice.toLowerCase();
    const isInsufficientDevice =
      devNorm.includes("700 mb") ||
      devNorm.includes("700mb") ||
      devNorm.includes("cd") ||
      devNorm.includes("4 gb") ||
      devNorm.includes("4gb") ||
      devNorm.includes("2 gb") ||
      devNorm.includes("2gb");
    const isSufficientDevice =
      !isInsufficientDevice &&
      (devNorm.includes("16 gb") ||
        devNorm.includes("16gb") ||
        devNorm.includes("32 gb") ||
        devNorm.includes("32gb") ||
        devNorm.includes("500 gb") ||
        devNorm.includes("500gb") ||
        devNorm.includes("64 gb") ||
        devNorm.includes("128 gb") ||
        devNorm.includes("256 gb") ||
        devNorm.includes("1 tb"));

    if (!isSufficientDevice) {
      return {
        valid: false,
        error: "Thiết bị đã chọn không đủ dung lượng để lưu khoảng 6 GB dữ liệu. Em hãy so sánh lại dung lượng thiết bị và chọn thiết bị lớn hơn 6 GB."
      };
    }

    return { valid: true, error: null };
  }

  /**
   * Controller/Renderer điều phối trạng thái bài học G6-L03 qua LessonBridge.
   */
  function createController(options) {
    const opts = options || {};
    const bridge = opts.bridge || (typeof window !== "undefined" ? window.LessonBridge : null);
    const goldenData = opts.goldenData;
    if (!goldenData || !goldenData.lesson) {
      throw new Error("GoldenLessonRenderer: thiếu dữ liệu G6-L03.golden.json");
    }

    const activitiesById = new Map((goldenData.activities || []).map(a => [a.activityId, a]));
    const questionsById = new Map((goldenData.questions || []).map(q => [q.questionId, q]));
    const compById = (goldenData.goldenLessonBlueprint && goldenData.goldenLessonBlueprint.activityComponents) || {};

    const state = {
      lessonId: goldenData.lesson.lessonId || "G6-L03",
      legacyLessonId: goldenData.lesson.legacyLessonId || "G6-B3",
      student: null,
      status: "not_started",
      completedActivityIds: new Set(),
      responses: {},
      exitTicket: null,
      percentComplete: 0,
      currentActivityId: "G6-L03-A01",
      activePeriod: 1,
      period2Locked: true,
      period2LockMessage: PERIOD2_LOCK_NOTICE,
      period1CompletedScreenVisible: false,
      period1BannerText: "",
      resumeBannerText: null,
      deviceInspectMode: "SIMULATION",
      worksheetFeedback: null,
      productFeedback: {
        "G6-L03-PROD-01": null,
        "G6-L03-PROD-02": null
      },
      activityGateErrors: {},
      supportTierShown: {
        "G6-L03-A02": 0,
        "G6-L03-A05": 0,
        "G6-L03-A06": 0
      },
      pixelGrid4x4: [
        [1, 1, 1, 1],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0]
      ]
    };

    function isPeriod2Unlocked() {
      return PERIOD1_ACTIVITIES.every(id => state.completedActivityIds.has(id));
    }

    async function init() {
      state.student = bridge.getStudent();
      if (!state.student) {
        return { authenticated: false, state };
      }

      const loaded = await bridge.getProgress();
      const resumed = resolveResumeState(loaded, goldenData);
      state.status = resumed.status;
      state.completedActivityIds = new Set(resumed.completedActivityIds);
      state.responses = Object.assign({}, resumed.responses);
      state.exitTicket = resumed.exitTicket;
      state.percentComplete = resumed.percentComplete;
      state.currentActivityId = resumed.currentActivityId;
      state.period2Locked = !resumed.period1Done;
      state.activePeriod = resumed.period1Done ? resumed.activePeriod : 1;
      state.period1CompletedScreenVisible = false;
      state.resumeBannerText = resumed.resumeBannerText;
      state.activityGateErrors = {};

      bridge.startLesson();
      bridge.startLearningSession();
      return { authenticated: true, state, resumed };
    }

    function getQuestionVisibleFeedback(questionId) {
      const r = state.responses[questionId];
      if (!r || !r.attemptNumber || r.attemptNumber < 1) {
        // Tuyệt đối không hiển thị đáp án hay giải thích trước lần nộp đầu tiên
        return { attempted: false, showExplanation: false, explanation: null, canRetry: false };
      }
      const q = questionsById.get(questionId);
      return {
        attempted: true,
        attemptNumber: r.attemptNumber,
        isCorrect: r.isCorrect,
        responseValue: r.responseValue,
        showExplanation: true,
        explanation: q ? q.explanation : "",
        canRetry: r.isCorrect === false
      };
    }

    function submitQuestion(questionId, rawValue) {
      const q = questionsById.get(questionId);
      if (!q) throw new Error("Unknown questionId: " + questionId);
      const cleanVal = String(rawValue == null ? "" : rawValue).trim();
      if (!cleanVal) {
        return { ok: false, submitted: false, error: "Em hãy nhập hoặc chọn câu trả lời trước khi nộp." };
      }
      const evalRes = evaluateQuestionSubmission(q, cleanVal);
      const saved = bridge.saveResponse({
        activityId: q.activityId,
        questionId: q.questionId,
        requirementId: q.requirementId,
        questionText: q.questionText,
        questionType: q.questionType,
        responseType: q.questionType,
        responseValue: cleanVal,
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        maxScore: evalRes.maxScore,
        required: true
      });
      state.responses[q.questionId] = {
        activityId: q.activityId,
        questionId: q.questionId,
        requirementId: q.requirementId,
        questionText: q.questionText,
        questionType: q.questionType,
        responseType: q.questionType,
        responseValue: cleanVal,
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        maxScore: evalRes.maxScore,
        attemptNumber: (saved && saved.attemptNumber) || 1,
        submittedAt: new Date().toISOString(),
        required: true
      };
      delete state.activityGateErrors[q.activityId];
      return Object.assign({ ok: true, submitted: true }, evalRes, {
        attemptNumber: state.responses[q.questionId].attemptNumber,
        canRetry: !evalRes.isCorrect
      });
    }

    function togglePixelCell(rowIdx, colIdx) {
      if (rowIdx < 0 || rowIdx >= 4 || colIdx < 0 || colIdx >= 4) return;
      state.pixelGrid4x4[rowIdx][colIdx] = state.pixelGrid4x4[rowIdx][colIdx] ? 0 : 1;
      return getPixelBitString();
    }

    function getPixelBitString() {
      return state.pixelGrid4x4.map(row => row.join("")).join("");
    }

    /**
     * Nộp Sản phẩm 1 (A02):
     * - Kiểm tra chuỗi 16 bit khớp mẫu mục tiêu (1111010001000100) và có câu giải thích.
     * - Nguyên tắc Blocker 3: submission valid != answer correct đối với câu giải thích mở.
     *   Lưu evidence với evaluationStatus = "needs_teacher_review", isCorrect = null, score = null (KHÔNG auto full score).
     */
    function submitPixelProduct(bitString, explanationSentence) {
      const cleanBits = String(bitString == null ? getPixelBitString() : bitString).trim();
      const cleanExp = String(explanationSentence || "").trim();
      if (!/^[01]{16}$/.test(cleanBits) || cleanExp.length < 5) {
        const err = "Em cần tạo đủ chuỗi 16 bit (0 và 1) và viết 1 câu giải thích số 0, số 1 đang biểu diễn điều gì.";
        state.productFeedback["G6-L03-PROD-01"] = { ok: false, message: err };
        return { ok: false, submitted: false, isCorrect: null, score: null, error: err };
      }

      const targetBits =
        (compById["G6-L03-A02"] &&
          compById["G6-L03-A02"].pixelLab &&
          compById["G6-L03-A02"].pixelLab.targetBitString) ||
        "1111010001000100";
      const bitStringMatched = cleanBits === targetBits;
      if (!bitStringMatched) {
        const err = "Chuỗi 16 bit trên lưới chưa khớp với hình chữ T mẫu (Hàng 1: 1111; Hàng 2, 3, 4: 0100). Em hãy chạm lại các ô trên lưới và thử lại.";
        state.productFeedback["G6-L03-PROD-01"] = { ok: false, message: err };
        return { ok: false, submitted: false, bitStringMatched: false, isCorrect: null, score: null, error: err };
      }

      const payload = {
        bitString: cleanBits,
        bitStringMatched: true,
        explanationSentence: cleanExp,
        evaluationStatus: "needs_teacher_review"
      };
      const saved = bridge.saveResponse({
        activityId: "G6-L03-A02",
        questionId: "G6-L03-PROD-01",
        questionText: "Sản phẩm 1: Chuỗi bit 4×4 và 1 câu giải thích 0, 1 đang biểu diễn điều gì",
        responseType: "short_answer",
        responseValue: payload,
        isCorrect: null,
        score: null,
        maxScore: 1,
        required: true
      });
      state.responses["G6-L03-PROD-01"] = {
        activityId: "G6-L03-A02",
        questionId: "G6-L03-PROD-01",
        responseType: "short_answer",
        responseValue: payload,
        submitted: true,
        evaluationStatus: "needs_teacher_review",
        isCorrect: null,
        score: null,
        maxScore: 1,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };
      state.productFeedback["G6-L03-PROD-01"] = {
        ok: true,
        message: "Đã lưu Sản phẩm 1 (Chuỗi 16 bit hợp lệ; câu giải thích đã gửi để giáo viên đánh giá)."
      };
      delete state.activityGateErrors["G6-L03-A02"];
      return {
        ok: true,
        submitted: true,
        bitStringMatched: true,
        evaluationStatus: "needs_teacher_review",
        isCorrect: null,
        score: null,
        maxScore: 1,
        product: payload,
        attemptNumber: state.responses["G6-L03-PROD-01"].attemptNumber
      };
    }

    /**
     * Nộp bảng quy đổi dung lượng trong A05:
     * - Đọc trực tiếp giá trị học sinh nhập cho 3 ô (1KB_in_byte, 1MB_in_KB, 1GB_in_MB).
     * - Tuyệt đối không có giá trị mặc định hard-code.
     * - Nếu sai: trả thông báo "Chưa chính xác.\nEm hãy xem lại thang dung lượng và thử lại."
     */
    function submitCapacityWorksheet(rowsData) {
      if (!rowsData || typeof rowsData !== "object") {
        state.worksheetFeedback = { ok: false, message: WORKSHEET_WRONG_FEEDBACK };
        return {
          ok: false,
          submitted: false,
          isCorrect: false,
          feedback: WORKSHEET_WRONG_FEEDBACK
        };
      }

      const vKb = String(rowsData["1KB_in_byte"] == null ? "" : rowsData["1KB_in_byte"]).trim();
      const vMb = String(rowsData["1MB_in_KB"] == null ? "" : rowsData["1MB_in_KB"]).trim();
      const vGb = String(rowsData["1GB_in_MB"] == null ? "" : rowsData["1GB_in_MB"]).trim();

      if (!vKb || !vMb || !vGb) {
        const emptyMsg = "Chưa chính xác.\nEm hãy xem lại thang dung lượng và thử lại.";
        state.worksheetFeedback = { ok: false, message: emptyMsg };
        return {
          ok: false,
          submitted: false,
          isCorrect: false,
          feedback: emptyMsg
        };
      }

      const payload = {
        "1KB_in_byte": vKb,
        "1MB_in_KB": vMb,
        "1GB_in_MB": vGb
      };

      const wsRows =
        (compById["G6-L03-A05"] &&
          compById["G6-L03-A05"].capacityScale &&
          compById["G6-L03-A05"].capacityScale.worksheetRows) ||
        [];
      const expectedKb = (wsRows[0] && wsRows[0].approxValue) || "";
      const expectedMb = (wsRows[1] && wsRows[1].approxValue) || "";
      const expectedGb = (wsRows[2] && wsRows[2].approxValue) || "";

      const isOk =
        normalizeTextAnswer(vKb) === normalizeTextAnswer(expectedKb) &&
        normalizeTextAnswer(vMb) === normalizeTextAnswer(expectedMb) &&
        normalizeTextAnswer(vGb) === normalizeTextAnswer(expectedGb);

      const saved = bridge.saveResponse({
        activityId: "G6-L03-A05",
        questionId: "G6-L03-WS-01",
        questionText: "Bảng quy đổi gần đúng hệ thập phân giữa Byte, KB, MB, GB",
        responseType: "worksheet_table",
        responseValue: payload,
        isCorrect: isOk,
        score: isOk ? 1 : 0,
        maxScore: 1,
        required: true
      });
      state.responses["G6-L03-WS-01"] = {
        activityId: "G6-L03-A05",
        questionId: "G6-L03-WS-01",
        responseType: "worksheet_table",
        responseValue: payload,
        submitted: true,
        isCorrect: isOk,
        score: isOk ? 1 : 0,
        maxScore: 1,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };

      const feedbackMsg = isOk
        ? "Chính xác! Em đã hoàn thành đúng bảng quy đổi gần đúng theo hệ thập phân."
        : WORKSHEET_WRONG_FEEDBACK;
      state.worksheetFeedback = { ok: isOk, message: feedbackMsg };
      if (isOk) {
        delete state.activityGateErrors["G6-L03-A05"];
      }
      return {
        ok: isOk,
        submitted: true,
        isCorrect: isOk,
        canRetry: !isOk,
        feedback: feedbackMsg,
        worksheet: payload
      };
    }

    /**
     * Nộp Sản phẩm 2 (A06 – PHIẾU TƯ VẤN LƯU TRỮ):
     * - Lưu đúng 4 trường: need, estimatedCapacity, selectedDevice, reason.
     * - Kiểm tra tính hợp lí của dung lượng ước lượng & thiết bị được chọn.
     * - Nguyên tắc Blocker 3: submission valid != answer correct đối với phần giải thích mở.
     *   Lưu evidence với evaluationStatus = "needs_teacher_review", isCorrect = null, score = null (KHÔNG auto full score).
     */
    function submitStorageAdvisoryProduct(advisory) {
      const need = String((advisory && (advisory.need || advisory.needDescription)) || "").trim();
      const estimatedCapacity = String((advisory && advisory.estimatedCapacity) || "").trim();
      const selectedDevice = String((advisory && advisory.selectedDevice) || "").trim();
      const reason = String((advisory && advisory.reason) || "").trim();

      const check = validateStorageAdvisoryLogic(need, estimatedCapacity, selectedDevice, reason);
      if (!check.valid) {
        state.productFeedback["G6-L03-PROD-02"] = { ok: false, message: check.error };
        return {
          ok: false,
          submitted: false,
          validationPassed: false,
          isCorrect: null,
          score: null,
          error: check.error
        };
      }

      const payload = {
        need,
        estimatedCapacity,
        selectedDevice,
        reason,
        validationPassed: true,
        evaluationStatus: "needs_teacher_review"
      };
      const saved = bridge.saveResponse({
        activityId: "G6-L03-A06",
        questionId: "G6-L03-PROD-02",
        questionText: "Sản phẩm 2: PHIẾU TƯ VẤN LƯU TRỮ (Nhu cầu, Dung lượng ước lượng, Thiết bị chọn, Lí do)",
        responseType: "worksheet_table",
        responseValue: payload,
        isCorrect: null,
        score: null,
        maxScore: 2,
        required: true
      });
      state.responses["G6-L03-PROD-02"] = {
        activityId: "G6-L03-A06",
        questionId: "G6-L03-PROD-02",
        responseType: "worksheet_table",
        responseValue: payload,
        submitted: true,
        validationPassed: true,
        evaluationStatus: "needs_teacher_review",
        isCorrect: null,
        score: null,
        maxScore: 2,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };
      state.productFeedback["G6-L03-PROD-02"] = {
        ok: true,
        message: "Đã lưu Phiếu tư vấn lưu trữ (dữ liệu hợp lệ; phần lập luận đã gửi để giáo viên đánh giá)."
      };
      delete state.activityGateErrors["G6-L03-A06"];
      return {
        ok: true,
        submitted: true,
        validationPassed: true,
        evaluationStatus: "needs_teacher_review",
        isCorrect: null,
        score: null,
        maxScore: 2,
        product: payload,
        attemptNumber: state.responses["G6-L03-PROD-02"].attemptNumber
      };
    }

    function setDeviceInspectMode(mode) {
      if (mode !== "REAL_DEVICE" && mode !== "SIMULATION") {
        throw new Error("Invalid mode: " + mode);
      }
      state.deviceInspectMode = mode;
      return state.deviceInspectMode;
    }

    function revealNextSupportTier(activityId) {
      const comp = compById[activityId];
      if (!comp || !comp.support3Tier || !Array.isArray(comp.support3Tier.tiers)) {
        return null;
      }
      const cur = state.supportTierShown[activityId] || 0;
      const next = Math.min(comp.support3Tier.tiers.length, cur + 1);
      state.supportTierShown[activityId] = next;
      return comp.support3Tier.tiers.slice(0, next);
    }

    function hasQuestionSubmitted(qId) {
      const r = state.responses[qId];
      if (!r) return false;
      const val = r.responseValue;
      return Boolean((r.attemptNumber && r.attemptNumber >= 1) || (val !== undefined && val !== null && String(val).trim() !== ""));
    }

    function hasProd1Submitted() {
      const r = state.responses["G6-L03-PROD-01"];
      if (!r || !r.responseValue) return false;
      const v = r.responseValue;
      return Boolean(
        v &&
          typeof v === "object" &&
          /^[01]{16}$/.test(String(v.bitString || "")) &&
          v.bitStringMatched !== false &&
          String(v.explanationSentence || "").trim().length >= 5
      );
    }

    function hasWorksheetA05Completed() {
      const r = state.responses["G6-L03-WS-01"];
      return Boolean(r && r.isCorrect === true);
    }

    function hasProd2Submitted() {
      const r = state.responses["G6-L03-PROD-02"];
      if (!r || !r.responseValue) return false;
      const v = r.responseValue;
      if (!v || typeof v !== "object") return false;
      const need = String(v.need || v.needDescription || "").trim();
      const cap = String(v.estimatedCapacity || "").trim();
      const dev = String(v.selectedDevice || "").trim();
      const reason = String(v.reason || "").trim();
      return Boolean(need && cap && dev && reason.length >= 5 && v.validationPassed !== false);
    }

    /**
     * Kiểm tra điều kiện minh chứng bắt buộc trước khi cho phép hoàn thành từng hoạt động A01–A08.
     */
    function canCompleteActivity(activityId) {
      if (!activitiesById.has(activityId)) {
        throw new Error("Unknown activityId: " + activityId);
      }

      const missing = [];
      const missingCodes = [];

      if (activityId === "G6-L03-A01") {
        if (!hasQuestionSubmitted("G6-L03-Q001")) {
          missing.push("Câu Q001");
          missingCodes.push("G6-L03-Q001");
        }
      } else if (activityId === "G6-L03-A02") {
        if (!hasProd1Submitted()) {
          missing.push("Sản phẩm 1 (Chuỗi bit 4×4 và câu giải thích)");
          missingCodes.push("G6-L03-PROD-01");
        }
        if (!hasQuestionSubmitted("G6-L03-Q002")) {
          missing.push("Câu Q002");
          missingCodes.push("G6-L03-Q002");
        }
      } else if (activityId === "G6-L03-A03") {
        if (!hasQuestionSubmitted("G6-L03-Q003")) {
          missing.push("Câu Q003");
          missingCodes.push("G6-L03-Q003");
        }
      } else if (activityId === "G6-L03-A04") {
        ["G6-L03-A01", "G6-L03-A02", "G6-L03-A03"].forEach(prevId => {
          if (!state.completedActivityIds.has(prevId)) {
            missing.push("Hoạt động " + prevId);
            missingCodes.push(prevId);
          }
        });
        if (!hasQuestionSubmitted("G6-L03-Q004")) {
          missing.push("Câu Q004");
          missingCodes.push("G6-L03-Q004");
        }
        if (!hasQuestionSubmitted("G6-L03-Q005")) {
          missing.push("Câu Q005");
          missingCodes.push("G6-L03-Q005");
        }
      } else if (activityId === "G6-L03-A05") {
        if (!isPeriod2Unlocked()) {
          missing.push("Hoàn thành Checkpoint Tiết 1 (A01–A04)");
          missingCodes.push("PERIOD1_LOCKED");
        }
        if (!hasQuestionSubmitted("G6-L03-Q011")) {
          missing.push("Câu Q011 (Nêu 4 đơn vị cơ bản Byte, KB, MB, GB)");
          missingCodes.push("G6-L03-Q011");
        }
        if (!hasWorksheetA05Completed()) {
          missing.push("Bảng quy đổi dung lượng (đúng cả 3 ô)");
          missingCodes.push("G6-L03-WS-01");
        }
        if (!hasQuestionSubmitted("G6-L03-Q006")) {
          missing.push("Câu Q006");
          missingCodes.push("G6-L03-Q006");
        }
        if (!hasQuestionSubmitted("G6-L03-Q007")) {
          missing.push("Câu Q007");
          missingCodes.push("G6-L03-Q007");
        }
      } else if (activityId === "G6-L03-A06") {
        if (!isPeriod2Unlocked()) {
          missing.push("Hoàn thành Checkpoint Tiết 1 (A01–A04)");
          missingCodes.push("PERIOD1_LOCKED");
        }
        if (!hasProd2Submitted()) {
          missing.push("Phiếu tư vấn lưu trữ");
          missingCodes.push("G6-L03-PROD-02");
        }
        if (!hasQuestionSubmitted("G6-L03-Q008")) {
          missing.push("Câu Q008");
          missingCodes.push("G6-L03-Q008");
        }
        if (!hasQuestionSubmitted("G6-L03-Q009")) {
          missing.push("Câu Q009");
          missingCodes.push("G6-L03-Q009");
        }
      } else if (activityId === "G6-L03-A07") {
        if (!isPeriod2Unlocked()) {
          missing.push("Hoàn thành Checkpoint Tiết 1 (A01–A04)");
          missingCodes.push("PERIOD1_LOCKED");
        }
        if (!hasQuestionSubmitted("G6-L03-Q010")) {
          missing.push("Câu Q010");
          missingCodes.push("G6-L03-Q010");
        }
      } else if (activityId === "G6-L03-A08") {
        if (!isPeriod2Unlocked()) {
          missing.push("Hoàn thành Checkpoint Tiết 1 (A01–A04)");
          missingCodes.push("PERIOD1_LOCKED");
        }
        if (!state.exitTicket || !state.exitTicket.keyLearning || !state.exitTicket.applicationAnswer) {
          missing.push("Phiếu Exit Ticket hợp lệ");
          missingCodes.push("EXIT_TICKET");
        }
      }

      const canComplete = missing.length === 0;
      const message = canComplete ? "" : "Còn thiếu:\n- " + missing.join("\n- ");
      return {
        activityId,
        canComplete,
        missing,
        missingCodes,
        message
      };
    }

    function completeActivity(activityId) {
      if (!activitiesById.has(activityId)) {
        throw new Error("Unknown activityId: " + activityId);
      }

      const gate = canCompleteActivity(activityId);
      if (!gate.canComplete) {
        state.activityGateErrors[activityId] = gate.message;
        return {
          ok: false,
          blocked: true,
          activityId,
          missing: gate.missing,
          missingCodes: gate.missingCodes,
          message: gate.message,
          completedActivityIds: Array.from(state.completedActivityIds),
          percentComplete: state.percentComplete,
          status: state.status,
          nextActivityId: state.currentActivityId,
          period1BoundaryReached: false
        };
      }

      delete state.activityGateErrors[activityId];
      state.completedActivityIds.add(activityId);
      if (state.status === "not_started") state.status = "in_progress";
      bridge.markActivityCompleted(activityId);

      const doneCount = ALL_REQUIRED_ACTIVITIES.filter(id => state.completedActivityIds.has(id)).length;
      const period1AllDone = PERIOD1_ACTIVITIES.every(id => state.completedActivityIds.has(id));
      state.period2Locked = !period1AllDone;
      const nextIncomplete = ALL_REQUIRED_ACTIVITIES.find(id => !state.completedActivityIds.has(id)) || "G6-L03-A08";

      // Ranh giới kết thúc Tiết 1 (khi hoàn thành A01..A04):
      if (activityId === "G6-L03-A04" && period1AllDone && doneCount === 4) {
        state.percentComplete = 50;
        state.status = "in_progress";
        state.currentActivityId = "G6-L03-A05";
        state.activePeriod = 1; // KHÔNG tự mở nội dung Tiết 2
        state.period1CompletedScreenVisible = true;
        state.period1BannerText =
          "Em đã hoàn thành Tiết 1.\nLần sau em sẽ tiếp tục từ Nhiệm vụ A05.";

        bridge.saveProgress({
          currentActivityId: "G6-L03-A05",
          percentComplete: 50
        });
        // Gọi endLearningSession(false), KHÔNG gọi completeLesson(), KHÔNG tự nhảy sang Tiết 2
        bridge.endLearningSession(false);

        return {
          ok: true,
          blocked: false,
          activityId,
          completedActivityIds: Array.from(state.completedActivityIds),
          percentComplete: 50,
          status: "in_progress",
          nextActivityId: "G6-L03-A05",
          period1BoundaryReached: true,
          period2Unlocked: true,
          activePeriod: 1,
          endedSessionWithCompletedFalse: true,
          completeLessonCalled: false,
          bannerText: state.period1BannerText
        };
      }

      state.percentComplete = Math.round((doneCount / ALL_REQUIRED_ACTIVITIES.length) * 100);
      state.currentActivityId = nextIncomplete;
      bridge.saveProgress({
        currentActivityId: state.currentActivityId,
        percentComplete: state.percentComplete
      });

      return {
        ok: true,
        blocked: false,
        activityId,
        completedActivityIds: Array.from(state.completedActivityIds),
        percentComplete: state.percentComplete,
        status: state.status,
        nextActivityId: state.currentActivityId,
        period1BoundaryReached: false,
        period2Unlocked: period1AllDone
      };
    }

    /**
     * Chuyển tiết học có kiểm tra khóa Tiết 2 trước Checkpoint Tiết 1.
     */
    function switchPeriod(periodNumber) {
      const target = Number(periodNumber) === 2 ? 2 : 1;
      if (target === 2 && !isPeriod2Unlocked()) {
        state.period2Locked = true;
        state.activePeriod = 1;
        state.period2LockMessage = PERIOD2_LOCK_NOTICE;
        return {
          ok: false,
          switched: false,
          locked: true,
          activePeriod: 1,
          message: PERIOD2_LOCK_NOTICE
        };
      }
      state.period2Locked = !isPeriod2Unlocked();
      state.activePeriod = target;
      if (target === 2) {
        state.period1CompletedScreenVisible = false;
        if (!PERIOD2_ACTIVITIES.includes(state.currentActivityId)) {
          state.currentActivityId = "G6-L03-A05";
        }
      }
      return {
        ok: true,
        switched: true,
        locked: false,
        activePeriod: state.activePeriod,
        currentActivityId: state.currentActivityId
      };
    }

    function enterPeriod2Explicitly() {
      if (!isPeriod2Unlocked()) {
        state.period2Locked = true;
        state.activePeriod = 1;
        state.period2LockMessage = PERIOD2_LOCK_NOTICE;
        return {
          ok: false,
          switched: false,
          locked: true,
          activePeriod: 1,
          message: PERIOD2_LOCK_NOTICE
        };
      }
      state.period2Locked = false;
      state.activePeriod = 2;
      state.period1CompletedScreenVisible = false;
      state.currentActivityId = "G6-L03-A05";
      bridge.startLearningSession();
      return {
        ok: true,
        switched: true,
        locked: false,
        activePeriod: 2,
        currentActivityId: "G6-L03-A05"
      };
    }

    async function submitExitTicketAndCompleteA08(ticketData) {
      if (!isPeriod2Unlocked()) {
        return {
          submitted: false,
          blocked: true,
          error: PERIOD2_LOCK_NOTICE
        };
      }
      const payload = {
        understandingLevel: String((ticketData && ticketData.understandingLevel) || "clear").trim(),
        keyLearning: String((ticketData && ticketData.keyLearning) || "").trim(),
        stillConfused: String((ticketData && ticketData.stillConfused) || "").trim(),
        applicationAnswer: String((ticketData && ticketData.applicationAnswer) || "").trim(),
        selfAssessment: String((ticketData && ticketData.selfAssessment) || "clear").trim()
      };
      if (!payload.keyLearning || !payload.applicationAnswer) {
        return { submitted: false, error: "Em hãy điền Điều em đã học được và Câu trả lời vận dụng (lưu 6 GB dữ liệu)." };
      }
      const res = await bridge.submitExitTicket(payload);
      if (res && res.submitted !== false) {
        state.exitTicket = payload;
        completeActivity("G6-L03-A08");
      }
      return res;
    }

    async function finishLesson() {
      const missingLocal = ALL_REQUIRED_ACTIVITIES.filter(id => !state.completedActivityIds.has(id));
      if (!state.exitTicket) missingLocal.push("exit_ticket");

      // Gọi backend qua LessonBridge.completeLesson() để kiểm tra đồng bộ LESSON_RULES
      const res = await bridge.completeLesson();
      if (res && res.completed === true) {
        state.status = "completed";
        state.percentComplete = 100;
        bridge.endLearningSession(true);
      }
      return res;
    }

    return {
      state,
      init,
      isPeriod2Unlocked,
      canCompleteActivity,
      getQuestionVisibleFeedback,
      submitQuestion,
      togglePixelCell,
      getPixelBitString,
      submitPixelProduct,
      submitCapacityWorksheet,
      submitStorageAdvisoryProduct,
      setDeviceInspectMode,
      revealNextSupportTier,
      completeActivity,
      switchPeriod,
      enterPeriod2Explicitly,
      submitExitTicketAndCompleteA08,
      finishLesson
    };
  }

  /**
   * Render giao diện bài học vào #lesson-host khi chạy trên trình duyệt.
   */
  async function mountBrowserUI() {
    if (typeof document === "undefined") return;
    const hostEl = document.getElementById("lesson-host");
    const loadingEl = document.getElementById("lesson-loading");
    const errorEl = document.getElementById("lesson-error");
    const noSessionEl = document.getElementById("no-session");
    if (!hostEl) return;

    try {
      let goldenData = window.GOLDEN_LESSON_DATA && window.GOLDEN_LESSON_DATA["G6-L03"];
      if (!goldenData) {
        const jsonUrl =
          (document.body && document.body.dataset.goldenJson) ||
          "../../../data/lessons/G6-L03.golden.json";
        if (/^https?:\/\/script\.google\.com/i.test(jsonUrl)) {
          throw new Error("Forbidden direct Apps Script URL in lesson renderer");
        }
        const resp = await fetch(jsonUrl);
        goldenData = await resp.json();
      }

      if (loadingEl) loadingEl.hidden = true;
      const ctrl = createController({ goldenData, bridge: window.LessonBridge });
      window.__G6_L03_CONTROLLER__ = ctrl;

      const initRes = await ctrl.init();
      if (!initRes.authenticated) {
        if (noSessionEl) noSessionEl.hidden = false;
        return;
      }

      hostEl.hidden = false;
      const compMap = (goldenData.goldenLessonBlueprint && goldenData.goldenLessonBlueprint.activityComponents) || {};
      const qMap = new Map((goldenData.questions || []).map(q => [q.questionId, q]));

      function renderQuestionBlock(qId) {
        const q = qMap.get(qId);
        if (!q) return "";
        const fb = ctrl.getQuestionVisibleFeedback(qId);
        let inputHtml = "";
        if (q.questionType === "single_choice") {
          inputHtml = (q.options || [])
            .map(
              opt =>
                `<label style="display:block;margin:6px 0;"><input type="radio" name="q_${escHtml(q.questionId)}" value="${escHtml(opt.id)}" ${
                  fb.attempted && fb.responseValue === opt.id ? "checked" : ""
                }> <strong>${escHtml(opt.id)}.</strong> ${escHtml(opt.text)}</label>`
            )
            .join("");
        } else {
          inputHtml = `<input type="text" class="input" id="input_${escHtml(q.questionId)}" value="${
            fb.attempted ? escHtml(fb.responseValue) : ""
          }" placeholder="Nhập câu trả lời của em...">`;
        }

        const feedbackHtml = fb.attempted
          ? `<div class="q-feedback ${fb.isCorrect ? "ok" : "warn"}" style="margin-top:8px;padding:8px;border-radius:6px;background:${
              fb.isCorrect ? "#ecfdf5" : "#fff7ed"
            };">
              <strong>${fb.isCorrect ? "✓ Chính xác" : "✗ Chưa đúng – Em hãy đọc giải thích và thử lại"} (Lần ${fb.attemptNumber}):</strong>
              <p style="margin:4px 0 0;">${escHtml(formatStudentExplanation(fb.explanation))}</p>
            </div>`
          : "";

        return `<div class="question-box" data-qid="${escHtml(q.questionId)}" data-requirement-id="${escHtml(q.requirementId || "")}" style="margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
          <p><strong>Câu hỏi:</strong> ${escHtml(q.questionText)}</p>
          ${inputHtml}
          <p style="margin-top:8px;">
            <button type="button" class="btn small" data-action="submit-question" data-qid="${escHtml(q.questionId)}">
              ${fb.attempted && fb.canRetry ? "Thử lại câu hỏi" : "Nộp câu trả lời"}
            </button>
          </p>
          ${feedbackHtml}
        </div>`;
      }

      function renderSupportBlock(actId) {
        const comp = compMap[actId];
        if (!comp || !comp.support3Tier) return "";
        const shownCount = ctrl.state.supportTierShown[actId] || 0;
        const tiers = comp.support3Tier.tiers.slice(0, shownCount);
        return `<div class="support-box" style="margin:10px 0;">
          <button type="button" class="btn small secondary" data-action="support-tier" data-act="${escHtml(actId)}">
            ${escHtml(comp.support3Tier.buttonLabel)} (${shownCount}/${comp.support3Tier.tiers.length})
          </button>
          ${tiers
            .map(
              t =>
                `<div style="margin-top:6px;padding:8px;background:#f8fafc;border-left:3px solid #3b82f6;">
                  <strong>${escHtml(t.title)}:</strong> ${escHtml(t.content)}
                </div>`
            )
            .join("")}
        </div>`;
      }

      function renderActivityCard(act) {
        const comp = compMap[act.activityId] || {};
        const isDone = ctrl.state.completedActivityIds.has(act.activityId);
        let preQHtml = "";
        let postQHtml = "";
        if (act.activityId === "G6-L03-A05") {
          // Q011 render trước bảng quy đổi để học sinh độc lập nhớ lại trước khi tiếp xúc nhãn in sẵn
          preQHtml = renderQuestionBlock("G6-L03-Q011");
          postQHtml = (comp.questionIds || [])
            .filter(qid => qid !== "G6-L03-Q011")
            .map(renderQuestionBlock)
            .join("");
        } else {
          postQHtml = (comp.questionIds || []).map(renderQuestionBlock).join("");
        }
        const gateErr = ctrl.state.activityGateErrors[act.activityId] || "";

        let specialHtml = "";
        if (act.activityId === "G6-L03-A02" && comp.pixelLab) {
          const gridHtml = ctrl.state.pixelGrid4x4
            .map((row, rIdx) =>
              `<div style="display:flex;gap:6px;margin-bottom:6px;">` +
              row
                .map(
                  (cell, cIdx) =>
                    `<button type="button" data-action="toggle-pixel" data-r="${rIdx}" data-c="${cIdx}" style="width:44px;height:44px;font-weight:700;border:1px solid #475569;border-radius:6px;background:${
                      cell ? "#1e293b" : "#ffffff"
                    };color:${cell ? "#ffffff" : "#1e293b"};">${cell}</button>`
                )
                .join("") +
              `<span style="align-self:center;margin-left:8px;">Hàng ${rIdx + 1}: <code>${row.join("")}</code></span></div>`
            )
            .join("");
          const savedProd1 = (ctrl.state.responses["G6-L03-PROD-01"] || {}).responseValue || {};
          const prod1Fb = ctrl.state.productFeedback["G6-L03-PROD-01"];
          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <p><strong>Lưới điểm ảnh 4×4 (Chạm/nhấp ô để đổi 0 ↔ 1):</strong></p>
            ${gridHtml}
            <p>Chuỗi 16 bit hiện tại: <code id="live-bit-string">${escHtml(ctrl.getPixelBitString())}</code></p>
            <label for="prod1-exp"><strong>${escHtml(comp.pixelLab.productTitle)}:</strong></label>
            <textarea id="prod1-exp" class="input" rows="2" placeholder="${escHtml(comp.pixelLab.defaultExplanationPrompt)}">${escHtml(savedProd1.explanationSentence || "")}</textarea>
            <p style="margin-top:6px;"><button type="button" class="btn small" data-action="save-prod1">Lưu Sản phẩm 1</button></p>
            ${
              prod1Fb
                ? `<div style="margin-top:6px;padding:8px;border-radius:6px;background:${prod1Fb.ok ? "#ecfdf5" : "#fff7ed"};">
                    ${escHtml(prod1Fb.message)}
                  </div>`
                : ""
            }
          </div>`;
        } else if (act.activityId === "G6-L03-A03") {
          specialHtml = `<div style="margin:10px 0;padding:10px;background:#eff6ff;border-radius:8px;">
            <p><strong>${escHtml(comp.coreSummary)}</strong></p>
            <p class="muted" style="margin-top:4px;"><em>${escHtml(comp.supplementaryNote)}</em></p>
          </div>`;
        } else if (act.activityId === "G6-L03-A05" && comp.capacityScale) {
          const savedWs = (ctrl.state.responses["G6-L03-WS-01"] || {}).responseValue || {};
          const wsFb = ctrl.state.worksheetFeedback;
          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <p><strong>Bảng quy đổi gần đúng theo hệ thập phân (Em tự điền số thích hợp vào các ô trống):</strong></p>
            <div style="display:grid;gap:8px;margin:10px 0;">
              <label>1 KB ≈ <input type="text" id="ws-kb-byte" class="input" style="width:120px;display:inline-block;" value="${escHtml(savedWs["1KB_in_byte"] || "")}" placeholder="____"> byte</label>
              <label>1 MB ≈ <input type="text" id="ws-mb-kb" class="input" style="width:120px;display:inline-block;" value="${escHtml(savedWs["1MB_in_KB"] || "")}" placeholder="____"> KB</label>
              <label>1 GB ≈ <input type="text" id="ws-gb-mb" class="input" style="width:120px;display:inline-block;" value="${escHtml(savedWs["1GB_in_MB"] || "")}" placeholder="____"> MB</label>
            </div>
            <p class="muted"><em>${escHtml(comp.capacityScale.supplementaryKnowledge)}</em></p>
            <button type="button" class="btn small" data-action="save-ws1">Nộp bảng quy đổi dung lượng</button>
            ${
              wsFb
                ? `<div class="ws-feedback" style="margin-top:8px;padding:8px;border-radius:6px;white-space:pre-line;background:${wsFb.ok ? "#ecfdf5" : "#fff7ed"};">
                    ${escHtml(wsFb.message)}
                  </div>`
                : ""
            }
          </div>`;
        } else if (act.activityId === "G6-L03-A06" && comp.webquest) {
          const savedProd2 = (ctrl.state.responses["G6-L03-PROD-02"] || {}).responseValue || {};
          const savedNeed = savedProd2.need || savedProd2.needDescription || "";
          const savedCap = savedProd2.estimatedCapacity || "";
          const savedDev = savedProd2.selectedDevice || "";
          const savedReason = savedProd2.reason || "";
          const prod2Fb = ctrl.state.productFeedback["G6-L03-PROD-02"];
          const devOptions = ["CD 700 MB", "USB 4 GB", "USB 16 GB", "Thẻ nhớ 32 GB", "Ổ cứng 500 GB"];
          const deviceRadiosHtml = devOptions
            .map(
              opt =>
                `<label style="display:inline-block;margin:4px 8px 4px 0;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#ffffff;">
                  <input type="radio" name="prod2-dev-radio" value="${escHtml(opt)}" ${savedDev === opt ? "checked" : ""}> ${escHtml(opt)}
                </label>`
            )
            .join("");

          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <p><strong>Tình huống:</strong> ${escHtml(comp.webquest.scenarioPrompt || "Bạn An cần mang khoảng 6 GB dữ liệu học tập.")}</p>
            <p><strong>Quy trình 5 bước (${escHtml((comp.nlsCodes || []).join(", "))}):</strong> ${escHtml(comp.webquest.steps.join(" → "))}</p>
            <h4>${escHtml(comp.webquest.productTitle)}</h4>
            <label for="prod2-need">Nhu cầu lưu trữ</label>
            <input type="text" id="prod2-need" class="input" value="${escHtml(savedNeed)}" placeholder="Nhập nhu cầu lưu trữ của bạn An...">
            <label for="prod2-cap">Dung lượng ước lượng</label>
            <input type="text" id="prod2-cap" class="input" value="${escHtml(savedCap)}" placeholder="Nhập tổng dung lượng ước lượng...">
            <label for="prod2-dev">Thiết bị chọn</label>
            <div id="prod2-device-cards" style="margin:6px 0;">${deviceRadiosHtml}</div>
            <select id="prod2-dev" class="input">
              <option value="" ${!savedDev ? "selected" : ""}>-- Chọn thiết bị lưu trữ --</option>
              ${devOptions
                .map(opt => `<option value="${escHtml(opt)}" ${savedDev === opt ? "selected" : ""}>${escHtml(opt)}</option>`)
                .join("")}
            </select>
            <label for="prod2-reason">Lí do lựa chọn</label>
            <textarea id="prod2-reason" class="input" rows="2" placeholder="Giải thích vì sao thiết bị em chọn đủ dung lượng và phù hợp nhu cầu...">${escHtml(savedReason)}</textarea>
            <p style="margin-top:6px;"><button type="button" class="btn small" data-action="save-prod2">Lưu Phiếu tư vấn lưu trữ</button></p>
            ${
              prod2Fb
                ? `<div style="margin-top:6px;padding:8px;border-radius:6px;background:${prod2Fb.ok ? "#ecfdf5" : "#fff7ed"};">
                    ${escHtml(prod2Fb.message)}
                  </div>`
                : ""
            }
          </div>`;
        } else if (act.activityId === "G6-L03-A07") {
          const cardsHtml = (comp.simulationCards || [])
            .map(
              c =>
                `<div style="padding:8px;border:1px solid #cbd5e1;border-radius:6px;">
                  <strong>${escHtml(c.device)}</strong>: Tổng ${escHtml(c.totalCapacity)} · Trống ${escHtml(c.freeCapacity)}<br>
                  <span class="muted">${escHtml(c.note)}</span>
                </div>`
            )
            .join("");
          specialHtml = `<div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px;">
            <p>Chế độ quan sát:
              <button type="button" class="btn small ${ctrl.state.deviceInspectMode === "REAL_DEVICE" ? "" : "secondary"}" data-action="set-mode" data-mode="REAL_DEVICE">REAL_DEVICE</button>
              <button type="button" class="btn small ${ctrl.state.deviceInspectMode === "SIMULATION" ? "" : "secondary"}" data-action="set-mode" data-mode="SIMULATION">SIMULATION</button>
            </p>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:8px;">${cardsHtml}</div>
          </div>`;
        } else if (act.activityId === "G6-L03-A08" && comp.exitTicketConfig) {
          const ex = ctrl.state.exitTicket || {};
          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <h4>Phiếu Exit Ticket cuối bài</h4>
            <label for="et-level">Mức độ hiểu bài (understandingLevel)</label>
            <select id="et-level" class="input">
              <option value="clear" ${ex.understandingLevel === "clear" ? "selected" : ""}>Hiểu rõ</option>
              <option value="good" ${ex.understandingLevel === "good" ? "selected" : ""}>Khá hiểu</option>
              <option value="unclear" ${ex.understandingLevel === "unclear" ? "selected" : ""}>Chưa rõ</option>
              <option value="need_support" ${ex.understandingLevel === "need_support" ? "selected" : ""}>Cần hỗ trợ</option>
            </select>
            <label for="et-key">Điều em đã học được (keyLearning)</label>
            <textarea id="et-key" class="input" rows="2">${escHtml(ex.keyLearning || "")}</textarea>
            <label for="et-conf">Điều em còn chưa rõ (stillConfused)</label>
            <textarea id="et-conf" class="input" rows="2">${escHtml(ex.stillConfused || "")}</textarea>
            <label for="et-app">Câu vận dụng: ${escHtml(comp.exitTicketConfig.applicationPrompt)}</label>
            <textarea id="et-app" class="input" rows="2">${escHtml(ex.applicationAnswer || "")}</textarea>
            <label for="et-self">Tự đánh giá (selfAssessment)</label>
            <select id="et-self" class="input">
              <option value="clear" ${ex.selfAssessment === "clear" ? "selected" : ""}>Hiểu rõ</option>
              <option value="good" ${ex.selfAssessment === "good" ? "selected" : ""}>Khá hiểu</option>
              <option value="unclear" ${ex.selfAssessment === "unclear" ? "selected" : ""}>Chưa rõ</option>
              <option value="need_support" ${ex.selfAssessment === "need_support" ? "selected" : ""}>Cần hỗ trợ</option>
            </select>
            <p style="margin-top:8px;"><button type="button" class="btn small" data-action="submit-exit-ticket">Nộp Exit Ticket & Hoàn thành hoạt động</button></p>
          </div>`;
        }

        return `<article class="activity-card" data-act-id="${escHtml(act.activityId)}" style="margin:16px 0;padding:16px;border:2px solid ${
          isDone ? "#10b981" : "#cbd5e1"
        };border-radius:10px;">
          <header style="display:flex;justify-content:space-between;align-items:center;">
            <h3>${escHtml(act.title)} (${act.estimatedMinutes} phút)</h3>
            <span>${isDone ? "✓ Đã hoàn thành" : "Đang thực hiện"}</span>
          </header>
          <p><strong>Mục tiêu:</strong> ${escHtml(formatStudentText(act.objective))}</p>
          <p>${escHtml(formatStudentText(act.instruction))}</p>
          ${preQHtml}
          ${specialHtml}
          ${postQHtml}
          ${renderSupportBlock(act.activityId)}
          ${
            gateErr
              ? `<div class="gate-error" style="margin-top:8px;padding:10px;border-radius:6px;background:#fef2f2;border:1px solid #ef4444;color:#991b1b;white-space:pre-line;">
                  ${escHtml(gateErr)}
                </div>`
              : ""
          }
          ${
            act.activityId !== "G6-L03-A08"
              ? `<p style="margin-top:10px;">
                  <button type="button" class="btn small" data-action="complete-activity" data-act="${escHtml(act.activityId)}">
                    ${isDone ? "✓ Đã hoàn thành" : "Hoàn thành hoạt động"}
                  </button>
                </p>`
              : ""
          }
        </article>`;
      }

      function render() {
        const p2Unlocked = ctrl.isPeriod2Unlocked();
        const visibleIds = ctrl.state.activePeriod === 2 && p2Unlocked ? PERIOD2_ACTIVITIES : PERIOD1_ACTIVITIES;
        const visibleActs = (goldenData.activities || []).filter(a => visibleIds.includes(a.activityId));
        const nextAct = (goldenData.activities || []).find(a => a.activityId === ctrl.state.currentActivityId);
        const nextLabel = nextAct ? nextAct.title : ctrl.state.currentActivityId;

        hostEl.innerHTML = `
          <header>
            <h1 data-lesson-id="${escHtml(goldenData.lesson.lessonId)}">${escHtml(goldenData.lesson.title)}</h1>
            <p><strong>${escHtml(ctrl.state.student.fullName)}</strong> · Lớp ${escHtml(ctrl.state.student.classId)} · <span id="sync-status" class="sync" role="status"></span></p>
            <div class="bar" aria-hidden="true"><div class="bar-fill" style="width:${ctrl.state.percentComplete}%"></div></div>
            <p>Tiến độ: <strong>${ctrl.state.percentComplete}%</strong> · Trạng thái: <strong>${escHtml(ctrl.state.status)}</strong> · Nhiệm vụ tiếp theo: <strong data-act-id="${escHtml(ctrl.state.currentActivityId)}">${escHtml(nextLabel)}</strong></p>
          </header>
          ${
            ctrl.state.resumeBannerText
              ? `<div class="alert info" id="resume-banner" style="padding:12px;margin:12px 0;background:#e0f2fe;border-radius:8px;">
                  <strong>${escHtml(ctrl.state.resumeBannerText)}</strong>
                </div>`
              : ""
          }
          ${
            ctrl.state.period1CompletedScreenVisible
              ? `<div class="alert success" id="period1-complete-banner" style="padding:16px;margin:16px 0;background:#dcfce7;border:2px solid #22c55e;border-radius:10px;">
                  <h3>Hoàn thành Tiết 1 (50%)</h3>
                  <p style="white-space:pre-line;">${escHtml(ctrl.state.period1BannerText)}</p>
                  <p><button type="button" class="btn small" data-action="enter-period2">Tiếp tục Tiết 2</button></p>
                </div>`
              : ""
          }
          <nav style="display:flex;gap:8px;margin:12px 0;align-items:center;flex-wrap:wrap;">
            <button type="button" class="btn small ${ctrl.state.activePeriod === 1 ? "" : "secondary"}" data-action="switch-period" data-period="1">Tiết 1 (A01–A04 · 45 phút)</button>
            <button type="button" class="btn small ${ctrl.state.activePeriod === 2 && p2Unlocked ? "" : "secondary"}" data-action="switch-period" data-period="2" ${!p2Unlocked ? 'aria-disabled="true"' : ""}>
              ${p2Unlocked ? "Tiết 2 (A05–A08 · 45 phút)" : "🔒 Tiết 2 (A05–A08 · 45 phút)"}
            </button>
            ${
              !p2Unlocked
                ? `<span id="period2-lock-notice" class="muted" style="font-size:0.92rem;">${escHtml(PERIOD2_LOCK_NOTICE)}</span>`
                : ""
            }
          </nav>
          <section id="activities-container">
            ${visibleActs.map(renderActivityCard).join("")}
          </section>
          <footer style="margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;">
            <button type="button" class="btn" data-action="finish-lesson" data-lesson-id="${escHtml(goldenData.lesson.lessonId)}">Hoàn thành bài học</button>
            <span id="finish-status-note" class="muted" style="margin-left:10px;"></span>
          </footer>
        `;
        const syncEl = document.getElementById("sync-status");
        if (syncEl && window.LessonBridge && window.LessonBridge.mountSyncStatus) {
          window.LessonBridge.mountSyncStatus(syncEl);
        }
      }

      hostEl.addEventListener("click", async e => {
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;

        if (action === "switch-period") {
          ctrl.switchPeriod(Number(btn.dataset.period) || 1);
          render();
        } else if (action === "enter-period2") {
          ctrl.enterPeriod2Explicitly();
          render();
        } else if (action === "toggle-pixel") {
          ctrl.togglePixelCell(Number(btn.dataset.r), Number(btn.dataset.c));
          render();
        } else if (action === "save-prod1") {
          const expEl = document.getElementById("prod1-exp");
          ctrl.submitPixelProduct(ctrl.getPixelBitString(), expEl ? expEl.value : "");
          render();
        } else if (action === "save-ws1") {
          const kbVal = (document.getElementById("ws-kb-byte") || {}).value;
          const mbVal = (document.getElementById("ws-mb-kb") || {}).value;
          const gbVal = (document.getElementById("ws-gb-mb") || {}).value;
          ctrl.submitCapacityWorksheet({
            "1KB_in_byte": kbVal,
            "1MB_in_KB": mbVal,
            "1GB_in_MB": gbVal
          });
          render();
        } else if (action === "save-prod2") {
          const checkedRadio = hostEl.querySelector('input[name="prod2-dev-radio"]:checked');
          const selectVal = (document.getElementById("prod2-dev") || {}).value;
          const selectedDevice = (checkedRadio && checkedRadio.value) || selectVal || "";
          ctrl.submitStorageAdvisoryProduct({
            need: (document.getElementById("prod2-need") || {}).value,
            estimatedCapacity: (document.getElementById("prod2-cap") || {}).value,
            selectedDevice,
            reason: (document.getElementById("prod2-reason") || {}).value
          });
          render();
        } else if (action === "set-mode") {
          ctrl.setDeviceInspectMode(btn.dataset.mode);
          render();
        } else if (action === "support-tier") {
          ctrl.revealNextSupportTier(btn.dataset.act);
          render();
        } else if (action === "submit-question") {
          const qId = btn.dataset.qid;
          const q = qMap.get(qId);
          let val = "";
          if (q && q.questionType === "single_choice") {
            const checked = hostEl.querySelector(`input[name="q_${qId}"]:checked`);
            val = checked ? checked.value : "";
          } else {
            const inp = document.getElementById(`input_${qId}`);
            val = inp ? inp.value : "";
          }
          if (!val) return;
          ctrl.submitQuestion(qId, val);
          render();
        } else if (action === "complete-activity") {
          ctrl.completeActivity(btn.dataset.act);
          render();
        } else if (action === "submit-exit-ticket") {
          await ctrl.submitExitTicketAndCompleteA08({
            understandingLevel: (document.getElementById("et-level") || {}).value,
            keyLearning: (document.getElementById("et-key") || {}).value,
            stillConfused: (document.getElementById("et-conf") || {}).value,
            applicationAnswer: (document.getElementById("et-app") || {}).value,
            selfAssessment: (document.getElementById("et-self") || {}).value
          });
          render();
        } else if (action === "finish-lesson") {
          const r = await ctrl.finishLesson();
          render();
          const noteEl = document.getElementById("finish-status-note");
          if (noteEl) {
            noteEl.textContent = r.completed
              ? "Chúc mừng, em đã hoàn thành toàn bộ bài học!"
              : "Chưa đủ điều kiện hoàn thành. Còn thiếu: " + ((r && r.missing) || []).join(", ");
          }
        }
      });

      render();
    } catch (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "Lỗi tải bài học: " + (err && err.message ? err.message : String(err));
      }
    }
  }

  const exported = {
    PERIOD1_ACTIVITIES,
    PERIOD2_ACTIVITIES,
    ALL_REQUIRED_ACTIVITIES,
    PERIOD2_LOCK_NOTICE,
    WORKSHEET_WRONG_FEEDBACK,
    formatStudentExplanation,
    formatStudentText,
    resolveResumeState,
    evaluateQuestionSubmission,
    evaluateUnitNamesSequence,
    validateStorageAdvisoryLogic,
    createController,
    mountBrowserUI
  };

  if (typeof window !== "undefined") {
    window.GoldenLessonRenderer = exported;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", mountBrowserUI);
      } else {
        mountBrowserUI();
      }
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})();
