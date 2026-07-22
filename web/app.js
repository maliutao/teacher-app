/* ===== app.js — 核心逻辑：路由、数据管理、今日页、Toast、确认框 ===== */

// ==================== 数据层 ====================

const STORAGE_KEY = 'teacher_app_data';

function getDefaultData() {
  return { students: [], lessons: [] };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return {
        students: data.students || [],
        lessons: data.lessons || []
      };
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return getDefaultData();
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data:', e);
    showToast('保存失败，存储空间可能已满', 'error');
  }
}

function getData() {
  return loadData();
}

// 学生 CRUD
function addStudent(student) {
  const data = getData();
  student.id = generateId();
  student.createdAt = formatDate(new Date());
  data.students.push(student);
  saveData(data);
  return student;
}

function updateStudent(id, updates) {
  const data = getData();
  const idx = data.students.findIndex(s => s.id === id);
  if (idx !== -1) {
    data.students[idx] = { ...data.students[idx], ...updates };
    saveData(data);
  }
}

function deleteStudent(id) {
  const data = getData();
  data.students = data.students.filter(s => s.id !== id);
  data.lessons = data.lessons.filter(l => l.studentId !== id);
  saveData(data);
}

function findStudent(id) {
  return getData().students.find(s => s.id === id);
}

// 课程 CRUD
function addLesson(lesson) {
  const data = getData();
  lesson.id = generateId();
  data.lessons.push(lesson);
  saveData(data);
  return lesson;
}

function addLessons(lessons) {
  const data = getData();
  lessons.forEach(l => {
    l.id = generateId();
    data.lessons.push(l);
  });
  saveData(data);
}

function deleteLesson(id) {
  const data = getData();
  data.lessons = data.lessons.filter(l => l.id !== id);
  saveData(data);
}

function getLessonsByDate(dateStr) {
  return getData().lessons
    .filter(l => l.date === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

function getLessonsByStudent(studentId) {
  return getData().lessons
    .filter(l => l.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

function getLessonsInRange(startDate, endDate) {
  const start = typeof startDate === 'string' ? startDate : formatDate(startDate);
  const end = typeof endDate === 'string' ? endDate : formatDate(endDate);
  return getData().lessons
    .filter(l => l.date >= start && l.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}

// ==================== 路由 ====================

let currentTab = 'today';
let currentPageDate = new Date(); // 今日页面当前查看日期

const TAB_TITLES = {
  today: '今日',
  calendar: '课表',
  students: '学生',
  income: '收入'
};

function navigateTo(tab) {
  if (!TAB_TITLES[tab]) tab = 'today';
  currentTab = tab;
  window.location.hash = tab;

  // 切到今日 tab 时重置为实际今天
  if (tab === 'today') {
    currentPageDate = new Date();
  }

  // 更新页面显示
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + tab);
  if (page) page.classList.add('active');

  // 更新导航高亮
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.tab === tab);
  });

  // 更新 header
  document.getElementById('header-title').textContent = TAB_TITLES[tab];
  updateHeaderActions(tab);

  // 渲染对应页面
  renderCurrentPage();
}

function updateHeaderActions(tab) {
  const left = document.getElementById('header-left');
  const right = document.getElementById('header-right');
  left.innerHTML = '';
  right.innerHTML = '';

  if (tab === 'students') {
    right.innerHTML = '<button class="header-add-btn" onclick="openStudentForm()">✚ 添加</button>';
  }
}

function renderCurrentPage() {
  switch (currentTab) {
    case 'today': renderToday(); break;
    case 'calendar': renderCalendar(); break;
    case 'students': renderStudents(); break;
    case 'income': renderIncome(); break;
  }
}

// ==================== 今日页面 ====================

function renderToday() {
  const container = document.getElementById('page-today');
  const data = getData();
  const dateStr = formatDate(currentPageDate);
  const todayLessons = getLessonsByDate(dateStr);
  const todayDate = new Date(currentPageDate);

  // 本周数据
  const weekStart = getWeekStart(todayDate);
  const weekEnd = getWeekEnd(todayDate);
  const weekLessons = getLessonsInRange(weekStart, weekEnd);
  let weekTotal = 0;
  let weekPassed = 0;
  let weekPassedTotal = 0;
  const now = new Date();

  weekLessons.forEach(l => {
    const s = data.students.find(st => st.id === l.studentId);
    if (s) {
      weekTotal += s.price;
      // 判断是否已过：课程日期+结束时间 < 当前时间
      const lessonEnd = new Date(l.date + 'T' + l.endTime + ':00');
      if (lessonEnd < now) {
        weekPassed++;
        weekPassedTotal += s.price;
      }
    }
  });

  // 本月数据
  const monthStart = getMonthStart(todayDate);
  const monthEnd = getMonthEnd(todayDate);
  const monthLessons = getLessonsInRange(monthStart, monthEnd);
  let monthTotal = 0;
  let monthPassed = 0;
  let monthPassedTotal = 0;

  monthLessons.forEach(l => {
    const s = data.students.find(st => st.id === l.studentId);
    if (s) {
      monthTotal += s.price;
      const lessonEnd = new Date(l.date + 'T' + l.endTime + ':00');
      if (lessonEnd < now) {
        monthPassed++;
        monthPassedTotal += s.price;
      }
    }
  });

  // 进度条
  const weekProgress = weekLessons.length > 0 ? Math.min(weekPassed / weekLessons.length * 100, 100) : 0;
  const monthProgress = monthLessons.length > 0 ? Math.min(monthPassed / monthLessons.length * 100, 100) : 0;

  let html = '';

  // 日期导航
  html += `
    <div class="date-nav">
      <button onclick="shiftTodayDate(-1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="date-text">${formatFullDisplayDate(todayDate)}${isToday(todayDate) ? ' · 今天' : ''}</span>
      <button onclick="shiftTodayDate(1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  // 今日课程
  if (todayLessons.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-text">${isToday(todayDate) ? '今天没有课程安排' : '这天没有课程安排'}<br>点击右下角 ✚ 开始排课</div>
      </div>
    `;
  } else {
    html += `<div class="section-label">今日课程 · ${todayLessons.length} 节</div>`;
    todayLessons.forEach(lesson => {
      const student = data.students.find(s => s.id === lesson.studentId);
      if (!student) return;
      html += `
        <div class="swipeable" data-lesson-id="${lesson.id}">
          <div class="swipe-content" ontouchstart="handleSwipeStart(event, '${lesson.id}')" ontouchmove="handleSwipeMove(event)" ontouchend="handleSwipeEnd(event, '${lesson.id}')" onmousedown="handleSwipeStart(event, '${lesson.id}')" onmousemove="handleSwipeMoveMouse(event)" onmouseup="handleSwipeEnd(event, '${lesson.id}')" onmouseleave="handleSwipeCancel()">
            <div class="lesson-card">
              <div class="color-bar" style="background:${student.color}"></div>
              <div class="card-body">
                <div class="card-left">
                  <span class="card-time">${lesson.startTime} - ${lesson.endTime}</span>
                  <span class="card-student">${escapeHtml(student.name)}</span>
                </div>
                <div class="card-right">
                  <span class="card-location">${escapeHtml(student.location)}</span>
                  <span class="card-price">${formatMoney(student.price)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="swipe-actions" onclick="confirmDeleteLesson('${lesson.id}')">删除</div>
        </div>
      `;
    });
  }

  // 本周概览
  html += `
    <div class="stats-bar">
      <div class="stats-title">本周概览</div>
      <div class="stats-row">
        <span class="stats-number">${weekPassed} / ${weekLessons.length} 节</span>
        <span class="stats-number">${formatMoney(weekPassedTotal)} / ${formatMoney(weekTotal)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${weekProgress}%"></div>
      </div>
    </div>
  `;

  // 本月概览
  html += `
    <div class="stats-bar">
      <div class="stats-title">本月概览</div>
      <div class="stats-row">
        <span class="stats-number">${monthPassed} / ${monthLessons.length} 节</span>
        <span class="stats-number">${formatMoney(monthPassedTotal)} / ${formatMoney(monthTotal)}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${monthProgress}%"></div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function shiftTodayDate(days) {
  currentPageDate = addDays(currentPageDate, days);
  renderToday();
}

// ==================== 滑动删除 ====================

let swipeStartX = 0;
let swipeElement = null;
let swipeMouseActive = false;

function handleSwipeStart(e, lessonId) {
  swipeStartX = e.touches ? e.touches[0].clientX : e.clientX;
  swipeElement = e.currentTarget;
  if (!e.touches) swipeMouseActive = true;
}

function handleSwipeMove(e) {
  if (!swipeElement) return;
  const diff = swipeStartX - e.touches[0].clientX;
  if (diff > 30) {
    swipeElement.classList.add('swiped');
  } else if (diff < -30) {
    swipeElement.classList.remove('swiped');
  }
}

function handleSwipeMoveMouse(e) {
  if (!swipeElement || !swipeMouseActive) return;
  const diff = swipeStartX - e.clientX;
  if (diff > 30) {
    swipeElement.classList.add('swiped');
  } else if (diff < -30) {
    swipeElement.classList.remove('swiped');
  }
}

function handleSwipeEnd(e, lessonId) {
  swipeElement = null;
  swipeMouseActive = false;
}

function handleSwipeCancel() {
  if (swipeElement) {
    swipeElement.classList.remove('swiped');
  }
  swipeElement = null;
  swipeMouseActive = false;
}

function confirmDeleteLesson(lessonId) {
  showConfirm('确定删除这节课吗？', () => {
    deleteLesson(lessonId);
    renderCurrentPage();
    showToast('课程已删除', 'success');
  });
}

// ==================== Toast ====================

let toastTimer = null;

function showToast(message, type) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (type ? ' ' + type : '');

  // 强制重绘
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// ==================== 确认框 ====================

let confirmCallback = null;

function showConfirm(message, onConfirm) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').classList.add('active');
  confirmCallback = onConfirm;
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('active');
  confirmCallback = null;
}

// ==================== FAB ====================

function openSchedulePanel() {
  renderSchedulePanel();
  document.getElementById('schedule-overlay').classList.add('active');
}

function closeSchedulePanel() {
  document.getElementById('schedule-overlay').classList.remove('active');
}

// ==================== 初始化 ====================

function init() {
  // 导航事件
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.tab);
    });
  });

  // FAB 事件
  document.getElementById('fab').addEventListener('click', openSchedulePanel);

  // 关闭排课面板
  document.getElementById('schedule-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'schedule-overlay') closeSchedulePanel();
  });

  // 关闭学生表单
  document.getElementById('student-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'student-overlay') closeStudentForm();
  });

  // 确认框事件
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });
  document.getElementById('confirm-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'confirm-overlay') closeConfirm();
  });

  // Hash 路由
  const hash = window.location.hash.slice(1);
  if (hash && TAB_TITLES[hash]) {
    navigateTo(hash);
  } else {
    navigateTo('today');
  }

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.slice(1);
    if (h && TAB_TITLES[h] && h !== currentTab) {
      navigateTo(h);
    }
  });
}

// DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
