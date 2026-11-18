// ==================== بوابة ولي الأمر ====================
const okPhone = (p) => /^01[0-9]{9}$/.test(p);

function parentLogin(e) {
    e.preventDefault();
    const sp = document.getElementById('pStudent').value.trim();
    const pp = document.getElementById('pParent').value.trim();
    const err = document.getElementById('pError');
    const fail = (m) => { err.textContent = m; err.classList.remove('hidden'); };
    if (!okPhone(sp) || !okPhone(pp)) { fail('⚠️ تأكد من صحة الأرقام (11 رقم تبدأ بـ 01)'); return; }

    db.ref('students').orderByChild('phone').equalTo(sp).once('value', (snap) => {
        const v = snap.val();
        const id = v ? Object.keys(v)[0] : null;
        if (!id || v[id].parentPhone !== pp) { fail('❌ البيانات غير مطابقة'); return; }
        err.classList.add('hidden');
        showParentData(id, v[id]);
    });
}

function showParentData(id, st) {
    db.ref('studentAttempts').orderByChild('studentId').equalTo(id).once('value', (snap) => {
        const v = snap.val() || {};
        const list = Object.keys(v).map(k => v[k]).sort((a, b) => b.timestamp - a.timestamp);
        const valid = list.filter(a => !a.needsGrading);
        const avg = valid.length ? Math.round(valid.reduce((s, a) => s + (a.percentage || 0), 0) / valid.length) + '%' : '-';
        const grades = { '5': 'الثاني الإعدادي', '1': 'الأول ثانوي', '2': 'الثاني ثانوي', '3': 'الثالث ثانوي' };

        const rows = list.map(a => `
            <tr>
                <td>${a.lessonName || 'درس'}</td>
                <td>${a.needsGrading ? '<span class="badge-score" style="background:#fef3c7;color:#92400e;">قيد التصحيح</span>'
                    : `<span class="badge-score" style="${a.percentage >= 50 ? '' : 'background:#fee2e2;color:#b91c1c;'}">${a.score} / ${a.totalQuestions} (${a.percentage}%)</span>`}</td>
                <td style="font-size:13px;color:var(--text-muted);">${new Date(a.timestamp).toLocaleDateString('ar-EG')}</td>
            </tr>`).join('');

        document.getElementById('pLogin').classList.add('hidden');
        const box = document.getElementById('pData');
        box.classList.remove('hidden');
        box.innerHTML = `
            <div class="profile-card">
                <div class="field"><span class="label">الطالب</span><span class="value">${st.fullName || '-'}</span></div>
                <div class="field"><span class="label">الصف</span><span class="value">${grades[st.grade] || '-'}</span></div>
                <div class="field"><span class="label">عدد الامتحانات</span><span class="value">${list.length}</span></div>
                <div class="field"><span class="label">المعدل العام</span><span class="value">${avg}</span></div>
            </div>
            <div class="results-table-container">${list.length ? `<table class="results-table"><thead><tr><th>الامتحان</th><th>الدرجة</th><th>التاريخ</th></tr></thead><tbody>${rows}</tbody></table>` : '<p style="text-align:center;padding:20px;color:var(--text-muted);">لا توجد امتحانات بعد</p>'}</div>
            <button class="btn-primary" style="margin:16px 0;" onclick="location.reload()">خروج</button>`;
    });
}
