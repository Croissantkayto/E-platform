// ==================== نافذة المعلومات + التوست ====================
function showInfoModal(title, html) {
    document.getElementById('infoTitle').textContent = title;
    document.getElementById('infoBody').innerHTML = html;
    document.getElementById('infoOverlay').classList.add('open');
}
function closeInfoModal() { document.getElementById('infoOverlay').classList.remove('open'); }

function showToast(msg) {
    const wrap = document.getElementById('toastWrap');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ==================== الإشعارات ====================
let announcements = [];

function listenAnnouncements() {
    db.ref('announcements').on('value', (snap) => {
        const v = snap.val() || {};
        announcements = Object.keys(v).map(k => ({ id: k, ...v[k] }))
            .filter(a => !a.grade || !currentStudent || a.grade === currentStudent.grade);
        refreshNotifications();
    }, () => { announcements = []; });
}

function seenKey() { return 'notifSeen_' + currentStudentId; }

function buildNotifications() {
    const list = [];
    announcements.forEach(a => list.push({ ts: a.timestamp || 0, icon: 'fa-bullhorn', title: a.title || 'إعلان', body: a.body || '' }));
    attemptsCache.forEach(at => {
        Object.values(at.complaints || {}).forEach(c => {
            if (c.status === 'resolved') list.push({ ts: c.resolvedAt || c.timestamp || 0, icon: 'fa-circle-check', title: 'تمت مراجعة تظلمك', body: at.lessonName || '' });
        });
    });
    Object.keys(lessonsCache || {}).forEach(id => {
        const l = lessonsCache[id];
        if (l.isPublished && l.createdAt && (!l.grade || !currentStudent || l.grade === currentStudent.grade)) {
            list.push({ ts: l.createdAt, icon: 'fa-book', title: 'محاضرة جديدة', body: l.name });
        }
    });
    return list.sort((a, b) => b.ts - a.ts).slice(0, 30);
}

function refreshNotifications() {
    if (!currentStudentId) return;
    let seen = parseInt(localStorage.getItem(seenKey()));
    if (!seen) { seen = Date.now(); localStorage.setItem(seenKey(), seen); }
    const unread = buildNotifications().filter(n => n.ts > seen).length;
    const badge = document.getElementById('notifBadge');
    badge.textContent = unread > 9 ? '9+' : unread;
    badge.classList.toggle('hidden', unread === 0);
}

function openNotifications() {
    if (!currentStudentId) return;
    const list = buildNotifications();
    const seen = parseInt(localStorage.getItem(seenKey())) || 0;
    const html = list.length ? list.map(n => `
        <div class="notif-item ${n.ts > seen ? 'unread' : ''}">
            <i class="fas ${n.icon}"></i>
            <div><strong>${n.title}</strong><div>${n.body}</div>
            <small>${n.ts ? new Date(n.ts).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : ''}</small></div>
        </div>`).join('') : '<p style="text-align:center;color:var(--text-muted);padding:20px;">لا توجد إشعارات</p>';
    showInfoModal('🔔 الإشعارات', html);
    localStorage.setItem(seenKey(), Date.now());
    refreshNotifications();
}
