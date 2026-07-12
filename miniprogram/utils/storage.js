// utils/storage.js — 数据存取工具

const STORAGE_KEY = 'poop_records';
const PERIOD_KEY = 'period_days';

// 便便类型名称映射
var STOOL_TYPE_NAMES = {
  1: '棕色',
  2: '绿色',
  3: '黄色',
  4: '深色',
  5: '红色'
};

/**
 * 获取所有记录
 * @returns {Array} 所有记录，按日期+时间倒序排列
 */
function getAllRecords() {
  const records = wx.getStorageSync(STORAGE_KEY);
  if (!records || !Array.isArray(records)) {
    return [];
  }
  // 按日期倒序、时间倒序
  return records.sort(function (a, b) {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
}

/**
 * 按日期筛选记录
 * @param {string} date — 日期字符串 YYYY-MM-DD
 * @returns {Array} 该日期的记录，按时间升序
 */
function getRecordsByDate(date) {
  var all = getAllRecords();
  return all.filter(function (r) {
    return r.date === date;
  }).sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });
}

/**
 * 按月份筛选记录
 * @param {number} year — 年份
 * @param {number} month — 月份 (1-12)
 * @returns {Array} 该月份所有记录
 */
function getRecordsByMonth(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : month);
  var all = getAllRecords();
  return all.filter(function (r) {
    return r.date.indexOf(prefix) === 0;
  });
}

/**
 * 获取某月每日便便类型摘要（用于月历标记圆点）
 * @param {number} year
 * @param {number} month
 * @returns {Object} { "01": [1,3,1], "02": [2], ... } key=日期(DD)，value=便便类型数组(不去重，每条记录一个)
 */
function getDateSummary(year, month) {
  var records = getRecordsByMonth(year, month);
  var summary = {};
  records.forEach(function (r) {
    var day = r.date.slice(-2); // 取 DD 部分
    if (!summary[day]) {
      summary[day] = [];
    }
    // 每条记录对应一个点，不去重
    summary[day].push(r.stoolType);
  });
  return summary;
}

/**
 * 添加一条记录
 * @param {Object} record — 不含 id 的 Record 对象 { date, time, stoolType, note }
 * @returns {Object} 完整的 Record（含自动生成的 id）
 */
function addRecord(record) {
  var all = getAllRecords();
  var newRecord = {
    id: String(Date.now()),
    date: record.date || '',
    time: record.time || '',
    stoolType: record.stoolType || 2,
    note: record.note || ''
  };
  all.push(newRecord);
  wx.setStorageSync(STORAGE_KEY, all);
  console.log('[Storage] 添加记录：', newRecord);
  return newRecord;
}

/**
 * 按 ID 删除一条记录
 * @param {string} id
 * @returns {boolean} 是否删除成功
 */
function deleteRecord(id) {
  var all = getAllRecords();
  var index = -1;
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) {
      index = i;
      break;
    }
  }
  if (index === -1) {
    console.warn('[Storage] 未找到记录：', id);
    return false;
  }
  all.splice(index, 1);
  wx.setStorageSync(STORAGE_KEY, all);
  console.log('[Storage] 删除记录：', id);
  return true;
}

/**
 * 导出 CSV 字符串
 * @param {string} startDate — 起始日期 YYYY-MM-DD
 * @param {string} endDate — 结束日期 YYYY-MM-DD
 * @returns {string} CSV 格式字符串（UTF-8 BOM）
 */
function exportToCSV(startDate, endDate) {
  var all = getAllRecords();
  var filtered = all.filter(function (r) {
    return r.date >= startDate && r.date <= endDate;
  }).sort(function (a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  // CSV 行
  var lines = ['﻿日期,时间,便便类型,备注']; // BOM + 表头
  filtered.forEach(function (r) {
    var note = (r.note || '').replace(/"/g, '""'); // 转义引号
    var line = [
      r.date,
      r.time,
      STOOL_TYPE_NAMES[r.stoolType] || '未知',
      '"' + note + '"'
    ].join(',');
    lines.push(line);
  });

  return lines.join('\n');
}

// ====== 经期相关 ======

/**
 * 获取所有经期日期
 * @returns {Array} 日期字符串数组 ['2026-06-01', ...]
 */
function getPeriodDays() {
  var days = wx.getStorageSync(PERIOD_KEY);
  if (!days || !Array.isArray(days)) {
    return [];
  }
  return days.sort();
}

/**
 * 切换某日经期状态（有则删，无则加）
 * @param {string} date — YYYY-MM-DD
 * @returns {boolean} true=已标记为经期，false=已取消标记
 */
function togglePeriodDay(date) {
  var days = getPeriodDays();
  var index = days.indexOf(date);
  if (index > -1) {
    days.splice(index, 1);
    wx.setStorageSync(PERIOD_KEY, days);
    console.log('[Storage] 取消经期标记：', date);
    return false;
  } else {
    days.push(date);
    days.sort();
    wx.setStorageSync(PERIOD_KEY, days);
    console.log('[Storage] 标记经期：', date);
    return true;
  }
}

/**
 * 判断某日是否为经期
 * @param {string} date — YYYY-MM-DD
 * @returns {boolean}
 */
function isPeriodDay(date) {
  var days = getPeriodDays();
  return days.indexOf(date) > -1;
}

/**
 * 获取某月所有经期日期
 * @param {number} year
 * @param {number} month
 * @returns {Array} 日期字符串数组
 */
function getPeriodDaysByMonth(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : month);
  var days = getPeriodDays();
  return days.filter(function (d) {
    return d.indexOf(prefix) === 0;
  });
}

/**
 * 预测下一次经期日期
 * 算法：将 period_days 按连续性分组为周期 → 计算平均周期长度和持续天数 → 预测
 * @returns {Object|null} { predictedStart, predictedEnd, predictedDays[], avgCycleLen, avgDuration }
 *   或 null（历史周期不足 2 个时）
 */
function predictPeriod() {
  var days = getPeriodDays();
  if (days.length < 3) return null; // 至少需要 3 天数据才能形成有效周期

  // 第一步：按连续性分组 → 每个周期 = { start, end }
  var cycles = [];
  var start = days[0];
  var prev = days[0];
  for (var i = 1; i < days.length; i++) {
    var curr = days[i];
    var prevDate = new Date(prev);
    var currDate = new Date(curr);
    var diff = (currDate - prevDate) / (1000 * 60 * 60 * 24); // 相差天数
    if (diff > 2) {
      // 间隔超过 2 天 → 新周期开始
      cycles.push({ start: start, end: prev });
      start = curr;
    }
    prev = curr;
  }
  // 最后一个周期
  cycles.push({ start: start, end: prev });

  // 需要至少 2 个完整周期才能预测
  if (cycles.length < 2) return null;

  // 第二步：计算统计数据
  var cycleLengths = [];
  for (var j = 1; j < cycles.length; j++) {
    var prevStart = new Date(cycles[j - 1].start);
    var currStart = new Date(cycles[j].start);
    cycleLengths.push((currStart - prevStart) / (1000 * 60 * 60 * 24));
  }

  var durations = [];
  for (var k = 0; k < cycles.length; k++) {
    var s = new Date(cycles[k].start);
    var e = new Date(cycles[k].end);
    durations.push((e - s) / (1000 * 60 * 60 * 24) + 1);
  }

  // 取最近 6 个周期（或全部）
  var recentLengths = cycleLengths.slice(-6);
  var recentDurations = durations.slice(-6);

  var sumLen = 0, sumDur = 0;
  for (var li = 0; li < recentLengths.length; li++) sumLen += recentLengths[li];
  for (var di = 0; di < recentDurations.length; di++) sumDur += recentDurations[di];
  var avgCycleLen = Math.round(sumLen / recentLengths.length);
  var avgDuration = Math.round(sumDur / recentDurations.length);

  // 第三步：预测
  var lastCycle = cycles[cycles.length - 1];
  var lastStart = new Date(lastCycle.start);
  var predictedStart = new Date(lastStart);
  predictedStart.setDate(predictedStart.getDate() + avgCycleLen);
  var predictedEnd = new Date(predictedStart);
  predictedEnd.setDate(predictedEnd.getDate() + avgDuration - 1);

  // 生成预测日期数组
  var predictedDays = [];
  var cursor = new Date(predictedStart);
  while (cursor <= predictedEnd) {
    var y = cursor.getFullYear();
    var m = cursor.getMonth() + 1;
    var d = cursor.getDate();
    predictedDays.push(y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d));
    cursor.setDate(cursor.getDate() + 1);
  }

  var result = {
    predictedStart: predictedDays[0],
    predictedEnd: predictedDays[predictedDays.length - 1],
    predictedDays: predictedDays,
    avgCycleLen: avgCycleLen,
    avgDuration: avgDuration
  };
  console.log('[Storage] 经期预测：', JSON.stringify(result));
  return result;
}

/**
 * 导入 CSV 文本，解析并合并到本地存储
 * @param {string} csvText — CSV 文本内容（UTF-8，首行为表头）
 * @returns {{ imported: number, skipped: number }} 导入和跳过的记录数
 */
function importFromCSV(csvText) {
  // 逆向映射：中文名 → 数字值
  var nameToValue = {};
  for (var key in STOOL_TYPE_NAMES) {
    if (STOOL_TYPE_NAMES.hasOwnProperty(key)) {
      nameToValue[STOOL_TYPE_NAMES[key]] = parseInt(key);
    }
  }

  // 去除 BOM
  var text = csvText;
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  var lines = text.split('\n').filter(function (line) {
    return line.trim() !== '';
  });

  if (lines.length < 2) {
    console.warn('[Storage] CSV 内容为空或只有表头');
    return { imported: 0, skipped: 0 };
  }

  // 跳过表头
  var dataLines = lines.slice(1);
  var existing = getAllRecords();
  var imported = 0;
  var skipped = 0;

  dataLines.forEach(function (line) {
    // 简单 CSV 解析：按逗号分割（备注可能在引号内）
    var parts = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current.trim());

    var date = parts[0] || '';
    var time = parts[1] || '';
    var typeName = parts[2] || '';
    var note = (parts[3] || '').replace(/^"|"$/g, '').replace(/""/g, '"');

    var stoolType = nameToValue[typeName];
    if (!date || !time || !stoolType) {
      skipped++;
      return;
    }

    // 去重：相同日期+时间+类型不重复导入
    var isDuplicate = existing.some(function (r) {
      return r.date === date && r.time === time && r.stoolType === stoolType;
    });
    if (isDuplicate) {
      skipped++;
      return;
    }

    // 添加记录
    var newRecord = {
      id: String(Date.now() + '-' + Math.random().toString(36).slice(2, 8)),
      date: date,
      time: time,
      stoolType: stoolType,
      note: note
    };
    existing.push(newRecord);
    imported++;
  });

  if (imported > 0) {
    wx.setStorageSync(STORAGE_KEY, existing);
  }
  console.log('[Storage] 导入完成：' + imported + ' 条新增，' + skipped + ' 条跳过');
  return { imported: imported, skipped: skipped };
}

module.exports = {
  getAllRecords: getAllRecords,
  getRecordsByDate: getRecordsByDate,
  getRecordsByMonth: getRecordsByMonth,
  getDateSummary: getDateSummary,
  addRecord: addRecord,
  deleteRecord: deleteRecord,
  exportToCSV: exportToCSV,
  importFromCSV: importFromCSV,
  STOOL_TYPE_NAMES: STOOL_TYPE_NAMES,

  // 经期相关
  getPeriodDays: getPeriodDays,
  togglePeriodDay: togglePeriodDay,
  isPeriodDay: isPeriodDay,
  getPeriodDaysByMonth: getPeriodDaysByMonth,
  predictPeriod: predictPeriod
};
