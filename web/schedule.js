/* ===== schedule.js — 排课面板：批量重复排课 + 单次排课 + 冲突检测 ===== */

let scheduleMode = 'repeat'; // 'repeat' | 'single'
let selectedWeekdays = [];   // [1,3,5] = 周一、周三、周五 (1-7, 周一=1)
let scheduleStudentId = '';

// 自定义时间选择器 — 按钮网格（小时 07-21 + 分钟 00/15/30/45）
function renderTimePicker(id, value, autoEndId) {
  const [h, m] = value.split(':').map(Number);

  // 小时 chip（07-21，每行 5 个）
  let hourChips = '';
  for (let i = 7; i <= 21; i++) {
    const active = i === h ? ' active' : '';
    hourChips += `<button type="button" class="tp-chip${active}" data-val="${i}" onclick="selectTimeChip(this)">${String(i).padStart(2, '0')}</button>`;
  }

  // 分钟 chip（00/15/30/45）
  const mins = [0, 15, 30, 45];
  let minChips = '';
  mins.forEach(mi => {
    const active = mi === m ? ' active' : '';
    minChips += `<button type="button" class="tp-chip${active}" data-val="${mi}" onclick="selectTimeChip(this)">${String(mi).padStart(2, '0')}</button>`;
  });

  const autoAttr = autoEndId ? ` data-auto-end="${autoEndId}"` : '';

  return `<div class="time-picker" id="${id}" data-hour="${h}" data-minute="${m}"${autoAttr}>
    <div class="tp-section">
      <div class="tp-label">时</div>
      <div class="tp-grid">${hourChips}</div>
    </div>
    <div class="tp-section">
      <div class="tp-label">分</div>
      <div class="tp-grid tp-grid-min">${minChips}</div>
    </div>
  </div>`;
}

function selectTimeChip(btn) {
  const picker = btn.closest('.time-picker');
  if (!picker) return;

  // 更新同组 chip 状态
  btn.parentElement.querySelectorAll('.tp-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');

  // 更新 data 属性
  const val = parseInt(btn.dataset.val);
  const isHour = btn.closest('.tp-section') === picker.querySelector('.tp-section');
  if (isHour) {
    picker.dataset.hour = val;
  } else {
    picker.dataset.minute = val;
  }

  // 如果是开始时间选择器，自动更新结束时间
  if (picker.dataset.autoEnd && isHour) {
    const startVal = getTimePickerValue(picker.id);
    setTimePickerValue(picker.dataset.autoEnd, addMinutes(startVal, 120));
  }

  // 更新预览
  updateSchedulePreview();
}

function getTimePickerValue(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  const h = parseInt(el.dataset.hour || 0);
  const m = parseInt(el.dataset.minute || 0);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function setTimePickerValue(id, timeStr) {
  const el = document.getElementById(id);
  if (!el) return;
  const [h, m] = timeStr.split(':').map(Number);
  el.dataset.hour = h;
  el.dataset.minute = m;
  // 更新小时 chip（第一个 tp-section 内）
  const sections = el.querySelectorAll('.tp-section');
  if (sections[0]) {
    sections[0].querySelectorAll('.tp-chip').forEach(c => {
      c.classList.toggle('active', parseInt(c.dataset.val) === h);
    });
  }
  // 更新分钟 chip（tp-grid-min 内）
  el.querySelectorAll('.tp-grid-min .tp-chip').forEach(c => {
    c.classList.toggle('active', parseInt(c.dataset.val) === m);
  });
}

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
          ${renderTimePicker('sched-start', defaultStart, 'sched-end')}
        </div>
        <div class="form-group">
          <label class="form-label">结束时间</label>
          ${renderTimePicker('sched-end', defaultEnd, null)}
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
          ${renderTimePicker('sched-single-start', defaultStart, 'sched-single-end')}
        </div>
        <div class="form-group">
          <label class="form-label">结束时间</label>
          ${renderTimePicker('sched-single-end', defaultEnd, null)}
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
  const startTime = getTimePickerValue('sched-start');
  const endTime = getTimePickerValue('sched-end');

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
  const startTime = getTimePickerValue('sched-start');
  const endTime = getTimePickerValue('sched-end');
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
  const startTime = getTimePickerValue('sched-single-start');
  const endTime = getTimePickerValue('sched-single-end');

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
