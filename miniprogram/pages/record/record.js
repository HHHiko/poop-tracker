// pages/record/record.js
var storage = require('../../utils/storage');
var app = getApp();

Page({
  data: {
    stoolTypes: [],
    selectedType: 0,      // 选中的便便类型 value
    selectedTime: '',     // 选中的时间 HH:MM
    showNote: false,      // 是否展开备注输入框
    note: '',             // 备注内容
    recordDate: '',       // 记录日期 YYYY-MM-DD

    // 经期相关
    isPeriod: false,      // 当天是否为经期
    periodEmoji: '🩸',
    periodName: '经期',

    // 总记录计数
    totalCount: 0,        // 总记录条数
    poops: [],            // 每条记录对应的彩色圆点数据
    MAX_DOTS: 100         // 最多显示 100 个圆点，超出显示数字
  },

  onLoad(options) {
    var stoolTypes = app.globalData.stoolTypes;
    var periodConfig = app.globalData.periodConfig;
    this.setData({
      stoolTypes: stoolTypes,
      periodEmoji: periodConfig.emoji,
      periodName: periodConfig.name
    });

    // 接收日期参数（来自详情页的补录），默认今天
    var date = options.date || this._formatDate(new Date());
    this.setData({ recordDate: date });

    // 默认时间为当前时间
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    this.setData({
      selectedTime: (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m)
    });

    // 加载当天经期状态
    this.setData({ isPeriod: storage.isPeriodDay(date) });
  },

  onShow() {
    // 每次进入记录页时刷新经期状态 + 总记录计数
    this.setData({ isPeriod: storage.isPeriodDay(this.data.recordDate) });
    this._updatePoopCounter();
  },

  // ====== 更新总记录计数和圆点 ======
  _updatePoopCounter() {
    var records = storage.getAllRecords();
    var count = records.length;
    var poops = [];

    // 构建颜色映射
    var colorMap = {};
    var types = this.data.stoolTypes || app.globalData.stoolTypes;
    types.forEach(function (t) {
      colorMap[t.value] = t.color;
    });

    // 生成圆点数据（按记录顺序，最近的在前面）
    var max = Math.min(count, this.data.MAX_DOTS);
    for (var i = 0; i < max; i++) {
      poops.push({
        color: colorMap[records[i].stoolType] || '#A1887F'
      });
    }

    this.setData({
      totalCount: count,
      poops: poops
    });
  },

  // ====== 选择便便类型 ======
  onTypeSelect(e) {
    var value = e.currentTarget.dataset.value;
    this.setData({ selectedType: value });
  },

  // ====== 经期切换 ======
  onPeriodToggle() {
    var date = this.data.recordDate;
    var result = storage.togglePeriodDay(date);
    this.setData({ isPeriod: result });
    wx.showToast({
      title: result ? '已标记经期' : '已取消经期',
      icon: 'none',
      duration: 1500
    });
  },

  // ====== 时间选择 ======
  onTimeChange(e) {
    this.setData({ selectedTime: e.detail.value });
  },

  // ====== 备注展开/收起 ======
  onToggleNote() {
    this.setData({ showNote: !this.data.showNote });
  },
  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  // ====== 保存 ======
  onSave() {
    var type = this.data.selectedType;
    var time = this.data.selectedTime;

    // 校验
    if (type === 0) {
      wx.showToast({ title: '请选择便便颜色', icon: 'none', duration: 2000 });
      return;
    }
    if (!time) {
      wx.showToast({ title: '请选择时间', icon: 'none', duration: 2000 });
      return;
    }

    // 写入存储
    storage.addRecord({
      date: this.data.recordDate,
      time: time,
      stoolType: type,
      note: this.data.note
    });

    // 保存后即时更新计数
    this._updatePoopCounter();

    wx.showToast({ title: '记录成功！🎉', icon: 'success', duration: 1500 });

    // 延迟返回，让用户看到成功提示
    var that = this;
    setTimeout(function () {
      wx.navigateBack({ delta: 1 });
    }, 1000);
  },

  // ====== 工具 ======
  _formatDate(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  }
});
