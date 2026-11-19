// ==================== أنيميشنات (JS) ====================

// ---------- فتح/غلق الستائر بسلاسة ----------
function resetAnim(el) {
    ['height', 'overflow', 'transition', 'opacity', 'paddingTop', 'paddingBottom'].forEach(p => el.style[p] = '');
}

function slideToggle(el, icon) {
    if (!el) return;
    clearTimeout(el._t);
    const isOpen = el.style.display === 'block' && el.dataset.closing !== '1';

    if (isOpen) {
        el.dataset.closing = '1';
        el.classList.remove('opened');
        el.style.overflow = 'hidden';
        el.style.transition = 'none';
        el.style.height = el.offsetHeight + 'px';
        void el.offsetHeight;
        el.style.transition = 'height .32s ease, padding .32s ease, opacity .25s ease';
        el.style.height = '0px'; el.style.paddingTop = '0px'; el.style.paddingBottom = '0px'; el.style.opacity = '0';
        if (icon) icon.style.transform = 'rotate(0deg)';
        el._t = setTimeout(() => { el.style.display = 'none'; resetAnim(el); delete el.dataset.closing; }, 330);
    } else {
        delete el.dataset.closing;
        resetAnim(el);
        el.style.display = 'block';
        const cs = getComputedStyle(el);
        const pt = cs.paddingTop, pb = cs.paddingBottom, full = el.scrollHeight;
        el.style.overflow = 'hidden';
        el.style.transition = 'none';
        el.style.height = '0px'; el.style.paddingTop = '0px'; el.style.paddingBottom = '0px'; el.style.opacity = '0';
        void el.offsetHeight;
        el.style.transition = 'height .4s cubic-bezier(.2,.8,.2,1), padding .4s cubic-bezier(.2,.8,.2,1), opacity .3s ease';
        el.style.height = full + 'px'; el.style.paddingTop = pt; el.style.paddingBottom = pb; el.style.opacity = '1';
        el.classList.add('opened');
        if (icon) icon.style.transform = 'rotate(180deg)';
        el._t = setTimeout(() => resetAnim(el), 420);
    }
}

// ---------- Ripple على الأزرار ----------
document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.btn-file, .btn-primary, .btn-submit, .btn-save-later, .viewer-btn, .btn-review, .back-btn');
    if (!t || t.disabled) return;
    const r = t.getBoundingClientRect();
    const s = Math.max(r.width, r.height) * 2;
    const span = document.createElement('span');
    span.className = 'ripple';
    span.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px;`;
    t.appendChild(span);
    setTimeout(() => span.remove(), 650);
});

// ---------- عدّاد الأرقام ----------
function runCountUps(root) {
    root.querySelectorAll('.count-up').forEach(el => {
        const to = parseFloat(el.dataset.to) || 0;
        const isInt = Number.isInteger(to);
        const t0 = performance.now(), dur = 1000;
        (function step(t) {
            const p = Math.min((t - t0) / dur, 1);
            const v = to * (1 - Math.pow(1 - p, 3));
            el.textContent = isInt ? Math.round(v) : v.toFixed(1);
            if (p < 1) requestAnimationFrame(step);
        })(t0);
    });
}

// ---------- قصاصات الاحتفال ----------
function launchConfetti() {
    const wrap = document.createElement('div');
    wrap.className = 'confetti-wrap';
    const colors = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#38bdf8'];
    for (let i = 0; i < 70; i++) {
        const c = document.createElement('i');
        c.style.cssText = `left:${Math.random() * 100}%;background:${colors[i % colors.length]};` +
            `width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;` +
            `animation-delay:${Math.random() * .6}s;animation-duration:${1.8 + Math.random() * 1.6}s;` +
            `--dx:${(Math.random() - .5) * 240}px;--rot:${Math.random() * 720}deg;`;
        wrap.appendChild(c);
    }
    document.body.appendChild(wrap);
    setTimeout(() => wrap.remove(), 4200);
}
