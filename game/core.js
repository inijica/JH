/* 通用工具与提示（需最先加载） */
const $ = id => document.getElementById(id);

function fmtNum(n) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(1);
}

function fmtNeiLi(n) {
  if (n >= 1000) return Math.floor(n).toString();
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(3);
}

function fmtRate(n) {
  return (Math.round(n * 1000) / 1000).toString();
}

function fmtDecimal(n) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function fmtBondStat(v) {
  const n = Math.round((Number(v) || 0) * 100) / 100;
  return n.toString();
}

function levelToChinese(n) {
  const nums = ['零','一','二','三','四','五','六','七','八','九'];
  if (n < 10) return nums[n];
  if (n < 20) return '十' + (n > 10 ? nums[n - 10] : '');
  if (n < 100) {
    const t = Math.floor(n / 10), o = n % 10;
    return nums[t] + '十' + (o > 0 ? nums[o] : '');
  }
  if (n === 100) return '一百';
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = nums[h] + '百';
    if (r === 0) return res;
    if (r < 10) return res + '零' + nums[r];
    if (r < 20) return res + '一十' + (r > 10 ? nums[r - 10] : '');
    const t = Math.floor(r / 10), o = r % 10;
    return res + nums[t] + '十' + (o > 0 ? nums[o] : '');
  }
  return n.toString();
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatPercent(v) {
  return (v * 100).toFixed(1).replace(/\.0$/,'') + '%';
}

let _toastSuppressStack = 0;

function showToast(msg, duration = 2400) {
  if (_toastSuppressStack > 0) return;
  let t = document.getElementById('__game_toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '__game_toast';
    t.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);background:rgba(48,72,61,.92);color:#f8f5eb;padding:10px 20px;border-radius:3px;font-size:14px;letter-spacing:1px;z-index:999;pointer-events:none;opacity:0;transition:opacity .3s;max-width:80vw;text-align:center;line-height:1.6;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._tm);
  t._tm = setTimeout(() => { t.style.opacity = '0'; }, duration);
}

/* 依次弹出多条提示：上一条消失后再弹下一条 */
const _toastQueue = [];
let _toastQueueTimer = 0;

function showToastSequence(messages, duration = 2000) {
  const list = (messages || []).map(m => String(m).trim()).filter(Boolean);
  if (!list.length) return;
  _toastQueue.push(...list);
  if (!_toastQueueTimer) runToastQueue(duration);
}

function runToastQueue(duration) {
  if (!_toastQueue.length) { _toastQueueTimer = 0; return; }
  showToast(_toastQueue.shift(), duration);
  _toastQueueTimer = setTimeout(() => {
    _toastQueueTimer = 0;
    runToastQueue(duration);
  }, duration + 450);
}

/* 把剧情文本中的（）提示提取出来，正文不显示，待对话结束后逐条弹出 */
function splitDialogNotices(text) {
  const notices = [];
  const display = String(text == null ? '' : text).replace(/（([^）\n]*)）/g, (_, inner) => {
    const note = String(inner).trim();
    if (note) notices.push(note);
    return '';
  });
  return { display, notices };
}

const INTEL_RETAIN_MS = 60 * 60 * 1000;
let intelLogs = [];
/* 情报日志筛选：true 时只显示陪伴事件 */
let intelOnlyCompanion = false;

/* 丢弃超过一小时的情报，返回是否有条目被移除 */
function pruneIntelLogs(now = Date.now()) {
  const cutoff = now - INTEL_RETAIN_MS;
  const before = intelLogs.length;
  intelLogs = intelLogs.filter(l =>
    l && typeof l.text === 'string' && (!Number.isFinite(l.ts) || l.ts >= cutoff)
  );
  return intelLogs.length !== before;
}

function currentTimeText(at) {
  const d = at ? new Date(at) : new Date();
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function addIntel(text, cls = '', at, tag = '') {
  intelLogs.push({ time: currentTimeText(at), text: String(text), cls: cls || '', tag: tag || '', ts: Date.now() });
  renderIntel();
}

function toggleIntelCompanionFilter() {
  intelOnlyCompanion = !intelOnlyCompanion;
  renderIntel();
  return intelOnlyCompanion;
}

function renderIntel() {
  const el = $('intelList');
  if (!el) return;
  pruneIntelLogs();
  const filterBtn = $('intelCompanionFilter');
  if (filterBtn) filterBtn.classList.toggle('active', intelOnlyCompanion);
  const list = intelOnlyCompanion ? intelLogs.filter(l => l && l.tag === 'companion') : intelLogs;
  if (!list.length) {
    el.innerHTML = intelOnlyCompanion
      ? '<div class="intel-item" style="color:#a5a294;text-align:center;border:none">暂无陪伴事件</div>'
      : '<div class="intel-item" style="color:#a5a294;text-align:center;border:none">暂无情报</div>';
  } else {
    el.innerHTML = list.map(l =>
      `<div class="intel-item ${l.cls}"><span class="intel-time">${l.time}</span>${escapeHtml(l.text)}</div>`
    ).join('');
  }
  el.scrollTop = el.scrollHeight;
}

/* 空闲时每分钟清理一次过期情报，保证只保留最近一小时 */
setInterval(() => {
  if (pruneIntelLogs()) renderIntel();
}, 60 * 1000);
