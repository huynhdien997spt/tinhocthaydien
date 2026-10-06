// lesson-demo.js – bài mẫu dùng ĐÚNG đường đi V2 (chỉ qua LessonBridge). Bài thật có thể chép cách dùng ở đây.
(async function () {
  const $ = id => document.getElementById(id), L = (window.LESSONS || []).find(l => l.lessonId === document.body.dataset.lessonId) || { activities: [] };
  $("f-lesson").textContent = L.title || document.body.dataset.lessonId;
  const st = LessonBridge.getStudent();
  if (!st) { $("no-session").hidden = false; return; }
  $("lesson-body").hidden = false; $("f-fullName").textContent = st.fullName; $("f-classId").textContent = st.classId;
  LessonBridge.mountSyncStatus($("sync-status"));

  const acts = L.activities, done = new Set();
  const percent = () => Math.round(100 * done.size / Math.max(1, acts.length));
  function paint() {
    $("pct").textContent = percent(); $("bar-fill").style.width = percent() + "%";
    $("activities").innerHTML = acts.map(a => `<p><strong>${a.id} ${a.title}:</strong> ${done.has(a.id) ? "✓ Hoàn thành" : `<button class="btn small" data-act="${a.id}" type="button">Hoàn thành ${a.id}</button>`}</p>`).join("");
  }
  // 1) Khôi phục tiến độ từ cloud (đổi máy vẫn học tiếp)
  const prog = await LessonBridge.getProgress();
  prog.completedActivityIds.forEach(a => done.add(a));
  if (prog.exitTicket) { $("e-note").textContent = "Đã nộp."; $("e-key").value = prog.exitTicket.keyLearning || ""; $("e-conf").value = prog.exitTicket.stillConfused || ""; $("e-app").value = prog.exitTicket.applicationAnswer || ""; }
  if (prog.responses.Q1) { const r = prog.responses.Q1; $("q-note").textContent = "Đã trả lời: " + r.responseValue + " (lần " + r.attemptNumber + ")"; }
  if (prog.status === "completed") $("finish-note").textContent = "Em đã hoàn thành bài này.";
  paint();
  // 2) Bắt đầu bài + phiên học (đo thời gian học thật)
  LessonBridge.startLesson(); LessonBridge.startLearningSession();
  setInterval(() => { $("active").textContent = LessonBridge.getActiveSeconds(); }, 1000);

  $("activities").addEventListener("click", e => {
    const a = e.target.dataset.act; if (!a) return;
    done.add(a); LessonBridge.markActivityCompleted(a); LessonBridge.saveProgress({ currentActivityId: a, percentComplete: percent() }); paint();
  });
  $("q-send").addEventListener("click", () => {
    const v = (document.querySelector('input[name="q1"]:checked') || {}).value; if (!v) return;
    const r = LessonBridge.saveResponse({ activityId: "A2", questionId: "Q1", questionText: $("q-text").textContent, responseType: "single_choice", responseValue: v, isCorrect: v === "8", score: v === "8" ? 1 : 0, maxScore: 1, required: true });
    $("q-note").textContent = "Đã ghi (lần " + r.attemptNumber + ")";
  });
  $("e-send").addEventListener("click", async () => {
    const r = await LessonBridge.submitExitTicket({ understandingLevel: $("e-level").value, keyLearning: $("e-key").value, stillConfused: $("e-conf").value, applicationAnswer: $("e-app").value, selfAssessment: $("e-self").value });
    $("e-note").textContent = r.queued ? "Chưa đồng bộ – sẽ tự lưu khi có mạng." : "Đã nộp.";
  });
  $("finish").addEventListener("click", async () => {
    const r = await LessonBridge.completeLesson();
    $("finish-note").textContent = r.queued ? "Chưa đồng bộ – sẽ tự lưu khi có mạng." : r.completed ? "Chúc mừng, em đã hoàn thành bài!" : "Em cần hoàn thành: " + (r.missing || []).join(", ");
    if (r.completed) { LessonBridge.endLearningSession(true); }
  });
})();
