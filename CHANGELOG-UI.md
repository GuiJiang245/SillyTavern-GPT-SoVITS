# 本次 UI / 交互改动总览

> 本补丁包主要对 GPT-SoVITS 前端的“手机来电 UI”和“对话气泡主题”进行了完全重绘，新增多种世界观手机壳、重构所有配色（参考配色网）、补充自定义图标与自定义主题功能，并修复了手机端关闭按钮无效、电脑端切换来电框架手机消失等交互问题。只需用本包内文件覆盖原插件同名文件即可生效。

## 一、整体目标

- 把原本 AI 感很重、配色割裂的来电手机 UI，改造成**多世界观可切换**的高质感界面（现代手机 / 双面镜 / 全息投影 / 传音玉简 / 水晶棱镜 / 星空深渊）。
- 在**电脑端是带外框的小手机**，手机端则是全屏沉浸，但两端都要：
  - 屏幕不“脱框”、不被裁切；
  - 按钮可点、关闭可靠；
  - 浅色/深色主题下文字始终可读。

---

## 二、主要文件变更一览

**新增文件**

- `frontend/css/frame-themes.css`
- `frontend/js/theme_manager.js`

**修改的现有文件**

- `frontend/css/mobile.css`
- `frontend/css/mobile_apps.css`
- `frontend/css/phone_call.css`
- `frontend/css/style.css`
- `frontend/js/events.js`
- `frontend/js/mobile_ui.js`
- `frontend/js/ui_dashboard.js`
- `frontend/js/ui_templates.js`
- `frontend/mobile_ui/css/auto_phone_call.css`
- `index.js`（插件根目录）

---

## 三、功能与样式改动明细

### 1. 手机壳与“世界观来电框架”

涉及：`frame-themes.css`, `theme_manager.js`, `ui_dashboard.js`, `mobile_ui.js`, `mobile.css`

- 新增独立的框架主题样式文件 `frame-themes.css`，实现多种外壳：
  - `modern`：iPhone 风格默认手机壳（现代手机）。
  - `mirror`：双面镜（哈利波特感，椭圆 + 金属雕花）。
  - `holographic`：全息投影，赛博朋克霓虹边框+扫描线。
  - `jade`：传音玉简，古风玉石边框+淡金刻纹。
  - `crystal`：水晶棱镜，改用伪元素/outline，实现彩色折射而不破坏圆角。
  - `cosmos`：星空深渊，增加固定定位、星云渐变和星点效果，解决“选了就消失”的问题。
- 统一由 `theme_manager.js` 管理框架主题；`ui_dashboard.js` 中「来电框架」下拉即时切换，并兼容 iframe 模式。

### 2. 移动端行为与关闭逻辑

涉及：`mobile_ui.js`, `frame-themes.css`, `mobile_apps.css`

- 手机端全屏模式、保留主题特效；修复“手机端点关闭没反应”：新增 `mobile-hidden` 类与 CSS 覆盖，关闭栏/导航关闭按钮增强触控与 z-index，文档级事件委托保证可点。

### 3. 主屏 App 图标与双面镜布局

涉及：`mobile.css`, `mobile_apps.css`, `mobile_ui.js`, `ui_templates.js`

- 主屏 4 个 App 使用 Pantone 系渐变与 SVG 图标；支持上传整块自定义图标；双面镜主题下图标单列竖排、居中、加大间距。

### 4. 气泡风格与配色体系

涉及：`style.css`, `phone_call.css`, `events.js`, `ui_dashboard.js`, `ui_templates.js`

- 参考配色网重新设计 12 款气泡风格配色与 Font Awesome 图标；UI 变量控制文字/描边，浅色主题可读性优化；旧日·回溯与森野·极简差异化。

### 5. 设置面板与角色绑定 UI

涉及：`ui_templates.js`, `ui_dashboard.js`, `mobile_apps.css`, `style.css`

- 自定义主题（5 个颜色选择器）保存到 localStorage；角色绑定模型选择改为内联 `.tts-custom-select`；参考语言等文本不裁切、不反色。

### 6. 来电背景上传与删除按钮

涉及：`ui_templates.js`, `theme_manager.js`, `phone_call.css`, `mobile_apps.css`

- 来电背景上传/清除、Base64 存储与预览；删除按钮图标居中（flex 居中）。

### 7. 其它

- 电脑端手机可拖动、返回主屏清理来电资源；来电/电话界面控件不出框；`index.js` 接入 ThemeManager 与 Mobile UI 初始化。
