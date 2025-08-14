// ==============================
// script.js (full)
// ==============================

// Helpers
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

/* ===========================
   Header shadow on scroll
=========================== */
const header = $('#siteHeader');
const onScroll = () => {
    if (window.scrollY > 8) header?.classList.add('scrolled');
    else header?.classList.remove('scrolled');
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ===========================
   Drawer (off-canvas)
=========================== */
const hamBtn = $('#hamBtn');
const drawer = $('#drawer');
const backdrop = $('#backdrop');

const openDrawer = () => {
    hamBtn?.classList.add('is-open');
    document.body.classList.add('no-scroll', 'drawer-open');
    hamBtn?.setAttribute('aria-expanded', 'true');
    drawer?.focus?.({ preventScroll: true });
};
const closeDrawer = () => {
    hamBtn?.classList.remove('is-open');
    document.body.classList.remove('no-scroll', 'drawer-open');
    hamBtn?.setAttribute('aria-expanded', 'false');
    hamBtn?.focus?.({ preventScroll: true });
};

hamBtn?.addEventListener('click', () => {
    const opened = !document.body.classList.contains('drawer-open');
    opened ? openDrawer() : closeDrawer();
});
backdrop?.addEventListener('click', closeDrawer);
drawer?.addEventListener('click', (e) => {
    if (e.target.closest?.('[data-close]')) closeDrawer();
});
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) closeDrawer();
});

/* ===========================
   Smooth scroll (on-page anchors)
=========================== */
$$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const el = $(id);
        if (el) {
            e.preventDefault();
            const y = el.getBoundingClientRect().top + window.scrollY - 60; // header height offset
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    });
});

/* ===========================
   Hero video: PC/スマホで出し分け
=========================== */
const heroVideo = $('#bgVideo');
const HERO_SOURCES = {
    desktop: './movie/top_pc.mp4',
    mobile: './movie/top_smt.mp4'
};
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

function setHeroVideoSource() {
    if (!heroVideo) return;
    const target = isDesktop() ? HERO_SOURCES.desktop : HERO_SOURCES.mobile;
    const current = heroVideo.getAttribute('src') || '';

    if (current !== target) {
        try { heroVideo.pause(); } catch { }
        // Remove any <source> children (safety)
        heroVideo.querySelectorAll('source').forEach(s => s.remove());
        heroVideo.setAttribute('src', target);
        heroVideo.load();
        const p = heroVideo.play();
        if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay might be blocked on some browsers */ });
    }
}

// Initial set + debounced on resize (handles orientation changes, etc.)
window.addEventListener('DOMContentLoaded', setHeroVideoSource);
let _resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(setHeroVideoSource, 250);
});

/* ===========================
   Initial page fade-in (wait for video readiness)
=========================== */
let pageRevealed = false;
function revealPage() {
    if (pageRevealed) return;
    pageRevealed = true;
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
}

if (heroVideo) {
    // Reveal as soon as the video is ready to display frames, with a fallback timer
    ['loadeddata', 'canplay', 'playing'].forEach(ev =>
        heroVideo.addEventListener(ev, () => revealPage(), { once: true })
    );
    setTimeout(() => revealPage(), 1600); // fallback in case of slow network
}

/* ===========================
   Trigger CTA image animation
   after handwrite-sub finishes
=========================== */
const handwriteSub = $('.handwrite-sub');
handwriteSub?.addEventListener('animationend', () => {
    document.body.classList.add('hero-cta-ready');
}, { once: true });

/* ===========================
   Video autoplay handling (common)
=========================== */
const ensureAutoplay = () => {
    // make sure we have the correct hero src before trying to play
    setHeroVideoSource();

    const vids = [$('#bgVideo'), ...$$('.sec-bg-video')].filter(Boolean);
    vids.forEach(v => {
        v.muted = true;
        v.setAttribute('playsinline', '');
        v.play().catch(() => { /* ignore autoplay errors */ });
    });
};
window.addEventListener('load', ensureAutoplay);
document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureAutoplay(); });

/* ===========================
   Floating particles (subtle motion)
=========================== */
const particles = $('#particles');
const spawnDots = () => {
    if (!particles) return;
    const count = Math.min(36, Math.floor(window.innerWidth / 40));
    particles.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const d = document.createElement('span');
        d.className = 'dot';
        const size = 4 + Math.random() * 6;
        d.style.width = d.style.height = size + 'px';
        const left = Math.random() * 100; // vw
        const duration = 10 + Math.random() * 20;
        const delay = -Math.random() * duration; // start mid-way
        d.style.left = left + 'vw';
        d.style.bottom = '-8vh';
        d.style.animationDuration = duration + 's';
        d.style.animationDelay = delay + 's';
        particles.appendChild(d);
    }
};
window.addEventListener('resize', spawnDots);
spawnDots();

/* ===========================
   Footer year
=========================== */
const y = document.getElementById('y');
if (y) y.textContent = new Date().getFullYear();

/* ===========================
   Scroll reveal (fade-in)
=========================== */
const revealTargets = $$('.reveal, .card.reveal');
const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
        }
    });
}, { root: null, rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

revealTargets.forEach(el => io.observe(el));
