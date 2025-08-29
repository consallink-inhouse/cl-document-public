// === ブログ一覧をKurocoから取得する ===
const ENDPOINT = "https://cl-recruit-site.g.kuroco.app/rcms-api/3/blogs";
const API_KEY = "";
const CONTAINER_ID = "blog-list";

/** エスケープ **/
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

/** 読み込み中プレースホルダ */
function showSkeleton(count = 6) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    const item = `
    <div class="blog-card" aria-hidden="true">
      <div style="width:100%;aspect-ratio:16/9;background:#eee;"></div>
    </div>`;
    container.innerHTML = Array.from({ length: count }).map(() => item).join("");
}

/** タイトル・日付・サムネ画像・リンク生成 */
const pickTitle = (item) => item?.subject || "(無題)";
const pickDate = (item) => item?.ymd || "";
const pickThumb = (item) => item?.thumbnail?.url || "";
const pickHref = (item) => "./blog.html?slug=" + (item?.slug || item?.topics_id || "");

function renderList(list) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = "<p>記事がありません。</p>";
        return;
    }

    const html = list.map((item) => {
        const title = pickTitle(item);
        const ymd = pickDate(item);
        const img = pickThumb(item);
        const href = pickHref(item);

        return `
      <a class="blog-card" href="${href}">
        ${img ? `<img class="blog-thumb" src="${img}" alt="${escapeHtml(title)}" loading="lazy" />` : ""}
        <div class="blog-info">
            <h3 class="blog-title">${escapeHtml(title)}</h3>
            ${ymd ? `<div class="blog-meta">日付：${escapeHtml(ymd)}</div>` : ""}
        </div>
      </a>
    `;
    }).join("");

    container.innerHTML = html;
}

/** メイン：APIを叩いて描画 */
async function main() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) {
        console.warn(`#${CONTAINER_ID} が見つかりません。index.html に <div id="${CONTAINER_ID}"></div> を用意してください。`);
        return;
    }

    // スケルトン表示
    showSkeleton();

    try {
        const headers = {
            "Accept": "application/json",
        };
        if (API_KEY) {
            // プロジェクト設定に合わせてヘッダ名を変更
            headers["X-RCMS-API-KEY"] = API_KEY;
            // headers["X-API-KEY"] = API_KEY;
        }

        const res = await fetch(ENDPOINT, {
            method: "GET",
            headers,
            // 公開APIなら omit でOK。Cookie等を送らない
            credentials: "omit",
            // キャッシュ挙動は用途に応じて調整可
            cache: "no-store",
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("APIエラー:", res.status, text);
            container.innerHTML = `<p>APIエラー: ${res.status}</p>`;
            return;
        }

        const data = await res.json();

        const list = Array.isArray(data.list) ? data.list : [];
        renderList(list);
    } catch (e) {
        console.error(e);
        const container = document.getElementById(CONTAINER_ID);
        if (container) container.innerHTML = "<p>ブログ一覧を読み込めませんでした。時間をおいて再度お試しください。</p>";
    }
}

main();