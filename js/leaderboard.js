// ==================== لوحة الشرف ====================
// المسار: leaderboard/{lessonId}_{examIndex}/{studentId}
async function updateLeaderboard(attempt) {
    try {
        const ref = db.ref(`leaderboard/${draftKey(attempt.lessonId, attempt.examIndex)}/${currentStudentId}`);
        const old = (await ref.once('value')).val();
        if (old && old.percentage >= attempt.percentage) return;
        await ref.set({
            name: `${currentStudent.firstName || ''} ${currentStudent.fatherName || ''}`.trim() || 'طالب',
            percentage: attempt.percentage,
            score: attempt.score,
            total: attempt.totalQuestions,
            timestamp: Date.now()
        });
    } catch (e) { console.error('leaderboard:', e); }
}

async function openLeaderboard(lessonId, index) {
    const lesson = (lessonsCache || {})[lessonId];
    const exam = lesson && lesson.exams ? lesson.exams[index] : null;
    const title = '🏆 لوحة الشرف - ' + (exam ? exam.name : 'الامتحان');
    showInfoModal(title, '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i></div>');
    try {
        const snap = await db.ref('leaderboard/' + draftKey(lessonId, index)).orderByChild('percentage').limitToLast(10).once('value');
        const arr = [];
        snap.forEach(c => { arr.push({ id: c.key, ...c.val() }); });
        arr.sort((a, b) => b.percentage - a.percentage || a.timestamp - b.timestamp);
        if (!arr.length) { showInfoModal(title, '<p style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد نتائج بعد. كن الأول! 💪</p>'); return; }
        const medals = ['🥇', '🥈', '🥉'];
        showInfoModal(title, arr.map((r, i) => `
            <div class="lb-row ${r.id === currentStudentId ? 'me' : ''}">
                <span class="lb-rank">${medals[i] || (i + 1)}</span>
                <span class="lb-name">${r.name}${r.id === currentStudentId ? ' (أنت)' : ''}</span>
                <span class="badge-score">${r.percentage}%</span>
            </div>`).join(''));
    } catch (e) {
        showInfoModal(title, '<p style="text-align:center;color:var(--danger);padding:20px;">تعذر تحميل اللوحة</p>');
    }
}
