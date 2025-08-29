// =========================
// FAQ アコーディオン
// =========================
(() => {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
        const btn = item.querySelector('.q');
        const panel = item.querySelector('.a');
        if (!btn || !panel) return;

        // 初期状態（閉じる）
        panel.hidden = true;
        panel.style.height = '0px';
        panel.style.opacity = '0';
        btn.setAttribute('aria-expanded', 'false');

        btn.addEventListener('click', () => toggle(item, btn, panel));
    });

    function toggle(item, btn, panel) {
        const isOpen = item.classList.contains('open');

        if (isOpen) {
            // ---- 閉じるアニメーション ----
            const start = panel.scrollHeight;
            panel.hidden = false;                // 高さ測定のため一時的に表示
            panel.style.height = start + 'px';   // 現在の高さから
            // 次フレームでアニメーション開始
            requestAnimationFrame(() => {
                panel.style.transition = 'height 420ms cubic-bezier(.22, 1, .36, 1), opacity 320ms ease';
                panel.style.height = '0px';
                panel.style.opacity = '0';
            });

            btn.setAttribute('aria-expanded', 'false');
            item.classList.remove('open');

            const onCloseEnd = (e) => {
                if (e.propertyName === 'height') {
                    panel.hidden = true;           // 完全に閉じたら非表示
                    // 後始末
                    panel.style.transition = '';
                    panel.style.height = '0px';
                }
                panel.removeEventListener('transitionend', onCloseEnd);
            };
            panel.addEventListener('transitionend', onCloseEnd);

        } else {
            // ---- 開くアニメーション ----
            panel.hidden = false;               // 表示して高さを計測
            const end = panel.scrollHeight;

            // 0 から end へアニメーション
            panel.style.height = '0px';
            panel.style.opacity = '0';
            requestAnimationFrame(() => {
                panel.style.transition = 'height 480ms cubic-bezier(.22, 1, .36, 1), opacity 360ms ease';
                panel.style.height = end + 'px';
                panel.style.opacity = '1';
            });

            btn.setAttribute('aria-expanded', 'true');
            item.classList.add('open');

            const onOpenEnd = (e) => {
                if (e.propertyName === 'height') {
                    // 自然な高さに戻す（折返しやレスポンシブに対応）
                    panel.style.transition = '';
                    panel.style.height = 'auto';
                }
                panel.removeEventListener('transitionend', onOpenEnd);
            };
            panel.addEventListener('transitionend', onOpenEnd);
        }
    }
})();
