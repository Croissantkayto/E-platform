// ==================== التظلم ====================
async function submitComplaint(questionId, questionText, maxScore) {
    if (!currentAttemptId) { alert('⚠️ لا يمكن تقديم التظلم الآن. حاول لاحقاً.'); return; }
    const reason = prompt('اكتب سبب تظلمك (مثلاً: إجابتي صحيحة لكن لم تُحتسب):');
    if (!reason || !reason.trim()) return;
    try {
        const aSnap = await db.ref('studentAttempts/' + currentAttemptId).once('value');
        const attempt = aSnap.val() || {};
        const compRef = db.ref('complaints').push();
        await compRef.set({
            attemptId: currentAttemptId,
            studentId: currentStudentId,
            studentName: currentStudent.fullName,
            lessonName: attempt.lessonName || currentLessonName,
            questionId, questionText,
            studentAnswer: (attempt.answers || {})[questionId] || '',
            aiFeedback: (attempt.essayFeedbacks || {})[questionId] || '',
            aiScore: (attempt.essayScores || {})[questionId] ?? null,
            maxScore: parseInt(maxScore),
            reason: reason.trim(),
            status: 'pending',
            timestamp: Date.now()
        });
        await db.ref(`studentAttempts/${currentAttemptId}/complaints/${compRef.key}`).set({
            questionId, reason: reason.trim(), status: 'pending', timestamp: Date.now()
        });
        const btn = document.getElementById(`complaint-btn-${questionId}`);
        if (btn) btn.innerHTML = `<div style="background:#fef3c7;color:#92400e;padding:10px;border-radius:8px;font-weight:bold;text-align:center;font-size:14px;"><i class="fas fa-clock"></i> تم تقديم تظلمك وجاري مراجعته.</div>`;
        alert('✅ تم إرسال التظلم بنجاح.');
    } catch (e) { alert('❌ خطأ: ' + e.message); }
}
