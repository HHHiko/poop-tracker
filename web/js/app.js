// app.js — PWA 主控制器
// 三视图 SPA：record（首页）、calendar（月历）、detail（详情）

// ====== 全局配置 ======
var stoolTypes = [
  { value: 1, name: '棕色', color: '#A1887F', desc: '健康正常', img: 'image/brown.png' },
  { value: 2, name: '绿色', color: '#81C784', desc: '消化较快', img: 'image/green.png' },
  { value: 3, name: '黄色', color: '#FFD54F', desc: '油脂偏多', img: 'image/yellow.png' },
  { value: 4, name: '深色', color: '#6D4C41', desc: '偏黑发暗', img: 'image/black.png' },
  { value: 5, name: '红色', color: '#EF5350', desc: '需留意',   img: 'image/red.png' }
];

// ====== 应用状态 ======
var state = {
  view: 'record',          // ★ 首页改为记录页
  history: [],             // 导航历史，用于返回
  // 月历
  year: 0,
  month: 0,
  prediction: null,
  selectedDate: '',        // 日历中选中的日期
  // 记录
  recordDate: '',
  selectedType: 0,
  selectedTime: '',
  showNote: false,
  note: '',
  isPeriod: false,
  // 详情
  detailDate: '',
  // 导出
  showExportPicker: false
};

// ====== 工具函数 ======
function formatDate(date) {
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var d = date.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
}

function isToday(year, month, day) {
  var now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

// ====== Toast ======
var toastTimer = null;
function showToast(msg, icon, duration) {
  var el = document.getElementById('toast');
  var iconEl = document.getElementById('toast-icon');
  var msgEl = document.getElementById('toast-msg');
  if (!el) return;
  iconEl.textContent = icon === 'success' ? '✅' : icon === 'error' ? '❌' : '';
  msgEl.textContent = msg;
  el.className = 'toast show';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    el.className = 'toast';
  }, duration || 1500);
}

// ====== Modal ======
var modalCallback = null;
function showModal(title, content, confirmText, cancelText, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-content').textContent = content;
  document.getElementById('modal-confirm').textContent = confirmText || '确定';
  var cancelBtn = document.getElementById('modal-cancel');
  if (cancelText) {
    cancelBtn.textContent = cancelText;
    cancelBtn.style.display = '';
  } else {
    cancelBtn.style.display = 'none';
  }
  document.getElementById('modal-overlay').className = 'modal-overlay show';
  modalCallback = onConfirm;
}

function hideModal() {
  document.getElementById('modal-overlay').className = 'modal-overlay';
  modalCallback = null;
}

// Modal 按钮绑定（在 initApp 中调用）
function _setupModal() {
  document.getElementById('modal-confirm').addEventListener('click', function () {
    var cb = modalCallback;
    hideModal();
    if (cb) { modalCallback = null; cb(); }
  });
  document.getElementById('modal-cancel').addEventListener('click', hideModal);
  document.getElementById('modal-overlay').addEventListener('click', function (e) {
    if (e.target === this) hideModal();
  });
}

// ====== 导航 ======
function navigateTo(view, params) {
  state.history.push(state.view);
  state.view = view;
  _onViewEnter(view, params);
  _updateUI();
}

function goBack() {
  if (state.history.length === 0) {
    state.view = 'calendar';
  } else {
    state.view = state.history.pop();
  }
  _onViewEnter(state.view, null);
  _updateUI();
}

// ====== 视图切换 ======
function _onViewEnter(view, params) {
  if (view === 'calendar') {
    _initCalendar();
  } else if (view === 'record') {
    _initRecord(params);
  } else if (view === 'detail') {
    _initDetail(params);
  }
}

function _updateUI() {
  var v = state.view;
  // 视图显隐
  document.getElementById('view-calendar').style.display = v === 'calendar' ? '' : 'none';
  document.getElementById('view-record').style.display = v === 'record' ? '' : 'none';
  document.getElementById('view-detail').style.display = v === 'detail' ? '' : 'none';
  // 底部导航栏：详情页不显示
  document.getElementById('tab-bar').style.display = v === 'detail' ? 'none' : '';
  // Tab 图标切换
  var calTab = document.getElementById('tab-calendar');
  var recTab = document.getElementById('tab-record');
  if (v === 'calendar') {
    calTab.className = 'tab-item active';
    recTab.className = 'tab-item';
    document.getElementById('tab-img-cal').src = 'image/calendar-active.png';
    document.getElementById('tab-img-rec').src = 'image/record.png';
  } else if (v === 'record') {
    calTab.className = 'tab-item';
    recTab.className = 'tab-item active';
    document.getElementById('tab-img-cal').src = 'image/calendar.png';
    document.getElementById('tab-img-rec').src = 'image/record-active.png';
  }

  // 更新各视图内容
  if (v === 'calendar') _renderCalendarDOM();
  if (v === 'record') _renderRecordDOM();
  if (v === 'detail') _renderDetailDOM();
}

// ====== 底部 Tab 切换 ======
function switchTab(tab) {
  state.history = [];
  state.view = tab;
  _onViewEnter(tab, null);
  _updateUI();
}

// ====== 月历页 ======
function _initCalendar() {
  // ★ 修复：始终取当前显示的年月，首次调用时从今天取
  var now = new Date();
  state.year = state.year || now.getFullYear();
  state.month = state.month || (now.getMonth() + 1);
}

function _renderCalendarDOM() {
  var y = state.year;
  var m = state.month;
  document.getElementById('cal-title').textContent = y + '年 ' + m + '月';

  var summary = storage.getDateSummary(y, m);
  var periodDays = storage.getPeriodDaysByMonth(y, m);
  var periodSet = {};
  periodDays.forEach(function (d) { periodSet[d.slice(-2)] = true; });

  // 预测
  var prediction = storage.predictPeriod();
  state.prediction = prediction;
  var predictedSet = {};
  if (prediction && prediction.predictedDays) {
    var monthPrefix = y + '-' + (m < 10 ? '0' + m : m) + '-';
    prediction.predictedDays.forEach(function (d) {
      if (d.indexOf(monthPrefix) === 0) {
        var dd = d.slice(-2);
        if (!periodSet[dd]) predictedSet[dd] = true;
      }
    });
  }

  var daysInMonth = new Date(y, m, 0).getDate();
  var firstDayOfWeek = new Date(y, m - 1, 1).getDay();
  var totalCells = firstDayOfWeek + daysInMonth;
  var totalRows = Math.ceil(totalCells / 7);
  var prevMonthDays = new Date(y, m - 1, 0).getDate();

  var html = '';
  var dayCounter = 1;

  for (var row = 0; row < totalRows; row++) {
    html += '<div class="week-row">';
    for (var col = 0; col < 7; col++) {
      var idx = row * 7 + col;
      var cellClass = 'day-cell';
      var content = '';
      var barHtml = '';

      if (idx < firstDayOfWeek) {
        cellClass += ' prev';
        content = '<span class="day-num dimmed">' + (prevMonthDays - firstDayOfWeek + idx + 1) + '</span>';
      } else if (dayCounter > daysInMonth) {
        cellClass += ' next';
        content = '<span class="day-num dimmed">' + (dayCounter - daysInMonth) + '</span>';
        dayCounter++;
      } else {
        var dayStr = dayCounter < 10 ? '0' + dayCounter : String(dayCounter);
        var daySummary = summary[dayStr] || [];
        var today = isToday(y, m, dayCounter);
        var isPeriod = !!periodSet[dayStr];
        var isPredicted = !!predictedSet[dayStr];

        cellClass += ' current';
        if (today) cellClass += ' today';
        if (isPeriod) cellClass += ' period-day';
        if (isPredicted) cellClass += ' period-predicted';

        content = '<span class="day-num">' + dayCounter + '</span>';

        // 便便标记方块（像素画缩略图）
        if (daySummary.length > 0) {
          content += '<div class="dots-row">';
          daySummary.forEach(function (t) {
            var c = (stoolTypes[t - 1] || {}).color || '#999';
            content += '<span class="dot" style="background:' + c + '"></span>';
          });
          content += '</div>';
        }

        if (isPeriod) barHtml = '<div class="period-bar"></div>';
        else if (isPredicted) barHtml = '<div class="period-predicted-bar"></div>';

        var dateStr = formatDate(new Date(y, m - 1, dayCounter));
        content += barHtml;
        if (dateStr === state.selectedDate) cellClass += ' selected';
        html += '<div class="' + cellClass + '" data-date="' + dateStr + '" onclick="onCalendarDayTap(\'' + dateStr + '\')">' + content + '</div>';
        dayCounter++;
        continue;
      }
      html += '<div class="' + cellClass + '">' + content + '</div>';
    }
    html += '</div>';
  }

  document.getElementById('cal-grid').innerHTML = html;
  _renderLegend();
}

function _renderLegend() {
  var html = '';
  stoolTypes.forEach(function (t) {
    html += '<div class="legend-item"><img class="legend-img" src="' + t.img + '" alt=""><span class="legend-label">' + t.desc + '</span></div>';
  });
  html += '<div class="legend-item"><span class="legend-dot period-legend"></span><span class="legend-label">经期</span></div>';
  if (state.prediction) {
    html += '<div class="legend-item"><span class="legend-dot period-predicted-legend"></span><span class="legend-label">预测经期</span></div>';
  }
  document.getElementById('legend-items').innerHTML = html;
}

function onCalendarDayTap(dateStr) {
  // 点击同一日期 → 收起面板
  if (dateStr === state.selectedDate) {
    state.selectedDate = '';
    _updateCalendarSelection();
    _renderPreviewPanel();
    return;
  }
  // 点击不同日期 → 切换预览
  state.selectedDate = dateStr;
  _updateCalendarSelection();
  _renderPreviewPanel();
}

function goPrevMonth() {
  state.month--;
  if (state.month === 0) { state.year--; state.month = 12; }
  state.selectedDate = '';
  _renderCalendarDOM();
  _renderPreviewPanel();
}

function goNextMonth() {
  state.month++;
  if (state.month === 13) { state.year++; state.month = 1; }
  state.selectedDate = '';
  _renderCalendarDOM();
  _renderPreviewPanel();
}

// ====== 记录页 ======
function _initRecord(params) {
  var date = (params && params.date) ? params.date : formatDate(new Date());
  state.recordDate = date;
  state.selectedType = 0;
  state.showNote = false;
  state.note = '';
  state.isPeriod = storage.isPeriodDay(date);

  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  state.selectedTime = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
}

function _renderRecordDOM() {
  document.getElementById('rec-date').textContent = state.recordDate;
  document.getElementById('time-input').value = state.selectedTime || '';

  // 渲染类型卡片 — 使用像素画图标
  var cardsHtml = '';
  stoolTypes.forEach(function (t) {
    var sel = state.selectedType === t.value ? ' selected' : '';
    cardsHtml += '<div class="type-card' + sel + '" data-value="' + t.value + '" onclick="onTypeSelect(' + t.value + ')" style="--card-color:' + t.color + '">' +
      '<img class="type-icon-img" src="' + t.img + '" alt="' + t.name + '">' +
      '<span class="type-name">' + t.name + '</span>' +
      '<span class="type-desc">' + t.desc + '</span>' +
    '</div>';
  });
  // 经期卡片
  var pActive = state.isPeriod ? ' period-active' : '';
  cardsHtml += '<div class="type-card period-card' + pActive + '" onclick="onPeriodToggle()">' +
    '<span class="type-emoji">🩸</span>' +
    '<span class="type-name">经期</span>' +
    '<span class="type-desc">' + (state.isPeriod ? '已标记 ✕' : '点击标记') + '</span>' +
  '</div>';

  document.getElementById('type-grid').innerHTML = cardsHtml;

  // 备注区域
  document.getElementById('note-area').style.display = state.showNote ? '' : 'none';
  document.getElementById('note-toggle-text').textContent = state.showNote ? '📝 备注（点击收起 ▲）' : '📝 添加备注（可选 ▼）';
  document.getElementById('note-input').value = state.note;
}

function onTypeSelect(value) {
  state.selectedType = value;
  _renderRecordDOM();
}

function onPeriodToggle() {
  var result = storage.togglePeriodDay(state.recordDate);
  state.isPeriod = result;
  _renderRecordDOM();
  showToast(result ? '已标记经期' : '已取消经期', 'none', 1200);
}

function onTimeChange() {
  var val = document.getElementById('time-input').value;
  if (val) state.selectedTime = val;
}

function onToggleNote() {
  state.showNote = !state.showNote;
  _renderRecordDOM();
}

function onSaveRecord() {
  if (state.selectedType === 0) {
    showToast('请选择便便颜色', 'none', 2000);
    return;
  }
  if (!state.selectedTime) {
    showToast('请选择时间', 'none', 2000);
    return;
  }

  storage.addRecord({
    date: state.recordDate,
    time: state.selectedTime,
    stoolType: state.selectedType,
    note: state.note
  });

  showToast('记录成功！', 'success', 1500);
  setTimeout(function () { goBack(); }, 800);
}

function onNoteInput(val) {
  state.note = val;
}

// ====== 详情页 ======
function _initDetail(params) {
  state.detailDate = (params && params.date) ? params.date : formatDate(new Date());
  state.showExportPicker = false;
}

function _renderDetailDOM() {
  var date = state.detailDate;
  var records = storage.getRecordsByDate(date);
  var isPeriod = storage.isPeriodDay(date);
  var isEmpty = records.length === 0;

  document.getElementById('detail-date-title').innerHTML = date + (isPeriod ? '<span class="period-badge">🩸 经期</span>' : '');
  document.getElementById('detail-period-toggle').className = 'period-toggle ' + (isPeriod ? 'period-on' : 'period-off');
  document.getElementById('detail-period-icon').textContent = isPeriod ? '🩸' : '🩹';
  document.getElementById('detail-period-text').textContent = isPeriod ? '经期中 · 点击取消' : '标记为经期日';

  var listEl = document.getElementById('detail-list');
  var emptyEl = document.getElementById('detail-empty');

  if (isEmpty) {
    emptyEl.style.display = '';
    listEl.innerHTML = '';
  } else {
    emptyEl.style.display = 'none';
    var html = '';
    records.forEach(function (r) {
      var t = stoolTypes[r.stoolType - 1] || { color: '#999', img: '', name: '未知' };
      html += '<div class="record-item" data-id="' + r.id + '">' +
        '<div class="record-left"><span class="dot" style="background:' + t.color + '"></span><span class="record-time">' + r.time + '</span></div>' +
        '<div class="record-mid"><img class="detail-record-icon" src="' + t.img + '" alt="' + t.name + '"><span class="record-type">' + t.name + '</span></div>' +
        '<div class="record-right">' +
          (r.note ? '<span class="record-note">' + r.note + '</span>' : '') +
        '</div>' +
        '<div class="delete-btn" onclick="event.stopPropagation();onDeleteRecord(\'' + r.id + '\')">' +
          '<span class="delete-icon">🗑</span>' +
        '</div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  }

  document.getElementById('export-sheet').style.display = state.showExportPicker ? '' : 'none';
}

function onDetailPeriodToggle() {
  var result = storage.togglePeriodDay(state.detailDate);
  _renderDetailDOM();
  showToast(result ? '已标记经期' : '已取消经期', 'none', 1200);
}

function onDetailAddRecord() {
  navigateTo('record', { date: state.detailDate });
}

function onDeleteRecord(id) {
  showModal('确认删除', '删除后无法恢复，确定吗？', '删除', '取消', function () {
    storage.deleteRecord(id);
    showToast('已删除', 'success', 1200);
    _renderDetailDOM();
  });
}

// ====== 日历预览面板 ======
function onDeselectDate() {
  state.selectedDate = '';
  _updateCalendarSelection();
  _renderPreviewPanel();
}

function _updateCalendarSelection() {
  // 清除旧选中
  var prev = document.querySelector('.day-cell.selected');
  if (prev) prev.classList.remove('selected');
  // 设置新选中
  if (state.selectedDate) {
    var cell = document.querySelector('.day-cell[data-date="' + state.selectedDate + '"]');
    if (cell) cell.classList.add('selected');
  }
}

function _renderPreviewPanel() {
  var panel = document.getElementById('day-preview');
  var dateText = document.getElementById('preview-date-text');
  var listEl = document.getElementById('preview-list');
  var emptyEl = document.getElementById('preview-empty');

  if (!state.selectedDate) {
    panel.style.display = 'none';
    return;
  }

  panel.style.display = '';
  dateText.textContent = '📅 ' + state.selectedDate;

  var records = storage.getRecordsByDate(state.selectedDate);

  if (records.length === 0) {
    emptyEl.style.display = '';
    listEl.innerHTML = '';
  } else {
    emptyEl.style.display = 'none';
    var html = '';
    records.forEach(function (r) {
      var t = stoolTypes[r.stoolType - 1] || { color: '#999', img: '', name: '未知' };
      html += '<div class="preview-item" data-id="' + r.id + '">' +
        '<div class="preview-item-left"><span class="preview-dot" style="background:' + t.color + '"></span><span class="preview-time">' + r.time + '</span></div>' +
        '<div class="preview-item-mid"><img class="preview-icon" src="' + t.img + '" alt="' + t.name + '"><span class="preview-type">' + t.name + '</span></div>' +
        '<div class="preview-item-right">' + (r.note ? '<span class="preview-note">' + r.note + '</span>' : '') + '</div>' +
        '<div class="preview-delete-btn" onclick="event.stopPropagation();onPreviewDelete(\'' + r.id + '\')"><span class="preview-delete-icon">🗑</span></div>' +
      '</div>';
    });
    listEl.innerHTML = html;
  }
}

function onPreviewDelete(id) {
  showModal('确认删除', '删除后无法恢复，确定吗？', '删除', '取消', function () {
    storage.deleteRecord(id);
    showToast('已删除', 'success', 1200);
    _renderPreviewPanel();
    _renderCalendarDOM();
  });
}

function onGoToDetail() {
  navigateTo('detail', { date: state.selectedDate });
}

// ====== 导出 ======
function onExport() {
  state.showExportPicker = true;
  _renderDetailDOM();
}

function onExportCancel() {
  state.showExportPicker = false;
  _renderDetailDOM();
}

function onExportSelect(range) {
  var today = state.detailDate || formatDate(new Date());
  var startDate = '';
  if (range === '1m') {
    var d = new Date(); d.setMonth(d.getMonth() - 1);
    startDate = formatDate(d);
  } else if (range === '3m') {
    var d2 = new Date(); d2.setMonth(d2.getMonth() - 3);
    startDate = formatDate(d2);
  } else {
    startDate = '2020-01-01';
  }

  var csv = storage.exportToCSV(startDate, today);
  if (!csv || csv.split('\n').length <= 1) {
    showToast('该范围内无记录', 'none');
    state.showExportPicker = false;
    _renderDetailDOM();
    return;
  }

  state.showExportPicker = false;
  _renderDetailDOM();

  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = '便便记录_' + startDate + '_' + today + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('已下载 CSV 文件', 'success', 2000);
}

// ====== 导入 ======
function onImport() {
  var input = document.getElementById('import-file');
  input.value = '';
  input.click();
}

function onImportFile(file) {
  var reader = new FileReader();
  reader.onload = function (e) {
    var result = storage.importFromCSV(e.target.result);
    showModal('导入完成', '新增 ' + result.imported + ' 条记录，跳过 ' + result.skipped + ' 条（重复或格式错误）', '好的', '', function () {
      _renderDetailDOM();
    });
  };
  reader.readAsText(file, 'utf-8');
}

// ====== 初始化 ======
function initApp() {
  var all = storage.getAllRecords();
  if (all.length === 0) {
    var today = formatDate(new Date());
    storage.addRecord({ date: today, time: '08:30', stoolType: 1, note: '示例：棕色健康' });
    storage.addRecord({ date: today, time: '14:00', stoolType: 3, note: '' });
  }

  _setupModal();
  // 初始化月历（保证首次渲染时有正确的年月）
  var now = new Date();
  state.year = now.getFullYear();
  state.month = now.getMonth() + 1;
  // ★ 首页显示记录页
  _initRecord(null);
  _updateUI();
}
