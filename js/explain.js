// ==================== شرح الأسئلة بالذكاء الاصطناعي ====================
// الشرح بيتولّد مرة واحدة لكل سؤال ويتخزن في Firebase (explanations/{questionId})
// وبعدها كل الطلاب بيقروه من هناك (أسرع وأرخص وثابت).

const qRegistry = {};      // questionId -> { q, studentAnswer }
const explainMem = {};     // كاش في الذاكرة

function registerQuestion(q, studentAnswer) { qRegistry[q.id] = { q, studentAnswer }; }

function explainBtn(qid) {
    return `<button class="btn-explain" onclick="explainQuestion('${qid}', this)"><i class="fas fa-wand-magic-sparkles"></i> شرح السؤال</button>`;
}
function explainBox(qid) { return `<div class="explain-box hidden" id="explain-${qid}"></div>`; }

function escx(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// بصمة بسيطة للسؤال: لو الأدمن عدّل السؤال الشرح القديم يتجاهل
function qSig(q) {
    const raw = JSON.stringify([q.questionText || '', q.imageUrl || '', q.options || [], q.correctAnswer, !!q.isTrueFalse]);
    let h = 5381;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) | 0;
    return String(h);
}

function correctIndexOf(q) {
    return q.isTrueFalse ? (q.correctAnswer === true || q.correctAnswer === 'true' ? 0 : 1) : parseInt(q.correctAnswer);
}

async function getExplanation(q) {
    const sig = qSig(q);
    if (explainMem[q.id] && explainMem[q.id].sig === sig) return explainMem[q.id];

    try {
        const cached = (await db.ref('explanations/' + q.id).once('value')).val();
        if (cached && cached.sig === sig && cached.options && !cached.hidden) { explainMem[q.id] = cached; return cached; }
    } catch (e) { /* نكمل ونولّد جديد */ }

    const res = await fetch(SERVER_URL + '/explain-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            questionText: q.questionText || '', imageUrl: q.imageUrl || '',
            options: q.isTrueFalse ? null : (q.options || null),
            isTrueFalse: !!q.isTrueFalse, correctAnswer: q.correctAnswer
        })
    });
    if (!res.ok) throw new Error('server');
    const data = await res.json();
    if (!data.success || !data.explanation || !Array.isArray(data.explanation.options)) throw new Error('bad');

    const ex = { ...data.explanation, sig, createdAt: Date.now(), flags: 0 };
    explainMem[q.id] = ex;
    db.ref('explanations/' + q.id).set(ex).catch(() => {});
    return ex;
}

function renderExplanation(q, ex, studentAnswer) {
    const correctIdx = correctIndexOf(q);
    let studentIdx = -1;
    if (studentAnswer !== undefined && studentAnswer !== '') {
        studentIdx = q.isTrueFalse ? (studentAnswer === true ? 0 : 1) : parseInt(studentAnswer);
    }
    const rows = ex.options.map((o, i) => {
        const isCorrect = i === correctIdx;
        const mine = i === studentIdx;
        return `
        <div class="ex-opt ${isCorrect ? 'ok' : 'no'} ${mine ? 'mine' : ''}" style="animation-delay:${0.05 + i * 0.08}s">
            <div class="ex-opt-head">
                <span class="ex-badge">${isCorrect ? '<i class="fas fa-circle-check"></i> الإجابة الصحيحة' : '<i class="fas fa-circle-xmark"></i> إجابة خاطئة'}</span>
                ${mine ? '<span class="ex-mine">اختيارك</span>' : ''}
            </div>
            <div class="ex-opt-text">${escx(o.text)}</div>
            <div class="ex-opt-why">${escx(o.explanation)}</div>
        </div>`;
    }).join('');

    return `
        ${ex.summary ? `<div class="ex-summary"><i class="fas fa-lightbulb"></i> ${escx(ex.summary)}</div>` : ''}
        ${rows}
        ${ex.tip ? `<div class="ex-tip">💡 ${escx(ex.tip)}</div>` : ''}
        <button class="ex-flag" onclick="flagExplanation('${q.id}', this)"><i class="fas fa-flag"></i> الشرح فيه خطأ؟</button>`;
}

async function explainQuestion(qid, btn) {
    const box = document.getElementById('explain-' + qid);
    const reg = qRegistry[qid];
    if (!box || !reg) return;

    // فتح/غلق
    if (box.dataset.loaded === '1') {
        const hidden = box.classList.toggle('hidden');
        btn.classList.toggle('active', !hidden);
        return;
    }
    if (box.dataset.loading === '1') return;

    box.classList.remove('hidden');
    btn.classList.add('active');
    box.dataset.loading = '1';
    box.innerHTML = '<div class="ex-loading"><i class="fas fa-spinner fa-spin"></i> المدرس الذكي بيحلل السؤال...</div>';
    try {
        const ex = await getExplanation(reg.q);
        box.innerHTML = renderExplanation(reg.q, ex, reg.studentAnswer);
        box.dataset.loaded = '1';
    } catch (e) {
        box.innerHTML = `<div class="ex-error">⚠️ تعذر تحميل الشرح الآن. <button class="ex-retry" onclick="retryExplain('${qid}')">إعادة المحاولة</button></div>`;
    }
    delete box.dataset.loading;
}

function retryExplain(qid) {
    const box = document.getElementById('explain-' + qid);
    const btn = box && box.parentElement.querySelector('.btn-explain');
    if (!box || !btn) return;
    box.classList.add('hidden'); delete box.dataset.loaded;
    explainQuestion(qid, btn);
}

function flagExplanation(qid, el) {
    db.ref(`explanations/${qid}/flags`).transaction(v => (v || 0) + 1).catch(() => {});
    el.disabled = true;
    el.innerHTML = '✅ شكراً، هنراجع الشرح';
}

// أزرار الشرح بعد تسليم الامتحان
function addExplainButtons() {
    currentQuestions.forEach(q => {
        if (q.isEssay) return;
        const box = document.querySelector(`.question-box[data-qid="${q.id}"]`);
        if (!box) return;
        registerQuestion(q, userAnswers[q.id]);
        box.querySelector('.q-number').insertAdjacentHTML('afterend', explainBtn(q.id));
        box.insertAdjacentHTML('beforeend', explainBox(q.id));
    });
}

// ---------- التنسيق ----------
(function () {
    const st = document.createElement('style');
    st.textContent = `
    .btn-explain { display:inline-flex; align-items:center; gap:6px; margin:0 8px 10px 0; padding:7px 14px; border-radius:20px; border:1.5px solid #8b5cf6; background:transparent; color:#8b5cf6; font-weight:800; font-size:13px; cursor:pointer; transition:.2s; position:relative; overflow:hidden; }
    .btn-explain:hover, .btn-explain.active { background:#8b5cf6; color:#fff; }
    .btn-explain i { animation: exSpark 2.4s ease-in-out infinite; }
    @keyframes exSpark { 0%,100% { transform: rotate(0) scale(1); } 50% { transform: rotate(18deg) scale(1.2); } }
    .explain-box { margin-top:14px; padding:14px; border-radius:14px; background:var(--bg-body); border:1px dashed #8b5cf6; animation: riseIn .45s both; }
    .ex-loading, .ex-error { text-align:center; padding:14px; color:var(--text-muted); font-weight:700; }
    .ex-retry { margin-right:6px; border:none; background:#8b5cf6; color:#fff; padding:5px 12px; border-radius:8px; cursor:pointer; font-weight:700; }
    .ex-summary { background:#ede9fe; color:#4c1d95; padding:12px; border-radius:10px; margin-bottom:10px; line-height:1.7; font-weight:600; }
    .ex-opt { padding:12px; border-radius:12px; margin-bottom:8px; border:2px solid var(--border-color); background:var(--bg-card); animation: riseIn .45s both; }
    .ex-opt.ok { border-color:var(--accent-green); background:var(--accent-green-light); }
    .ex-opt.no { border-color:#fca5a5; }
    .ex-opt.mine { box-shadow:0 0 0 3px rgba(2,132,199,.25); }
    .ex-opt-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px; }
    .ex-badge { font-size:12px; font-weight:800; }
    .ex-opt.ok .ex-badge { color:#047857; } .ex-opt.no .ex-badge { color:#b91c1c; }
    .ex-mine { background:var(--primary-blue); color:#fff; font-size:11px; font-weight:800; padding:2px 10px; border-radius:10px; }
    .ex-opt-text { font-weight:800; margin-bottom:6px; color:var(--text-main); }
    .ex-opt.ok .ex-opt-text { color:#065f46; }
    .ex-opt-why { font-size:14px; line-height:1.8; color:var(--text-main); }
    .ex-opt.ok .ex-opt-why { color:#065f46; }
    .ex-tip { background:#fef3c7; color:#92400e; padding:10px 12px; border-radius:10px; margin-top:6px; font-weight:700; font-size:14px; line-height:1.7; }
    .ex-flag { display:block; margin:10px auto 0; background:transparent; border:none; color:var(--text-muted); font-size:12px; cursor:pointer; text-decoration:underline; }
    [data-theme="dark"] .ex-summary { background:#2e1065; color:#ddd6fe; }
    [data-theme="dark"] .ex-opt.ok .ex-opt-text, [data-theme="dark"] .ex-opt.ok .ex-opt-why, [data-theme="dark"] .ex-opt.ok .ex-badge { color:#6ee7b7; }
    [data-theme="dark"] .ex-tip { background:#422006; color:#fcd34d; }
    `;
    document.head.appendChild(st);
})();
