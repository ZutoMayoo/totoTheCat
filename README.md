# 🐱 toto-the-cat — DeepSeek Harness 桌宠插件

[English](./README.en.md) | 中文

![npm version](https://img.shields.io/npm/v/toto-the-cat) ![npm downloads](https://img.shields.io/npm/dm/toto-the-cat) ![license](https://img.shields.io/npm/l/toto-the-cat) ![GitHub stars](https://img.shields.io/github/stars/ZutoMayoo/totoTheCat)

一只名叫**托托（Toto）**的桌宠，住在 DeepSeek Harness 的 Web 界面里。
形象完全来自 `assets/` 目录的自定义图片（透明 PNG 立绘或序列帧动画）；
没有图片资源时托托不会显示。零依赖、零构建，像皮肤一样即装即用。

![放入 assets/ 图片即可定义托托的外观；无资源时不显示]

## 截图

![](assets/screenshot.png)

## 特性

- **序列帧动画**：`idle-0.png`…连续帧默认约 4 fps 循环（240ms/帧，设置页可调），或单帧 `idle.png` 静态
- **可拖拽**：按住托托拖到屏幕任意位置，位置自动记忆（localStorage）
- **安静如猫**：托托不会说话，安静地陪着你工作
- **番茄闹钟**：点击托托出现文字入口（再点隐藏），入口旁开面板；
  专注/休息计时，完成一个专注时段获得经验（1 XP/分钟），自动进入 5 分钟休息
- **有关托托的30个事实**：与番茄闹钟并列的独立入口；每条事实含标题与
  内容，模块内只显示标题、点击展开详情；未解锁的显示「？？？」；升级时
  提醒有新事实可查看；进度由 host 持久化，跨浏览器共享
- **手动关闭**：托托右上角 × 一键隐藏（× 平时隐藏，交互后出现、空闲
  2.5 秒后自动隐藏）；隐藏后右下角**常驻唤醒药丸**
  （点击即恢复），设置页也可重新打开
- **紧凑身形**：默认画面约 180×225 px，拖拽/缩放不挡操作
- **设置页**（设置 → 托托桌宠）：显示开关、大小、动画、速度、像素渲染
- **中英文案**：跟随 DSH 语言设置自动切换
- **无障碍友好**：尊重系统「减少动态效果」偏好

## 目录结构

```
totoTheCat/
├── package.json        # 插件清单：dsh.bundle.patch + dsh.client.platform=web
├── cordis.patch.yml    # patch 层：把本包作为一行插件挂进 web profile
├── index.js            # host（Node）半边 —— assets 静态路由 + /state 进度路由
├── client.js           # browser 半边 —— 托托本体 + 番茄闹钟/等级/30个事实
├── assets/             # 外观资源 + 事实文档（发布包含）
│   ├── idle-0.png…     # 示例帧动画
│   └── 有关托托的30个事实.md
├── tools/
│   └── slice-frames.ps1 # 长图切帧工具
├── dev/                # 开发期文件（画师源图/旧版备份，不发布）
├── README.md           # 本文档
└── README.en.md
```

## DSH 插件机制（30 秒入门）

- DSH = **profile 启动器**。一个 profile 是「一叠 plugin-bundle patch 层」，
  定义在 `$DSH_HOME/profiles/<name>/package.json` 的 `dsh.profile.bundles` 里。
- **插件 = 一个普通的 npm 包**。只要它的 `package.json` 声明了
  `dsh.bundle.patch`，`dsh plugin` 安装后就会自动把它加入 profile 的层栈，
  该 patch 文件（`cordis.patch.yml`）在 profile 启动时被合成进 Cordis 配置。
- 浏览器半边靠 `dsh.client.platform: "web"` + `exports["./client"]` 声明，
  由 `dsh-client-modules` 服务加载，通过 **Slot**（如 `shell.overlay`、
  `settings.section`）把 UI 挂进界面。
- host / client 两个半边都是**纯 JS 函数体**（无 TS、无 JSX、无构建）。

> 本仓库同时也是一个完整的、可直接照抄的最小插件模板。参考实现：
> `@deepseek-ai/dsh` 的 web profile 里已装的 `cyber-particle` 插件
> （粒子背景），本插件的结构与其一致。

## 安装

### 方式一：正式安装（发布到 npm 注册表后）

```sh
dsh plugin --profile web add toto-the-cat
dsh web        # 重启 web 服务使新的 bundle 生效
```

### 方式二：开发模式（改代码即时生效）

用 `link:` 协议安装，profile 的 `node_modules` 里会放一个指向本仓库的
链接，改完代码重启 `dsh web` 即可看到新效果，无需反复重新安装：

```sh
cd D:\WORK\Project\totoTheCat
dsh plugin --profile web add link:D:\WORK\Project\totoTheCat
dsh web
```

### 方式三：本地目录安装

```sh
dsh plugin --profile web add D:\WORK\Project\totoTheCat
dsh web
```

### 卸载

```sh
dsh plugin --profile web remove toto-the-cat
dsh web
```

> 卸载**不会**删除经验进度文件 `$DSH_HOME/toto-the-cat-state.json`，
> 重新安装后进度仍在（如需彻底清除，手动删除该文件即可）。

## 配置要求

- **运行环境**：DeepSeek Harness 的 **web profile**（`dsh web`）。host 半边
  依赖 `webServer` 服务、浏览器半边依赖 `shell.overlay` / `settings.section`
  槽位，headless 等其它 profile 下本插件不生效（也不影响它们）。
- **安装后必须重启 `dsh web`**：profile 的 bundle 层在启动时合成，新增或
  更新插件后重启才生效。
- **可写目录**：经验进度写入 `$DSH_HOME/toto-the-cat-state.json`
  （`DSH_HOME` 未设置时回退 `~/.dsh`），需要该目录可写。
- **无运行时依赖**：不依赖任何 npm 包；浏览器侧只使用标准 Web API。
- **浏览器**：Chromium 内核（Chrome / Edge）实测可用；未依赖私有 API。
- **默认外观资源**：包内置 4 帧示例动画（`assets/idle-0..3.png`）；替换
  外观见[自定义外观](#自定义外观)。

## 开发循环

1. 编辑 `client.js`（浏览器侧）或 `index.js`（host 侧）；
2. 用 `node --check client.js` 做语法自检；
3. 重启 `dsh web`（或让 DSH 的 HMR 生效）观察效果。

> 提示：`dsh plugin add` 会运行 pnpm 并**自动**把包名写进
> `dsh.profile.bundles`（通过检查 `dsh.bundle` 声明），无需手动编辑
> profile 的 package.json。

## 自定义外观

托托没有内置形象——外观完全由你在 `assets/` 目录提供的图片决定：
没有图片则托托不显示（设置页会提示原因）。在 `assets/` 放入以下资源即可：

| 用途 | 文件 | 说明 |
| --- | --- | --- |
| 单帧立绘 | `assets/idle.png` | 静态显示 |
| 序列帧动画（推荐） | `assets/idle-0.png`、`idle-1.png`、… | 默认约 4 fps 循环播放（设置页可调速） |

- **格式**：PNG（带透明通道）。自动探测**只识别 `.png` 后缀文件名**，
  WebP/JPG 等不会被识别
- **画幅**：4:5（宽:高），显示容器 200×250、默认约 180×225 px；像素画
  建议按整数倍出图（360×450 / 720×900），默认开启「像素渲染」保持锐利
- **动画**：最多 16 帧，4–8 帧循环效果最佳；各帧尺寸必须一致
- **生效**：放好文件后重启 `dsh web`；删除文件则托托不再显示
  资源由 host 半边的 `/toto-the-cat/assets/*` 静态路由供给，浏览器侧启动时自动探测；探测完成前页面不会显示任何占位形象。

## 番茄闹钟与成长（入口在托托身上）

- **入口簇**：点击托托出现两个并列的文字入口「番茄闹钟」与
  「有关托托的30个事实」（再点一次隐藏）；**点击入口标题即开/关对应面板**
  （无叉号）。面板**永远出现在屏幕较空的一侧**（自动比较托托上下方剩余
  空间，托托靠上则面板在下方，靠下则在上方），并跟随托托拖动。计时中
  入口会显示「专注 24:31 / 休息 04:59」
- **计时**：专注时长 = 固定档位（5/10/15/30/45/60 分钟）+ 自定义
  （1–120 分钟，拉条或手动输入，选择自动记忆）；完成后自动进入 5 分钟
  休息，休息结束回到待机
- **经验**：完成一个专注时段获得 `工作时长（分钟）× 1` 经验；经验由
  host 半边持久化到 `$DSH_HOME/toto-the-cat-state.json`，**Chrome / Edge /
  多标签页共享同一份进度**
- **等级**：前 3 次升级（到 2/3/4 级）每级只需 10 经验——**30 分钟内即可
  解锁前三级**（两个 15 分钟专注时段）；之后每 5 级 +1 经验。
  累计：L2=10、L3=20、L4=30、L5=40、L9=81、L15=149、**L30=350**
- **节奏**：350 经验全解锁 ≈ **6 小时专注**（15/30/45/60 分钟时段均为整
  6 小时，25 分钟时段约 5 小时 50 分）
- **有关托托的30个事实**：内容从 **`assets/有关托托的30个事实.md`** 运行时
  加载解析（格式：`1. 标题: 内容`，改文档刷新即生效，无需改代码）；每条
  事实含**标题 + 内容**两个字段，模块内只显示标题列表，点击标题展开详细
  内容；未解锁的显示「？？？」（第 N 条在 L = N+1 级解锁）。
  **第 30 级同时解锁第 30 条事实与「作者后记」**。升级时屏幕下方弹出
  提示，告知解锁了哪条新事实。文档缺失/解析失败时回退占位符。

## 可调参数（设置 → 托托桌宠）

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| 显示托托 | 开 | 彻底隐藏/显示桌宠（托托右上角 × 可快速隐藏） |
| 大小 | 0.9 | 0.6–1.8 倍缩放（默认画面约 180×225 px） |
| 动画 | 开 | 关闭后渲染静态帧（也尊重系统减少动态效果） |
| 动画速度 | 240ms | 帧间隔 120–400ms，左快右慢 |
| 像素渲染 | 开 | 最近邻缩放，像素画任意尺寸都锐利；非像素图可关闭 |
| 位置 | 右下角 | 拖拽调整，设置页可一键复位 |

界面偏好与位置保存在浏览器 `localStorage`（键 `toto-the-cat:config`）；
经验进度在 host 侧（见上）。

## 扩展点

托托目前是纯前端宠物；后续想让它「感知」你的工作状态，可从这几处入手：

- **host 半边监听宿主事件**（`index.js` 注释里有事件清单）：
  `agent/status`、`subagent/start`、`subagent/end`、`goal/changed`、
  `tools/change`、`agent-preset/selected` 等；
- **Client→Host RPC**：host 用 `harness.handle(method, fn)` 注册，
  浏览器侧用 `host.call(method, args)` 调用（JSON 双向，见
  `cordis-plugin-development` skill 的「Call Host from Client」一节）；
- **更多动画/表情**：加新的序列帧（`idle-N.png`）或在 `client.js` 里增加
  状态（如 `sleeping`、`excited` 时的不同帧组）即可；
- **状态感知**：订阅宿主事件后，可切换不同的帧组（如忙碌/空闲）。

## 常见问题

- **设置了但看不到托托？** 装完必须重启 `dsh web`；确认
  `dsh web --dump-config` 里有 `toto-the-cat` 行。
- **番茄钟/经验没生效？** 经验进度路由 `/toto-the-cat/state` 由 host 半边
  注册，**新增该路由后必须重启 `dsh web`**；重启前经验只保存在 localStorage
  兜底（跨浏览器不共享）。进度文件位于 `$DSH_HOME/toto-the-cat-state.json`。
- **托托不见了？** 大概率是之前点过右上角 ×（或设置里关过「显示托托」），
  配置存在该浏览器的 localStorage 里（不同浏览器互不影响）。隐藏状态下
  右下角会有常驻的「唤醒药丸」，点击即可恢复；也可到
  设置 → 托托桌宠 → 打开「显示托托」。或在控制台执行
  `localStorage.removeItem('toto-the-cat:config')` 后刷新。
- **设置里找不到「托托桌宠」？** 检查 `settings.section` 槽位是否被其他
  插件整体替换（`Slots.listSubTree` 可查）。
- **放了图片但没换成自定义形象？** 先重启 `dsh web`，然后直接在浏览器
  访问 `http://127.0.0.1:3080/toto-the-cat/assets/idle-0.png` 自测：
  返回图片 → 正常；返回 HTML 页面 → host 半边未激活（资产路由未注册），
  检查终端里 `toto-the-cat` 插件行是否有报错。
- **想移除**：`dsh plugin --profile web remove toto-the-cat` 后重启。

## License

MIT
