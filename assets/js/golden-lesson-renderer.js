// golden-lesson-renderer.js – Reference Renderer cho Golden Lesson G6-L03 (Phase 3 / P3.3).
// KHÔNG phải generic Learning Engine của Phase 5.
// Mọi thao tác đọc/ghi tiến độ, câu trả lời, sản phẩm học tập, Exit Ticket và phiên học
// đều đi qua LessonBridge -> ProgressService / ResponseService / LearningTimer -> ApiClient.
// Tuyệt đối không gọi trực tiếp Google Apps Script URL từ bài học.

(function () {
  const PERIOD1_ACTIVITIES = ["G6-L03-A01", "G6-L03-A02", "G6-L03-A03", "G6-L03-A04"];
  const PERIOD2_ACTIVITIES = ["G6-L03-A05", "G6-L03-A06", "G6-L03-A07", "G6-L03-A08"];
  const ALL_REQUIRED_ACTIVITIES = PERIOD1_ACTIVITIES.concat(PERIOD2_ACTIVITIES);

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
      allActivitiesDone,
      isResumingAtPeriod2Start,
      resumeBannerText: isResumingAtPeriod2Start
        ? "Tiếp tục Tiết 2 · Tiến độ: 50% · Bắt đầu từ A05"
        : null,
      responses: (progressObj && progressObj.responses) || {},
      exitTicket: (progressObj && progressObj.exitTicket) || null
    };
  }

  /**
   * Chấm câu trả lời của một Question trong G6-L03.
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
      isCorrect = normalizeTextAnswer(submittedValue) === normalizeTextAnswer(questionObj.correctAnswer);
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
      period1CompletedScreenVisible: false,
      period1BannerText: "",
      resumeBannerText: null,
      deviceInspectMode: "SIMULATION",
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
      state.activePeriod = resumed.activePeriod;
      state.resumeBannerText = resumed.resumeBannerText;

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
      const evalRes = evaluateQuestionSubmission(q, rawValue);
      const saved = bridge.saveResponse({
        activityId: q.activityId,
        questionId: q.questionId,
        questionText: q.questionText,
        responseType: q.questionType,
        responseValue: String(rawValue == null ? "" : rawValue).trim(),
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        maxScore: evalRes.maxScore,
        required: true
      });
      state.responses[q.questionId] = {
        activityId: q.activityId,
        questionId: q.questionId,
        questionText: q.questionText,
        responseType: q.questionType,
        responseValue: String(rawValue == null ? "" : rawValue).trim(),
        isCorrect: evalRes.isCorrect,
        score: evalRes.score,
        maxScore: evalRes.maxScore,
        attemptNumber: (saved && saved.attemptNumber) || 1,
        required: true
      };
      return Object.assign({}, evalRes, {
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

    function submitPixelProduct(bitString, explanationSentence) {
      const cleanBits = String(bitString || getPixelBitString()).trim();
      const cleanExp = String(explanationSentence || "").trim();
      if (!/^[01]{16}$/.test(cleanBits) || cleanExp.length < 5) {
        return { ok: false, error: "Em cần nhập đủ chuỗi 16 bit (0 và 1) và 1 câu giải thích." };
      }
      const payload = { bitString: cleanBits, explanationSentence: cleanExp };
      const saved = bridge.saveResponse({
        activityId: "G6-L03-A02",
        questionId: "G6-L03-PROD-01",
        questionText: "Sản phẩm 1: Chuỗi bit 4×4 và 1 câu giải thích 0, 1 đang biểu diễn điều gì",
        responseType: "short_answer",
        responseValue: payload,
        isCorrect: true,
        score: 1,
        maxScore: 1,
        required: true
      });
      state.responses["G6-L03-PROD-01"] = {
        activityId: "G6-L03-A02",
        questionId: "G6-L03-PROD-01",
        responseType: "short_answer",
        responseValue: payload,
        isCorrect: true,
        score: 1,
        maxScore: 1,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };
      return { ok: true, product: payload, attemptNumber: state.responses["G6-L03-PROD-01"].attemptNumber };
    }

    function submitCapacityWorksheet(rowsData) {
      const payload = rowsData || {
        "1KB_in_byte": "1000",
        "1MB_in_KB": "1000",
        "1GB_in_MB": "1000"
      };
      const isOk =
        String(payload["1KB_in_byte"]).trim() === "1000" &&
        String(payload["1MB_in_KB"]).trim() === "1000" &&
        String(payload["1GB_in_MB"]).trim() === "1000";
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
        isCorrect: isOk,
        score: isOk ? 1 : 0,
        maxScore: 1,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };
      return { ok: isOk, worksheet: payload };
    }

    function submitStorageAdvisoryProduct(advisory) {
      const needDescription = String((advisory && advisory.needDescription) || "").trim();
      const estimatedCapacity = String((advisory && advisory.estimatedCapacity) || "").trim();
      const selectedDevice = String((advisory && advisory.selectedDevice) || "").trim();
      const reason = String((advisory && advisory.reason) || "").trim();
      if (!needDescription || !estimatedCapacity || !selectedDevice || reason.length < 5) {
        return { ok: false, error: "Em hãy điền đầy đủ Nhu cầu, Dung lượng ước lượng, Thiết bị chọn và Lí do trong Phiếu tư vấn lưu trữ." };
      }
      const payload = { needDescription, estimatedCapacity, selectedDevice, reason };
      const saved = bridge.saveResponse({
        activityId: "G6-L03-A06",
        questionId: "G6-L03-PROD-02",
        questionText: "Sản phẩm 2: PHIẾU TƯ VẤN LƯU TRỮ (Nhu cầu, Dung lượng ước lượng, Thiết bị chọn, Lí do)",
        responseType: "worksheet_table",
        responseValue: payload,
        isCorrect: true,
        score: 2,
        maxScore: 2,
        required: true
      });
      state.responses["G6-L03-PROD-02"] = {
        activityId: "G6-L03-A06",
        questionId: "G6-L03-PROD-02",
        responseType: "worksheet_table",
        responseValue: payload,
        isCorrect: true,
        score: 2,
        maxScore: 2,
        attemptNumber: (saved && saved.attemptNumber) || 1
      };
      return { ok: true, product: payload, attemptNumber: state.responses["G6-L03-PROD-02"].attemptNumber };
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

    function completeActivity(activityId) {
      if (!activitiesById.has(activityId)) {
        throw new Error("Unknown activityId: " + activityId);
      }
      state.completedActivityIds.add(activityId);
      if (state.status === "not_started") state.status = "in_progress";
      bridge.markActivityCompleted(activityId);

      const doneCount = ALL_REQUIRED_ACTIVITIES.filter(id => state.completedActivityIds.has(id)).length;
      const period1AllDone = PERIOD1_ACTIVITIES.every(id => state.completedActivityIds.has(id));
      const nextIncomplete = ALL_REQUIRED_ACTIVITIES.find(id => !state.completedActivityIds.has(id)) || "G6-L03-A08";

      // Ranh giới kết thúc Tiết 1 (khi hoàn thành A01..A04):
      if (activityId === "G6-L03-A04" && period1AllDone && doneCount === 4) {
        state.percentComplete = 50;
        state.status = "in_progress";
        state.currentActivityId = "G6-L03-A05";
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
          activityId,
          completedActivityIds: Array.from(state.completedActivityIds),
          percentComplete: 50,
          status: "in_progress",
          nextActivityId: "G6-L03-A05",
          period1BoundaryReached: true,
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
        activityId,
        completedActivityIds: Array.from(state.completedActivityIds),
        percentComplete: state.percentComplete,
        status: state.status,
        nextActivityId: state.currentActivityId,
        period1BoundaryReached: false
      };
    }

    function enterPeriod2Explicitly() {
      state.activePeriod = 2;
      state.period1CompletedScreenVisible = false;
      state.currentActivityId = "G6-L03-A05";
      bridge.startLearningSession();
      return { activePeriod: 2, currentActivityId: "G6-L03-A05" };
    }

    async function submitExitTicketAndCompleteA08(ticketData) {
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
              <p style="margin:4px 0 0;">${escHtml(fb.explanation)}</p>
            </div>`
          : "";

        return `<div class="question-box" data-qid="${escHtml(q.questionId)}" style="margin:12px 0;padding:12px;border:1px solid #e2e8f0;border-radius:8px;">
          <p><strong>Câu hỏi ${escHtml(q.questionId)} (${escHtml(q.requirementId)}):</strong> ${escHtml(q.questionText)}</p>
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
        const qHtml = (comp.questionIds || []).map(renderQuestionBlock).join("");

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
          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <p><strong>Lưới điểm ảnh 4×4 (Chạm/nhấp ô để đổi 0 ↔ 1):</strong></p>
            ${gridHtml}
            <p>Chuỗi 16 bit hiện tại: <code id="live-bit-string">${escHtml(ctrl.getPixelBitString())}</code></p>
            <label for="prod1-exp"><strong>${escHtml(comp.pixelLab.productTitle)}:</strong></label>
            <textarea id="prod1-exp" class="input" rows="2" placeholder="${escHtml(comp.pixelLab.defaultExplanationPrompt)}">${escHtml(savedProd1.explanationSentence || "")}</textarea>
            <p style="margin-top:6px;"><button type="button" class="btn small" data-action="save-prod1">Lưu Sản phẩm 1</button></p>
          </div>`;
        } else if (act.activityId === "G6-L03-A03") {
          specialHtml = `<div style="margin:10px 0;padding:10px;background:#eff6ff;border-radius:8px;">
            <p><strong>${escHtml(comp.coreSummary)}</strong></p>
            <p class="muted" style="margin-top:4px;"><em>${escHtml(comp.supplementaryNote)}</em></p>
          </div>`;
        } else if (act.activityId === "G6-L03-A05" && comp.capacityScale) {
          specialHtml = `<div style="margin:10px 0;padding:10px;background:#f8fafc;border-radius:8px;">
            <ul>${comp.capacityScale.decimalApproximations.map(item => `<li>${escHtml(item)}</li>`).join("")}</ul>
            <p class="muted"><em>${escHtml(comp.capacityScale.supplementaryKnowledge)}</em></p>
            <button type="button" class="btn small" data-action="save-ws1">Xác nhận bảng quy đổi thập phân (1000)</button>
          </div>`;
        } else if (act.activityId === "G6-L03-A06" && comp.webquest) {
          const savedProd2 = (ctrl.state.responses["G6-L03-PROD-02"] || {}).responseValue || {};
          specialHtml = `<div style="margin:10px 0;padding:12px;background:#f8fafc;border-radius:8px;">
            <p><strong>Quy trình 5 bước (${escHtml((comp.nlsCodes || []).join(", "))}):</strong> ${escHtml(comp.webquest.steps.join(" → "))}</p>
            <h4>${escHtml(comp.webquest.productTitle)}</h4>
            <label>Nhu cầu lưu trữ</label>
            <input type="text" id="prod2-need" class="input" value="${escHtml(savedProd2.needDescription || "Lưu bộ video bài giảng và tư liệu học tập")}">
            <label>Dung lượng ước lượng</label>
            <input type="text" id="prod2-cap" class="input" value="${escHtml(savedProd2.estimatedCapacity || "Khoảng 6 GB (≈ 6000 MB)")}">
            <label>Thiết bị chọn</label>
            <input type="text" id="prod2-dev" class="input" value="${escHtml(savedProd2.selectedDevice || "USB 16 GB")}">
            <label>Lí do lựa chọn</label>
            <textarea id="prod2-reason" class="input" rows="2">${escHtml(savedProd2.reason || "")}</textarea>
            <p style="margin-top:6px;"><button type="button" class="btn small" data-action="save-prod2">Lưu Phiếu tư vấn lưu trữ</button></p>
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
            <p style="margin-top:8px;"><button type="button" class="btn small" data-action="submit-exit-ticket">Nộp Exit Ticket & Hoàn thành A08</button></p>
          </div>`;
        }

        return `<article class="activity-card" data-act-id="${escHtml(act.activityId)}" style="margin:16px 0;padding:16px;border:2px solid ${
          isDone ? "#10b981" : "#cbd5e1"
        };border-radius:10px;">
          <header style="display:flex;justify-content:space-between;align-items:center;">
            <h3>${escHtml(act.title)} (${act.estimatedMinutes} phút · YCCĐ: ${escHtml(act.requirementIds.join(", "))})</h3>
            <span>${isDone ? "✓ Đã hoàn thành" : "Đang thực hiện"}</span>
          </header>
          <p><strong>Mục tiêu:</strong> ${escHtml(act.objective)}</p>
          <p>${escHtml(act.instruction)}</p>
          ${specialHtml}
          ${qHtml}
          ${renderSupportBlock(act.activityId)}
          ${
            act.activityId !== "G6-L03-A08"
              ? `<p style="margin-top:10px;">
                  <button type="button" class="btn small" data-action="complete-activity" data-act="${escHtml(act.activityId)}">
                    ${isDone ? "Đã hoàn thành " + escHtml(act.activityId) : "Đánh dấu hoàn thành " + escHtml(act.activityId)}
                  </button>
                </p>`
              : ""
          }
        </article>`;
      }

      function render() {
        const visibleIds = ctrl.state.activePeriod === 1 ? PERIOD1_ACTIVITIES : PERIOD2_ACTIVITIES;
        const visibleActs = (goldenData.activities || []).filter(a => visibleIds.includes(a.activityId));

        hostEl.innerHTML = `
          <header>
            <h1>${escHtml(goldenData.lesson.title)} <small>(${escHtml(goldenData.lesson.lessonId)})</small></h1>
            <p><strong>${escHtml(ctrl.state.student.fullName)}</strong> · Lớp ${escHtml(ctrl.state.student.classId)} · <span id="sync-status" class="sync" role="status"></span></p>
            <div class="bar" aria-hidden="true"><div class="bar-fill" style="width:${ctrl.state.percentComplete}%"></div></div>
            <p>Tiến độ: <strong>${ctrl.state.percentComplete}%</strong> · Trạng thái: <strong>${escHtml(ctrl.state.status)}</strong> · Nhiệm vụ tiếp theo: <strong>${escHtml(ctrl.state.currentActivityId)}</strong></p>
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
                  <p><button type="button" class="btn small" data-action="enter-period2">Tiếp tục sang Tiết 2 (Bắt đầu từ A05)</button></p>
                </div>`
              : ""
          }
          <nav style="display:flex;gap:8px;margin:12px 0;">
            <button type="button" class="btn small ${ctrl.state.activePeriod === 1 ? "" : "secondary"}" data-action="switch-period" data-period="1">Tiết 1 (A01–A04 · 45 phút)</button>
            <button type="button" class="btn small ${ctrl.state.activePeriod === 2 ? "" : "secondary"}" data-action="switch-period" data-period="2">Tiết 2 (A05–A08 · 45 phút)</button>
          </nav>
          <section id="activities-container">
            ${visibleActs.map(renderActivityCard).join("")}
          </section>
          <footer style="margin-top:20px;padding-top:12px;border-top:1px solid #cbd5e1;">
            <button type="button" class="btn" data-action="finish-lesson">Hoàn thành bài học (G6-L03)</button>
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
          ctrl.state.activePeriod = Number(btn.dataset.period) || 1;
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
          ctrl.submitCapacityWorksheet({ "1KB_in_byte": "1000", "1MB_in_KB": "1000", "1GB_in_MB": "1000" });
          render();
        } else if (action === "save-prod2") {
          ctrl.submitStorageAdvisoryProduct({
            needDescription: (document.getElementById("prod2-need") || {}).value,
            estimatedCapacity: (document.getElementById("prod2-cap") || {}).value,
            selectedDevice: (document.getElementById("prod2-dev") || {}).value,
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
              ? "Chúc mừng, em đã hoàn thành toàn bộ Bài 3 (G6-L03)!"
              : "Chưa đủ điều kiện hoàn thành. Còn thiếu: " + ((r && r.missing) || []).join(", ");
          }
        }
      });

      render();
    } catch (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.hidden = false;
        errorEl.textContent = "Không thể tải dữ liệu bài học: " + err.message;
      }
    }
  }

  const exported = {
    PERIOD1_ACTIVITIES,
    PERIOD2_ACTIVITIES,
    ALL_REQUIRED_ACTIVITIES,
    resolveResumeState,
    evaluateQuestionSubmission,
    createController,
    mountBrowserUI
  };

  if (typeof window !== "undefined") {
    window.GoldenLessonRenderer = exported;
    if (typeof document !== "undefined" && document.getElementById("lesson-host")) {
      mountBrowserUI();
    }
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exported;
  }
})();
