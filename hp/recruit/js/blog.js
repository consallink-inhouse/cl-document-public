// === ブログ記事をKurocoから取得する ===
const LIST_ENDPOINT = "https://cl-recruit-site.g.kuroco.app/rcms-api/3/blogs";
const API_KEY = "";

/** エスケープ **/
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

const qs = new URLSearchParams(location.search);
const slug = qs.get("slug") || "";

const hasMarked = () => typeof marked !== "undefined" && typeof marked.parse === "function";
const hasPurify = () => typeof DOMPurify !== "undefined" && typeof DOMPurify.sanitize === "function";
function markdownToHtml(md) {
    if (!md) return "";
    const raw = hasMarked() ? marked.parse(md) : escapeHtml(md).replace(/\n/g, "<br>");
    return hasPurify() ? DOMPurify.sanitize(raw) : raw;
}

/** タイトル・日付・サムネ画像・本文 */
const pickTitle = (item) => item?.subject || "(無題)";
const pickDate = (item) => item?.ymd || "";
const pickThumb = (item) => item?.thumbnail?.url || "";
const pickBody = (item) => item?.main_text || ""; // Markdown想定

function render(item) {
    if (!item) {
        const empty = document.getElementById("blog-empty");
        empty.textContent = "記事が見つかりませんでした。";
        empty.style.display = "";
        return;
    }
    const title = pickTitle(item);
    document.getElementById("blog-title").textContent = title;

    const ymd = pickDate(item);
    if (ymd) document.getElementById("blog-meta").textContent = "日付：" + ymd;

    const img = pickThumb(item);
    if (img) {
        const el = document.getElementById("blog-thumb");
        el.src = img;
        el.alt = title;
        el.style.display = "";
    }

    const html = markdownToHtml(pickBody(item));
    document.getElementById("blog-content").innerHTML = html || "<p>本文はありません。</p>";
}

async function main() {
    try {
        if (!slug) throw new Error("slugが指定されていません。");

        const headers = { "Accept": "application/json" };
        if (API_KEY) headers["X-RCMS-API-KEY"] = API_KEY;

        // listを取得 → slug一致の1件を探す（軽量な件数・検索条件に調整可）
        const res = await fetch(LIST_ENDPOINT, { headers, credentials: "omit", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const list = Array.isArray(data.list) ? data.list : [];
        const item = list.find(x => x.slug === slug);

        render(item);
    } catch (e) {
        console.error(e);
        const empty = document.getElementById("blog-empty");
        empty.textContent = "ブログ記事を読み込めませんでした。時間をおいて再度お試しください。";
        empty.style.display = "";
    }
}

main();