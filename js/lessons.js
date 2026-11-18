// ==================== عرض الدروس ====================
let lessonsCache = null;

function loadLessons() {
    const container = document.getElementById('lessonsList');
    container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">جاري التحميل...</p>';

    db.ref('lessons').on('value', (snapshot) => {
        lessonsCache = snapshot.val();
        renderLessons();
    });
}

function renderLessons() {
    const container = document.getElementById('lessonsList');
    const lessons = lessonsCache;
    if (!lessons) { container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد دروس متاحة.</p>'; return; }

    // نحفظ الستائر المفتوحة عشان ما تتقفلش لما الصفحة تتحدث
    const openIds = Array.from(container.querySelectorAll('[id^="accordion-"],[id^="sub-"]'))
        .filter(el => el.style.display === 'block').map(el => el.id);

    const studentGrade = currentStudent ? currentStudent.grade : null;
    const lessonsArray = Object.keys(lessons)
        .map(key => ({ id: key, ...lessons[key] }))
        .filter(lesson => {
            if (!lesson.isPublished) return false;
            if (studentGrade && lesson.grade && lesson.grade !== studentGrade) return false;
            return true;
        });

    if (lessonsArray.length === 0) { container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">لا توجد دروس متاحة لصفك.</p>'; return; }

    container.innerHTML = '';

    lessonsArray.forEach(lesson => {
        const exams = lesson.exams || [];
        const contents = lesson.contents || [];

        const box = document.createElement('div');
        box.className = 'lecture-box';

        let subContentsHTML = '';
        let subExamsHTML = '';

        const viewed = getViewed();
        contents.forEach(c => {
            let icon = c.type === 'pdf' ? 'fa-file-pdf' : (c.type === 'video' ? 'fa-play-circle' : 'fa-image');
            let label = c.type === 'pdf' ? 'فتح الملف' : (c.type === 'video' ? 'مشاهدة الفيديو' : 'عرض الصورة');
            const isViewed = viewed.includes(c.url);
            subContentsHTML += `
                <button class="btn-file ${isViewed ? 'viewed' : ''}" onclick="openContent('${c.type}', '${encodeURIComponent(c.url)}', '${encodeURIComponent(c.title || '')}')">
                    <span>${isViewed ? '<i class="fas fa-circle-check" style="color:var(--accent-green)"></i> ' : ''}${c.title || 'محتوى'}</span>
                    <span style="color:var(--primary-blue)"><i class="fas ${icon}"></i> ${label}</span>
                </button>
            `;
        });

        exams.forEach((exam, index) => {
            const draft = drafts[draftKey(lesson.id, index)];
            if (draft) {
                subExamsHTML += `
                    <div class="resume-row">
                        <button class="btn-file btn-resume" onclick="event.stopPropagation(); startExam('${lesson.id}', '${exam.name}', ${index})">
                            <span>${exam.name}</span>
                            <span><i class="fas fa-play"></i> استكمال (${countDraftAnswers(draft)} إجابة محفوظة)</span>
                        </button>
                        <button class="btn-file btn-restart" title="بدء من جديد" onclick="event.stopPropagation(); restartExam('${lesson.id}', '${exam.name}', ${index})">
                            <i class="fas fa-rotate-left"></i>
                        </button>
                    </div>
                `;
            } else {
                subExamsHTML += `
                    <button class="btn-file btn-exam" onclick="event.stopPropagation(); startExam('${lesson.id}', '${exam.name}', ${index})">
                        <span>${exam.name}</span>
                        <span><i class="fas fa-edit"></i> دخول</span>
                    </button>
                `;
            }
        });

        let contentHTML = '';
        if (subContentsHTML) {
            contentHTML += `
                <div class="sub-accordion">
                    <div class="sub-accordion-header" onclick="toggleSubAccordion('sub-cont-${lesson.id}')">
                        <span><i class="fas fa-folder-open"></i> الشرح والمحتوى</span>
                        <i class="fas fa-chevron-down" id="icon-sub-cont-${lesson.id}"></i>
                    </div>
                    <div class="sub-accordion-content" id="sub-cont-${lesson.id}">${subContentsHTML}</div>
                </div>
            `;
        }
        if (subExamsHTML) {
            contentHTML += `
                <div class="sub-accordion">
                    <div class="sub-accordion-header" onclick="toggleSubAccordion('sub-exam-${lesson.id}')">
                        <span><i class="fas fa-file-alt"></i> التطبيق والامتحانات</span>
                        <i class="fas fa-chevron-down" id="icon-sub-exam-${lesson.id}"></i>
                    </div>
                    <div class="sub-accordion-content" id="sub-exam-${lesson.id}">${subExamsHTML}</div>
                </div>
            `;
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
            </div>
        `;
        container.appendChild(box);
    });

    // استرجاع الستائر المفتوحة
    openIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = 'block';
        const iconId = id.startsWith('accordion-') ? 'icon-' + id.slice(10) : 'icon-' + id;
        const icon = document.getElementById(iconId);
        if (icon) icon.style.transform = 'rotate(180deg)';
    });
}

function toggleAccordion(id) {
    const content = document.getElementById('accordion-' + id);
    const icon = document.getElementById('icon-' + id);
    if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    }
}

function toggleSubAccordion(id) {
    const content = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (content.style.display === 'block') {
        content.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        content.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    }
}
