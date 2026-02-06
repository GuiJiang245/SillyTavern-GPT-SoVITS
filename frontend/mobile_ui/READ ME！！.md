### README：本次 UI / 交互改动总览

> 本补丁包主要对 GPT-SoVITS 前端的“手机来电 UI”和“对话气泡主题”进行了完全重绘，新增多种世界观手机壳、重构所有配色（参考配色网）、补充自定义图标与自定义主题功能，并修复了手机端关闭按钮无效、电脑端切换来电框架手机消失等交互问题。只需用本包内文件覆盖原插件同名文件即可生效。

#### 一、整体目标

- 把原本 AI 感很重、配色割裂的来电手机 UI，改造成**多世界观可切换**的高质感界面（现代手机 / 双面镜 / 全息投影 / 传音玉简 / 水晶棱镜 / 星空深渊）。
- 在**电脑端是带外框的小手机**，手机端则是全屏沉浸，但两端都要：
  - 屏幕不“脱框”、不被裁切；
  - 按钮可点、关闭可靠；
  - 浅色/深色主题下文字始终可读。

---

### 二、主要文件变更一览

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

### 三、功能与样式改动明细

#### 1. 手机壳与“世界观来电框架”

涉及：`frame-themes.css`, `theme_manager.js`, `ui_dashboard.js`, `mobile_ui.js`, `mobile.css`

- 新增独立的框架主题样式文件 `frame-themes.css`，实现多种外壳：
  - `modern`：iPhone 风格默认手机壳（现代手机）。
  - `mirror`：双面镜（哈利波特感，椭圆 + 金属雕花）。
  - `holographic`：全息投影，赛博朋克霓虹边框+扫描线。
  - `jade`：传音玉简，古风玉石边框+淡金刻纹。
  - `crystal`：水晶棱镜，改用伪元素/outline，实现彩色折射而不破坏圆角。
  - `cosmos`：星空深渊，增加固定定位、星云渐变和星点效果，解决“选了就消失”的问题。
- 统一由 `theme_manager.js` 管理框架主题：
  - `applyFrameTheme(themeName)` 将 `data-frame-theme` 设置到**正确的 Document**（支持设置面板在 iframe 情况），并写入 `localStorage('tts_frame_theme')`。
  - 页面初始化时从本地加载框架主题和自定义背景。
- 在 `ui_dashboard.js` 中：
  - 「来电框架」下拉改用自定义 `.tts-custom-select`，点击后：
    - 更新下拉 UI；
    - 写入 `localStorage`；
    - 通过 `TTS_ThemeManager.applyFrameTheme` 和直接操作 DOM，使电脑端手机壳**即时切换**。
  - 兼容 iframe 模式：若当前文档找不到 `#tts-mobile-root`，自动从 `window.parent.document` 中查找。

#### 2. 移动端行为与关闭逻辑

涉及：`mobile_ui.js`, `frame-themes.css`, `mobile_apps.css`

- 手机端改为**全屏模式**但保留主题效果：
  - 在 `frame-themes.css` 的 `@media (max-width: 768px)` 中：
    - 让所有 `data-frame-theme` 的手机壳全屏铺满（不再缩在右下角）。
    - 仅隐藏外壳伪元素（雕花、棱镜外轮廓），保留屏幕内的扫描线/仙气等特效。
- 修复“手机端点关闭没反应”的问题：
  - 新增 `#tts-mobile-root.mobile-hidden` 规则，`display:none !important` + `visibility:hidden` + `opacity:0`，优先级盖过原有 `display:block !important`。
  - `closePhone()`：
    - 手机端：给 `#tts-mobile-root` 加 `mobile-hidden` 类并用 `style.setProperty(..., 'important')` 真正隐藏。
    - 桌面端：继续使用 `.minimized` + `scale(0)` 动画。
  - `openPhone()`：
    - 移除 `mobile-hidden` 和相关行内样式，再显示手机壳。
- 关闭入口统一、可点：
  - 首页顶部「✕ 关闭」栏（`.mobile-home-close-bar` + `.home-close-btn`）：
    - 增大触控区域（至少 44px）、提高 `z-index`，确保不被内容遮盖。
  - 应用内导航右侧 `✕`（`.nav-close-btn`）同样增强。
  - 在 `mobile_ui.js` 里增加**文档级事件委托**：
    - 监听 `#tts-mobile-root .home-close-btn, .nav-close-btn` 的 `click/touch`，统一调 `closePhone()`，保证各种嵌套场景都能关。

#### 3. 主屏 App 图标与双面镜布局

涉及：`mobile.css`, `mobile_apps.css`, `mobile_ui.js`, `ui_templates.js`

- 主屏 App 注册改版（`mobile_ui.js`）：
  - 为 4 个主 App 定义更“高级”的 SVG 图标，并参考 Pantone 年度色 做渐变底色：
    - 来电：Very Peri / 长春花蓝。
    - 系统设置：Classic Blue / 经典蓝。
    - 收藏夹：Viva Magenta / 非凡洋红。
    - 对话追踪：Mocha Mousse / 摩卡慕斯。
- **自定义图标整块替换**：
  - 在设置面板「视觉体验」中新增「App 图标」区域（`ui_templates.js`）：
    - 来电 / 系统设置 / 收藏夹 / 对话追踪 各自上传、预览、清除。
    - Base64 存 `localStorage('tts_custom_app_icons')` 或 `TTS_ThemeManager`。
  - `mobile_ui.js` 的 `renderHomeScreen()`：
    - 若存在自定义图，用 `<img class="app-icon-custom">` 覆盖整个 `.app-icon`，背景透明，高光伪元素隐藏，实现**整个格子替换**，而不仅仅是内部符号。
- `mobile.css` 中 `.app-icon` / `.app-icon-custom`：
  - `.app-icon-custom` 100% 宽高 + `object-fit: cover`，铺满整个圆角方块。
  - `.app-icon.app-icon-is-custom` 去掉默认高光，保留阴影。
- 双面镜下的主屏网格（`frame-themes.css`）：
  - 在 `data-frame-theme='mirror'` 时：
    - `app-grid` 改为 **单列竖排**，增加 `gap` 和 `padding`，并通过 `max-width + margin:0 auto` 居中。
    - 解决原来双面镜椭圆裁切导致图标挤在一块、不在中心的问题。

#### 4. 气泡风格与配色体系

涉及：`style.css`, `phone_call.css`, `events.js`, `ui_dashboard.js`, `ui_templates.js`

- 参考：
  - Pantone 年度色
  - 色系配色
  - 题材配色
  - 名画配色
- 重新为所有气泡风格设计配色与图标（Font Awesome）：
  - `default` 森野·极简：柔和偏绿自然色系。
  - `classic` 旧日·回溯：更明显的旧纸 / 棕褐色调、双线框、噪点纹理、衬线体字体，和默认拉开差距。
  - 其他风格（赛博、琉璃、墨、蒸汽等）都按名字对应的画派 / 色系重新抽色，避免“AI 胡乱撞色”。
- 气泡 / 面板文字与状态栏字体颜色：
  - 统一通过 UI 变量控制：`--ui-text-primary`, `--ui-text-stroke`, `--s-load-bg` 等。
  - 浅色背景下自动用较深文字 + 细描边（text-shadow 模拟），避免“为对比度硬上黑色”这种违和感。
  - `events.js` / `style.css` 中增加对不同气泡风格下文字、边框、背景的联动。

#### 5. 设置面板与角色绑定 UI

涉及：`ui_templates.js`, `ui_dashboard.js`, `mobile_apps.css`, `style.css`

- 自定义主题：
  - 在「视觉体验」卡片下新增「自定义主题」子卡片：
    - 5 个颜色选择器：背景 / 文字 / 强调色 / 输入框背景 / 输入框文字。
    - `ui_dashboard.js` 负责读取/写入 `localStorage('tts_custom_theme')`，并在选择「自定义」气泡风格时应用到 CSS 变量。
- 角色绑定：
  - 原生 `<select>` 替换为与气泡风格同款 `.tts-custom-select`：
    - 模型选项在卡片内部弹出，不再使用浏览器原生下拉。
    - 角色名、模型下拉文本同样使用 UI 文字变量，浅色主题下可读性更好。
- 参考语言 / 其它文本：
  - 调整字体颜色、行高与截断规则，确保「Chinese / Japanese / English」等在各种背景下不会被裁切或看不清。

#### 6. 来电背景上传与删除按钮

涉及：`ui_templates.js`, `theme_manager.js`, `phone_call.css`, `mobile_apps.css`

- 来电背景上传：
  - 设置面板中：
    - 「📷 上传」触发隐藏的 `<input type="file">`，限制大小（例如 2MB 内）。
    - 读取为 Base64，调用 `TTS_ThemeManager.applyCustomBackground` 或写入 `localStorage('tts_call_custom_bg')`。
    - 预览区显示缩略图。
  - `theme_manager.js`：
    - 将背景图应用到来电 / 通话容器和 `.mobile-screen`，并通过 CSS 变量 `--custom-call-bg` 暴露。
- 删除按钮居中：
  - `#tts-bg-clear-btn` 改成 `display:flex; align-items:center; justify-content:center;`，图标在按钮中央。

#### 7. 其它小修小补

- `mobile_ui.js`：
  - 初始化时修正悬浮球位置、拖拽逻辑，保证电脑端可以拖动小手机，不影响内部点击。
  - 打开 App 时统一走 `TTS_Mobile.openApp`，回到主屏自动清理来电音频资源。
- `auto_phone_call.css` / `phone_call.css`：
  - 调整来电界面内表单控件高度、边距，使其在手机壳里不出框。
- `index.js`：
  - 接入新增的 ThemeManager / Mobile UI 初始化，保证插件加载时自动注入手机 UI 与主题管理。