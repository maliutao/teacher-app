/* ===== students.js — 学生管理页面 + 增删改查表单 ===== */

let editingStudentId = null;

function renderStudents() {
  const container = document.getElementById('page-students');
  const data = getData();
  const students = data.students;

  if (students.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <div class="empty-text">还没有学生<br>点击右上角"添加"开始</div>
        <button class="btn btn-primary" onclick="openStudentForm()">✚ 添加学生</button>
      </div>
    `;
    return;
  }

  const now = new Date();
  const weekStart = formatDate(getWeekStart(now));
  const weekEnd = formatDate(getWeekEnd(now));
  const monthStart = formatDate(getMonthStart(now));
  const monthEnd = formatDate(getMonthEnd(now));

  let html = '';
  students.forEach(student => {
    const weekCount = data.lessons.filter(l =>
      l.studentId === student.id && l.date >= weekStart && l.date <= weekEnd
    ).length;
    const monthCount = data.lessons.filter(l =>
      l.studentId === student.id && l.date >= monthStart && l.date <= monthEnd
    ).length;

    const initial = escapeHtml(student.name.charAt(0));

    html += `
      <div class="student-card" onclick="openStudentForm('${student.id}')">
        <div class="student-dot" style="background:${student.color}">${initial}</div>
        <div class="student-info">
          <div class="student-name">${escapeHtml(student.name)}</div>
          <div class="student-detail">${escapeHtml(student.location)} · ${formatMoney(student.price)}/节</div>
          <div class="student-stats">本周 ${weekCount} 节 · 本月 ${monthCount} 节</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openStudentForm(studentId) {
  editingStudentId = studentId || null;
  const panel = document.getElementById('student-panel');
  const data = getData();
  let student = null;

  if (studentId) {
    student = data.students.find(s => s.id === studentId);
  }

  const isEdit = !!student;
  const title = isEdit ? '编辑学生' : '添加学生';
  const name = student ? escapeHtml(student.name) : '';
  const location = student ? escapeHtml(student.location) : '';
  const price = student ? student.price : '';
  const duration = student ? student.duration : 60;
  const selectedColor = (student && STUDENT_COLORS.includes(student.color))
    ? student.color : getNextColor(data.students);

  let colorOptions = '';
  STUDENT_COLORS.forEach(c => {
    colorOptions += `<div class="color-option${c === selectedColor ? ' selected' : ''}"
      style="background:${c}" data-color="${c}" onclick="selectColor(this)"></div>`;
  });

  panel.innerHTML = `
    <div class="sheet-header">
      <h2>${title}</h2>
      <button class="sheet-close" onclick="closeStudentForm()">✕</button>
    </div>

    <div class="form-group">
      <label class="form-label">姓名</label>
      <input class="form-input" id="sf-name" type="text" placeholder="学生姓名" value="${name}" maxlength="20">
    </div>

    <div class="form-group">
      <label class="form-label">上课地点</label>
      <input class="form-input" id="sf-location" type="text" placeholder="如：星巴克二楼、学生家里" value="${location}" maxlength="40">
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label">每节价格（元）</label>
        <input class="form-input" id="sf-price" type="number" placeholder="200" value="${price}" min="0" inputmode="numeric">
      </div>
      <div class="form-group">
        <label class="form-label">默认课时（分钟）</label>
        <select class="form-input" id="sf-duration">
          <option value="30"${duration === 30 ? ' selected' : ''}>30 分钟</option>
          <option value="45"${duration === 45 ? ' selected' : ''}>45 分钟</option>
          <option value="60"${duration === 60 ? ' selected' : ''}>60 分钟</option>
          <option value="90"${duration === 90 ? ' selected' : ''}>90 分钟</option>
          <option value="120"${duration === 120 ? ' selected' : ''}>120 分钟</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">标识色</label>
      <div class="color-picker" id="sf-colors">${colorOptions}</div>
    </div>

    <button class="btn btn-primary btn-full" onclick="saveStudent()" style="margin-top:8px">
      ${isEdit ? '保存修改' : '添加学生'}
    </button>

    ${isEdit ? `
      <button class="btn btn-danger btn-full" onclick="confirmDeleteStudent('${studentId}')" style="margin-top:12px">
        删除学生
      </button>
    ` : ''}
  `;

  document.getElementById('student-overlay').classList.add('active');

  // 自动聚焦
  setTimeout(() => {
    const nameInput = document.getElementById('sf-name');
    if (nameInput) nameInput.focus();
  }, 350);
}

function closeStudentForm() {
  document.getElementById('student-overlay').classList.remove('active');
  editingStudentId = null;
}

function selectColor(el) {
  el.parentElement.querySelectorAll('.color-option').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function getSelectedColor() {
  const selected = document.querySelector('#sf-colors .color-option.selected');
  return selected ? selected.dataset.color : STUDENT_COLORS[0];
}

function saveStudent() {
  const name = document.getElementById('sf-name').value.trim();
  const location = document.getElementById('sf-location').value.trim();
  const price = parseInt(document.getElementById('sf-price').value);
  const duration = parseInt(document.getElementById('sf-duration').value);
  const color = getSelectedColor();

  // 验证
  if (!name) {
    showToast('请输入学生姓名', 'error');
    return;
  }
  if (!location) {
    showToast('请输入上课地点', 'error');
    return;
  }
  if (!price || price <= 0) {
    showToast('请输入有效价格', 'error');
    return;
  }

  const studentData = { name, location, price, duration, color };

  if (editingStudentId) {
    updateStudent(editingStudentId, studentData);
    showToast('学生信息已更新', 'success');
  } else {
    addStudent(studentData);
    showToast('学生已添加', 'success');
  }

  closeStudentForm();
  renderStudents();
}

function confirmDeleteStudent(studentId) {
  const student = findStudent(studentId);
  if (!student) return;

  closeStudentForm();

  showConfirm(`确定删除「${student.name}」吗？该学生的所有课程也将被删除。`, () => {
    deleteStudent(studentId);
    renderStudents();
    showToast('学生已删除', 'success');
  });
}
