/* ===== charts.js — 手写 SVG 图表：柱状图 + 环形图 ===== */

function renderBarChart(containerId, dailyData, options) {
  // dailyData: [{date: '2026-07-01', total: 600}, ...]
  // options: {height, barColor, showLabels}
  const opts = {
    height: 160,
    barColor: '#4F46E5',
    showLabels: true,
    ...options
  };

  const container = document.getElementById(containerId);
  if (!container) return;

  if (!dailyData || dailyData.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text" style="padding:24px 0;color:var(--text-tertiary);font-size:0.85rem;">暂无数据</div></div>';
    return;
  }

  const maxVal = Math.max(...dailyData.map(d => d.total), 1);
  const barCount = dailyData.length;
  const chartWidth = 320;
  const chartHeight = opts.height;
  const padding = { top: 24, right: 8, bottom: 28, left: 8 };
  const plotW = chartWidth - padding.left - padding.right;
  const plotH = chartHeight - padding.top - padding.bottom;

  const barGap = 2;
  const barWidth = Math.max(4, (plotW - barGap * (barCount - 1)) / barCount);

  let bars = '';
  let labels = '';

  dailyData.forEach((d, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barH = (d.total / maxVal) * plotH;
    const y = padding.top + plotH - barH;

    bars += `<rect x="${x}" y="${padding.top + plotH}" width="${barWidth}" height="0" rx="${Math.min(barWidth / 3, 3)}" fill="${opts.barColor}" opacity="0.85">
      <animate attributeName="height" from="0" to="${barH}" dur="0.4s" fill="freeze"/>
      <animate attributeName="y" from="${padding.top + plotH}" to="${y}" dur="0.4s" fill="freeze"/>
    </rect>`;

    // 金额标签（只在柱子足够高时显示）
    if (barH > 20 && opts.showLabels && barWidth > 16) {
      bars += `<text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" font-size="9" font-family="Space Mono" fill="${opts.barColor}">${d.total}</text>`;
    }

    // X 轴标签（间隔显示避免重叠）
    const labelInterval = Math.max(1, Math.ceil(barCount / 10));
    if (i % labelInterval === 0 || i === barCount - 1) {
      const dateParts = d.date.split('-');
      const dayLabel = parseInt(dateParts[2]);
      labels += `<text x="${x + barWidth / 2}" y="${chartHeight - 4}" text-anchor="middle" font-size="9" font-family="Space Mono" fill="#9CA3AF">${dayLabel}</text>`;
    }
  });

  // 基线
  const baseY = padding.top + plotH;
  const baseline = `<line x1="${padding.left}" y1="${baseY}" x2="${chartWidth - padding.right}" y2="${baseY}" stroke="#E5E7EB" stroke-width="1"/>`;

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="xMidYMid meet">
      ${baseline}
      ${bars}
      ${labels}
    </svg>
  `;
}

function renderDonutChart(containerId, segments, options) {
  // segments: [{name: '张三', value: 3600, color: '#4A90D9'}, ...]
  const opts = {
    size: 160,
    strokeWidth: 28,
    ...options
  };

  const container = document.getElementById(containerId);
  if (!container) return;

  if (!segments || segments.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text" style="padding:24px 0;color:var(--text-tertiary);font-size:0.85rem;">暂无数据</div></div>';
    return;
  }

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-text" style="padding:24px 0;color:var(--text-tertiary);font-size:0.85rem;">暂无数据</div></div>';
    return;
  }

  const size = opts.size;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - opts.strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  let arcs = '';
  let offset = 0;

  segments.forEach(seg => {
    const pct = seg.value / total;
    const dashLen = circumference * pct;
    const dashGap = circumference - dashLen;
    const rotation = (offset / total) * 360 - 90;

    arcs += `<circle
      cx="${cx}" cy="${cy}" r="${r}"
      fill="none"
      stroke="${seg.color}"
      stroke-width="${opts.strokeWidth}"
      stroke-dasharray="${dashLen} ${dashGap}"
      stroke-dashoffset="0"
      transform="rotate(${rotation} ${cx} ${cy})"
      stroke-linecap="butt"
    />`;

    offset += seg.value;
  });

  // 中心文字
  const centerText = `<text x="${cx}" y="${cy - 6}" text-anchor="middle" font-family="Big Shoulders Display" font-size="22" font-weight="700" fill="#1A1A2E">${formatMoneyShort(total)}</text>
    <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-family="Archivo" font-size="11" fill="#9CA3AF">总计</text>`;

  const svgHtml = `
    <svg class="chart-svg" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet" style="max-width:${size}px;margin:0 auto;display:block;">
      ${arcs}
      ${centerText}
    </svg>
  `;

  // 图例
  let legendHtml = '<div class="chart-legend">';
  segments.sort((a, b) => b.value - a.value).forEach(seg => {
    const pct = Math.round(seg.value / total * 100);
    legendHtml += `
      <div class="legend-item">
        <span class="legend-dot" style="background:${seg.color}"></span>
        <span class="legend-name">${escapeHtml(seg.name)}</span>
        <span class="legend-value">${formatMoney(seg.value)} (${pct}%)</span>
      </div>
    `;
  });
  legendHtml += '</div>';

  container.innerHTML = svgHtml + legendHtml;
}
