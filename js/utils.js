// js/utils.js
export const DEBUG = false;
export const debugLog = (...args) => { if (DEBUG) console.log("[PG]", ...args); };
export const debugWarn = (...args) => { if (DEBUG) console.warn("[PG]", ...args); };
export const debugErr = (...args) => { if (DEBUG) console.error("[PG]", ...args); };

export function formatDisplayName(name) {
  const match = name.match(/(.+?)（(.+)）/);
  if (match) return { main: match[1], form: `（${match[2]}）` };
  return { main: name, form: "" };
}

export function normalizePokemonName(input) {
  if (!input) return "";
  let s = input.normalize("NFC");
  s = s.replace(/[！-～]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xfee0));
  s = s.replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60));
  s = s.replace(/[・\s\u3000\-‐‑‒–—―]/g, "");
  return s;
}

/**
 * debut表示用: 第X世代（TITLE）
 * @param {number|null|undefined} gen
 * @param {string|null|undefined} title
 * @returns {string}
 */
export function formatDebut(gen, title) {
  if (!gen && !title) return "—";
  const g = gen ? `第${gen}世代` : "";
  const t = title ? `（${title}）` : "";
  return `${g}${t}` || "—";
}

/**
 * 性別比を表示用テキストに整形
 * データ仕様: genderRate ∈ {-1,0,1,...,8}
 *   -1: 性別不明
 *    0: ♂100%（♂のみ）
 *    8: ♀100%（♀のみ）
 *    他: 12.5%刻み（例: 1 => ♂87.5% / ♀12.5%）
 */
export function formatGenderRate(rate) {
  if (rate === -1) return "性別不明";
  if (rate === 0) return "♂のみ";
  if (rate === 8) return "♀のみ";
  if (typeof rate !== "number" || rate < 0 || rate > 8) return "—";
  const female = rate * 12.5;
  const male = 100 - female;
  // 小数点は .5 以外出ない前提だが、一応 toFixed(1) で丸め
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `♂:${fmt(male)}% / ♀:${fmt(female)}%`;
}
