/* ===== utils.js — 工具函数 ===== */

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* --- 日期相关 --- */

function formatDate(date) {
  // date: Date object → "YYYY-MM-DD"
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(str) {
  // "YYYY-MM-DD" → Date object
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(date) {
  // Date → "7月22日"
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatFullDisplayDate(date) {
  // Date → "7月22日 周二"
  return `${formatDisplayDate(date)} ${getWeekdayName(date)}`;
}

function getWeekdayName(date) {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return names[date.getDay()];
}

function getWeekdayShort(date) {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return names[date.getDay()];
}

// 中国习惯：周一=1, 周日=7
function getWeekdayCN(date) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMinutes(timeStr, minutes) {
  // "HH:mm" + minutes → "HH:mm"
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutes;
  const wrapped = ((totalMin % 1440) + 1440) % 1440;
  const newH = Math.floor(wrapped / 60);
  const newM = wrapped % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function isToday(date) {
  return isSameDay(date, new Date());
}

function getWeekStart(date) {
  // 返回本周一
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 周一开始
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekEnd(date) {
  // 返回本周日
  return addDays(getWeekStart(date), 6);
}

function getMonthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function timesOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1), e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2), e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

/* --- 格式化 --- */

function formatMoney(amount) {
  return '¥' + amount.toLocaleString('zh-CN');
}

function formatMoneyShort(amount) {
  if (amount >= 10000) {
    return '¥' + (amount / 10000).toFixed(1) + '万';
  }
  return '¥' + amount.toLocaleString('zh-CN');
}

/* --- 学生颜色 --- */

const STUDENT_COLORS = [
  '#4A90D9', '#2ECC71', '#F39C12', '#E74C3C',
  '#9B59B6', '#1ABC9C', '#E67E22', '#3498DB'
];

function getNextColor(existingStudents) {
  const used = new Set(existingStudents.map(s => s.color));
  for (const color of STUDENT_COLORS) {
    if (!used.has(color)) return color;
  }
  return STUDENT_COLORS[existingStudents.length % STUDENT_COLORS.length];
}
