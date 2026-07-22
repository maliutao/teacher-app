/* ===== schedule.js — 排课面板：批量重复排课 + 单次排课 + 冲突检测 ===== */

let scheduleMode = 'repeat'; // 'repeat' | 'single'
let selectedWeekdays = [];   // [1,3,5] = 周一、周三、周五 (1-7, 周一=1)
let scheduleStudentId = '';

function renderSchedulePanel() {
  selectedWeekdays = []; // 每次打开面板重置
  const panel = document.getElementById('schedule-panel');
  const data = getData();
  const students = data.students;

  if (students.length === 0) {
    panel.innerHTML = `
      <div class="sheet-header">
        <h2>排课</h2>
        <button class="sheet-close" onclick="closeSchedulePanel()">✕</button>
      </div>
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-text">请先添加学生，再排课</div>
        <button class="btn btn-primary" onclick="closeSchedulePanel();openStudentForm()">✚ 添加学生</button>
      </div>
    `;
    return;
  }

  // 学生平铺选择器（chip 行）
  let studentChips = '';
  students.forEach(s => {
    const isActive = scheduleStudentId === s.id;
    studentChips += `<button class="chip${isActive ? ' active' : ''}" onclick="selectScheduleStudent('${s.id}')" style="${isActive ? `background:${s.color};border-color:${s.color};` : ''}">
      <span class="chip-dot" style="background:${isActive ? 'white' : s.color}"></span>
      ${escapeHtml(s.name)}
    </button>`;
  });

  // 星期按钮
  const dayNames = ['一', '二', '三', '四', '五', '六', '日'];
  let weekdayBtns = '';
  dayNames.forEach((name, i) => {
    const dayNum = i + 1;
    const isActive = selectedWeekdays.includes(dayNum);
    weekdayBtns += `<button class="weekday-btn${isActive ? ' active' : ''}" data-day="${dayNum}" onclick="toggleWeekday(${dayNum}, this)">${name}</button>`;
  });

  // 默认值 — 默认 2 小时
  const today = new Date();
  const todayStr = formatDate(today);
  const endDate = formatDate(addDays(today, 28)); // 默认 4 周

  const defaultStart = '10:00';
  const defaultEnd = addMinutes(defaultStart, 120); // 默认 2 小时

  panel.innerHTML = `
    <div class="sheet-header">
      <h2>排课</h2>
      <button class="sheet-close" onclick="closeSchedulePanel()">✕</button>
    </div>

    <div class="form-group">
      <label class="form-label">选择学生</label>
      <div class="chip-row" id="sched-student-chips">${studentChips}</div>
    </div>

    <div class="tabs" style="margin-top:4px">
      <button class="tab-btn${scheduleMode === 'repeat' ? ' active' : ''}" onclick="switchScheduleMode('repeat')">重复排课</button>
      <button class="tab-btn${scheduleMode === 'single' ? ' active' : ''}" onclick="switchScheduleMode('single')">单次排课</button>
    </div>

    <div id="schedule-repeat" style="display:${scheduleMode === 'repeat' ? 'block' : 'none'}">
      <div class="form-group">
        <label class="form-label">选择星期（可多选）</label>
        <div class="weekday-selector" id="weekday-selector">${weekdayBtns}</div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始时间</label>
          <input class="form-input" id="sched-start" type="time" value="${defaultStart}" step="900" onchange="onScheduleStartTimeChange('sched-start','sched-end')">
        </div>
        <div class="form-group">
          <label class="form-label">结束时间</label>
          <input class="form-input" id="sched-end" type="time" value="${defaultEnd}" step="900" onchange="updateSchedulePreview()">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始日期</label>
          <input class="form-input" id="sched-range-start" type="date" value="${todayStr}" onchange="updateSchedulePreview()">
        </div>
        <div class="form-group">
          <label class="form-label">结束日期</label>
          <input class="form-input" id="sched-range-end" type="date" value="${endDate}" onchange="updateSchedulePreview()">
        </div>
      </div>

      <div id="schedule-preview" class="preview-box" style="display:none"></div>

      <button class="btn btn-primary btn-full" onclick="submitRepeatSchedule()">
        ✚ 确认排课
      </button>
    </div>

    <div id="schedule-single" style="display:${scheduleMode === 'single' ? 'block' : 'none'}">
      <div class="form-group">
        <label class="form-label">选择日期</label>
        <input class="form-input" id="sched-single-date" type="date" value="${todayStr}">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">开始时间</label>
          <input class="form-input" id="sched-single-start" type="time" value="${defaultStart}" step="900" onchange="onScheduleStartTimeChange('sched-single-start','sched-single-end')">
        </div>
        <div class="form-group">
          <label class="form-label">结束时间</label>
          <input class="form-input" id="sched-single-end" type="time" value="${defaultEnd}" step="900" onchange="updateSchedulePreview()">
        </div>
      </div>

      <div id="schedule-single-preview" class="preview-box" style="display:none"></div>

      <button class="btn btn-primary btn-full" onclick="submitSingleSchedule()">
        ✚ 添加课程
      </button>
    </div>
  `;

  updateSchedulePreview();
}

function switchScheduleMode(mode) {
  scheduleMode = mode;
  document.querySelectorAll('#schedule-panel .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.includes(mode === 'repeat' ? '重复' : '单次'));
  });
  document.getElementById('schedule-repeat').style.display = mode === 'repeat' ? 'block' : 'none';
  document.getElementById('schedule-single').style.display = mode === 'single' ? 'block' : 'none';
}

function toggleWeekday(day, btn) {
  const idx = selectedWeekdays.indexOf(day);
  if (idx === -1) {
    selectedWeekdays.push(day);
    btn.classList.add('active');
  } else {
    selectedWeekdays.splice(idx, 1);
    btn.classList.remove('active');
  }
  updateSchedulePreview();
}

// 平铺选择学生
function selectScheduleStudent(studentId) {
  scheduleStudentId = (scheduleStudentId === studentId) ? '' : studentId;
  renderSchedulePanel(); // 重新渲染以更新 chip 高亮
}

// 开始时间变化时，自动设置结束时间 = 开始 + 2 小时
function onScheduleStartTimeChange(startId, endId) {
  const startInput = document.getElementById(startId);
  const endInput = document.getElementById(endId);
  if (startInput && endInput && startInput.value) {
    endInput.value = addMinutes(startInput.value, 120);
  }
  updateSchedulePreview();
}
function updateSchedulePreview() {
  if (scheduleMode !== 'repeat') return;

  const previewEl = document.getElementById('schedule-preview');
  if (!previewEl) return;

  const studentId = scheduleStudentId;
  if (!studentId || selectedWeekdays.length === 0) {
    previewEl.style.display = 'none';
    return;
  }

  const rangeStart = document.getElementById('sched-range-start')?.value;
  const rangeEnd = document.getElementById('sched-range-end')?.value;
  const startTime = document.getElementById('sched-start')?.value;
  const endTime = document.getElementById('sched-end')?.value;

  if (!rangeStart || !rangeEnd || !startTime || !endTime) {
    previewEl.style.display = 'none';
    return;
  }

  // 计算将生成的课程
  const lessons = generateRepeatLessons(studentId, selectedWeekdays, startTime, endTime, rangeStart, rangeEnd);

  if (lessons.length === 0) {
    previewEl.style.display = 'block';
    previewEl.innerHTML = '指定日期范围内没有匹配的课程';
    return;
  }

  // 检测冲突
  const data = getData();
  const conflicts = detectConflicts(lessons, data.lessons);

  let html = `将生成 <strong>${lessons.length}</strong> 节课程`;
  if (conflicts.length > 0) {
    html += `<div class="conflict">⚠ ${conflicts.length} 个时段与已有课程冲突</div>`;
  }

  previewEl.style.display = 'block';
  previewEl.innerHTML = html;
}

function generateRepeatLessons(studentId, weekdays, startTime, endTime, startDate, endDate) {
  const lessons = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const current = new Date(start);

  while (current <= end) {
    const cnDay = getWeekdayCN(current);
    if (weekdays.includes(cnDay)) {
      lessons.push({
        studentId,
        date: formatDate(current),
        startTime,
        endTime,
        note: ''
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return lessons;
}

function detectConflicts(newLessons, existingLessons) {
  const conflicts = [];
  for (const nl of newLessons) {
    for (const el of existingLessons) {
      if (nl.date === el.date && timesOverlap(nl.startTime, nl.endTime, el.startTime, el.endTime)) {
        conflicts.push({ newLesson: nl, existingLesson: el });
      }
    }
  }
  return conflicts;
}

function submitRepeatSchedule() {
  const studentId = scheduleStudentId;
  const startTime = document.getElementById('sched-start').value;
  const endTime = document.getElementById('sched-end').value;
  const rangeStart = document.getElementById('sched-range-start').value;
  const rangeEnd = document.getElementById('sched-range-end').value;

  // 验证
  if (!studentId) {
    showToast('请选择学生', 'error');
    return;
  }
  if (selectedWeekdays.length === 0) {
    showToast('请至少选择一个星期', 'error');
    return;
  }
  if (!startTime || !endTime) {
    showToast('请设置上课时间', 'error');
    return;
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    showToast('结束时间必须晚于开始时间', 'error');
    return;
  }
  if (!rangeStart || !rangeEnd) {
    showToast('请设置日期范围', 'error');
    return;
  }
  if (rangeStart > rangeEnd) {
    showToast('结束日期不能早于开始日期', 'error');
    return;
  }

  const lessons = generateRepeatLessons(studentId, selectedWeekdays, startTime, endTime, rangeStart, rangeEnd);

  if (lessons.length === 0) {
    showToast('指定范围内没有匹配的课程', 'error');
    return;
  }

  // 冲突检测
  const data = getData();
  const conflicts = detectConflicts(lessons, data.lessons);

  function doAdd() {
    addLessons(lessons);
    closeSchedulePanel();
    selectedWeekdays = [];
    showToast(`成功添加 ${lessons.length} 节课`, 'success');
    renderCurrentPage();
  }

  if (conflicts.length > 0) {
    closeSchedulePanel();
    showConfirm(`有 ${conflicts.length} 个时段与已有课程冲突，是否仍然继续？`, doAdd);
  } else {
    doAdd();
  }
}

function submitSingleSchedule() {
  const studentId = scheduleStudentId;
  const date = document.getElementById('sched-single-date').value;
  const startTime = document.getElementById('sched-single-start').value;
  const endTime = document.getElementById('sched-single-end').value;

  if (!studentId) {
    showToast('请选择学生', 'error');
    return;
  }
  if (!date) {
    showToast('请选择日期', 'error');
    return;
  }
  if (!startTime || !endTime) {
    showToast('请设置上课时间', 'error');
    return;
  }
  if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
    showToast('结束时间必须晚于开始时间', 'error');
    return;
  }

  const lesson = { studentId, date, startTime, endTime, note: '' };

  // 冲突检测
  const data = getData();
  const conflicts = detectConflicts([lesson], data.lessons);

  function doAdd() {
    addLesson(lesson);
    closeSchedulePanel();
    showToast('课程已添加', 'success');
    renderCurrentPage();
  }

  if (conflicts.length > 0) {
    closeSchedulePanel();
    showConfirm('该时段与已有课程冲突，是否仍然添加？', doAdd);
  } else {
    doAdd();
  }
}
