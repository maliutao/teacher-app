/* ===== calendar.js — 课表页：日/周/月/学生 4 个子视图 ===== */

let calendarView = 'week'; // 默认周视图
let calendarDate = new Date();
let calendarMonth = new Date();
let calendarStudentId = ''; // '' = 全部

function renderCalendar() {
  const container = document.getElementById('page-calendar');

  let html = '';

  // 子视图切换 tabs
  html += `
    <div class="tabs">
      <button class="tab-btn${calendarView === 'day' ? ' active' : ''}" onclick="switchCalendarView('day')">日</button>
      <button class="tab-btn${calendarView === 'week' ? ' active' : ''}" onclick="switchCalendarView('week')">周</button>
      <button class="tab-btn${calendarView === 'month' ? ' active' : ''}" onclick="switchCalendarView('month')">月</button>
      <button class="tab-btn${calendarView === 'student' ? ' active' : ''}" onclick="switchCalendarView('student')">学生</button>
    </div>
  `;

  html += '<div id="calendar-view-content">';

  switch (calendarView) {
    case 'day': html += renderDayView(); break;
    case 'week': html += renderWeekView(); break;
    case 'month': html += renderMonthView(); break;
    case 'student': html += renderStudentView(); break;
  }

  html += '</div>';
  container.innerHTML = html;
}

function switchCalendarView(view) {
  calendarView = view;
  // 切到周视图时始终以今天为起点
  if (view === 'week') {
    calendarDate = new Date();
  }
  // 切到月视图时重置为当月
  if (view === 'month') {
    calendarMonth = new Date();
  }
  renderCalendar();
}

// ==================== 日视图 ====================

function renderDayView() {
  const data = getData();
  const dateStr = formatDate(calendarDate);
  const lessons = getLessonsByDate(dateStr);

  let html = '';

  // 日期导航
  html += `
    <div class="date-nav">
      <button onclick="shiftCalendarDate(-1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="date-text">${formatFullDisplayDate(calendarDate)}${isToday(calendarDate) ? ' · 今天' : ''}</span>
      <button onclick="shiftCalendarDate(1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  if (lessons.length === 0) {
    html += `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-text">这天没有课程</div>
      </div>
    `;
    return html;
  }

  // 时间轴 — 按每天最多 5 节课设计，每小时 52px 给色块文字留足空间
  const startHour = Math.max(7, Math.floor(timeToMinutes(lessons[0].startTime) / 60) - 1);
  const lastLesson = lessons[lessons.length - 1];
  const endHour = Math.min(22, Math.ceil(timeToMinutes(lastLesson.endTime) / 60));

  const totalHours = endHour - startHour;
  const hourHeight = 52; // 稍宽松，给色块内文字留足空间
  const axisHeight = Math.max(totalHours * hourHeight, 260);

  html += `<div class="time-axis" style="position:relative;height:${axisHeight}px;">`;

  // 时间刻度线
  for (let h = startHour; h <= endHour; h++) {
    const top = (h - startHour) * hourHeight;
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    html += `<div style="position:absolute;top:${top}px;left:0;right:0;height:1px;background:var(--border);"></div>`;
    html += `<span style="position:absolute;top:${top - 8}px;left:0;width:40px;text-align:right;padding-right:6px;font-family:'Space Mono';font-size:0.6rem;color:var(--text-tertiary);letter-spacing:-0.3px;">${timeStr}</span>`;
  }

  // 课程色块 — 优化排版：大名字 + 时间 + 地点
  lessons.forEach(lesson => {
    const student = data.students.find(s => s.id === lesson.studentId);
    if (!student) return;

    const startMin = timeToMinutes(lesson.startTime);
    const endMin = timeToMinutes(lesson.endTime);
    const top = ((startMin - startHour * 60) / 60) * hourHeight;
    const height = Math.max(((endMin - startMin) / 60) * hourHeight, 50);

    html += `
      <div style="position:absolute;top:${top + 1}px;left:46px;right:4px;height:${height - 2}px;
        background:${student.color};border-radius:10px;padding:6px 12px;overflow:hidden;
        display:flex;flex-direction:column;justify-content:center;gap:4px;
        box-shadow:0 2px 6px ${student.color}44;">
        <div style="display:flex;align-items:baseline;gap:6px;overflow:hidden;">
          <span style="font-family:'Archivo';font-weight:600;font-size:0.95rem;color:white;line-height:1.2;flex-shrink:0;letter-spacing:0.2px;">${escapeHtml(student.name)}</span>
          <span style="font-family:'Archivo';font-size:0.78rem;color:rgba(255,255,255,0.8);line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(student.location)}</span>
        </div>
        <div style="font-family:'Space Mono';font-size:0.72rem;color:rgba(255,255,255,0.88);font-weight:500;letter-spacing:0.3px;">${lesson.startTime} – ${lesson.endTime}</div>
      </div>
    `;
  });

  html += '</div>';

  return html;
}

function shiftCalendarDate(days) {
  calendarDate = addDays(calendarDate, days);
  renderCalendar();
}

// ==================== 周视图（4周，始终以今天为起点） ====================

function renderWeekView() {
  const data = getData();
  const weekStart = getWeekStart(calendarDate);

  let html = '';

  // 导航 — 可前后翻 4 周
  html += `
    <div class="date-nav">
      <button onclick="shiftCalendarDate(-7)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="date-text">未来 4 周</span>
      <button onclick="shiftCalendarDate(7)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  const dayHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  for (let w = 0; w < 4; w++) {
    const weekBegin = addDays(weekStart, w * 7);
    const weekEndDay = addDays(weekBegin, 6);

    html += `<div class="week-label">${formatDisplayDate(weekBegin)} — ${formatDisplayDate(weekEndDay)}</div>`;

    html += '<div class="week-grid">';

    dayHeaders.forEach(d => {
      html += `<div class="week-header-cell">${d}</div>`;
    });

    for (let d = 0; d < 7; d++) {
      const day = addDays(weekBegin, d);
      const dayStr = formatDate(day);
      const dayLessons = data.lessons.filter(l => l.date === dayStr);
      const todayClass = isToday(day) ? ' today' : '';

      html += `<div class="week-cell${todayClass}" onclick="goToDayView('${dayStr}')">`;
      html += `<span class="day-num">${day.getDate()}</span>`;

      if (dayLessons.length > 0) {
        html += '<div class="mini-dots">';
        const shown = Math.min(dayLessons.length, 4);
        for (let i = 0; i < shown; i++) {
          const student = data.students.find(s => s.id === dayLessons[i].studentId);
          const color = student ? student.color : '#999';
          html += `<span class="mini-dot" style="background:${color}"></span>`;
        }
        html += '</div>';
      }

      html += '</div>';
    }

    html += '</div>';
  }

  return html;
}

function goToDayView(dateStr) {
  calendarDate = parseDate(dateStr);
  calendarView = 'day';
  renderCalendar();
}

// ==================== 月视图 ====================

function renderMonthView() {
  const data = getData();
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startWeekday = firstDay.getDay();
  startWeekday = startWeekday === 0 ? 6 : startWeekday - 1;

  let html = '';

  html += `
    <div class="date-nav">
      <button onclick="shiftCalendarMonth(-1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="date-text">${year}年${month + 1}月</span>
      <button onclick="shiftCalendarMonth(1)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  `;

  html += '<div class="calendar-grid">';

  const headers = ['一', '二', '三', '四', '五', '六', '日'];
  headers.forEach(h => {
    html += `<div class="grid-header">${h}</div>`;
  });

  for (let i = 0; i < startWeekday; i++) {
    const prevDay = new Date(year, month, -(startWeekday - i - 1));
    html += `<div class="grid-cell other-month"><span>${prevDay.getDate()}</span></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    const dayStr = formatDate(day);
    const dayLessons = data.lessons.filter(l => l.date === dayStr);
    const todayClass = isToday(day) ? ' today' : '';
    const hasLessons = dayLessons.length > 0 ? ' has-lessons' : '';

    html += `<div class="grid-cell${todayClass}${hasLessons}" onclick="goToDayView('${dayStr}')">`;
    html += `<span>${d}</span>`;

    if (hasLessons) {
      // 最多显示 2 行圆点（每行 3 个）
      const maxDots = 6;
      const shown = Math.min(dayLessons.length, maxDots);
      const rows = Math.ceil(shown / 3);

      for (let row = 0; row < rows; row++) {
        html += '<div class="dot-row">';
        const rowStart = row * 3;
        const rowEnd = Math.min(rowStart + 3, shown);
        for (let i = rowStart; i < rowEnd; i++) {
          const student = data.students.find(s => s.id === dayLessons[i].studentId);
          const color = student ? student.color : '#999';
          html += `<span class="lesson-dot" style="background:${color}"></span>`;
        }
        html += '</div>';
      }
    }

    html += '</div>';
  }

  const totalCells = startWeekday + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="grid-cell other-month"><span>${i}</span></div>`;
  }

  html += '</div>';
  return html;
}

function shiftCalendarMonth(months) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + months, 1);
  renderCalendar();
}

// ==================== 学生视图（平铺选择 + 全部按钮） ====================

function renderStudentView() {
  const data = getData();
  const students = data.students;

  if (students.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-text">还没有学生</div>
      </div>
    `;
  }

  let html = '';

  // 平铺学生选择器（chip 行 + 全部按钮）
  html += '<div class="chip-row">';
  html += `<button class="chip${calendarStudentId === '' ? ' active' : ''}" onclick="onCalendarStudentChange('')">全部</button>`;
  students.forEach(s => {
    const isActive = calendarStudentId === s.id;
    html += `<button class="chip${isActive ? ' active' : ''}" onclick="onCalendarStudentChange('${s.id}')" style="${isActive ? `background:${s.color};border-color:${s.color};` : ''}">
      <span class="chip-dot" style="background:${isActive ? 'white' : s.color}"></span>
      ${escapeHtml(s.name)}
    </button>`;
  });
  html += '</div>';

  // 获取要显示的课程
  let lessons, displayStudent;
  if (calendarStudentId === '') {
    // 全部：显示所有学生的课程
    lessons = data.lessons.slice().sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  } else {
    displayStudent = data.students.find(s => s.id === calendarStudentId);
    if (!displayStudent) return html;
    lessons = getLessonsByStudent(calendarStudentId);
  }

  if (lessons.length === 0) {
    const name = calendarStudentId === '' ? '' : escapeHtml(displayStudent.name);
    html += `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <div class="empty-text">${name ? name + ' 还没有排课' : '还没有排课'}</div>
      </div>
    `;
    return html;
  }

  // 按月分组
  const groups = {};
  lessons.forEach(l => {
    const [y, m] = l.date.split('-');
    const key = `${y}年${parseInt(m)}月`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });

  let totalCount = 0;
  let totalPrice = 0;

  Object.keys(groups).sort().forEach(key => {
    html += `<div class="month-group">`;
    html += `<div class="month-group-header">${key}</div>`;

    groups[key].forEach(lesson => {
      totalCount++;
      const student = data.students.find(s => s.id === lesson.studentId);
      if (!student) return;
      totalPrice += student.price;

      const d = parseDate(lesson.date);
      const dayStr = `${d.getMonth() + 1}/${d.getDate()} ${getWeekdayShort(d)}`;

      html += `
        <div class="swipeable" data-lesson-id="${lesson.id}">
          <div class="swipe-content" ontouchstart="handleSwipeStart(event, '${lesson.id}')" ontouchmove="handleSwipeMove(event)" ontouchend="handleSwipeEnd(event, '${lesson.id}')" onmousedown="handleSwipeStart(event, '${lesson.id}')" onmousemove="handleSwipeMoveMouse(event)" onmouseup="handleSwipeEnd(event, '${lesson.id}')" onmouseleave="handleSwipeCancel()">
            <div class="mini-lesson">
              <span class="detail-dot" style="background:${student.color}"></span>
              <span class="ml-date">${dayStr}</span>
              <span style="flex:1;font-weight:500;font-size:0.85rem;">${escapeHtml(student.name)}</span>
              <span class="ml-time">${lesson.startTime}</span>
              <span class="ml-price">${formatMoney(student.price)}</span>
            </div>
          </div>
          <div class="swipe-actions" onclick="confirmDeleteLesson('${lesson.id}')">删除</div>
        </div>
      `;
    });

    html += '</div>';
  });

  // 汇总
  html += `
    <div class="stats-bar">
      <div class="stats-row">
        <span class="stats-number">共 ${totalCount} 节</span>
        <span class="stats-number">${formatMoney(totalPrice)}</span>
      </div>
    </div>
  `;

  return html;
}

function onCalendarStudentChange(studentId) {
  calendarStudentId = studentId;
  renderCalendar();
}
