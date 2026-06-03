// storage.js — PWA 数据存取（localStorage 版）
// 从小程序 wx.Storage 迁移，API 保持一致

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

// ====== 底层读写 ======
function _read(key) {
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[Storage] 读取失败:', key, e);
    return null;
  }
}

function _write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('[Storage] 写入失败:', key, e);
  }
}

// ====== 便便记录 ======

function getAllRecords() {
  var records = _read(STORAGE_KEY);
  if (!records || !Array.isArray(records)) return [];
  return records.sort(function (a, b) {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
}

function getRecordsByDate(date) {
  var all = getAllRecords();
  return all.filter(function (r) {
    return r.date === date;
  }).sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });
}

function getRecordsByMonth(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : month);
  var all = getAllRecords();
  return all.filter(function (r) {
    return r.date.indexOf(prefix) === 0;
  });
}

function getDateSummary(year, month) {
  var records = getRecordsByMonth(year, month);
  var summary = {};
  records.forEach(function (r) {
    var day = r.date.slice(-2);
    if (!summary[day]) summary[day] = [];
    if (summary[day].indexOf(r.stoolType) === -1) {
      summary[day].push(r.stoolType);
    }
  });
  return summary;
}

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
  _write(STORAGE_KEY, all);
  return newRecord;
}

function deleteRecord(id) {
  var all = getAllRecords();
  var idx = -1;
  for (var i = 0; i < all.length; i++) {
    if (all[i].id === id) { idx = i; break; }
  }
  if (idx === -1) return false;
  all.splice(idx, 1);
  _write(STORAGE_KEY, all);
  return true;
}

// ====== 经期相关 ======

function getPeriodDays() {
  var days = _read(PERIOD_KEY);
  if (!days || !Array.isArray(days)) return [];
  return days.sort();
}

function togglePeriodDay(date) {
  var days = getPeriodDays();
  var idx = days.indexOf(date);
  if (idx > -1) {
    days.splice(idx, 1);
    _write(PERIOD_KEY, days);
    return false;
  } else {
    days.push(date);
    days.sort();
    _write(PERIOD_KEY, days);
    return true;
  }
}

function isPeriodDay(date) {
  return getPeriodDays().indexOf(date) > -1;
}

function getPeriodDaysByMonth(year, month) {
  var prefix = year + '-' + (month < 10 ? '0' + month : month);
  return getPeriodDays().filter(function (d) {
    return d.indexOf(prefix) === 0;
  });
}

function predictPeriod() {
  var days = getPeriodDays();
  if (days.length < 3) return null;

  var cycles = [];
  var start = days[0];
  var prev = days[0];
  for (var i = 1; i < days.length; i++) {
    var curr = days[i];
    var prevDate = new Date(prev);
    var currDate = new Date(curr);
    var diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    if (diff > 2) {
      cycles.push({ start: start, end: prev });
      start = curr;
    }
    prev = curr;
  }
  cycles.push({ start: start, end: prev });
  if (cycles.length < 2) return null;

  var cycleLengths = [];
  for (var j = 1; j < cycles.length; j++) {
    var ps = new Date(cycles[j - 1].start);
    var cs = new Date(cycles[j].start);
    cycleLengths.push((cs - ps) / (1000 * 60 * 60 * 24));
  }
  var durations = [];
  for (var k = 0; k < cycles.length; k++) {
    var s = new Date(cycles[k].start);
    var e = new Date(cycles[k].end);
    durations.push((e - s) / (1000 * 60 * 60 * 24) + 1);
  }

  var recentLens = cycleLengths.slice(-6);
  var recentDurs = durations.slice(-6);
  var sumLen = 0, sumDur = 0;
  for (var li = 0; li < recentLens.length; li++) sumLen += recentLens[li];
  for (var di = 0; di < recentDurs.length; di++) sumDur += recentDurs[di];
  var avgCycleLen = Math.round(sumLen / recentLens.length);
  var avgDuration = Math.round(sumDur / recentDurs.length);

  var lastCycle = cycles[cycles.length - 1];
  var lastStart = new Date(lastCycle.start);
  var predictedStart = new Date(lastStart);
  predictedStart.setDate(predictedStart.getDate() + avgCycleLen);
  var predictedEnd = new Date(predictedStart);
  predictedEnd.setDate(predictedEnd.getDate() + avgDuration - 1);

  var predictedDays = [];
  var cursor = new Date(predictedStart);
  while (cursor <= predictedEnd) {
    var y = cursor.getFullYear();
    var m = cursor.getMonth() + 1;
    var d = cursor.getDate();
    predictedDays.push(y + '-' + (m < 10 ? '0' + m : m) + '-' + (d < 10 ? '0' + d : d));
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    predictedStart: predictedDays[0],
    predictedEnd: predictedDays[predictedDays.length - 1],
    predictedDays: predictedDays,
    avgCycleLen: avgCycleLen,
    avgDuration: avgDuration
  };
}

// ====== CSV 导入导出 ======

function exportToCSV(startDate, endDate) {
  var all = getAllRecords();
  var filtered = all.filter(function (r) {
    return r.date >= startDate && r.date <= endDate;
  }).sort(function (a, b) {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });

  var lines = ['﻿日期,时间,便便类型,备注'];
  filtered.forEach(function (r) {
    var note = (r.note || '').replace(/"/g, '""');
    lines.push([r.date, r.time, STOOL_TYPE_NAMES[r.stoolType] || '未知', '"' + note + '"'].join(','));
  });
  return lines.join('\n');
}

function importFromCSV(csvText) {
  var nameToValue = {};
  for (var key in STOOL_TYPE_NAMES) {
    if (STOOL_TYPE_NAMES.hasOwnProperty(key)) {
      nameToValue[STOOL_TYPE_NAMES[key]] = parseInt(key);
    }
  }

  var text = csvText;
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  var lines = text.split('\n').filter(function (l) { return l.trim() !== ''; });
  if (lines.length < 2) return { imported: 0, skipped: 0 };

  var dataLines = lines.slice(1);
  var existing = getAllRecords();
  var imported = 0, skipped = 0;

  dataLines.forEach(function (line) {
    var parts = [];
    var current = '';
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    parts.push(current.trim());

    var date = parts[0] || '';
    var time = parts[1] || '';
    var typeName = parts[2] || '';
    var note = (parts[3] || '').replace(/^"|"$/g, '').replace(/""/g, '"');
    var stoolType = nameToValue[typeName];

    if (!date || !time || !stoolType) { skipped++; return; }

    var isDup = existing.some(function (r) {
      return r.date === date && r.time === time && r.stoolType === stoolType;
    });
    if (isDup) { skipped++; return; }

    existing.push({
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      date: date, time: time, stoolType: stoolType, note: note
    });
    imported++;
  });

  if (imported > 0) _write(STORAGE_KEY, existing);
  return { imported: imported, skipped: skipped };
}

// ====== 命名空间（兼容小程序 require 调用风格） ======
var storage = {
  getAllRecords: getAllRecords,
  getRecordsByDate: getRecordsByDate,
  getRecordsByMonth: getRecordsByMonth,
  getDateSummary: getDateSummary,
  addRecord: addRecord,
  deleteRecord: deleteRecord,
  exportToCSV: exportToCSV,
  importFromCSV: importFromCSV,
  STOOL_TYPE_NAMES: STOOL_TYPE_NAMES,
  getPeriodDays: getPeriodDays,
  togglePeriodDay: togglePeriodDay,
  isPeriodDay: isPeriodDay,
  getPeriodDaysByMonth: getPeriodDaysByMonth,
  predictPeriod: predictPeriod
};
