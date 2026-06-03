# CLAUDE.md — 便便记录助手

> **项目一句话简介**：微信小程序，用图标快速记录每日排便情况，月历直观展示，数据仅存本地。

---

## 📂 标准文档路径

本项目所有开发标准文件位于 `doc/` 目录。每次开始开发前，**必须先阅读** `doc/implementation-steps.md` 确认当前进度。

| 文档 | 路径 | 用途 |
|------|------|------|
| 需求定义 | [doc/requirements.md](doc/requirements.md) | 功能需求、用户画像、验收标准 |
| 技术规范 | [doc/technical-spec.md](doc/technical-spec.md) | 技术选型、项目结构、路由设计 |
| 设计规范 | [doc/design-spec.md](doc/design-spec.md) | 配色、字体、组件、间距 |
| 数据模型 | [doc/data-model.md](doc/data-model.md) | 数据结构、存储接口定义 |
| 执行步骤 | [doc/implementation-steps.md](doc/implementation-steps.md) | 分阶段计划、当前进度 |

---

## 🔧 工作规则（每次会话必须遵守）

### 1. 步骤驱动原则
- 每次会话开始，先读取 `doc/implementation-steps.md`，确认**当前处于哪个阶段**
- 一次只推进一个阶段，该阶段验收通过后再标记完成
- 不跳阶段、不跨阶段混做

### 2. 开发日志原则
- 每次会话结束时，必须更新 `devlog/` 当日日志（`YYYY-MM-DD.md`）
- 日志使用固定模板，记录「已完成事项」和「待办事项」
- 如果当日日志不存在，新建；如果存在，追加更新

### 3. 代码修改原则
- 修改任何代码前，先确认当前阶段目标
- 保持代码简洁，注释用中文
- 每个阶段完成后自测通过，再推进下一阶段

### 4. 核心约束（不可违反）
- 后端：**无后端**，数据仅存微信本地 Storage
- 框架：**微信小程序原生**，不引入 Taro/uni-app 等框架
- 组件库：可引入 Vant Weapp（仅限 Calendar 组件），其余用原生
- 无第三方云服务、无用户登录、无网络请求

---

## 📝 开发日志模板

`devlog/YYYY-MM-DD.md` 格式如下：

```markdown
# 开发日志 — YYYY-MM-DD

## 当前阶段
阶段 X：XXX（进行中 / 已完成）

## 今日完成
- [x] 完成事项 1
- [x] 完成事项 2

## 待办事项
- [ ] 待办 1
- [ ] 待办 2

## 遇到的问题
- 问题描述 & 解决思路（无则写"无"）

## 下次计划
- 下一步要做什么
```

---

## 🗺 项目结构总览

```
f:\拉了么\
├── CLAUDE.md                   ← 你在这里
├── README.md
├── doc/                        # 标准文档（只读参考）
├── devlog/                     # 开发日志（每日更新）
└── miniprogram/                # 小程序源码
    ├── app.js / app.json / app.wxss
    ├── utils/storage.js
    └── pages/
        ├── calendar/           # 月历页（首页 / tabBar 第1项）
        ├── record/             # 记录页（tabBar 第2项）
        └── detail/             # 日详情页（非 tabBar）
```

---

## ⚡ 快速启动

1. 打开微信开发者工具
2. 导入项目 → 选择 `f:\拉了么\miniprogram\` 目录
3. 填入 AppID（测试号即可）
4. 开始开发
