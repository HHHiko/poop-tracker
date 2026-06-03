// pages/detail/detail.js
var storage = require('../../utils/storage');
var app = getApp();

Page({
  data: {
    date: '',
    records: [],
    stoolTypes: [],
    isEmpty: false,
    showExportPicker: false,
    exportRanges: [
      { label: '最近 1 个月', key: '1m' },
      { label: '最近 3 个月', key: '3m' },
      { label: '全部记录', key: 'all' }
    ]
  },

  onLoad(options) {
    this.setData({
      date: options.date || '',
      stoolTypes: app.globalData.stoolTypes,
      isPeriod: storage.isPeriodDay(options.date || '')
    });
    this._loadRecords();
  },

  onShow() {
    // 从记录页返回时刷新数据 + 经期状态
    this._loadRecords();
    this.setData({ isPeriod: storage.isPeriodDay(this.data.date) });
  },

  // ====== 加载记录 ======
  _loadRecords() {
    var records = storage.getRecordsByDate(this.data.date);
    this.setData({
      records: records,
      isEmpty: records.length === 0
    });
  },

  // ====== 经期快速切换（不跳转页面） ======
  onPeriodToggle() {
    var date = this.data.date;
    var result = storage.togglePeriodDay(date);
    this.setData({ isPeriod: result });
    // 通知日历页刷新经期标记
    var pages = getCurrentPages();
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].route === 'pages/calendar/calendar') {
        pages[i]._renderCalendar();
        break;
      }
    }
    wx.showToast({
      title: result ? '已标记经期' : '已取消经期',
      icon: 'none',
      duration: 1200
    });
  },

  // ====== 删除记录 ======
  onDelete(e) {
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
          that._loadRecords();
        }
      }
    });
  },

  // ====== 添加记录（跳转记录页） ======
  onAddRecord() {
    // 用 reLaunch 传递日期（switchTab 不支持 query 参数）
    wx.reLaunch({ url: '/pages/record/record?date=' + this.data.date });
  },

  // ====== 导入 ======
  onImport() {
    var that = this;
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['.csv'],
      success: function (res) {
        var fs = wx.getFileSystemManager();
        var content = fs.readFileSync(res.tempFiles[0].path, 'utf8');
        that._doImport(content);
      },
      fail: function (err) {
        // 如果 chooseMessageFile 不可用，尝试从剪贴板导入
        if (err.errMsg && err.errMsg.indexOf('not support') > -1) {
          wx.getClipboardData({
            success: function (res) {
              if (res.data && res.data.indexOf('日期,时间,便便类型') > -1) {
                wx.showModal({
                  title: '检测到 CSV 数据',
                  content: '剪贴板中有便便记录数据，是否导入？',
                  confirmText: '导入',
                  cancelText: '取消',
                  success: function (modalRes) {
                    if (modalRes.confirm) {
                      that._doImport(res.data);
                    }
                  }
                });
              } else {
                wx.showToast({ title: '剪贴板中无有效记录数据', icon: 'none' });
              }
            },
            fail: function () {
              wx.showToast({ title: '已取消导入', icon: 'none' });
            }
          });
        } else {
          wx.showToast({ title: '已取消导入', icon: 'none' });
        }
      }
    });
  },

  // 执行导入
  _doImport(content) {
    var that = this;
    var result = storage.importFromCSV(content);
    wx.showModal({
      title: '导入完成',
      content: '新增 ' + result.imported + ' 条记录，跳过 ' + result.skipped + ' 条（重复或格式错误）',
      showCancel: false,
      confirmText: '好的',
      success: function () {
        that._loadRecords();
        // 通知日历页刷新
        var pages = getCurrentPages();
        for (var i = 0; i < pages.length; i++) {
          if (pages[i].route === 'pages/calendar/calendar') {
            pages[i]._renderCalendar();
            break;
          }
        }
      }
    });
  },

  // ====== 导出 ======
  onExport() {
    this.setData({ showExportPicker: true });
  },
  onExportCancel() {
    this.setData({ showExportPicker: false });
  },
  onExportSelect(e) {
    var range = e.currentTarget.dataset.range;
    var today = this.data.date || this._formatDate(new Date());
    var startDate = '';

    if (range === '1m') {
      var d = new Date();
      d.setMonth(d.getMonth() - 1);
      startDate = this._formatDate(d);
    } else if (range === '3m') {
      var d2 = new Date();
      d2.setMonth(d2.getMonth() - 3);
      startDate = this._formatDate(d2);
    } else {
      // 全部：从 2020 年开始
      startDate = '2020-01-01';
    }

    var csv = storage.exportToCSV(startDate, today);

    if (!csv || csv.split('\n').length <= 1) {
      wx.showToast({ title: '该范围内无记录', icon: 'none' });
      this.setData({ showExportPicker: false });
      return;
    }

    // 写入临时文件
    var fs = wx.getFileSystemManager();
    var filePath = wx.env.USER_DATA_PATH + '/便便记录_' + startDate + '_' + today + '.csv';
    var that = this;

    fs.writeFile({
      filePath: filePath,
      data: csv,
      encoding: 'utf8',
      success: function () {
        that.setData({ showExportPicker: false });
        // 分享文件到微信
        wx.shareFileMessage({
          filePath: filePath,
          fileName: '便便记录_' + startDate + '_' + today + '.csv',
          success: function () {
            wx.showToast({ title: '请选择发送对象', icon: 'none' });
          },
          fail: function (err) {
            // 备用：复制到剪贴板
            wx.setClipboardData({
              data: csv,
              success: function () {
                wx.showToast({ title: '已复制到剪贴板，请粘贴到备忘录', icon: 'none', duration: 3000 });
              }
            });
          }
        });
      },
      fail: function (err) {
        console.error('[导出] 文件写入失败', err);
        // 备用方案
        wx.setClipboardData({
          data: csv,
          success: function () {
            wx.showToast({ title: '已复制到剪贴板', icon: 'success', duration: 2000 });
          }
        });
        that.setData({ showExportPicker: false });
      }
    });
  },

  // ====== 获取便便类型信息 ======
  getTypeInfo(value) {
    var types = this.data.stoolTypes;
    for (var i = 0; i < types.length; i++) {
      if (types[i].value === value) return types[i];
    }
    return { name: '未知', icon: '', color: '#999' };
  },

  // ====== 工具 ======
  _formatDate(date) {
    var y = date.getFullYear();
    var m = date.getMonth() + 1;
    var d = date.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d);
  }
});
