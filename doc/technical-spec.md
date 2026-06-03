# 技术规范

## 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 框架 | 微信小程序原生 | 无需额外学习成本，官方文档完善，包体积最小 |
| 语言 | JavaScript (ES5/ES6) | 微信小程序原生支持 |
| 样式 | WXSS | 小程序原生样式语言，支持 CSS 大部分特性 |
| 存储 | wx.Storage (Sync) | 同步读写，简单可靠，10MB 上限远超需求 |
| 组件库 | 无（纯原生） | 日历手写，减少依赖，保持包体积小 |
| 后端 | 无 | 纯前端，零运维成本 |

## 项目结构

```
miniprogram/
├── app.js                  # 小程序入口：注册 App，初始化全局数据
├── app.json                # 全局配置：页面路由、窗口样式、tabBar
├── app.wxss                # 全局样式：配色变量、通用 class
│
├── utils/
│   └── storage.js          # 数据存取工具模块
│
├── pages/
│   ├── calendar/           # 月历页
│   │   ├── calendar.wxml   #   模板
│   │   ├── calendar.wxss   #   样式
│   │   ├── calendar.js     #   逻辑
│   │   └── calendar.json   #   页面配置
│   │
│   ├── record/             # 记录页
│   │   ├── record.wxml
│   │   ├── record.wxss
│   │   ├── record.js
│   │   └── record.json
│   │
│   └── detail/             # 日详情页
│       ├── detail.wxml
│       ├── detail.wxss
│       ├── detail.js
│       └── detail.json
│
└── images/                 # 图标资源（如需要）
```

## 页面路由设计

| 路径 | 页面 | tabBar | 参数 |
|------|------|--------|------|
| `pages/calendar/calendar` | 月历页 | ✅ 第1项 | 无 |
| `pages/record/record` | 记录页 | ✅ 第2项 | `?date=YYYY-MM-DD`（可选，默认今天） |
| `pages/detail/detail` | 日详情页 | ❌ | `?date=YYYY-MM-DD`（必传） |

### 页面跳转逻辑

```
月历页 ──点击日期──→ 日详情页
月历页 ──点击FAB──→ 记录页(今天)
日详情页 ──添加记录──→ 记录页(该日期)
记录页 ──保存成功──→ navigateBack
日详情页 ──返回──→ navigateBack → 月历页
tabBar ──切换──→ 月历页 / 记录页(今天)
```

## 存储方案

### Storage Key 设计

| Key | 类型 | 说明 |
|-----|------|------|
| `poop_records` | Array | 所有排便记录 |

### 容量估算

- 单条记录约 100 字节
- 假设每天 2 次 × 365 天 × 10 年 ≈ 7,300 条
- 总容量约 730KB，远低于 10MB 上限

### 工具函数接口

```javascript
// utils/storage.js
function getAllRecords()           // 获取所有记录
function getRecordsByDate(date)    // 按日期筛选 (YYYY-MM-DD)
function getRecordsByMonth(year, month) // 按月份筛选
function addRecord(record)         // 添加一条记录
function deleteRecord(id)          // 按 ID 删除一条记录
function updateRecord(id, data)    // 更新一条记录（备用）
```

## 无第三方依赖

本项目不使用任何 npm 包或第三方组件库。理由：
1. 减少构建复杂性
2. 日历组件手写可完全掌控样式和行为
3. 包体积最小化
4. 对新手更友好（无需配置 npm 构建）
