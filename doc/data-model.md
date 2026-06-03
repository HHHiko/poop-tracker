# 数据模型

## 核心数据结构

### Record（排便记录）

```javascript
{
  id: "1717300000000",        // String — 唯一标识，使用 Date.now() 生成的时间戳
  date: "2026-06-02",         // String — 日期，格式 YYYY-MM-DD
  time: "08:30",              // String — 时间，格式 HH:MM（24小时制）
  stoolType: 2,               // Number — 便便类型：1=偏硬, 2=正常, 3=偏软, 4=腹泻
  note: "早上吃的辣火锅"       // String — 备注（可选，无备注时为空字符串 ""）
}
```

### 便便类型枚举（按便便本身颜色）

| 值 | 颜色 | Emoji | 卡片色 |
|----|------|-------|--------|
| 1 | 棕色 | 🟤 | `#A1887F` |
| 2 | 绿色 | 🟢 | `#81C784` |
| 3 | 黄色 | 🟡 | `#FFD54F` |
| 4 | 深色 | ⚫ | `#6D4C41` |
| 5 | 红色 | 🔴 | `#EF5350` |

---

## Storage 设计

| Key | 数据类型 | 说明 |
|-----|---------|------|
| `poop_records` | `Array<Record>` | 所有排便记录，按时间倒序排列 |
| `period_days` | `Array<string>` | 经期日期列表，格式 `["2026-06-01", "2026-06-02", ...]` |

### 读取示例

```javascript
const records = wx.getStorageSync('poop_records') || [];
```

### 写入示例

```javascript
wx.setStorageSync('poop_records', records);
```

---

## 工具函数接口 (utils/storage.js)

### `getAllRecords()`
- 返回：`Array<Record>` — 所有记录，按日期+时间倒序
- 实现：直接从 Storage 读取并返回

### `getRecordsByDate(date: string)`
- 参数：`date` — 日期字符串 `YYYY-MM-DD`
- 返回：`Array<Record>` — 该日期的所有记录，按时间升序
- 实现：`getAllRecords().filter(r => r.date === date)`

### `getRecordsByMonth(year: number, month: number)`
- 参数：`year` — 年份，`month` — 月份 (1-12)
- 返回：`Array<Record>` — 该月所有记录
- 实现：按 `YYYY-MM` 前缀过滤

### `getDateSummary(year: number, month: number)`
- 参数：`year`, `month`
- 返回：`Object` — `{ "01": [1,2], "02": [4], ... }` key 为日期(DD)，value 为该日便便类型数组（去重）
- 用途：月历页绘制标记小圆点

### `addRecord(record: object)`
- 参数：不含 `id` 的 Record 对象
- 返回：完整的 Record（含自动生成的 id）
- 实现：生成 id → 插入数组 → 写回 Storage

### `deleteRecord(id: string)`
- 参数：`id`
- 返回：`boolean` — 是否删除成功
- 实现：按 id 查找并删除 → 写回 Storage

### `exportToCSV(startDate: string, endDate: string)`
- 参数：`startDate`, `endDate` — 日期范围 `YYYY-MM-DD`
- 返回：CSV 格式字符串（BOM + 表头 + 数据行）
- 实现：筛选范围内的记录 → 拼接 CSV 字符串

### `getPeriodDays()`
- 返回：`Array<string>` — 所有经期日期，升序排列

### `togglePeriodDay(date: string)`
- 参数：`date` — 日期字符串 `YYYY-MM-DD`
- 返回：`boolean` — `true`=已标记为经期，`false`=已取消标记
- 实现：若 date 已存在则删除，否则添加

### `isPeriodDay(date: string)`
- 参数：`date`
- 返回：`boolean` — 该日是否为经期

### `getPeriodDaysByMonth(year: number, month: number)`
- 参数：`year`, `month`
- 返回：`Array<string>` — 该月所有经期日期
- 用途：月历页显示经期标记

---

## CSV 导出格式

```
日期,时间,便便类型,备注
2026-06-02,08:30,正常,早上喝了酸奶
2026-06-02,18:30,偏软,
```

- 编码：UTF-8 with BOM（确保 Excel 正确识别中文）
- 分隔符：逗号
- 文件名：`便便记录_2026-01-01_2026-06-02.csv`

---

## 数据示例

```javascript
// Storage 中 poop_records 的实际存储示例
[
  {
    id: "1717315200000",
    date: "2026-06-02",
    time: "18:30",
    stoolType: 3,
    note: ""
  },
  {
    id: "1717290000000",
    date: "2026-06-02",
    time: "08:30",
    stoolType: 2,
    note: "早上喝了酸奶"
  },
  {
    id: "1717203600000",
    date: "2026-06-01",
    time: "09:15",
    stoolType: 4,
    note: "拉肚子了"
  }
]
```
