// ==================== عارض المحتوى (PDF / فيديو / صور) ====================
let viewerState = { type: '', url: '', title: '' };

// ---------- تحويل الروابط ----------
function driveFileId(url) {
    const m = url.match(/\/file\/d\/([^\/?#]+)/) || url.match(/[?&]id=([^&#]+)/);
    return m ? m[1] : null;
}

function youtubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
}

function getEmbedUrl(type, url) {
    const dId = driveFileId(url);
    if (type === 'video') {
        const yId = youtubeId(url);
        if (yId) return `https://www.youtube-nocookie.com/embed/${yId}?rel=0&modestbranding=1`;
        if (dId) return `https://drive.google.com/file/d/${dId}/preview`;
        return url;
    }
    if (type === 'pdf') {
        if (dId) return `https://drive.google.com/file/d/${dId}/preview`;
        return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
    }
    return url;
}

function getDownloadUrl(url) {
    const dId = driveFileId(url);
    return dId ? `https://drive.google.com/uc?export=download&id=${dId}` : url;
}

// ---------- ما تم مشاهدته ----------
function viewedKey() { return 'viewed_' + (currentStudentId || 'guest'); }
function getViewed() {
    try { return JSON.parse(localStorage.getItem(viewedKey()) || '[]'); } catch (e) { return []; }
}
function markViewed(url) {
    const v = getViewed();
    if (!v.includes(url)) {
        v.push(url);
        try { localStorage.setItem(viewedKey(), JSON.stringify(v)); } catch (e) {}
        if (lessonsCache) renderLessons();
    }
}

// ---------- فتح / إغلاق ----------
function openContent(type, encUrl, encTitle) {
    const url = decodeURIComponent(encUrl);
    const title = decodeURIComponent(encTitle) || 'محتوى';
    viewerState = { type, url, title };

    const body = document.getElementById('viewerBody');
    const spinner = document.getElementById('viewerSpinner');
    document.getElementById('viewerTitle').textContent = title;
    document.getElementById('viewerIcon').className = 'fas ' + (type === 'pdf' ? 'fa-file-pdf' : (type === 'video' ? 'fa-play-circle' : 'fa-image'));
    document.getElementById('viewerDownload').style.display = type === 'pdf' ? 'inline-flex' : 'none';
    document.getElementById('viewerFullscreen').style.display = type === 'image' ? 'none' : 'inline-flex';

    body.innerHTML = '';
    spinner.style.display = 'flex';

    if (type === 'image') {
        const img = document.createElement('img');
        img.src = url; img.alt = title;
        img.onload = () => spinner.style.display = 'none';
        img.onerror = () => { spinner.style.display = 'none'; body.innerHTML = viewerErrorHTML(); };
        body.appendChild(img);
    } else {
        const frame = document.createElement('iframe');
        frame.src = getEmbedUrl(type, url);
        frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.onload = () => spinner.style.display = 'none';
        body.appendChild(frame);
        setTimeout(() => { spinner.style.display = 'none'; }, 8000);
    }

    document.getElementById('viewerOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    markViewed(url);
}

function viewerErrorHTML() {
    return `<div class="viewer-error"><i class="fas fa-triangle-exclamation"></i><p>تعذر عرض المحتوى هنا</p><button class="btn-primary" onclick="viewerNewTab()">فتح في تبويب جديد</button></div>`;
}

function closeViewer() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    const box = document.getElementById('viewerBox');
    box.classList.remove('maximized');
    document.getElementById('viewerOverlay').classList.remove('open');
    document.getElementById('viewerBody').innerHTML = ''; // يوقف الفيديو
    document.body.style.overflow = '';
}

function viewerNewTab() { window.open(viewerState.url, '_blank', 'noopener'); }

function viewerDownload() {
    const a = document.createElement('a');
    a.href = getDownloadUrl(viewerState.url);
    a.target = '_blank';
    a.rel = 'noopener';
    a.download = viewerState.title || 'file';
    document.body.appendChild(a); a.click(); a.remove();
}

function viewerFullscreen() {
    const box = document.getElementById('viewerBox');
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (box.classList.contains('maximized')) { box.classList.remove('maximized'); return; }
    if (box.requestFullscreen) {
        box.requestFullscreen().catch(() => box.classList.add('maximized'));
    } else {
        box.classList.add('maximized'); // iOS وغيره
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('viewerOverlay').classList.contains('open')) closeViewer();
});
