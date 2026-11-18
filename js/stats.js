// ==================== إحصائيات الطالب ====================
function renderStats() {
    const box = document.getElementById('statsBox');
    if (!box) return;
    const valid = attemptsCache.filter(a => !a.needsGrading && a.totalQuestions > 0);
    if (!valid.length) { box.innerHTML = ''; return; }

    const asc = [...valid].sort((a, b) => a.timestamp - b.timestamp).slice(-12);
    const n = asc.length;
    const W = 320, H = 150, L = 28, R = 10, T = 12, B = 22;
    const x = i => n === 1 ? L + (W - L - R) / 2 : L + i * ((W - L - R) / (n - 1));
    const y = p => T + (H - T - B) * (1 - p / 100);
    const pts = asc.map((a, i) => `${x(i).toFixed(1)},${y(a.percentage || 0).toFixed(1)}`).join(' ');
    const grid = [0, 50, 100].map(p => `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}"/><text class="chart-text" x="2" y="${y(p) + 3}">${p}%</text>`).join('');
    const dots = asc.map((a, i) => `<circle class="chart-dot" cx="${x(i).toFixed(1)}" cy="${y(a.percentage || 0).toFixed(1)}" r="3.5"/>`).join('');

    const best = Math.max(...valid.map(a => a.percentage || 0));
    const last = asc[n - 1].percentage || 0;
    const avg = Math.round(valid.reduce((s, a) => s + (a.percentage || 0), 0) / valid.length);

    const by = {};
    valid.forEach(a => { const k = a.lessonName || 'درس'; (by[k] = by[k] || []).push(a.percentage || 0); });
    const arr = Object.keys(by).map(k => ({ k, avg: Math.round(by[k].reduce((s, v) => s + v, 0) / by[k].length) })).sort((a, b) => a.avg - b.avg);
    const weak = arr.filter(r => r.avg < 70).slice(0, 3);
    const strong = arr.filter(r => r.avg >= 85).slice(-3).reverse();
    const li = (r, c) => `<div class="stat-line"><span>${r.k}</span><span class="badge-score" style="${c}">${r.avg}%</span></div>`;

    box.innerHTML = `
        <div class="profile-card">
            <h3 class="stats-title"><i class="fas fa-chart-line"></i> تطور مستواك</h3>
            <div class="stat-chips">
                <div class="chip"><b>${avg}%</b><span>المعدل</span></div>
                <div class="chip"><b>${best}%</b><span>أعلى نسبة</span></div>
                <div class="chip"><b>${last}%</b><span>آخر امتحان</span></div>
            </div>
            <svg viewBox="0 0 ${W} ${H}" class="chart-svg">${grid}<polyline class="chart-line" points="${pts}"/>${dots}</svg>
            ${weak.length ? `<h4 class="stats-sub">📉 محتاج مراجعة</h4>${weak.map(r => li(r, 'background:#fee2e2;color:#b91c1c;')).join('')}` : ''}
            ${strong.length ? `<h4 class="stats-sub">⭐ نقاط قوتك</h4>${strong.map(r => li(r, 'background:var(--accent-green-light);color:#065f46;')).join('')}` : ''}
        </div>`;
}
