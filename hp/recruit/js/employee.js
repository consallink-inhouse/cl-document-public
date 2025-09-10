// === 社員図鑑情報をKurocoから取得する ===
const LIST_ENDPOINT = "https://cl-recruit-site.g.kuroco.app/rcms-api/4/employees";
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

/** 登録日・トップ画面・MBTI・TikTok動画・質問1,2,3・回答1,2,3 **/
const pickDate = (item) => item?.ymd || "";
const pickTop = (item) => item?.top_image?.url || "";
const pickMbti = (item) => item?.mbti || "";
const pickTiktok = (item) => item?.tiktok_url || "";
const pickQuestion1 = (item) => item?.question1.label || "";
const pickQuestion2 = (item) => item?.question2.label || "";
const pickQuestion3 = (item) => item?.question3.label || "";
const pickAnswer1 = (item) => item?.answer1 || "";
const pickAnswer2 = (item) => item?.answer2 || "";
const pickAnswer3 = (item) => item?.answer3 || "";

function render(item) {
    if (!item) {
        const empty = document.getElementById("employee-empty");
        empty.textContent = "社員図鑑が見つかりませんでした。";
        empty.style.display = "";
        return;
    }

    const ymd = pickDate(item);
    document.getElementById("employee-meta").textContent = "登録日：" + ymd;

    const topImg = pickTop(item);
    if (topImg) {
        const el = document.getElementById("employee-top");
        el.src = topImg;
        el.alt = "社員図鑑のトップ写真";
        el.style.display = "";
    }

    const mbti = pickMbti(item);
    document.getElementById("employee-mbti").textContent = mbti;

    // TikTok動画
    const tiktok = pickTiktok(item);
    const wrap = document.getElementById("employee-tiktok");

    if (tiktok && wrap) {
        const cleanUrl = tiktok.split("?")[0]; // クエリを除去
        const vid = (cleanUrl.match(/\/video\/(\d+)/) || [])[1];

        wrap.innerHTML = vid
            ? `<iframe src="https://www.tiktok.com/player/v1/${vid}?autoplay=1&loop=1" 
                width="100%" height="600"
                style="max-width:680px;border:0;border-radius:12px"
                allowfullscreen loading="lazy"></iframe>`
            : `<a href="${tiktok}" target="_blank">TikTokを見る</a>`;
    } else if (wrap) {
        wrap.style.display = "none";
    }

    // インタビュー内容
    const question1 = pickQuestion1(item);
    document.getElementById("employee-question1").textContent = "Q１." + question1;

    const answer1 = pickAnswer1(item);
    document.getElementById("employee-answer1").textContent = answer1;

    const question2 = pickQuestion2(item);
    document.getElementById("employee-question2").textContent = "Q２." + question2;

    const answer2 = pickAnswer2(item);
    document.getElementById("employee-answer2").textContent = answer2;

    const question3 = pickQuestion3(item);
    document.getElementById("employee-question3").textContent = "Q３." + question3;

    const answer3 = pickAnswer3(item);
    document.getElementById("employee-answer3").textContent = answer3;
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
        empty.innerHTML = "<p>社員図鑑を読み込めませんでした。</br>時間をおいて再度お試しください。</p>";
        empty.style.display = "";
    }
}

main();