// ==================== متغيرات الامتحان ====================
let currentExamIndex = null;
let currentLessonId = null;
let currentLessonName = '';
let currentExamName = '';
let allQuestions = [];
let currentQuestions = [];
let userAnswers = {};
let essayFeedbacks = {};
let essayScores = {};
let isSubmitted = false;
let timerInterval = null;
let timeRemaining = 1800;
let examSettings = { questionCount: 10, timeLimit: 30 };
let currentAttemptId = null;
let examActive = false;
let autosaveTimer = null;
let tabLeaves = 0;
let leftFlag = false;

// ----------------------  الرسالة ------------------

/* ===== رسالة منبثقة ديناميكية بالكامل بـ JS ===== */

function injectConfirmStyles() {
    if (document.getElementById('confirm-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'confirm-modal-styles';
    style.textContent = `
        .cf-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.65);
            backdrop-filter: blur(3px);
            z-index: 1400;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        .cf-overlay.open { opacity: 1; visibility: visible; }

        .cf-box {
            background: var(--bg-card, #ffffff);
            width: 100%;
            max-width: 420px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
            border: 1px solid var(--border-color, #e2e8f0);
            transform: scale(0.92) translateY(10px);
            opacity: 0;
            transition: transform 0.25s ease, opacity 0.25s ease;
        }
        .cf-overlay.open .cf-box { transform: scale(1) translateY(0); opacity: 1; }

        .cf-icon {
            width: 64px;
            height: 64px;
            margin: 24px auto 0;
            border-radius: 50%;
            background: var(--primary-light, #e0f2fe);
            color: var(--primary-blue, #0284c7);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
        }
        .cf-icon.warn   { background: var(--warn-light, #fef3c7); color: var(--warn, #f59e0b); }
        .cf-icon.danger { background: #fee2e2; color: var(--danger, #ef4444); }

        .cf-title {
            text-align: center;
            font-size: 19px;
            font-weight: 800;
            color: var(--text-main, #1e293b);
            margin: 14px 20px 6px;
        }
        .cf-text {
            text-align: center;
            font-size: 15px;
            font-weight: 600;
            color: var(--text-muted, #64748b);
            line-height: 1.7;
            margin: 0 24px 22px;
        }

        .cf-actions {
            display: flex;
            gap: 10px;
            padding: 0 20px 20px;
        }
        .cf-btn {
            flex: 1;
            padding: 14px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 800;
            cursor: pointer;
            transition: 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: inherit;
        }
        .cf-btn.ok {
            background: var(--primary-blue, #0284c7);
            color: #fff;
            border: 2px solid var(--primary-blue, #0284c7);
            box-shadow: 0 4px 15px rgba(2, 132, 199, 0.3);
        }
        .cf-btn.ok:hover {
            background: var(--primary-hover, #0369a1);
            border-color: var(--primary-hover, #0369a1);
            transform: translateY(-2px);
        }
        .cf-btn.cancel {
            background: var(--bg-body, #f8fafc);
            color: var(--text-main, #1e293b);
            border: 2px solid var(--border-color, #e2e8f0);
        }
        .cf-btn.cancel:hover {
            border-color: var(--primary-blue, #0284c7);
            background: var(--primary-light, #e0f2fe);
            color: var(--primary-hover, #0369a1);
        }

        /* زر واحد فقط يأخذ العرض الكامل */
        .cf-actions.single .cf-btn { flex: 1 1 100%; }

        [data-theme="dark"] .cf-icon.danger { background: #450a0a; color: #fca5a5; }
    `;
    document.head.appendChild(style);
}

function showConfirm({
    title = 'تأكيد العملية',
    text = 'هل أنت متأكد من تنفيذ هذا الإجراء؟',
    type = 'primary',
    okText = 'حسناً',
    cancelText = 'تراجع',
    icon = 'fa-question-circle',
    showCancel = true,       // ← اختياري: إظهار زر الرجوع أم لا
    onOk = null,
    onCancel = return
} = {}) {

    injectConfirmStyles();

    const old = document.querySelector('.cf-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'cf-overlay';

    // بناء الأزرار حسب showCancel
    const actionsHTML = showCancel
        ? `<button class="cf-btn cancel"><i class="fas fa-undo"></i> ${cancelText}</button>
           <button class="cf-btn ok"><i class="fas fa-check"></i> ${okText}</button>`
        : `<button class="cf-btn ok"><i class="fas fa-check"></i> ${okText}</button>`;

    overlay.innerHTML = `
        <div class="cf-box">
            <div class="cf-icon ${type === 'primary' ? '' : type}">
                <i class="fas ${icon}"></i>
            </div>
            <h3 class="cf-title">${title}</h3>
            <p class="cf-text">${text}</p>
            <div class="cf-actions ${showCancel ? '' : 'single'}">
                ${actionsHTML}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    const okBtn = overlay.querySelector('.cf-btn.ok');
    const cancelBtn = overlay.querySelector('.cf-btn.cancel');

    const close = (callback) => {
        overlay.classList.remove('open');
        setTimeout(() => overlay.remove(), 250);
        if (typeof callback === 'function') callback();
    };

    okBtn.onclick = () => close(onOk);
    if (cancelBtn) cancelBtn.onclick = () => close(onCancel);

    // الضغط خارج الصندوق: يُغلق فقط لو فيه زر تراجع
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay && showCancel) close(onCancel);
    });

    // Escape: يُغلق فقط لو فيه زر تراجع
    const escHandler = (e) => {
        if (e.key === 'Escape' && showCancel) {
            close(onCancel);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// ==================== المسودات (الاستكمال لاحقاً) ====================
// المسار: examDrafts/{studentId}/{lessonId}_{examIndex}
let drafts = {};

function draftKey(lessonId, examIndex) { return lessonId + '_' + examIndex; }
function draftRef(lessonId, examIndex) { return db.ref(`examDrafts/${currentStudentId}/${draftKey(lessonId, examIndex)}`); }

function countDraftAnswers(draft) {
    return Object.keys(draft.answers || {}).filter(k => draft.answers[k] !== '').length;
}

function listenDrafts() {
    if (!currentStudentId) return;
    db.ref('examDrafts/' + currentStudentId).on('value', (snap) => {
        drafts = snap.val() || {};
        if (lessonsCache) renderLessons();
    });
}

function buildDraft(auto) {
    const clean = {};
    Object.keys(userAnswers).forEach(k => { if (userAnswers[k] !== undefined) clean[k] = userAnswers[k]; });
    const perms = {};
    currentQuestions.forEach(q => { if (q._perm) perms[q.id] = q._perm; });
    return {
        lessonId: currentLessonId, examIndex: currentExamIndex, examName: currentExamName, lessonName: currentLessonName,
        questionIds: currentQuestions.map(q => q.id), answers: clean, perms: perms, tabLeaves: tabLeaves,
        timeRemaining: timeRemaining, autoSaved: !!auto, savedAt: Date.now()
    };
}

// ---------- الحفظ التلقائي ----------
function setAutosaveStatus(s) {
    const el = document.getElementById('autosaveStatus');
    if (!el) return;
    el.innerHTML = s === 'saving' ? '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...'
        : s === 'saved' ? '<i class="fas fa-cloud-arrow-up"></i> تم الحفظ تلقائياً'
        : s === 'error' ? '⚠️ تعذر الحفظ' : '';
}

function scheduleAutosave() {
    if (!examActive || isSubmitted || !currentQuestions.length) return;
    clearTimeout(autosaveTimer);
    setAutosaveStatus('saving');
    autosaveTimer = setTimeout(autosaveNow, 2500);
}

async function autosaveNow() {
    if (!examActive || isSubmitted || !currentQuestions.length) return;
    try {
        await draftRef(currentLessonId, currentExamIndex).set(buildDraft(true));
        if (!isSubmitted) setAutosaveStatus('saved');
    } catch (e) { setAutosaveStatus('error'); }
}

// ---------- تسجيل الخروج من صفحة الامتحان ----------
document.addEventListener('visibilitychange', () => {
    if (!examActive || isSubmitted) return;
    if (document.hidden) { tabLeaves++; leftFlag = true; autosaveNow(); }
    else if (leftFlag) {
        leftFlag = false; showToast(`⚠️ اذا خرجت مرتين سيتم طردك واعتبارك غشاش (${tabLeaves})`);
    if(tabLeaves > 1){
        cheat_detector();
    }
    }
});

function cheat_detector(){
    submitExam(true);
}

// ---------- الحفظ اليدوي والخروج ----------
async function saveForLater(silent) {
    if (isSubmitted || currentQuestions.length === 0) return;
    if (timerInterval) clearInterval(timerInterval);
    clearTimeout(autosaveTimer);
    try {
        await draftRef(currentLessonId, currentExamIndex).set(buildDraft(false));
        examActive = false;
        if (silent !== true) alert('✅ تم حفظ إجاباتك. تقدر تكمل الامتحان من نفس المكان في أي وقت.\n(الوقت المتبقي محفوظ ولن يُحتسب وقت غيابك)');
        navigateTo('lessons');
    } catch (e) {
        alert('❌ تعذر الحفظ: ' + e.message);
        startTimer();
    }
}

async function leaveExam() {
    if (examActive && !isSubmitted && currentQuestions.length) {
        if (!confirm('سيتم حفظ إجاباتك لتكملها لاحقاً (الوقت المتبقي يتوقف). هل تريد الخروج؟')) return;
        await saveForLater(true);
    } else {
        navigateTo('lessons');
    }
}

function restartExam(lessonId, examName, examIndex) {
    if (!confirm('هل تريد حذف الإجابات المحفوظة وبدء الامتحان من جديد؟')) return;
    delete drafts[draftKey(lessonId, examIndex)];
    draftRef(lessonId, examIndex).remove().finally(() => startExam(lessonId, examName, examIndex));
}

function restoreAnswers() {
    currentQuestions.forEach(q => {
        const a = userAnswers[q.id];
        if (a === undefined) return;
        if (q.isEssay) {
            const t = document.getElementById('essay-' + q.id);
            if (t) t.value = a;
        } else {
            const label = document.getElementById(`opt-${q.id}-${a}`);
            if (label) label.classList.add('selected');
        }
    });
    updateProgress();
}

// ==================== ترتيب الاختيارات العشوائي ====================
function assignPerm(q) {
    if (q._perm || q.isEssay || q.isTrueFalse) return;
    const isText = q.isText || (!q.imageUrl && q.questionText);
    if (isText && q.options && q.options.length === 4) {
        const p = [0, 1, 2, 3];
        for (let i = 3; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
        q._perm = p;
    }
}

// ==================== بدء الامتحان ====================
function startExam(lessonId, examName, examIndex) {
    showConfirm({
        title: 'تنبيه',
        text: `سيتم بدء الامتحان ويجب حل الأسئلة قبل انتهاء الوقت.
- يمنع الخروج من المنصة أثناء الامتحان.
- بالتوفيق`,
        type: 'warn',
        icon: 'fa-exclamation-triangle',
        showCancel: true,
        okText: 'دخول الامتحان',
        cancelText: 'تراجع',
        onOk: () => beginExam(lessonId, examName, examIndex)   // ← لا يبدأ إلا بعد الموافقة
    });
}

function beginExam(lessonId, examName, examIndex) {
    db.ref('lessons/' + lessonId).once('value', (snapshot) => {
        const lesson = snapshot.val();
        if (!lesson) { alert('⚠️ خطأ في تحميل البيانات'); return; }

        const exams = lesson.exams || [];
        const exam = exams[examIndex];
        if (!exam) { alert('⚠️ الامتحان غير موجود'); return; }

        const draft = drafts[draftKey(lessonId, examIndex)] || null;
        const av = examAvailability(lessonId, examIndex, exam);
        if (!av.timeOk || (!av.attemptsOk && !draft)) { alert('⛔ ' + av.reason); return; }

        let questionCount = exam.questionCount === 'all' ? 'all' : (parseInt(exam.questionCount) || 10);
        const timeLimit = parseInt(exam.timeLimit) || 20;
        examSettings.questionCount = questionCount;
        examSettings.timeLimit = timeLimit;

        currentLessonId = lessonId;
        currentLessonName = lesson.name + ' - ' + exam.name;
        currentExamName = exam.name;
        currentExamIndex = examIndex;
        isSubmitted = false;
        userAnswers = {};
        essayFeedbacks = {};
        essayScores = {};
        currentQuestions = [];
        currentAttemptId = null;

        // الوقت: الحفظ اليدوي يوقف الوقت، والتلقائي (انقطاع) الوقت بيكمل
        let tr = timeLimit * 60;
        if (draft) {
            tr = parseInt(draft.timeRemaining) || 0;
            if (draft.autoSaved && draft.savedAt) tr -= Math.floor((Date.now() - draft.savedAt) / 1000);
            tr = Math.max(tr, 1);
        }
        timeRemaining = tr;
        tabLeaves = draft ? (parseInt(draft.tabLeaves) || 0) : 0;
        leftFlag = false;
        examActive = true;
        clearTimeout(autosaveTimer);
        setAutosaveStatus('');

        navigateTo('exam');
        document.getElementById('examTitle').innerHTML = `<i class="fas fa-file-signature"></i> ${exam.name}`;
        document.getElementById('examQuestionsCount').textContent = questionCount === 'all' ? 'كل الأسئلة' : `${questionCount} أسئلة`;
        document.getElementById('examTimeLimit').innerHTML = `<i class="far fa-clock"></i> ${timeLimit} دقيقة`;
        document.getElementById('progressText').textContent = '0 / 0';
        document.getElementById('resultContainer').classList.add('hidden');
        document.getElementById('resultContainer').innerHTML = '';
        document.getElementById('submitBtn').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('saveLaterBtn').style.display = 'block';
        document.getElementById('examMeta').style.display = 'flex';
        document.getElementById('timerBox').style.display = 'flex';

        updateTimerDisplay();
        startTimer();

        const container = document.getElementById('questionsContainer');
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">جاري تحميل الأسئلة...</p>';

        const stop = (html) => {
            container.innerHTML = html;
            document.getElementById('submitBtn').classList.add('hidden');
            document.getElementById('saveLaterBtn').style.display = 'none';
            if (timerInterval) clearInterval(timerInterval);
            examActive = false;
        };

        db.ref('questions').orderByChild('lessonId').equalTo(lessonId).once('value', (snapshot) => {
            const questions = snapshot.val();
            if (!questions) { stop('<p style="text-align:center;color:#ff9800;padding:20px;">⚠️ لا توجد أسئلة</p>'); return; }

            allQuestions = Object.keys(questions)
                .map(key => ({ id: key, ...questions[key] }))
                .filter(q => parseInt(q.examIndex) === parseInt(examIndex));

            if (allQuestions.length === 0) { stop('<p style="text-align:center;color:#ff9800;padding:20px;">⚠️ لا توجد أسئلة لهذا الامتحان</p>'); return; }

            let restored = [];
            if (draft && draft.questionIds) {
                restored = draft.questionIds.map(id => allQuestions.find(q => q.id === id)).filter(Boolean);
            }

            if (restored.length > 0) {
                currentQuestions = restored;
                userAnswers = Object.assign({}, draft.answers || {});
                currentQuestions.forEach(q => {
                    if (draft.perms && draft.perms[q.id]) q._perm = Array.from(draft.perms[q.id]);
                });
            } else {
                const shuffled = allQuestions.sort(() => 0.5 - Math.random());
                currentQuestions = questionCount === 'all' ? shuffled : shuffled.slice(0, Math.min(questionCount, shuffled.length));
            }
            currentQuestions.forEach(assignPerm);

            document.getElementById('examQuestionsCount').textContent = `${currentQuestions.length} سؤال`;
            document.getElementById('progressText').textContent = `0 / ${currentQuestions.length}`;

            renderQuestions();
            if (restored.length > 0) restoreAnswers();
        });
    });
}

// ==================== المؤقت ====================
function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) { clearInterval(timerInterval); alert('⏰ انتهى الوقت!'); submitExam(); }
    }, 1000);
}

function updateTimerDisplay() {
    const mins = Math.floor(timeRemaining / 60);
    const secs = timeRemaining % 60;
    document.getElementById('timerDisplay').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    const timerBox = document.getElementById('timerBox');
    timerBox.classList.toggle('timer-danger', timeRemaining < 60);
    if (timeRemaining < 60) timerBox.style.background = 'var(--danger)';
    else if (timeRemaining < 300) timerBox.style.background = '#f59e0b';
    else timerBox.style.background = 'var(--text-main)';
}

// ==================== عرض الأسئلة ====================
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    currentQuestions.forEach((q, index) => {
        const options = ['أ', 'ب', 'ج', 'د'];
        const div = document.createElement('div');
        div.className = 'question-box';
        div.dataset.qid = q.id;

        if (q.isEssay) {
            div.innerHTML = `
                <div class="q-number">سؤال ${index + 1} (مقالي - ${q.maxScore} درجات)</div>
                <div class="review-question-text">${q.questionText}</div>
                <textarea id="essay-${q.id}" class="essay-textarea" placeholder="اكتب إجابتك هنا..." oninput="userAnswers['${q.id}'] = this.value; updateProgress(); scheduleAutosave();"></textarea>
                <div id="feedback-${q.id}" class="essay-feedback hidden"></div>
                <div id="complaint-btn-${q.id}" class="hidden" style="margin-top:10px;"></div>
            `;
            container.appendChild(div);
            return;
        }

        const isTextQuestion = q.isText || (!q.imageUrl && q.questionText);

        let questionContent = '';
        if (isTextQuestion && q.questionText) {
            questionContent = `<div class="review-question-text">${q.questionText}</div>`;
        } else if (q.imageUrl) {
            questionContent = `<img src="${q.imageUrl}" alt="سؤال" loading="lazy" style="max-width:100%; border-radius:8px; margin:10px 0; border:1px solid var(--border-color);">`;
        }

        let optionsHTML = '';
        if (q.isTrueFalse) {
            optionsHTML = `
                <label class="option-label" id="opt-${q.id}-true" onclick="selectOption('${q.id}', true)">
                    <div class="custom-radio"></div> <span>صح</span>
                </label>
                <label class="option-label" id="opt-${q.id}-false" onclick="selectOption('${q.id}', false)">
                    <div class="custom-radio"></div> <span>خطأ</span>
                </label>
            `;
        } else if (isTextQuestion && q.options && q.options.length === 4) {
            (q._perm || [0, 1, 2, 3]).forEach((optIndex, pos) => {
                optionsHTML += `
                    <label class="option-label" id="opt-${q.id}-${optIndex}" onclick="selectOption('${q.id}', ${optIndex})">
                        <div class="custom-radio"></div> <span><strong>${options[pos]}.</strong> ${q.options[optIndex]}</span>
                    </label>`;
            });
        } else {
            options.forEach((letter, optIndex) => {
                optionsHTML += `
                    <label class="option-label" id="opt-${q.id}-${optIndex}" onclick="selectOption('${q.id}', ${optIndex})">
                        <div class="custom-radio"></div> <span><strong>${letter}.</strong></span>
                    </label>`;
            });
        }

        div.innerHTML = `<div class="q-number">سؤال ${index + 1} من ${currentQuestions.length}</div>${questionContent}<div>${optionsHTML}</div>`;
        container.appendChild(div);
    });
}

function updateProgress() {
    const answered = Object.keys(userAnswers).filter(k => userAnswers[k] !== '' && userAnswers[k] !== undefined).length;
    const pt = document.getElementById('progressText');
    pt.textContent = `${answered} / ${currentQuestions.length}`;
    pt.classList.remove('bump'); void pt.offsetWidth; pt.classList.add('bump');
}

// ==================== اختيار إجابة ====================
function selectOption(questionId, optionIndex) {
    if (isSubmitted) return;
    userAnswers[questionId] = optionIndex;
    document.querySelectorAll(`[id^="opt-${questionId}-"]`).forEach(label => label.classList.remove('selected'));
    const selectedLabel = document.getElementById(`opt-${questionId}-${optionIndex}`);
    if (selectedLabel) selectedLabel.classList.add('selected');
    updateProgress();
    scheduleAutosave();
}

// ==================== تسليم الامتحان ====================
async function submitExam(cheater) {
    if (isSubmitted) return;
    if (timerInterval) clearInterval(timerInterval);

    const answered = Object.keys(userAnswers).filter(k => userAnswers[k] !== '' && userAnswers[k] !== undefined).length;
    if (answered < currentQuestions.length & cheater == false) {
        if (!confirm(`⚠️ لم تجب على ${currentQuestions.length - answered} سؤال/أسئلة.\nهل تريد التسليم؟`)) { startTimer(); return; }
    }

    isSubmitted = true;
    examActive = false;
    clearTimeout(autosaveTimer);
    setAutosaveStatus('');
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('saveLaterBtn').style.display = 'none';

    // التسليم النهائي بيمسح المسودة المحفوظة
    draftRef(currentLessonId, currentExamIndex).remove().catch(() => {});

    let objectiveScore = 0;
    let totalObjective = 0;
    currentQuestions.forEach(q => {
        if (q.isEssay) return;
        totalObjective++;
        const correctAnswer = q.isTrueFalse ? (q.correctAnswer === true || q.correctAnswer === 'true') : parseInt(q.correctAnswer);
        if (userAnswers[q.id] === correctAnswer) {
            objectiveScore++;
            const correctOpt = document.getElementById(`opt-${q.id}-${correctAnswer}`);
            if (correctOpt) correctOpt.classList.add('correct');
        } else if (userAnswers[q.id] !== undefined) {
            const wrongOpt = document.getElementById(`opt-${q.id}-${userAnswers[q.id]}`);
            const correctOpt = document.getElementById(`opt-${q.id}-${correctAnswer}`);
            if (wrongOpt) wrongOpt.classList.add('wrong');
            if (correctOpt) correctOpt.classList.add('correct');
        } else {
            const correctOpt = document.getElementById(`opt-${q.id}-${correctAnswer}`);
            if (correctOpt) correctOpt.classList.add('correct');
        }
    });

    addExplainButtons();

    const resultContainer = document.getElementById('resultContainer');
    resultContainer.classList.remove('hidden');

    let essayScore = 0;
    let totalEssayMax = 0;
    let isGradingComplete = true;
    const essayQuestions = currentQuestions.filter(q => q.isEssay);

    if (essayQuestions.length > 0) {
        resultContainer.innerHTML = `
            <div style="text-align:center; padding: 20px 0;">
                <h2 style="color:var(--primary-blue); font-size:22px;">جاري تصحيح الأسئلة المقالية...</h2>
                <div class="loading-spinner" style="margin-top:20px;"><i class="fas fa-spinner fa-spin fa-2x"></i></div>
            </div>
        `;

        for (const q of essayQuestions) {
            totalEssayMax += q.maxScore;
            const ans = userAnswers[q.id] || '';
            const feedbackDiv = document.getElementById(`feedback-${q.id}`);
            const complaintBtn = document.getElementById(`complaint-btn-${q.id}`);

            if (!ans.trim()) {
                if (feedbackDiv) {
                    feedbackDiv.classList.remove('hidden');
                    feedbackDiv.innerHTML = `<strong>الدرجة: 0 / ${q.maxScore}</strong><br>⚠️ لم يتم تقديم إجابة.`;
                }
                essayFeedbacks[q.id] = "لم يتم تقديم إجابة.";
                essayScores[q.id] = 0;
                continue;
            }

            try {
                const res = await fetch(SERVER_URL + '/grade-essay', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        questionText: q.questionText,
                        modelAnswer: q.modelAnswer,
                        studentAnswer: ans,
                        maxScore: q.maxScore
                    })
                });

                if (!res.ok) throw new Error("Server error");
                const data = await res.json();

                if (data.success) {
                    essayScore += data.score;
                    essayScores[q.id] = data.score;
                    essayFeedbacks[q.id] = data.feedback;
                    if (feedbackDiv) {
                        feedbackDiv.classList.remove('hidden');
                        feedbackDiv.innerHTML = `<strong style="color:#6a1b9a;">✅ تم التصحيح:</strong>
                            <div style="font-size:18px; margin:8px 0; color:#4CAF50;"><strong>${data.score} / ${q.maxScore}</strong></div>
                            <div>${data.feedback}</div>`;
                    }
                    if (complaintBtn) {
                        complaintBtn.classList.remove('hidden');
                        complaintBtn.innerHTML = `<button class="btn-review" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;" onclick="submitComplaint('${q.id}', '${(q.questionText || '').replace(/'/g, "\\'")}', ${q.maxScore})"><i class="fas fa-exclamation-triangle"></i> تقديم تظلم</button>`;
                    }
                } else {
                    throw new Error(data.error || "AI Error");
                }
            } catch (e) {
                isGradingComplete = false;
                essayFeedbacks[q.id] = "قيد التصحيح (سيتم التقييم قريباً)";
                if (feedbackDiv) {
                    feedbackDiv.classList.remove('hidden');
                    feedbackDiv.innerHTML = `<strong style="color:#d97706;">⏳ إجابتك قيد التصحيح..</strong><br>سيتم إعلامك بالدرجة والتعليق قريباً في صفحة النتائج.`;
                }
                console.error("AI Grading Failed:", e);
            }
        }
    }

    const finalScore = objectiveScore + essayScore;
    const totalScore = totalObjective + totalEssayMax;
    const percentage = totalScore > 0 ? Math.round((finalScore / totalScore) * 100) : 0;
    const passed = percentage >= 50;

    let resultText = '';
    if (!isGradingComplete) {
        resultText = `
            <div style="text-align:center; padding: 20px 0;">
                <h2 style="font-size:24px; color:var(--primary-blue); margin-bottom:15px; font-weight:800;"><i class="fas fa-clock"></i> تم تسليم إجاباتك!</h2>
                <div style="font-size:24px; font-weight:800; color:var(--text-main); margin-bottom:15px;">
                    الدرجة الاختيارية: ${objectiveScore} / ${totalObjective}
                </div>
                <div style="background:#fef3c7; border:1px solid #fcd34d; color:#92400e; padding:15px; border-radius:8px; font-weight:700;">
                    <i class="fas fa-hourglass-half"></i> الأسئلة المقالية قيد التصحيح التلقائي. ستظهر الدرجة النهائية في صفحة "النتائج" قريباً.
                </div>
            </div>
        `;
    } else {
        resultText = `
            <div style="text-align:center; padding: 20px 0;">
                <h2 style="font-size:24px; color:var(--primary-blue); margin-bottom:15px; font-weight:800;"><i class="fas fa-award"></i> تم التسليم!</h2>
                <div style="font-size:64px; font-weight:900; color:${passed ? 'var(--accent-green)' : 'var(--danger)'}; line-height:1;"><span class="count-up" data-to="${finalScore}">0</span> <span style="font-size:32px; color:var(--text-muted);">/</span> ${totalScore}</div>
                <div style="font-size:18px; color:var(--text-muted); margin:10px 0 12px; font-weight:700;">النسبة: ${percentage}%</div>
                <div class="result-bar"><span style="--w:${percentage}%"></span></div>
                ${essayQuestions.length > 0 ? `<div style="font-size:14px; color:var(--text-muted); margin-bottom:15px;">(الاختياري: ${objectiveScore} + المقالي: ${essayScore.toFixed(1)})</div>` : ''}
                <div style="font-weight:800; font-size:20px; color:${passed ? 'var(--accent-green)' : 'var(--danger)'}; background:${passed ? 'var(--accent-green-light)' : '#fee2e2'}; display:inline-block; padding:10px 20px; border-radius:10px;">
                    ${passed ? '<i class="fas fa-check-circle"></i> ممتاز! أنت ناجح' : '<i class="fas fa-exclamation-triangle"></i> تحتاج للمزيد من المراجعة'}
                </div>
            </div>
        `;
    }
    resultContainer.innerHTML = resultText;
    runCountUps(resultContainer);
    if (isGradingComplete && passed) launchConfetti();

    saveResult(objectiveScore, finalScore, totalObjective, totalScore, percentage, userAnswers, essayFeedbacks, !isGradingComplete, essayQuestions);
}

// ==================== حفظ النتيجة ====================
async function saveResult(objectiveScore, finalScore, totalObjective, totalScore, percentage, answers, feedbacks, needsGrading, essayQuestions) {
    try {
        const studentName = currentStudent ? currentStudent.fullName || currentStudent.firstName : 'طالب';

        let displayScore = needsGrading ? objectiveScore : finalScore;
        let displayTotal = needsGrading ? totalObjective : totalScore;
        let displayPercentage = needsGrading ? (totalObjective > 0 ? Math.round((objectiveScore / totalObjective) * 100) : 0) : percentage;

        const attemptData = {
            studentId: currentStudentId,
            studentName: studentName,
            studentPhone: currentStudent ? currentStudent.phone : '',
            studentGrade: currentStudent ? currentStudent.grade : '',
            lessonId: currentLessonId,
            lessonName: currentLessonName,
            examIndex: currentExamIndex,
            score: displayScore,
            totalQuestions: displayTotal,
            percentage: displayPercentage,
            questionCount: currentQuestions.length,
            timeLimit: examSettings.timeLimit,
            timestamp: Date.now(),
            answers: answers,
            essayFeedbacks: feedbacks,
            essayScores: essayScores,
            needsGrading: needsGrading,
            objectiveScore: objectiveScore,
            tabLeaves: tabLeaves,
            essayQuestionsToGrade: essayQuestions
        };

        const ref = await db.ref('studentAttempts').push(attemptData);
        currentAttemptId = ref.key;
        draftRef(attemptData.lessonId, attemptData.examIndex).remove().catch(() => {});
        if (!needsGrading) updateLeaderboard(attemptData);
    } catch (error) { console.error('❌ خطأ:', error); }
}
