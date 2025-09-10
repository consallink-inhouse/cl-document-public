// === 社員図鑑一覧をKurocoから取得する ===
const ENDPOINT = "https://cl-recruit-site.g.kuroco.app/rcms-api/4/employees";
const API_KEY = "";
const CONTAINER_ID = "employee-list";

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

/** 登録日・サムネ画面・職種・入社年・雇用区分・業界開始年・Slug **/
const pickDate = (item) => item?.ymd || "";
const pickThumb = (item) => item?.thumbnail?.url || "";
const pickJob = (item) => item?.job_type.label || "";
const pickJoin = (item) => item?.join_year || "";
const pickEmployment = (item) => item?.employment_type.label || "";
const pickIndustry = (item) => item?.industry_start_year || "";
const pickHref = (item) => "./employee.html?slug=" + (item?.slug || item?.topics_id || "");

function renderList(list) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    if (!Array.isArray(list) || list.length === 0) {
        container.innerHTML = "<p>記事がありません。</p>";
        return;
    }

    const html = list.map((item) => {
        const ymd = pickDate(item);
        const img = pickThumb(item);
        const job = pickJob(item);
        const join = pickJoin(item);
        const employment = pickEmployment(item);
        const industry = pickIndustry(item);
        const href = pickHref(item);
        const currentYear = new Date().getFullYear();
        const IndustryHistory = currentYear - industry + 1;

        return `
      <a class="employee-card__img" href="${href}" style="background-image:url('${img}'); text-decoration: none;">
        <div class="env-card__body">
            <p class="env-card__desc">${escapeHtml(job)}</br>${escapeHtml(join)}年${escapeHtml(employment)}入社</br>業界歴${escapeHtml(IndustryHistory)}年目</p>
            <span class="env-card__arrow" aria-hidden="true">
                <img src="./images/icon/next.png" alt="">
            </span>
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
        if (container) container.innerHTML = "<p>ブログ一覧を読み込めませんでした。</br>時間をおいて再度お試しください。</p>";
    }
}

main();