// ==============================
// script.js (robust sync for aria-expanded & .is-open)
// ==============================

// Helpers
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));

/* ===========================
   Consts
=========================== */
const HEADER_H = 64;

/* ===========================
   Web Components: Header / Footer
=========================== */
class SiteHeader extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
<header id="siteHeader">
  <a class="brand-logo" href="./index.html" aria-label="トップへ">
      <img src="./images/header.png" alt="ConsalLink Recruit" loading="eager" />
  </a>
  <nav>
      <button class="hamburger" id="hamBtn" aria-label="メニューを開く" aria-controls="drawer" aria-expanded="false">
          <span class="ham-lines" aria-hidden="true">
              <span></span><span></span><span></span>
          </span>
      </button>
  </nav>
</header>

<div class="drawer-backdrop" id="backdrop" tabindex="-1" aria-hidden="true"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle" tabindex="-1">
  <div class="drawer-header">
      <strong id="drawerTitle">メニュー</strong>
  </div>
  <ul class="drawer-list">
      <li><a class="drawer-link" href="environment.html" data-close>働く環境</a></li>
      <li><a class="drawer-link" href="#numbers" data-close>数字で見る</a></li>
      <li><a class="drawer-link" href="midcareer.html" data-close>中途採用</a></li>
      <li><a class="drawer-link" href="#freshers" data-close>新卒採用</a></li>
      <li><a class="drawer-link" href="#catalog" data-close>社員図鑑</a></li>

      <li>
          <a class="drawer-link ham-cta ham-cta--faq" href="faq.html#common" data-close aria-label="よくある質問">
              <span class="ham-cta-zoom">
                  <img class="ham-cta-img" src="./images/humberger/question.png" alt="よくある質問（FAQ）">
              </span>
          </a>
      </li>

      <li class="drawer-grid-two">
          <a class="drawer-link ham-cta ham-cta--square" href="midcareer.html" data-close aria-label="中途採用エントリー">
              <span class="ham-cta-zoom">
                  <img class="ham-cta-img" src="./images/humberger/middle-entry-thum.png" alt="中途採用エントリー">
              </span>
          </a>
          <a class="drawer-link ham-cta ham-cta--square" href="#freshers" data-close aria-label="新卒採用エントリー">
              <span class="ham-cta-zoom">
                  <img class="ham-cta-img" src="./images/humberger/new-entry-thum.png" alt="新卒採用エントリー">
              </span>
          </a>
      </li>
  </ul>
</aside>
    `.trim();

        // ドロワー/バックドロップを body直下へ（重なり順の安定化）
        hoistOverlayLayers(this);

        // 初期見た目
        applyHeaderShadow();

        // 生成直後に同期（念のため）
        queueMicrotask(syncHamburgerState);
    }
}
class SiteFooter extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
<footer class="reveal">
  <nav class="foot-links" aria-label="フッターナビ">
      <a href="#catalog">社員図鑑</a>
      <a href="environment.html">働く環境</a>
      <a href="#numbers">数字で見る</a>
      <a href="faq.html#common">よくある質問</a>
      <a href="midcareer.html">中途採用</a>
      <a href="#freshers">新卒採用</a>
  </nav>

  <a href="#top" class="foot-logo" aria-label="トップへ">
      <img src="./images/header.png" alt="ConsalLink Recruit" loading="lazy" />
  </a>

  <div class="foot-addresses" aria-label="拠点情報">
      <section class="addr-card">
          <div class="addr-inner">
              <div class="addr-body">
                  <h3 class="addr-title">大阪本社</h3>
                  <address class="addr-text">
                      〒530-0015<br>
                      大阪府大阪市北区中崎西2丁目4-12 梅田センタービル 14F
                  </address>
                  <div class="addr-access">
                      <strong>アクセス</strong>
                      <ul>
                          <li>地下鉄谷町線 中崎町駅から徒歩5分</li>
                          <li>阪急線 大阪梅田駅から徒歩5分</li>
                      </ul>
                  </div>
                  <p class="addr-map">
                      <a href="https://maps.app.goo.gl/izMmRtGozMFzuBmAA" target="_blank" rel="noopener">Google Map</a>
                  </p>
              </div>
          </div>
      </section>

      <section class="addr-card">
          <div class="addr-inner">
              <div class="addr-body">
                  <h3 class="addr-title">東京支社</h3>
                  <address class="addr-text">
                      〒113-0033<br>
                      東京都文京区本郷2丁目26番9号 NOVEL WORK Hongo 2F
                  </address>
                  <div class="addr-access">
                      <strong>アクセス</strong>
                      <ul>
                          <li>地下鉄丸ノ内線 本郷三丁目駅から徒歩3分</li>
                          <li>地下鉄大江戸線 本郷三丁目駅から徒歩4分</li>
                      </ul>
                  </div>
                  <p class="addr-map">
                      <a href="https://maps.app.goo.gl/srVxhXYtBvL5eiG17" target="_blank" rel="noopener">Google Map</a>
                  </p>
              </div>
          </div>
      </section>
  </div>

  <div>© <span id="y"></span> ConsalLink Inc.</div>
</footer>
    `.trim();

        const y = this.querySelector('#y');
        if (y) y.textContent = new Date().getFullYear();
    }
}

customElements.define('site-header', SiteHeader);
customElements.define('site-footer', SiteFooter);

/* ===========================
   Drawer/Backdrop を <body> 直下へ退避
   ※ z-index はCSS既定を使用（headerが最前面）
=========================== */
function hoistOverlayLayers(rootEl) {
    const drawer = rootEl.querySelector('#drawer');
    const backdrop = rootEl.querySelector('#backdrop');
    if (!drawer || !backdrop) return;

    const body = document.body;
    if (drawer.parentElement !== body) body.appendChild(drawer);
    if (backdrop.parentElement !== body) body.appendChild(backdrop);

    drawer.style.zIndex = '';
    backdrop.style.zIndex = '';
}

/* ===========================
   グローバル委譲：ハンバーガー/ドロワー
   クリック元のボタン要素を渡して“確実に”同期
=========================== */
(function bindGlobalNavHandlers() {
    if (window.__navBound) return;
    window.__navBound = true;

    document.addEventListener('click', (e) => {
        const ham = e.target.closest?.('#hamBtn');
        const backdrop = e.target.closest?.('#backdrop');
        const closeLink = e.target.closest?.('[data-close]');

        if (ham) {
            toggleDrawer(ham);
            e.preventDefault();
            return;
        }
        if (backdrop) {
            closeDrawer();
            e.preventDefault();
            return;
        }
        if (closeLink) {
            closeDrawer();
            return;
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) {
            closeDrawer();
        }
    });

    // body.class の変化でフォールバック同期（他JSの介入にも強い）
    const bodyClassObserver = new MutationObserver(syncHamburgerState);
    bodyClassObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // hamBtn が遅延生成/再生成されても同期されるように監視
    const docObserver = new MutationObserver(() => {
        if (document.getElementById('hamBtn')) {
            syncHamburgerState();
        }
    });
    docObserver.observe(document.documentElement, { childList: true, subtree: true });
})();

/* ===========================
   Drawer open/close
=========================== */
function toggleDrawer(btnCandidate) {
    if (document.body.classList.contains('drawer-open')) closeDrawer();
    else openDrawer(btnCandidate);
}

function openDrawer(btnCandidate) {
    const drawer = $('#drawer');
    const backdrop = $('#backdrop');
    const main = $('#main');

    document.body.classList.add('no-scroll', 'drawer-open');
    document.body.classList.add('drawer-opening');
    setTimeout(() => document.body.classList.remove('drawer-opening'), 800);

    // ← ここを一括同期に
    setHamburgers(true);

    if (main) main.setAttribute('aria-hidden', 'true');
    if (backdrop) backdrop.setAttribute('aria-hidden', 'false');
    drawer?.focus?.({ preventScroll: true });

    // 最終同期（次フレームでもう一度）
    requestAnimationFrame(() => requestAnimationFrame(syncHamburgerState));
}

function closeDrawer() {
    const backdrop = $('#backdrop');
    const main = $('#main');

    document.body.classList.remove('no-scroll', 'drawer-open', 'drawer-opening');

    // ← ここを一括同期に
    setHamburgers(false);

    main?.removeAttribute('aria-hidden');
    backdrop?.setAttribute('aria-hidden', 'true');

    // 最終同期（次フレームでもう一度）
    requestAnimationFrame(() => requestAnimationFrame(syncHamburgerState));
}

function syncHamburgerState() {
    const open = document.body.classList.contains('drawer-open');
    setHamburgers(open);
}

function setHamburgers(open) {
    const btns = document.querySelectorAll('#hamBtn, .hamburger'); // id重複/クラス両対応
    btns.forEach((btn) => {
        // 明示的に文字列で設定（true/false → "true"/"false"）
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.classList.toggle('is-open', open);
    });
}

/* ===========================
   Splash & Curtain
=========================== */
const splash = $('#splash');
const splashLogo = $('.splash-logo');
const splashSpinner = $('.splash-spinner');
const whiteout = document.createElement('div');
whiteout.id = 'whiteout';
if (document.body.id === 'top') {
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
function applyHeaderShadow() {
    const header = $('#siteHeader');
    if (!header) return;
    if (window.scrollY > 8) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
}
window.addEventListener('scroll', applyHeaderShadow, { passive: true });
window.addEventListener('load', applyHeaderShadow);

/* ===========================
   Smooth scroll (delegated)
=========================== */
document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = $(id);
    if (!el) return;
    e.preventDefault();
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_H;
    window.scrollTo({ top: y, behavior: 'smooth' });
    if (document.body.classList.contains('drawer-open')) {
        closeDrawer();
    }
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
        v.play?.().catch(() => { });
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        particles.innerHTML = '';
        return;
    }
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
   Footer year (global fallback)
=========================== */
const yGlobal = document.getElementById('y');
if (yGlobal) yGlobal.textContent = new Date().getFullYear();

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

