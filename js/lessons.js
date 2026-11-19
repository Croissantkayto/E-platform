// ==================== الوحدات والدروس ====================
let lessonsCache = null;
let unitsCache = null;
let currentUnitId = null;   // null = شاشة الوحدات، أو id الوحدة، أو '__none' لـ "دروس أخرى"
let searchTerm = '';
let animateNext = true;   // تشغيل أنيميشن الدخول عند التنقل فقط (مش عند تحديث البيانات)

function skeletonHTML() {
    const card = '<div class="unit-card skeleton-card"><div class="unit-img skeleton"></div><div class="unit-info"><div class="skeleton line"></div><div class="skeleton line short"></div></div></div>';
    return '<div class="units-grid">' + card.repeat(4) + '</div>';
}

function loadLessons() {
    animateNext = true;
    document.getElementById('lessonsList').innerHTML = skeletonHTML();
    db.ref('lessons').on('value', (s) => { lessonsCache = s.val() || {}; renderLessons(); refreshNotifications(); },
        () => { lessonsCache = {}; renderLessons(); });
    db.ref('units').on('value', (s) => { unitsCache = s.val() || {}; renderLessons(); },
        () => { unitsCache = {}; renderLessons(); });
}

function fmtDate(ts) { return new Date(ts).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }); }

// ---------- إتاحة الامتحان (موعد + محاولات) ----------
function examAvailability(lessonId, index, exam) {
    const now = Date.now();
    const openAt = parseInt(exam.openAt) || 0, closeAt = parseInt(exam.closeAt) || 0, max = parseInt(exam.maxAttempts) || 0;
    const used = attemptsCache.filter(a => a.lessonId === lessonId && parseInt(a.examIndex) === index).length;
    let timeOk = true, reason = '';
    if (openAt && now < openAt) { timeOk = false; reason = 'يفتح ' + fmtDate(openAt); }
    else if (closeAt && now > closeAt) { timeOk = false; reason = 'انتهى الموعد'; }
    const attemptsOk = !max || used < max;
    if (timeOk && !attemptsOk) reason = 'استنفدت المحاولات';
    return { timeOk, attemptsOk, used, max, reason };
}

// ---------- فلاتر ----------
function visibleLessons() {
    const g = currentStudent ? currentStudent.grade : null;
    return Object.keys(lessonsCache || {}).map(k => ({ id: k, ...lessonsCache[k] }))
        .filter(l => l.isPublished && !(g && l.grade && l.grade !== g));
}
function visibleUnits() {
    const g = currentStudent ? currentStudent.grade : null;
    return Object.keys(unitsCache || {}).map(k => ({ id: k, ...unitsCache[k] }))
        .filter(u => u.isPublished !== false && !(g && u.grade && u.grade !== g))
        .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.name || '').localeCompare(b.name || '', 'ar'));
}
function lessonMatches(l, term) {
    const hay = [l.name, l.description, ...(l.contents || []).map(c => c.title), ...(l.exams || []).map(e => e.name)]
        .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(term);
}

function onSearch(v) { searchTerm = v.trim().toLowerCase(); renderLessons(); }
function openUnit(id, card) {
    const container = document.getElementById('lessonsList');
    if (card) card.classList.add('picked');
    container.classList.add('leaving');
    setTimeout(() => { currentUnitId = id; animateNext = true; renderLessons(); window.scrollTo({ top: 0 }); }, 240);
}
function backToUnits() {
    document.getElementById('lessonsList').classList.add('leaving');
    setTimeout(() => { currentUnitId = null; animateNext = true; renderLessons(); window.scrollTo({ top: 0 }); }, 220);
}

// ---------- الرسم ----------
function renderLessons() {
    if (lessonsCache === null || unitsCache === null) return;
    const container = document.getElementById('lessonsList');
    container.classList.remove('leaving');
    container.classList.toggle('anim-in', animateNext);
    animateNext = false;

    const openIds = Array.from(container.querySelectorAll('[id^="accordion-"],[id^="sub-"]'))
        .filter(el => el.style.display === 'block').map(el => el.id);

    const lessons = visibleLessons();
    const units = visibleUnits();
    container.innerHTML = '';

    const restoreOpen = () => openIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'block';
        const icon = document.getElementById(id.startsWith('accordion-') ? 'icon-' + id.slice(10) : 'icon-' + id);
        if (icon) icon.style.transform = 'rotate(180deg)';
    });
    const msg = (t) => { container.innerHTML = `<p style="text-align:center;color:#999;padding:20px;">${t}</p>`; };

    // بحث
    if (searchTerm) {
        const found = lessons.filter(l => lessonMatches(l, searchTerm));
        if (!found.length) { msg('لا توجد نتائج للبحث.'); return; }
        found.forEach(l => container.appendChild(buildLessonBox(l)));
        restoreOpen(); return;
    }

    if (lessons.length === 0) { msg('لا توجد دروس متاحة لصفك.'); return; }

    // لا توجد وحدات: عرض الدروس مباشرة
    if (units.length === 0) {
        lessons.forEach(l => container.appendChild(buildLessonBox(l)));
        restoreOpen(); return;
    }

    const unitIds = new Set(units.map(u => u.id));
    const orphans = lessons.filter(l => !l.unitId || !unitIds.has(l.unitId));

    if (currentUnitId === null) { renderUnitsGrid(container, units, lessons, orphans); return; }

    // داخل وحدة
    const unit = currentUnitId === '__none' ? { name: 'دروس أخرى' } : units.find(u => u.id === currentUnitId);
    if (!unit) { currentUnitId = null; renderLessons(); return; }
    const list = currentUnitId === '__none' ? orphans : lessons.filter(l => l.unitId === currentUnitId);
    const head = document.createElement('div');
    head.className = 'unit-header';
    head.innerHTML = `<button class="back-btn" onclick="backToUnits()"><i class="fas fa-arrow-right"></i> الوحدات</button><h3>${unit.name}</h3>`;
    container.appendChild(head);
    if (!list.length) { container.insertAdjacentHTML('beforeend', '<p style="text-align:center;color:#999;padding:20px;">لا توجد دروس في هذه الوحدة بعد.</p>'); return; }
    list.forEach(l => container.appendChild(buildLessonBox(l)));
    restoreOpen();
}

function renderUnitsGrid(container, units, lessons, orphans) {
    const groups = {};
    const add = (u) => { const t = u.term || ''; (groups[t] = groups[t] || []).push(u); };
    units.forEach(add);
    if (orphans.length) add({ id: '__none', name: 'دروس أخرى', image: '', term: '' });

    Object.keys(groups).forEach(term => {
        if (term) container.insertAdjacentHTML('beforeend', `<h3 class="term-title">${term}</h3>`);
        const grid = document.createElement('div');
        grid.className = 'units-grid';
        groups[term].forEach(u => {
            const count = u.id === '__none' ? orphans.length : lessons.filter(l => l.unitId === u.id).length;
            const card = document.createElement('div');
            card.className = 'unit-card';
            card.onclick = () => openUnit(u.id, card);
            card.innerHTML = `
                <div class="unit-img"><i class="fas fa-book-open"></i>${u.image ? `<img src="${u.image}" alt="" loading="lazy" onload="this.classList.add('loaded')" onerror="this.remove()">` : ''}</div>
                <div class="unit-info"><h4>${u.name}</h4><span>${count} درس</span></div>`;
            grid.appendChild(card);
        });
        container.appendChild(grid);
    });
}

// ---------- صندوق الدرس ----------
function examRowHTML(lesson, exam, index) {
    const draft = drafts[draftKey(lesson.id, index)];
    const av = examAvailability(lesson.id, index, exam);
    const trophy = `<button class="btn-file btn-trophy" title="لوحة الشرف" onclick="event.stopPropagation(); openLeaderboard('${lesson.id}', ${index})"><i class="fas fa-trophy"></i></button>`;
    let main;
    if (!av.timeOk || (!av.attemptsOk && !draft)) {
        main = `<button class="btn-file btn-locked" disabled><span>${exam.name}</span><span><i class="fas fa-lock"></i> ${av.reason}</span></button>`;
    } else if (draft) {
        main = `
            <button class="btn-file btn-resume" onclick="event.stopPropagation(); startExam('${lesson.id}', '${exam.name}', ${index})">
                <span>${exam.name}</span>
                <span><i class="fas fa-play"></i> استكمال (${countDraftAnswers(draft)} إجابة محفوظة)</span>
            </button>
            <button class="btn-file btn-restart" title="بدء من جديد" onclick="event.stopPropagation(); restartExam('${lesson.id}', '${exam.name}', ${index})"><i class="fas fa-rotate-left"></i></button>`;
    } else {
        const label = av.max ? ` • المحاولات ${av.used}/${av.max}` : '';
        main = `
            <button class="btn-file btn-exam" onclick="event.stopPropagation(); startExam('${lesson.id}', '${exam.name}', ${index})">
                <span>${exam.name}${label}</span>
                <span><i class="fas fa-edit"></i> دخول</span>
            </button>`;
    }
    return `<div class="resume-row">${main}${trophy}</div>`;
}

function buildLessonBox(lesson) {
    const exams = lesson.exams || [];
    const contents = lesson.contents || [];
    const box = document.createElement('div');
    box.className = 'lecture-box';

    let subContentsHTML = '';
    let subExamsHTML = '';
    const viewed = getViewed();

    contents.forEach(c => {
        const icon = c.type === 'pdf' ? 'fa-file-pdf' : (c.type === 'video' ? 'fa-play-circle' : 'fa-image');
        const label = c.type === 'pdf' ? 'فتح الملف' : (c.type === 'video' ? 'مشاهدة الفيديو' : 'عرض الصورة');
        const isViewed = viewed.includes(c.url);
        subContentsHTML += `
            <button class="btn-file ${isViewed ? 'viewed' : ''}" onclick="openContent('${c.type}', '${encodeURIComponent(c.url)}', '${encodeURIComponent(c.title || '')}')">
                <span>${isViewed ? '<i class="fas fa-circle-check" style="color:var(--accent-green)"></i> ' : ''}${c.title || 'محتوى'}</span>
                <span style="color:var(--primary-blue)"><i class="fas ${icon}"></i> ${label}</span>
            </button>`;
    });
    exams.forEach((exam, index) => { subExamsHTML += examRowHTML(lesson, exam, index); });

    let contentHTML = '';
    if (subContentsHTML) {
        contentHTML += `
            <div class="sub-accordion">
                <div class="sub-accordion-header" onclick="toggleSubAccordion('sub-cont-${lesson.id}')">
                    <span><i class="fas fa-folder-open"></i> الشرح والمحتوى</span>
                    <i class="fas fa-chevron-down" id="icon-sub-cont-${lesson.id}"></i>
                </div>
                <div class="sub-accordion-content" id="sub-cont-${lesson.id}">${subContentsHTML}</div>
            </div>`;
    }
    if (subExamsHTML) {
        contentHTML += `
            <div class="sub-accordion">
                <div class="sub-accordion-header" onclick="toggleSubAccordion('sub-exam-${lesson.id}')">
                    <span><i class="fas fa-file-alt"></i> التطبيق والامتحانات</span>
                    <i class="fas fa-chevron-down" id="icon-sub-exam-${lesson.id}"></i>
                </div>
                <div class="sub-accordion-content" id="sub-exam-${lesson.id}">${subExamsHTML}</div>
            </div>`;
    }
    if (!subContentsHTML && !subExamsHTML) {
        contentHTML = '<p style="color:#999;text-align:center;font-size:14px;font-weight:600;">لا يوجد محتوى أو امتحانات بعد.</p>';
    }

    box.innerHTML = `
        <div class="lecture-header" onclick="toggleAccordion('${lesson.id}')">
            <h3><i class="fas fa-book"></i> ${lesson.name}</h3>
            <i class="fas fa-chevron-down" id="icon-${lesson.id}" style="transition:0.3s;"></i>
        </div>
        <div class="lecture-content" id="accordion-${lesson.id}">
            <p style="color:var(--text-muted); font-size:14px; margin-bottom:15px; font-weight:600;">${lesson.description || 'لا يوجد وصف'}</p>
            ${contentHTML}
        </div>`;
    return box;
}

function toggleAccordion(id) {
    slideToggle(document.getElementById('accordion-' + id), document.getElementById('icon-' + id));
}

function toggleSubAccordion(id) {
    slideToggle(document.getElementById(id), document.getElementById('icon-' + id));
}
