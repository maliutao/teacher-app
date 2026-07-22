/* ===== income.js — 收入统计页：汇总 + 图表 + 明细 ===== */

let incomeRange = 'month'; // 'week' | 'month' | 'custom'
let incomeCustomStart = '';
let incomeCustomEnd = '';

function renderIncome() {
  const container = document.getElementById('page-income');
  const data = getData();

  // 计算时间范围
  const now = new Date();
  let startDate, endDate, rangeLabel;

  if (incomeRange === 'week') {
    startDate = getWeekStart(now);
    endDate = getWeekEnd(now);
    rangeLabel = '本周';
  } else if (incomeRange === 'month') {
    startDate = getMonthStart(now);
    endDate = getMonthEnd(now);
    rangeLabel = '本月';
  } else {
    startDate = incomeCustomStart ? parseDate(incomeCustomStart) : getMonthStart(now);
    endDate = incomeCustomEnd ? parseDate(incomeCustomEnd) : getMonthEnd(now);
    rangeLabel = `${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)}`;
  }

  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);

  // 筛选课程
  const lessons = data.lessons
    .filter(l => l.date >= startStr && l.date <= endStr)
    .sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime));

  // 收入计算
  let totalIncome = 0;
  const byStudent = {};
  const byDate = {};

  lessons.forEach(lesson => {
    const student = data.students.find(s => s.id === lesson.studentId);
    if (!student) return;

    totalIncome += student.price;

    if (!byStudent[student.id]) {
      byStudent[student.id] = { name: student.name, color: student.color, count: 0, total: 0 };
    }
    byStudent[student.id].count++;
    byStudent[student.id].total += student.price;

    if (!byDate[lesson.date]) {
      byDate[lesson.date] = 0;
    }
    byDate[lesson.date] += student.price;
  });

  let html = '';

  // 时间范围选择
  html += `
    <div class="tabs">
      <button class="tab-btn${incomeRange === 'week' ? ' active' : ''}" onclick="switchIncomeRange('week')">本周</button>
      <button class="tab-btn${incomeRange === 'month' ? ' active' : ''}" onclick="switchIncomeRange('month')">本月</button>
      <button class="tab-btn${incomeRange === 'custom' ? ' active' : ''}" onclick="switchIncomeRange('custom')">自定义</button>
    </div>
  `;

  // 自定义日期范围
  if (incomeRange === 'custom') {
    html += `
      <div class="form-row" style="margin-bottom:16px">
        <div class="form-group">
          <input class="form-input" type="date" id="income-start" value="${incomeCustomStart || startStr}" onchange="onIncomeCustomChange()">
        </div>
        <div class="form-group">
          <input class="form-input" type="date" id="income-end" value="${incomeCustomEnd || endStr}" onchange="onIncomeCustomChange()">
        </div>
      </div>
    `;
  }

  // 总收入
  html += `
    <div class="income-total">
      <div class="big-number">${formatMoney(totalIncome)}</div>
      <div class="sub-text">${rangeLabel} · ${lessons.length} 节课</div>
    </div>
  `;

  // 柱状图（每日收入）
  const dailyData = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = formatDate(cursor);
    dailyData.push({
      date: dateStr,
      total: byDate[dateStr] || 0
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  // 如果天数太多，按周聚合
  let chartData = dailyData;
  if (dailyData.length > 31) {
    // 按周聚合
    const weekData = {};
    dailyData.forEach(d => {
      const dt = parseDate(d.date);
      const weekKey = formatDate(getWeekStart(dt));
      if (!weekData[weekKey]) weekData[weekKey] = { date: weekKey, total: 0 };
      weekData[weekKey].total += d.total;
    });
    chartData = Object.values(weekData).sort((a, b) => a.date.localeCompare(b.date));
  }

  html += `
    <div class="chart-container">
      <div class="chart-title">每日收入</div>
      <div id="income-bar-chart"></div>
    </div>
  `;

  // 环形图（学生占比）
  const segments = Object.values(byStudent).map(s => ({
    name: s.name,
    value: s.total,
    color: s.color
  }));

  html += `
    <div class="chart-container">
      <div class="chart-title">学生占比</div>
      <div id="income-donut-chart"></div>
    </div>
  `;

  // 明细列表
  if (lessons.length > 0) {
    html += `
      <div class="section-label">收入明细</div>
      <div class="detail-list">
    `;

    lessons.forEach(lesson => {
      const student = data.students.find(s => s.id === lesson.studentId);
      if (!student) return;
      const d = parseDate(lesson.date);
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()} ${getWeekdayShort(d)}`;

      html += `
        <div class="detail-item">
          <span class="detail-dot" style="background:${student.color}"></span>
          <div class="detail-info">
            <div class="detail-date">${dateLabel} ${lesson.startTime}</div>
            <div class="detail-name">${escapeHtml(student.name)}</div>
          </div>
          <span class="detail-amount">${formatMoney(student.price)}</span>
        </div>
      `;
    });

    html += '</div>';
  }

  container.innerHTML = html;

  // 渲染图表（需要 DOM 就绪后）
  setTimeout(() => {
    renderBarChart('income-bar-chart', chartData);
    renderDonutChart('income-donut-chart', segments);
  }, 50);
}

function switchIncomeRange(range) {
  incomeRange = range;
  renderIncome();
}

function onIncomeCustomChange() {
  const start = document.getElementById('income-start')?.value;
  const end = document.getElementById('income-end')?.value;
  if (start) incomeCustomStart = start;
  if (end) incomeCustomEnd = end;
  // 仅重新渲染，不清空输入框焦点
  renderIncome();
  // 恢复焦点到日期输入框（如果用户仍在编辑）
  const activeId = document.activeElement?.id;
  if (activeId === 'income-start' || activeId === 'income-end') {
    const el = document.getElementById(activeId);
    if (el) el.focus();
  }
}
