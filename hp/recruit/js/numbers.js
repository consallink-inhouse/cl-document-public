// numbers.js
(() => {
    window.addEventListener('DOMContentLoaded', () => {
        const easing = 'easeOutQuart';
        const duration = 1200;

        // ===== CountUp =====
        const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
        function animateCount(el, target, dur = 1200, dec = 0) {
            const start = performance.now();
            const from = 0;
            const factor = Math.pow(10, dec);
            const tick = now => {
                const p = Math.min(1, (now - start) / dur);
                const v = from + (target - from) * easeOutCubic(p);
                el.textContent = (Math.round(v * factor) / factor).toLocaleString();
                if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        // .kpi-value .num => 0→既存値
        const nums = document.querySelectorAll('.kpi-card .kpi-value .num');
        const ioCount = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                if (el.dataset.countInited === '1') return;
                const raw = (el.textContent || '').replace(/[, ]/g, '');
                const target = parseFloat(raw) || 0;
                const decimals = (raw.includes('.') ? (raw.split('.')[1]?.length || 0) : 0);
                el.textContent = '0';
                animateCount(el, target, 1200, decimals);
                el.dataset.countInited = '1';
                ioCount.unobserve(el);
            });
        }, { threshold: 0.4 });
        nums.forEach(el => ioCount.observe(el));

        // ===== Charts =====
        const baseOpts = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 1200, easing },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(11,41,74,.94)',
                    padding: 10,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,.2)',
                    borderWidth: 1,
                }
            },
            layout: { padding: 8 }
        };

        const ioCharts = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const canvas = entry.target;
                if (canvas.dataset.inited === '1') return;

                switch (canvas.id) {
                    case 'chart-sales': initSales(canvas); break; // 売上（縦棒）
                    case 'chart-gender': initGender(canvas); break; // 男女（円）
                    case 'chart-bunri': initBunri(canvas); break; // 文理（ドーナツ）
                    case 'chart-dept': initDept(canvas); break; // 事業部（横棒）
                    case 'chart-age': initAge(canvas); break; // 年齢（横棒）
                }
                canvas.dataset.inited = '1';
                ioCharts.unobserve(canvas);
            });
        }, { threshold: 0.25 });

        ['chart-sales', 'chart-gender', 'chart-bunri', 'chart-dept', 'chart-age'].forEach(id => {
            const c = document.getElementById(id);
            if (c) ioCharts.observe(c);
        });

        // 売上（縦棒／年別色分け／目盛非表示）
        function initSales(canvas) {
            const labels = ['2019', '2020', '2021', '2022', '2023', '2024'];
            const values = [420, 480, 520, 610, 680, 692];

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        borderRadius: 8,
                        backgroundColor: [
                            '#BFDBFE', // 2019 淡い青
                            '#A7F3D0', // 2020 淡い緑
                            '#FDE68A', // 2021 淡い黄
                            '#FCA5A5', // 2022 淡い赤
                            '#C4B5FD', // 2023 淡い紫
                            '#93C5FD'  // 2024 少し濃い青
                        ],
                        hoverBackgroundColor: [
                            '#3B82F6', '#10B981', '#D97706', '#DC2626', '#7C3AED', '#1D4ED8'
                        ]
                    }]
                },
                options: {
                    ...baseOpts,
                    scales: {
                        x: { ticks: { color: '#0b294a' }, grid: { display: false } },
                        y: { beginAtZero: true, ticks: { display: false }, grid: { display: false } }
                    }
                }
            });
        }

        // 男女比率（円：色を濃く）
        function initGender(canvas) {
            new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: ['男性 39名', '女性 19名'],
                    datasets: [{
                        data: [39, 19],
                        backgroundColor: ['#1E88FF', '#EC4899'], // 濃い青／濃いピンク
                        hoverBackgroundColor: ['#106FE0', '#DB2777'],
                        borderWidth: 0
                    }]
                },
                options: {
                    ...baseOpts,
                    cutout: '42%',
                }
            });
        }

        // 文理比率（ドーナツ：色を濃く／白抜き小さめ）
        function initBunri(canvas) {
            new Chart(canvas, {
                type: 'doughnut',
                data: {
                    labels: ['文系 80%', '理系 20%'],
                    datasets: [{
                        data: [80, 20],
                        backgroundColor: ['#2563EB', '#10B981'],   // 濃い青／濃い緑
                        hoverBackgroundColor: ['#1D4ED8', '#059669'],
                        borderWidth: 0
                    }]
                },
                options: {
                    ...baseOpts,
                    cutout: '42%',
                }
            });
        }

        // 事業部（横棒：淡色、ラベル少し小さめ）
        function initDept(canvas) {
            const labels = ['SS事業部', 'Mobility事業部', 'ERP事業部', '管理部', 'その他'];
            const values = [63.3, 11.7, 8.3, 8.3, 8.3];

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        borderRadius: 8,
                        backgroundColor: ['#A5C9FF', '#A7F3D0', '#FDE68A', '#FCA5A5', '#C4B5FD'],
                        hoverBackgroundColor: ['#93B7F5', '#86EFAC', '#FCD34D', '#F87171', '#A78BFA']
                    }]
                },
                options: {
                    ...baseOpts,
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true, ticks: { display: false }, grid: { display: false } },
                        y: { ticks: { color: '#0b294a', font: { size: 12, weight: '600' }, padding: 6 }, grid: { display: false } }
                    }
                }
            });
        }

        // 年齢（横棒：淡色、ラベル少し小さめ）
        function initAge(canvas) {
            const labels = ['20代', '30代', '40代', '50代以上'];
            const values = [55, 24, 10, 11];

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        data: values,
                        borderRadius: 8,
                        backgroundColor: ['#BFDBFE', '#A7F3D0', '#FDE68A', '#FBCFE8'],
                        hoverBackgroundColor: ['#93C5FD', '#86EFAC', '#FCD34D', '#F472B6']
                    }]
                },
                options: {
                    ...baseOpts,
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true, ticks: { display: false }, grid: { display: false } },
                        y: { ticks: { color: '#0b294a', font: { size: 12, weight: '600' }, padding: 6 }, grid: { display: false } }
                    }
                }
            });
        }
    });
})();
