// ==================== النتائج (من كاش مباشر) ====================
let attemptsCache = [];
let attemptsQuery = null;

function listenAttempts() {
    if (!currentStudentId) return;
    attemptsQuery = db.ref('studentAttempts').orderByChild('studentId').equalTo(currentStudentId);
    attemptsQuery.on('value', (snap) => {
        const v = snap.val() || {};
        attemptsCache = Object.keys(v).map(k => ({ id: k, ...v[k] })).sort((a, b) => b.timestamp - a.timestamp);
        if (lessonsCache) renderLessons();
        if (document.getElementById('page-results').classList.contains('active')) renderResults();
        if (document.getElementById('page-profile').classList.contains('active')) loadProfile();
        refreshNotifications();
    });
}

function loadStudentResults() { renderResults(); }

function renderResults() {
    const container = document.getElementById('resultsList');
    if (!attemptsCache.length) { container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">لا توجد نتائج سابقة</p>'; return; }

    let tableHTML = `
        <table class="results-table">
            <thead><tr><th>اسم الامتحان</th><th>الدرجة</th><th>التاريخ</th><th>الإجراء</th></tr></thead>
            <tbody>`;
    attemptsCache.forEach(attempt => {
        const dateStr = new Date(attempt.timestamp).toLocaleDateString('ar-EG');
        const passed = attempt.percentage >= 50;
        const isPending = attempt.needsGrading;
        const scoreDisplay = isPending
            ? `<span class="badge-score" style="background:#fef3c7; color:#92400e;"><i class="fas fa-hourglass-half"></i> قيد التصحيح</span>`
            : `<span class="badge-score" style="${passed ? '' : 'background:#fee2e2; color:#b91c1c;'}">${attempt.score} / ${attempt.totalQuestions} (${attempt.percentage}%)</span>`;
        tableHTML += `
            <tr>
                <td>${attempt.lessonName || 'درس'}</td>
                <td>${scoreDisplay}</td>
                <td style="color:var(--text-muted); font-size:13px;">${dateStr}</td>
                <td>${attempt.answers && !isPending
                    ? `<button class="btn-review" onclick="reviewExam('${attempt.id}')"><i class="fas fa-eye"></i> رؤية</button>
                       <button class="btn-review" style="margin-top:4px;" onclick="practiceMistakes('${attempt.id}')"><i class="fas fa-dumbbell"></i> أخطائي</button>`
                    : '<span style="color:#999;font-size:12px;">-</span>'}</td>
            </tr>`;
    });
    container.innerHTML = tableHTML + '</tbody></table>';
}

// ==================== التدريب على الأخطاء ====================
let practiceQs = {};
let practiceStats = { done: 0, right: 0, total: 0 };

function correctOf(q) { return q.isTrueFalse ? (q.correctAnswer === true || q.correctAnswer === 'true') : parseInt(q.correctAnswer); }

function practiceBanner() {
    const b = document.getElementById('reviewBanner');
    b.classList.remove('hidden');
    b.innerHTML = practiceStats.done < practiceStats.total
        ? `تدريب على أخطائك — ${practiceStats.done} / ${practiceStats.total}`
        : `🎉 خلصت التدريب: ${practiceStats.right} صح من ${practiceStats.total}`;
}

function practiceMistakes(attemptId) {
    const attempt = attemptsCache.find(a => a.id === attemptId);
    if (!attempt || !attempt.answers) { alert('لا توجد إجابات محفوظة.'); return; }
    db.ref('questions').orderByChild('lessonId').equalTo(attempt.lessonId).once('value', (snap) => {
        const all = snap.val() || {};
        const wrong = Object.keys(all).map(k => ({ id: k, ...all[k] })).filter(q => {
            if (parseInt(q.examIndex) !== parseInt(attempt.examIndex) || q.isEssay) return false;
            const a = attempt.answers[q.id];
            return a !== undefined && a !== correctOf(q);
        });
        if (!wrong.length) { alert('🎉 ما عندكش أخطاء في الأسئلة اللي جاوبت عليها!'); return; }

        navigateTo('exam');
        document.getElementById('examTitle').innerHTML = `<i class="fas fa-dumbbell"></i> تدريب: ${attempt.lessonName}`;
        document.getElementById('examMeta').style.display = 'none';
        document.getElementById('submitBtn').style.display = 'none';
        document.getElementById('saveLaterBtn').style.display = 'none';
        document.getElementById('resultContainer').classList.add('hidden');

        practiceQs = {};
        practiceStats = { done: 0, right: 0, total: wrong.length };
        practiceBanner();

        const letters = ['أ', 'ب', 'ج', 'د'];
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        wrong.forEach((q, i) => {
            practiceQs[q.id] = q;
            registerQuestion(q, attempt.answers[q.id]);
            let opts = '';
            if (q.isTrueFalse) {
                opts = [true, false].map(v => `<div class="option-label" id="pr-${q.id}-${v}" onclick="practiceAnswer('${q.id}', ${v})"><div class="custom-radio"></div><span>${v ? 'صح' : 'خطأ'}</span></div>`).join('');
            } else {
                const list = q.options && q.options.length ? q.options : letters;
                opts = list.map((t, k) => `<div class="option-label" id="pr-${q.id}-${k}" onclick="practiceAnswer('${q.id}', ${k})"><div class="custom-radio"></div><span><strong>${letters[k]}.</strong> ${q.options && q.options.length ? t : ''}</span></div>`).join('');
            }
            const content = q.imageUrl ? `<img src="${q.imageUrl}" style="max-width:100%; border-radius:8px; margin:10px 0;">` : `<div class="review-question-text">${q.questionText || ''}</div>`;
            const div = document.createElement('div');
            div.className = 'question-box';
            div.innerHTML = `<div class="q-number">سؤال ${i + 1} من ${wrong.length}</div>${explainBtn(q.id)}${content}<div>${opts}</div>${explainBox(q.id)}`;
            container.appendChild(div);
        });
    });
}

function practiceAnswer(qid, choice) {
    const q = practiceQs[qid];
    if (!q || q._done) return;
    q._done = true;
    const c = correctOf(q);
    const ok = document.getElementById(`pr-${qid}-${c}`);
    if (ok) ok.classList.add('correct');
    if (choice === c) practiceStats.right++;
    else { const w = document.getElementById(`pr-${qid}-${choice}`); if (w) w.classList.add('wrong'); }
    practiceStats.done++;
    practiceBanner();
}

// ==================== مراجعة الامتحان ====================
function reviewExam(attemptId) {
    db.ref('studentAttempts/' + attemptId).once('value', (snapshot) => {
        const attempt = snapshot.val();
        if (!attempt || !attempt.answers) { alert('لا توجد إجابات محفوظة لهذا الامتحان.'); return; }

        currentAttemptId = attemptId;

        db.ref('questions').orderByChild('lessonId').equalTo(attempt.lessonId).once('value', (qSnapshot) => {
            const allQs = qSnapshot.val();
            if (!allQs) return;
            const questionsArray = Object.keys(allQs).map(key => ({ id: key, ...allQs[key] })).filter(q => parseInt(q.examIndex) === parseInt(attempt.examIndex));

            navigateTo('exam');
            document.getElementById('examTitle').innerHTML = `<i class="fas fa-search"></i> مراجعة: ${attempt.lessonName}`;
            document.getElementById('examMeta').style.display = 'none';
            document.getElementById('submitBtn').style.display = 'none';
            document.getElementById('saveLaterBtn').style.display = 'none';
            document.getElementById('resultContainer').classList.add('hidden');

            const banner = document.getElementById('reviewBanner');
            banner.classList.remove('hidden');
            banner.innerHTML = `نتيجتك في هذا الامتحان: ${attempt.score} من ${attempt.totalQuestions} (${attempt.percentage}%)`;

            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';

            db.ref('studentAttempts/' + attemptId + '/complaints').once('value', (compSnap) => {
                const attemptComplaints = compSnap.val() || {};

                questionsArray.forEach((q, index) => {
                    const studentAnswer = attempt.answers[q.id];
                    const options = ['أ', 'ب', 'ج', 'د'];
                    const div = document.createElement('div');
                    div.className = 'question-box';

                    if (q.isEssay) {
                        const aiFeedback = attempt.essayFeedbacks && attempt.essayFeedbacks[q.id] ? attempt.essayFeedbacks[q.id] : 'لا يوجد تعليق.';

                        const myComplaint = Object.values(attemptComplaints).find(c => c.questionId === q.id);
                        let complaintSection = '';
                        if (myComplaint && myComplaint.status === 'resolved') {
                            complaintSection = `<div style="margin-top:10px;background:#d1fae5;color:#065f46;padding:10px;border-radius:8px;font-weight:bold;text-align:center;font-size:14px;"><i class="fas fa-check-circle"></i> تمت مراجعة تظلمك${myComplaint.newScore !== undefined ? ' - الدرجة بعد المراجعة: ' + myComplaint.newScore : ' - تم تأكيد الدرجة'}</div>`;
                        } else if (myComplaint) {
                            complaintSection = `<div style="margin-top:10px;background:#fef3c7;color:#92400e;padding:10px;border-radius:8px;font-weight:bold;text-align:center;font-size:14px;"><i class="fas fa-clock"></i> تم تقديم تظلمك وجاري مراجعته.</div>`;
                        } else {
                            complaintSection = `<div id="complaint-btn-${q.id}" style="margin-top:10px;"><button class="btn-review" style="background:#fee2e2;color:#b91c1c;border-color:#fca5a5;" onclick="submitComplaint('${q.id}', '${q.questionText.replace(/'/g, "\\'")}', ${q.maxScore})"><i class="fas fa-exclamation-triangle"></i> تقديم تظلم</button></div>`;
                        }

                        div.innerHTML = `
                            <div class="q-number">سؤال ${index + 1} (مقالي - ${q.maxScore} درجات)</div>
                            <div class="review-question-text">${q.questionText}</div>
                            <div style="background:#f8f9fa; padding:12px; border-radius:8px; border:1px solid #eee; margin-bottom:10px;">
                                <strong>إجابتك:</strong><br>${studentAnswer || '(لم تجب)'}
                            </div>
                            <div class="essay-feedback" style="background:#f3e5f5; border-right:4px solid #6a1b9a;">
                                <strong>تعليق المصحح:</strong><br>${aiFeedback}
                            </div>
                            ${complaintSection}
                        `;
                        container.appendChild(div);
                        return;
                    }

                    const correctAnswer = q.isTrueFalse ? (q.correctAnswer === true || q.correctAnswer === 'true') : parseInt(q.correctAnswer);
                    const isCorrect = studentAnswer === correctAnswer;
                    registerQuestion(q, studentAnswer);

                    let qContent = q.imageUrl ? `<img src="${q.imageUrl}" style="max-width:100%; border-radius:8px; margin:10px 0;">` : `<div class="review-question-text">${q.questionText || ''}</div>`;

                    let optionsHTML = '';
                    if (q.isTrueFalse) {
                        optionsHTML = `
                            <div class="option-label ${correctAnswer === true ? 'correct' : ''} ${studentAnswer === true && studentAnswer !== correctAnswer ? 'wrong' : ''}">${studentAnswer === true ? '<i class="fas fa-dot-circle"></i> ' : '<i class="far fa-circle"></i> '} صح ${correctAnswer === true ? '<i class="fas fa-check" style="float:left"></i>' : ''}</div>
                            <div class="option-label ${correctAnswer === false ? 'correct' : ''} ${studentAnswer === false && studentAnswer !== correctAnswer ? 'wrong' : ''}">${studentAnswer === false ? '<i class="fas fa-dot-circle"></i> ' : '<i class="far fa-circle"></i> '} خطأ ${correctAnswer === false ? '<i class="fas fa-check" style="float:left"></i>' : ''}</div>
                        `;
                    } else {
                        const opts = q.options || ['أ', 'ب', 'ج', 'د'];
                        opts.forEach((opt, i) => {
                            const isSelected = studentAnswer === i;
                            const isTheCorrectOne = correctAnswer === i;
                            let className = 'option-label';
                            if (isTheCorrectOne) className += ' correct';
                            else if (isSelected && !isTheCorrectOne) className += ' wrong';
                            optionsHTML += `<div class="${className}">${isSelected ? '<i class="fas fa-dot-circle"></i> ' : '<i class="far fa-circle"></i> '} ${options[i]}. ${opt} ${isTheCorrectOne ? '<i class="fas fa-check" style="float:left"></i>' : (isSelected ? '<i class="fas fa-times" style="float:left"></i>' : '')}</div>`;
                        });
                    }

                    div.innerHTML = `<div class="q-number">سؤال ${index + 1} ${isCorrect ? '<i class="fas fa-check-circle" style="color:var(--accent-green)"></i>' : '<i class="fas fa-times-circle" style="color:var(--danger)"></i>'}</div>${explainBtn(q.id)}${qContent}<div>${optionsHTML}</div>${explainBox(q.id)}`;
                    container.appendChild(div);
                });
            });
        });
    });
}

// ==================== الملف الشخصي ====================
function loadProfile() {
    if (!currentStudent) return;
    const gradeNames = { '5': 'الثاني الإعدادي', '1': 'الأول ثانوي', '2': 'الثاني ثانوي', '3': 'الثالث ثانوي' };
    document.getElementById('profileName').textContent = currentStudent.fullName || currentStudent.firstName || '-';
    document.getElementById('profilePhone').textContent = currentStudent.phone || '-';
    document.getElementById('profileGrade').textContent = gradeNames[currentStudent.grade] || '-';
    document.getElementById('profileGender').textContent = currentStudent.gender || '-';

    document.getElementById('profileExams').textContent = attemptsCache.length;
    const valid = attemptsCache.filter(a => !a.needsGrading);
    document.getElementById('profileAverage').textContent = valid.length
        ? Math.round(valid.reduce((sum, a) => sum + (a.percentage || 0), 0) / valid.length) + '%' : '-';
    renderStats();
}
