document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.faq-button');
    const sections = document.querySelectorAll('.faq-section');
    const questions = document.querySelectorAll('.faq-question');
    const hash = window.location.hash;

    if (hash) {
        // ハッシュに対応するタブとセクションを特定
        const targetId = hash.substring(1);
        const targetTab = document.querySelector(`.faq-button[data-target="${targetId}"]`);
        const targetSection = document.getElementById(targetId);

        // すべてのセクションを非表示にし、対象のセクションのみ表示
        sections.forEach(section => {
            section.style.display = 'none';
        });
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        // すべてのタブボタンのactiveクラスを削除し、対象のボタンに追加
        tabs.forEach(item => item.classList.remove('active'));
        if (targetTab) {
            targetTab.classList.add('active');
        }

    } else {
        // ハッシュがない場合は、従来の「共通」タブを初期表示
        const commonSection = document.getElementById('common');
        const commonTab = document.querySelector('.faq-button[data-target="common"]');

        sections.forEach(section => {
            if (section.id !== 'common') {
                section.style.display = 'none';
            }
        });
        if (commonTab) {
            commonTab.classList.add('active');
        }
    }

    // タブボタンのクリックイベント
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-target');

            // 全てのタブボタンからactiveクラスを削除し、クリックされたボタンに追加
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');

            // 全てのセクションを非表示にし、対象のセクションのみ表示
            sections.forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(targetId).style.display = 'block';

            // URLのハッシュを更新して、再読み込みしても状態を保持
            window.location.hash = targetId;
        });
    });

    // アコーディオンのクリックイベント（質問と回答の表示・非表示）
    questions.forEach(question => {
        question.addEventListener('click', () => {
            const answer = question.nextElementSibling;
            const isOpen = answer.classList.contains('active');

            // 他の質問の回答を閉じる
            questions.forEach(q => {
                q.nextElementSibling.classList.remove('active');
            });

            // クリックされた質問の回答を開く・閉じる
            if (!isOpen) {
                answer.classList.add('active');
            }
        });
    });
});