// app.js — 便便记录助手
var storage = require('./utils/storage');

App({
  onLaunch() {
    // 初始化本地存储
    var records = storage.getAllRecords();
    console.log('[App] 启动完成，当前记录数：', records.length);
  },

  globalData: {
    // 便便类型配置（供所有页面使用）
    stoolTypes: [
      { value: 1, name: '棕色', icon: '/image/brown.png', color: '#A1887F', desc: '健康正常' },
      { value: 2, name: '绿色', icon: '/image/green.png', color: '#81C784', desc: '消化较快' },
      { value: 3, name: '黄色', icon: '/image/yellow.png', color: '#FFD54F', desc: '油脂偏多' },
      { value: 4, name: '深色', icon: '/image/black.png', color: '#6D4C41', desc: '偏黑发暗' },
      { value: 5, name: '红色', icon: '/image/red.png', color: '#EF5350', desc: '需留意' }
    ],

    // 经期配置
    periodConfig: {
      name: '经期',
      emoji: '🩸',
      color: '#F48FB1',
      desc: '标记经期'
    }
  }
});
