// ==============================
// script.js (full)
// ==============================

// Helpers
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

/* ===========================
   Consts
=========================== */
const HEADER_H = 64;

/* ===========================
   Splash & Curtain sequence
=========================== */
const splash = $('#splash');
const splashLogo = $('.splash-logo');
const splashSpinner = $('.splash-spinner');
const whiteout = document.createElement('div');
whiteout.id = 'whiteout';
if (document.body.id === "top") {
    document.body.appendChild(whiteout);
}

const LOGO_FADE_MS = 3000;
const SPINNER_DELAY_MS = 1500;
const WHITEOUT_DELAY_MS = 2000;
const WHITEOUT_FADE_MS = 1500;


function runIntroTimeline() {
    splashLogo?.classList.add('is-visible');

    setTimeout(() => {
        splashSpinner?.classList.add('is-visible');

        setTimeout(() => {
            whiteout.classList.add('show');

            setTimeout(() => {
                whiteout.classList.remove('show');
                whiteout.classList.add('hidden');
                splash?.classList.add('hidden');
                document.body.classList.add('is-ready');
            }, WHITEOUT_FADE_MS);

        }, WHITEOUT_DELAY_MS);

    }, SPINNER_DELAY_MS);
}

if (document.body.id === 'top') {
  window.addEventListener('DOMContentLoaded', runIntroTimeline);
}

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
   Drawer (off-canvas) + Focus trap
=========================== */
const hamBtn = $('#hamBtn');
const drawer = $('#drawer');
const backdrop = $('#backdrop');
const main = $('#main');

const focusableSel = 'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
function trapFocus(container, e) {
    const nodes = $$(focusableSel, container);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
}

const openDrawer = () => {
    hamBtn?.classList.add('is-open');
    document.body.classList.add('no-scroll', 'drawer-open');
    hamBtn?.setAttribute('aria-expanded', 'true');
    main?.setAttribute('aria-hidden', 'true');
    backdrop?.setAttribute('aria-hidden', 'false');
    drawer?.focus?.({ preventScroll: true });
};
const closeDrawer = () => {
    hamBtn?.classList.remove('is-open');
    document.body.classList.remove('no-scroll', 'drawer-open');
    hamBtn?.setAttribute('aria-expanded', 'false');
    main?.removeAttribute('aria-hidden');
    backdrop?.setAttribute('aria-hidden', 'true');
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
drawer?.addEventListener('keydown', (e) => trapFocus(drawer, e));

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
            const y = el.getBoundingClientRect().top + window.scrollY - HEADER_H;
            window.scrollTo({ top: y, behavior: 'smooth' });
            if (document.body.classList.contains('drawer-open')) closeDrawer();
        }
    });
});

/* ===========================
   Hero video: responsive source
=========================== */
const heroVideo = $('#bgVideo');
const HERO_SOURCES = { desktop: './movie/top_pc.mp4', mobile: './movie/top_smt.mp4' };
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches;

function setHeroVideoSource() {
    if (!heroVideo) return;
    const target = isDesktop() ? HERO_SOURCES.desktop : HERO_SOURCES.mobile;
    const current = heroVideo.getAttribute('src') || '';
    if (current !== target) {
        try { heroVideo.pause(); } catch { }
        heroVideo.setAttribute('src', target);
        heroVideo.load();
        const p = heroVideo.play();
        if (p && typeof p.catch === 'function') p.catch(() => { });
    }
}
window.addEventListener('DOMContentLoaded', setHeroVideoSource);
let _resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(setHeroVideoSource, 250);
});

/* ===========================
   Reveal CTA after subtitle animation
=========================== */
const handwriteSub = $('.handwrite-sub');
handwriteSub?.addEventListener('animationend', () => {
    document.body.classList.add('hero-cta-ready');
}, { once: true });

/* ===========================
   Video autoplay handling
=========================== */
function playAllVideos() {
    const vids = [$('#bgVideo'), ...$$('.sec-bg-video')].filter(Boolean);
    vids.forEach(v => {
        v.muted = true;
        v.setAttribute('playsinline', '');
        v.play().catch(() => { });
    });
}
const ensureAutoplay = () => {
    setHeroVideoSource();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const vids = [$('#bgVideo'), ...$$('.sec-bg-video')].filter(Boolean);
        vids.forEach(v => { try { v.pause(); } catch { } });
        return;
    }
    playAllVideos();
};
window.addEventListener('load', ensureAutoplay);
document.addEventListener('visibilitychange', () => { if (!document.hidden) ensureAutoplay(); });

/* ===========================
   Floating particles
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
        const left = Math.random() * 100;
        const duration = 10 + Math.random() * 20;
        const delay = -Math.random() * duration;
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
   Scroll reveal
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
