// pages/calendar/calendar.js
var storage = require('../../utils/storage');
var app = getApp();

Page({
  data: {
    year: 2026,
    month: 6,
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    weeks: [],           // 6行×7列 的日历数据
    stoolTypes: [],      // 从 globalData 获取
    prediction: null,    // 预测结果
    selectedDate: '',    // 当前选中的日期 YYYY-MM-DD
    previewRecords: []   // 选中日期的记录列表
  },

  onLoad() {
    this.setData({ stoolTypes: app.globalData.stoolTypes });
    // 首次启动插入示例数据
    this._initSampleData();
    this._renderCalendar();
  },

  onShow() {
    // 从记录页返回时刷新日历（可能有新数据）
    this._renderCalendar();
  },

  // ====== 初始化示例数据 ======
  _initSampleData() {
    var all = storage.getAllRecords();
    if (all.length === 0) {
      var today = this._formatDate(new Date());
      storage.addRecord({ date: today, time: '08:30', stoolType: 1, note: '示例：棕色健康' });
      storage.addRecord({ date: today, time: '14:00', stoolType: 3, note: '' });
    }
  },

  // ====== 月份切换 ======
  goPrevMonth() {
    var y = this.data.year;
    var m = this.data.month - 1;
    if (m === 0) { y--; m = 12; }
    this.setData({ year: y, month: m, selectedDate: '', previewRecords: [] });
    this._renderCalendar();
  },

  goNextMonth() {
    var y = this.data.year;
    var m = this.data.month + 1;
    if (m === 13) { y++; m = 1; }
    this.setData({ year: y, month: m, selectedDate: '', previewRecords: [] });
    this._renderCalendar();
  },

  // ====== 点击日期 → 展开/切换预览面板 ======
  onDayTap(e) {
    var item = e.currentTarget.dataset.item;
    if (!item || item.month !== 'current') return;
    var dateStr = this._formatDate(new Date(this.data.year, this.data.month - 1, item.day));

    // 点击同一日期 → 收起面板
    if (dateStr === this.data.selectedDate) {
      this.setData({ selectedDate: '', previewRecords: [] });
      return;
    }

    // 点击不同日期 → 切换预览
    var records = storage.getRecordsByDate(dateStr);
    this.setData({ selectedDate: dateStr, previewRecords: records });
  },

  // ====== 关闭预览面板 ======
  onDeselectDate() {
    this.setData({ selectedDate: '', previewRecords: [] });
  },

  // ====== 预览面板内删除记录 ======
  onPreviewDelete(e) {
    var id = e.currentTarget.dataset.id;
    var that = this;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定吗？',
      confirmColor: '#EF5350',
      success: function (res) {
        if (res.confirm) {
          storage.deleteRecord(id);
          wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
          // 刷新预览面板
          var records = storage.getRecordsByDate(that.data.selectedDate);
          that.setData({ previewRecords: records });
          // 刷新日历标记点
          that._renderCalendar();
        }
      }
    });
  },

  // ====== 跳转完整详情页（导入/导出） ======
  onGoToDetail() {
    wx.navigateTo({ url: '/pages/detail/detail?date=' + this.data.selectedDate });
  },

  // ====== 核心：渲染日历 ======
  _renderCalendar() {
    var y = this.data.year;
    var m = this.data.month;
    var stoolTypes = this.data.stoolTypes;

    // 获取当月摘要 + 经期日期 + 预测经期
    var summary = storage.getDateSummary(y, m);
    var periodDays = storage.getPeriodDaysByMonth(y, m);
    var periodSet = {};
    periodDays.forEach(function (d) {
      periodSet[d.slice(-2)] = true; // 取 DD 部分做 key
    });

    // 预测经期：构建当月预测日期集合（DD → true）
    var prediction = storage.predictPeriod();
    var predictedSet = {};
    if (prediction && prediction.predictedDays) {
      var monthPrefix = y + '-' + (m < 10 ? '0' + m : m) + '-';
      prediction.predictedDays.forEach(function (d) {
        if (d.indexOf(monthPrefix) === 0) {
          var dd = d.slice(-2);
          // 预测不覆盖已确认经期
          if (!periodSet[dd]) {
            predictedSet[dd] = true;
          }
        }
      });
    }

    // 计算当月天数
    var daysInMonth = new Date(y, m, 0).getDate();
    // 当月第一天是周几 (0=周日)
    var firstDayOfWeek = new Date(y, m - 1, 1).getDay();

    var weeks = [];
    var dayCounter = 1;
    var totalCells = firstDayOfWeek + daysInMonth;
    var totalRows = Math.ceil(totalCells / 7);

    // 上月填充天数
    var prevMonthDays = new Date(y, m - 1, 0).getDate();

    for (var row = 0; row < totalRows; row++) {
      var week = [];
      for (var col = 0; col < 7; col++) {
        var index = row * 7 + col;
        var cell = {};

        if (index < firstDayOfWeek) {
          // 上月填充
          cell = {
            day: prevMonthDays - firstDayOfWeek + index + 1,
            month: 'prev',
            dots: []
          };
        } else if (dayCounter > daysInMonth) {
          // 下月填充
          cell = {
            day: dayCounter - daysInMonth,
            month: 'next',
            dots: []
          };
          dayCounter++;
        } else {
          // 当月日期
          var dayStr = dayCounter < 10 ? '0' + dayCounter : String(dayCounter);
          var daySummary = summary[dayStr] || [];
          cell = {
            day: dayCounter,
            month: 'current',
            dots: daySummary,
            dateStr: this._formatDate(new Date(y, m - 1, dayCounter)),
            isToday: this._isToday(y, m, dayCounter),
            isPeriod: !!periodSet[dayStr],
            isPredicted: !!predictedSet[dayStr]
          };
          dayCounter++;
        }
        week.push(cell);
      }
      weeks.push(week);
    }

    this.setData({
      weeks: weeks,
      prediction: prediction
    });

    // 构建月份摘要文本（调试用）
    var hasData = Object.keys(summary).length;
    if (hasData > 0) {
      var detail = Object.keys(summary).map(function(k) {
        return k + '(' + summary[k].length + '点)';
      }).join(', ');
      console.log('[月历] ' + y + '年' + m + '月 有记录的日期：' + detail);
    }
  },

  // ====== 工具函数 ======
  _formatDate(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  },

  _isToday(year, month, day) {
    var now = new Date();
    return now.getFullYear() === year &&
           now.getMonth() + 1 === month &&
           now.getDate() === day;
  }
});
