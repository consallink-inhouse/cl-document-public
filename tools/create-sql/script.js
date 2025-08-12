/**
 * C#の「string/var 代入」または「.CommandText =」の右辺（;まで）を抽出する
 * @param {string} code - C# ソース全体
 * @returns {string[]} 抽出された右辺式（連結式を含む）配列
 */
function extractAllAssignments(code) {
    const assignRegex = /(?:(?:string|var)\s+\w+\s*=\s*|(?:\.\s*CommandText\s*=\s*))([\s\S]*?);/gs;
    const matches = [];
    let m;
    while ((m = assignRegex.exec(code)) !== null) {
        matches.push(m[1]);
    }
    return matches;
}

/**
 * C#の文字列リテラル（通常 "…", 逐語 @"…", 補間 $"…", $@"…"）を順に抽出する
 * @param {string} expr - 連結式などの文字列を含む式
 * @returns {{type:'v'|'n', text:string}[]} 逐語:'v' / 通常(＋補間):'n' とその内容
 */
function splitStringLiterals(expr) {
    const combined = /\$?@\"((?:\"\"|[^"])*)\"|\$?\"([^"\\]*(?:\\.[^"\\]*)*)\"/g;
    const parts = [];
    let m;
    while ((m = combined.exec(expr)) !== null) {
        if (m[1] !== undefined) parts.push({ type: 'v', text: m[1] });
        else parts.push({ type: 'n', text: m[2] });
    }
    return parts;
}

/**
 * C#文字列リテラルのエスケープを実文字に戻して結合する
 * @param {{type:'v'|'n', text:string}[]} parts - splitStringLiterals の結果
 * @returns {string} 復元された文字列
 */
function unescapeCSharp(parts) {
    return parts.map(p => {
        if (p.type === 'v') { return p.text.replace(/""/g, '"'); }
        return p.text
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\"/g, '"')
            .replace(/\\\\/g, '\\');
    }).join('');
}

/**
 * SQL文字列の行末空白を除去し、前後の空白をトリムする
 * @param {string} sql - SQL文字列
 * @returns {string} 整形後のSQL
 */
function tidy(sql) {
    return sql.split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').trim();
}

/**
 * 各行のブロック深さを算出する（{ と } のカウント）
 * @param {string[]} lines - 行配列
 * @returns {{before:number[], after:number[]}} 各行の処理前後の深さ
 */
function computeDepths(lines) {
    let depth = 0;
    const before = new Array(lines.length);
    const after = new Array(lines.length);
    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        before[i] = depth;
        const opens = (raw.match(/{/g) || []).length;
        const closes = (raw.match(/}/g) || []).length;
        depth += opens - closes;
        after[i] = depth;
    }
    return { before, after };
}

/**
 * start以降で最初に空行でない行のインデックスを返す
 * @param {string[]} lines - 行配列
 * @param {number} start - 開始インデックス
 * @returns {number} 見つかった行インデックス。無ければ -1
 */
function nextNonEmptyIndex(lines, start) {
    for (let i = start; i < lines.length; i++) {
        if (lines[i].trim() !== '') return i;
    }
    return -1;
}

/**
 * 行が if / else if / else のヘッダかどうかを判定する
 * @param {string} line - 対象行
 * @returns {boolean} ヘッダならtrue
 */
function isHeader(line) { return /^\s*(if|else\s+if|else)\b/.test(line); }

/**
 * if/elseヘッダ行に対応する本文の開始・終了行を求める
 * - ヘッダと同じ行 or 次行に { がある場合はブロック形式
 * - それ以外は単文とみなして次の非空行を本文とする
 * @param {string[]} lines - 行配列
 * @param {{before:number[], after:number[]}} depths - computeDepths の結果
 * @param {number} i - ヘッダ行インデックス
 * @param {number} chainDepth - チェーンの深さ
 * @returns {{bodyStart:number, bodyEnd:number}} 本文の範囲（両端インクルーシブ）
 */
function resolveBlockBody(lines, depths, i, chainDepth) {
    const headerHasBrace = lines[i].includes('{');
    let braceLine = -1;
    if (headerHasBrace) {
        braceLine = i;
    } else {
        const j = nextNonEmptyIndex(lines, i + 1);
        if (j !== -1 && lines[j].trim().startsWith('{')) braceLine = j;
    }
    if (braceLine !== -1) {
        const target = chainDepth + 1;
        const bodyStart = braceLine + 1;
        let bodyEnd = bodyStart - 1;
        for (let k = bodyStart; k < lines.length; k++) {
            if (depths.before[k] === chainDepth) {
                bodyEnd = k - 1;
                break;
            }
            bodyEnd = k;
        }
        return { bodyStart, bodyEnd };
    } else {
        const s = nextNonEmptyIndex(lines, i + 1);
        if (s === -1) return { bodyStart: i + 1, bodyEnd: i + 1 };
        return { bodyStart: s, bodyEnd: s };
    }
}

/**
 * 1行から StringBuilder.Append / AppendLine の呼び出しをすべて抽出する
 * @param {string} line - 対象行
 * @param {string} sbName - StringBuilder 変数名
 * @returns {string[]} 引数文字列を復元したテキスト配列（AppendLineは必要に応じて改行付与）
 */
function extractAppendsFromLine(line, sbName) {
    const out = [];
    const re = new RegExp(String.raw`\b` + sbName + String.raw`\.Append(Line)?\s*\(([\s\S]*?)\)\s*;`, 'g');
    let m;
    while ((m = re.exec(line)) !== null) {
        const isLine = !!m[1];
        const arg = m[2];
        const parts = splitStringLiterals(arg);
        if (parts.length === 0) continue;
        const text = unescapeCSharp(parts);
        out.push(text + (isLine && !text.endsWith('\n') ? '\n' : ''));
    }
    return out;
}

/**
 * 先頭から走査して「Appendが含まれる最初の if/else チェーン」を特定する
 * @param {string[]} lines - 行配列
 * @param {{before:number[], after:number[]}} depths - 深さ情報
 * @param {string} sbName - StringBuilder 変数名
 * @returns {{start:number,end:number,depth:number,blocks:{header:number,bodyStart:number,bodyEnd:number,depth:number}[]}|null}
 *   チェーンの開始ヘッダ行、最終本文行、深さ、各ブロックの本文範囲。見つからなければ null
 */
function findIfChainThatContainsAppend(lines, depths, sbName) {
    const appendLines = new Set();
    for (let i = 0; i < lines.length; i++) {
        if (extractAppendsFromLine(lines[i], sbName).length) appendLines.add(i);
    }
    if (appendLines.size === 0) return null;

    for (let i = 0; i < lines.length; i++) {
        if (!isHeader(lines[i])) continue;
        const chainDepth = depths.before[i];
        const blocks = [];
        let cursor = i;
        while (cursor < lines.length) {
            if (!(isHeader(lines[cursor]) && depths.before[cursor] === chainDepth)) break;
            const { bodyStart, bodyEnd } = resolveBlockBody(lines, depths, cursor, chainDepth);
            blocks.push({ header: cursor, bodyStart, bodyEnd, depth: chainDepth });
            cursor = bodyEnd + 1;
            if (!(cursor < lines.length && isHeader(lines[cursor]) && depths.before[cursor] === chainDepth)) break;
        }
        if (blocks.length === 0) continue;

        const chainStart = blocks[0].bodyStart;
        const chainEnd = blocks[blocks.length - 1].bodyEnd;
        let contains = false;
        for (const ln of appendLines) {
            if (ln >= chainStart && ln <= chainEnd) { contains = true; break; }
        }
        if (contains) {
            return { start: blocks[0].header, end: chainEnd, depth: chainDepth, blocks };
        }
    }
    return null;
}

/**
 * StringBuilder を解析し、「共通前半」＋「分岐本文」＋「共通後半」で結果を組み立てる
 * @param {string} code - C# ソース全体
 * @returns {string[]} 分岐ごとに生成されたSQL文字列配列（分岐が無い場合は1件）
 */
function extractFromStringBuilderPatterns(code) {
    const results = [];
    const declRegex = /\b(?:StringBuilder)\s+(\w+)\s*=\s*new\s+StringBuilder\s*\([^;]*\)\s*;|\bvar\s+(\w+)\s*=\s*new\s+StringBuilder\s*\([^;]*\)\s*;/gs;
    const builderNames = [];
    let dm;
    while ((dm = declRegex.exec(code)) !== null) {
        const name = dm[1] || dm[2];
        if (name) builderNames.push(name);
    }
    if (builderNames.length === 0) return results;

    const lines = code.split('\n');
    const depths = computeDepths(lines);

    for (const name of builderNames) {
        const events = [];
        for (let i = 0; i < lines.length; i++) {
            const items = extractAppendsFromLine(lines[i], name);
            for (const t of items) events.push({ line: i, text: t });
        }
        if (events.length === 0) continue;

        const chain = findIfChainThatContainsAppend(lines, depths, name);
        if (!chain) {
            const sql = tidy(events.map(e => e.text).join(''));
            if (sql) results.push(sql);
            continue;
        }

        const headSql = events.filter(e => e.line < chain.start).map(e => e.text).join('');
        const tailSql = events.filter(e => e.line > chain.end).map(e => e.text).join('');

        for (const b of chain.blocks) {
            const body = events
                .filter(e => e.line >= b.bodyStart && e.line <= b.bodyEnd)
                .map(e => e.text)
                .join('');
            const sql = tidy(headSql + body + tailSql);
            if (sql) results.push(sql);
        }
    }
    return results;
}

/**
 * 連結代入式と StringBuilder の両パターンから SQL を抽出し、重複を除いて返す
 * @param {string} code - C# ソース全体
 * @returns {string[]} SQL文字列の配列
 */
function extractSQLFromCode(code) {
    const results = [];

    const clean = stripCSharpComments(code);

    const exprs = extractAllAssignments(clean);
    for (const expr of exprs) {
        const parts = splitStringLiterals(expr);
        if (parts.length === 0) continue;
        const joined = unescapeCSharp(parts);
        if (joined.trim()) results.push(tidy(joined));
    }

    const sbPatterns = extractFromStringBuilderPatterns(clean);
    results.push(...sbPatterns);

    const uniq = [];
    const set = new Set();
    for (const s of results) {
        if (!set.has(s)) {
            set.add(s);
            uniq.push(s);
        }
    }
    return uniq;
}

// ========= UI =========
const $src = document.getElementById('src');
const $multi = document.getElementById('multi');
const $run = document.getElementById('run');
const $clear = document.getElementById('clear');
const $toast = document.getElementById('toast');

$run.addEventListener('click', () => {
    const code = $src.value || '';
    const results = extractSQLFromCode(code);

    $multi.classList.toggle('single', results.length === 1);
    $multi.innerHTML = '';

    if (results.length === 0) {
        $multi.innerHTML = '<div class="hint">SQL 文字列の代入や StringBuilder.Append(Line) が見つかりませんでした。</div>';
        return;
    }

    results.forEach((sql, i) => {
        const box = document.createElement('div');
        box.className = 'sql-item';
        const title = (results.length === 1) ? '結果' : `結果${toJPNum(i + 1)}`;
        box.innerHTML = `
      <div class="sql-head">
        <div class="sql-title">${title}</div>
        <button class="copy-mini" data-idx="${i}">コピー</button>
      </div>
      <pre>${escapeHtml(sql)}</pre>
    `;
        $multi.appendChild(box);
    });

    // 個別コピー
    $multi.querySelectorAll('.copy-mini').forEach(btn => {
        btn.addEventListener('click', e => {
            const idx = Number(e.currentTarget.getAttribute('data-idx'));
            const text = results[idx];
            if (!text) return;
            showToast('コピーしました');
            navigator.clipboard.writeText(text);
        });
    });
});

// クリア：入力と結果を空に
$clear.addEventListener('click', () => {
    $src.value = '';
    $multi.innerHTML = '';
    $multi.classList.remove('single');
    showToast('クリアしました');
});

function showToast(msg) {
    if ($toast) { $toast.textContent = msg || '完了しました'; }
    $toast.classList.add('show');
    setTimeout(() => $toast.classList.remove('show'), 1400);
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
    ));
}
function toJPNum(n) { return ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'][n - 1] || String(n); }

/**
 * コメント行を除去
 * @param {string} code - C# ソース全体
 * @returns {string[]} SQL文字列の配列
 */
function stripCSharpComments(src) {
    let out = '';
    let i = 0, n = src.length;
    let state = 'normal';

    while (i < n) {
        const ch = src[i];
        const next = (i + 1 < n) ? src[i + 1] : '';

        if (state === 'normal') {
            if (ch === '/' && next === '/') {
                i += 2;
                while (i < n && src[i] !== '\n' && src[i] !== '\r') i++;
                if (i < n && src[i] === '\r') { out += '\r'; i++; if (i < n && src[i] === '\n') { out += '\n'; i++; } }
                else if (i < n && src[i] === '\n') { out += '\n'; i++; }
                continue;
            }
            if (ch === '/' && next === '*') {
                i += 2;
                while (i < n && !(src[i] === '*' && i + 1 < n && src[i + 1] === '/')) {
                    const c = src[i];
                    if (c === '\r' || c === '\n') {
                        out += c;
                        if (c === '\r' && i + 1 < n && src[i + 1] === '\n') { out += '\n'; i++; }
                    }
                    i++;
                }
                if (i < n) i += 2;
                continue;
            }
            if (ch === '"') {
                const prev1 = i > 0 ? src[i - 1] : '';
                const prev2 = i > 1 ? src[i - 2] : '';
                const isVerbatim = (prev1 === '@') || (prev2 === '$' && prev1 === '@') || (prev2 === '@' && prev1 === '$');
                out += ch; i++;
                state = isVerbatim ? 'verbatim' : 'string';
                continue;
            }
            if (ch === "'") {
                out += ch; i++; state = 'char'; continue;
            }
            out += ch; i++; continue;
        }

        if (state === 'string') {
            out += ch; i++;
            if (ch === '\\' && i < n) { out += src[i]; i++; continue; }
            if (ch === '"') { state = 'normal'; }
            continue;
        }

        if (state === 'verbatim') {
            out += ch; i++;
            if (ch === '"') {
                if (i < n && src[i] === '"') { out += '"'; i++; }
                else { state = 'normal'; }
            }
            continue;
        }

        if (state === 'char') {
            out += ch; i++;
            if (ch === '\\' && i < n) { out += src[i]; i++; continue; }
            if (ch === "'") { state = 'normal'; }
            continue;
        }
    }
    return out;
}
