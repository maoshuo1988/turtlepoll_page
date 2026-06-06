# 项目协作规则

这个文件是本项目后续开发的统一规则。之后无论新增页面、接接口、改组件还是调样式，都先遵守这里的约定。

## 项目基础

- 技术栈：Umi 4 + React 19 + TypeScript + Tailwind CSS v4。
- 包管理：使用 `yarn`，不要新增 npm/pnpm 相关配置。
- 构建验证：重要改动后必须跑 `yarn build`。
- 路径别名：使用 `@/` 指向 `src/`。
- 代码风格：保持现有函数组件、hooks、Tailwind class 的写法，不引入新的状态管理库或 UI 框架。

## 目录边界

- 页面入口放在 `src/pages/<route>/index.tsx`。
- `src/pages/<route>/index.tsx` 可以放页面级业务逻辑，例如取数、状态、登录校验、事件回调、接口编排和参数组装。
- `src/pages/<route>/index.tsx` 不直接堆完整页面 UI；复杂展示、区块、弹框、列表项必须拆到该页面的 `components/`。
- 每个页面必须有对应的页面文件夹：`src/pages/<route>/`。
- 页面专属组件优先放在该页面文件夹下，例如 `src/pages/<route>/components/<Xxx>.tsx`、`src/pages/<route>/components/<XxxSection>.tsx`、`src/pages/<route>/components/<XxxModal>.tsx`。
- 页面主体展示组件可以放在 `src/pages/<route>/components/<RoutePage>.tsx`；`src/pages/<route>/index.tsx` 负责页面级业务逻辑和渲染组装。
- 页面级业务 UI 必须归属当前 page：`src/pages/<route>/components/` 里不能只做一层薄封装然后继续引用 `src/components/common/<module>/<Page>`。
- 如果一个组件只服务某一个页面，即使体量很大，也先放在该页面 `components/` 下；不要放到 `common`。
- `common` 只允许放真正跨两个以上页面复用的基础业务组件、布局组件或工具型组件；页面自己的弹框、列表项、区块、页面主体都放回对应 page。
- 页面组件可以引用 hooks、types、api、utils、data 等非 UI 基础能力；但页面 UI 组件之间优先本页面相对路径引用。
- 复杂页面优先按端拆分：`<Xxx>Desktop.tsx` / `<Xxx>Mobile.tsx`，或 `components/desktop/` / `components/mobile/`；拆分后由页面级组件按响应式 class 或设备判断组合。
- 页面专属的数据映射、常量、类型可以放在 `src/pages/<route>/components/` 或 `src/pages/<route>/model.ts` / `types.ts`，但不要散落到无关目录。
- 单个源码文件必须控制在 2000 行以内，包括 `.ts`、`.tsx`、`.css`、`.scss`。接近或超过 2000 行时必须按功能拆分到同级子组件、hooks、types、data、style 分片或专属目录中。
- 拆分大文件时优先按业务功能边界拆：主容器保留状态编排和数据流，展示区块拆组件，数据映射拆 `model.ts` / `types.ts` / `data.ts`，长 CSS 按页面区块或效果拆成多个同级样式文件并由入口样式文件按顺序引入。
- 拆分不能改变页面逻辑、接口 payload、路由和用户可见交互；拆分后必须修正 import，并通过 `yarn build` 验证。
- `src/components/` 顶层只允许三类目录：`pc/`、`mobile/`、`common/`。
- `src/components/pc/` 放 PC 专属组件；`src/components/mobile/` 放移动端专属组件；PC 和移动端都会使用的组件放 `src/components/common/`。
- `src/components/common/<module>/` 只用于真正跨页面复用的业务组件、基础能力组件或工具型展示组件。
- `src/components` 下不要再新增 `shared/`、`header/`、`footer/`、`layout/` 这类顶层目录；对应内容分别放入 `common/`、`pc/` 或 `mobile/`。
- `src/components` 下不要再新增 `ui/` 分层；功能组件直接放在对应功能目录中，例如 `src/components/common/pet/PetChat.tsx`。
- `src/components` 下不要新增桶导出 `index.ts` / `index.tsx`；调用方必须直接 import 到具体文件，例如 `@/components/common/pet/PetChat`。
- 组件文件夹里的 `index.tsx` 只允许用于“同名组件文件夹 + index.module.scss”的组件本体，不允许作为统一导出口。
- 页面内复杂区块必须继续拆成 `src/pages/<route>/components/` 下的独立组件文件，避免单文件过大。
- 路由必须同步维护 `.umirc.ts`。新增页面后，不允许只建页面不加 route。
- 共享业务 UI 只有在确认跨页面复用时才放在 `src/components/common/<module>/`；页面专属 UI 必须放在 `src/pages/<route>/components/`。
- TSX 需要配套 `index.module.scss` 时，必须以当前 TSX 文件名新建同名文件夹，把原 TSX 改为该文件夹下的 `index.tsx`，并把样式放在同级 `index.module.scss`，例如 `Foo.tsx` 迁移为 `Foo/index.tsx` 和 `Foo/index.module.scss`。
- Tailwind CSS 和 CSS Module 可以同时使用：布局、间距、响应式优先保留 Tailwind class；复杂动画、长样式、伪元素、局部主题样式放到 `index.module.scss`。
- CSS Module 里组件自己的 class 必须通过 `styles.xxx`、`styles['xxx']` 或组件内 `css(...)` 映射使用，不要把组件 class 写成大范围 `:global`。
- `:global` 只用于真正的全局根选择器、浏览器/第三方选择器或主题根节点，例如 `html.dark`；不要用 `:global` 绕开 CSS Module。
- 如果 CSS Module 的 `@keyframes` 在 TSX inline `style.animation` 中使用，TSX 必须通过模块导出的动画名映射，例如 `styles['foo-spin'] ?? 'foo-spin'`，避免动画名 hash 后失效。
- `src/index.css` 只允许放全局配置：Tailwind 入口、全局主题变量、基础 `html/body/#root`、滚动条、全局字体、全局 reduced-motion 等。页面壳、卡片、按钮、导航、布局、业务组件样式必须迁到对应组件的 `index.module.scss` 或直接用 Tailwind。
- PC 左侧栏和布局相关内容放在 `src/components/pc/layout/`。
- PC 顶栏放在 `src/components/pc/header/`；PC 底栏如存在放在 `src/components/pc/footer/`。
- 移动端顶栏放在 `src/components/mobile/header/`；移动端底栏放在 `src/components/mobile/footer/`。
- 顶层布局放在 `src/layouts/`，页面壳组件放在 `src/layouts/components/`。
- 接口请求统一放在 `src/hooks/use*Requests.ts`。
- 接口类型统一放在 `src/hooks/*Types.ts`。
- 静态 mock 或本地映射数据放在 `src/data/` 或对应模块的独立数据文件，避免散落在页面组件里。

## 页面新增规则

- 新增一级页面时必须同时处理三处：
  - `.umirc.ts` routes。
  - `src/pages/<route>/index.tsx` 页面入口。
  - 左侧导航 `src/components/pc/layout/SidebarMainPanels.tsx` 的 `NAV_ITEMS` 和 `ViewType`。
- 新增页面必须创建对应的页面展示组件文件，优先为 `src/pages/<route>/components/<RoutePage>.tsx`；`index.tsx` 可以保留页面级业务逻辑，但不能承载大块 UI。
- 页面组件命名使用业务名 + `Page`，例如 `WorldCupPage`、`RivalryPage`。
- 同一页面的子组件、弹框、列表项、数据映射应封装在 `src/pages/<route>/components/` 或页面同级 `model.ts` / `types.ts` 下，方便一起维护。
- 页面组件不能从 `src/components/common/<module>/` 引用该页面主体或页面专属区块；需要用到就迁回当前页面目录。
- 不要为了满足拆分规则把页面专属组件硬塞进 `common`；`common` 只放确认会复用的组件。
- 页面组件和子组件的 props 必须定义明确类型：使用 `interface XxxProps` 或 `type XxxProps`，不要在参数里写大型内联类型。
- props 命名必须表达业务含义；回调统一用 `onXxx`，布尔值统一用 `is/has/can/should` 前缀。
- 单个组件参数过多时，要拆组件或合并成明确的领域对象，不能无限往一个组件上传散参数。
- `index.tsx` 或页面级组件负责取数、状态和动作编排；展示型子组件只接收清晰 props，不直接重复请求接口。
- 新增 `.tsx` 文件顶部必须写简短注释，说明这个文件是干什么的，格式优先使用：`/** 文件说明：xxx。 */`。
- 组件内只在复杂逻辑前写必要注释，不写无意义注释。
- 如果页面要在主布局中展示，优先接入 `src/layouts/home.tsx` 现有视图切换逻辑。
- 空页面不可交付。至少要有加载、空态、错误态或基础展示。

## 接口接入规则

- 不在 UI 组件里直接写 `fetch` / `axios`。
- 新接口先定义类型，再封装请求 hook。
- 请求 hook 命名使用现有风格：`useRequestXxx`、`useMutateXxx` 或项目已有同类命名。
- 接口返回要做兼容归一化，尤其是列表字段、分页字段、历史字段，避免页面直接猜后端结构。
- 需要登录的操作必须先检查登录态；未登录走现有登录弹框入口，不静默失败。
- 提交类操作要有 loading / disabled / 错误提示，不能点击后直接无反馈。

## 弹框和交互规则

- 下注、确认、引导、登录这类关键流程必须通过弹框确认，不要按钮点击后直接调用接口。
- 已存在的弹框逻辑优先复用，不要随便重写一套相似弹框。
- 浮动按钮迁移时，只迁移入口位置，弹框内容和原组件应保持复用。
- 弹框需要支持点击遮罩关闭或明确关闭按钮，且不应遮挡核心操作状态。

## 左侧栏规则

- 左侧栏导航入口统一维护在 `SidebarMainPanels.tsx`。
- 导航列表只放主页面入口；辅助入口如新手引导、宠物空间、聊天，应放在对应业务卡片区域。
- “和龟仙人聊聊”只打开 `PetChat`。
- “新手引导”只打开 `GuideTourModal`。
- 不要把不同入口复用同一个 `onOpenChat` / `onOpenGuide` 回调造成语义混乱。

## 设计规则

- UI 设计必须遵守根目录 `DESIGN.md`。
- 涉及页面、组件、弹框、表单、表格、导航、响应式或视觉风格的改动，优先使用 `ui-designer` skill。
- 整体视觉以项目现有暗色、emerald、少量 amber 强调为主。
- 按钮颜色和状态必须适配当前项目风格，不使用突兀的大面积新色系。
- 卡片圆角、边框、阴影沿用现有组件尺度。
- 不做营销落地页式大 hero，后台/工具页面优先信息密度和操作效率。
- 页面文案要短、直接、符合当前产品语气。
- PC 和手机端都要考虑，不能只改 PC，也不能把 PC 布局直接压缩到手机。
- **手机端布局**：与 PC 不一致时优先**拆分实现**（例如 `<Xxx>Mobile.tsx` / `components/mobile/`、或并列两套 DOM 用 `lg:hidden` 与 `hidden lg:block` 分隔），避免单靠大量响应式前缀堆在同一结构上。
- **PC 端优先稳定**：改手机布局时以**不改动 PC 端既有视觉效果与交互**为前提；需要新样式时优先加在手机专属分支，不动或少动 PC 共用样式。
- 亮色和暗色都要考虑；新增组件必须有可读的 `dark:` 对应样式，除非该区域明确只有单主题。
- PC 端优先信息扫描、对比和重复操作；手机端优先单列、触摸目标、无横向滚动。
- 弹框在 PC 端优先居中，手机端可使用底部 sheet，并处理 safe area。

## PC 端规则

- PC 端布局以 `lg` / `VP_LAYOUT_DESKTOP_MIN_PX` 为准，即 1024px 及以上进入 PC 壳；不要和 768 内容断点混用。
- PC 顶栏统一使用 `src/components/pc/header/PcHeader.tsx`，左侧栏统一使用 `src/components/pc/layout/`，不要在页面里重复造顶栏、侧栏或全局壳。
- 主页面仍由 `AppPageLayout` / `StandalonePageShell` 承接 header、sidebar、content 滚动区和基础间距；普通页面不要额外包一层全局容器。
- 页面根节点优先保持 `section` + `view-<route>` + `w-full` + `min-h-full` + `gap-4 max-lg:gap-3` 的现有结构。
- PC 主内容可以使用多列、表格、行式列表和信息密度更高的布局，但必须保持可扫描，不允许无限拉宽正文或把移动端单列直接撑满大屏。
- PC 端结构优先用 `grid` / `flex` / `gap` 管理，常见分叉使用 `lg:grid-cols-*`、`xl:grid-cols-*`、`2xl:grid-cols-*`。
- 列表、排行榜、记录类内容在 PC 端可以展示更多字段，操作区优先靠右，关键数字用 emerald / amber 少量强调。
- PC 左侧栏导航只放主页面入口；辅助入口如新手引导、宠物聊天、快捷购买、个人动作放在顶栏、业务卡片或抽屉区域。
- 新增一级页面必须同步维护 `.umirc.ts`、`src/layouts/home.tsx` 的路由视图映射、`SidebarMainPanels.tsx` 的 `NAV_ITEMS` 和 `ViewType`。
- PC 弹框优先居中，宽度克制，常用 420 / 520 / 640；复杂列表弹框可以更宽，但必须限制最大高度并内部滚动。
- PC hover 只能作为增强反馈，关键操作不能依赖 hover 才可见或可用。
- PC 视觉必须延续项目现有近黑背景、低透明边框、轻阴影、emerald 主 CTA、少量 amber 奖励色，不引入突兀的大面积新色系。
- PC 卡片圆角、边框、阴影沿用已有页面尺度；不要做卡片套卡片或每个小信息都做浮夸卡片。
- PC 复杂视觉舞台、Spine、Hero、动画层的尺寸、偏移和 `z-index` 必须集中放在 `src/config/*` 或页面 `model.ts` / `types.ts`，不要在 TSX 里堆长串魔法数字。
- PC 复杂样式写 CSS Module，并按规则 `@import` `viewport.scss`，使用 `vp-desktop()` 或 `vpDesktopClampPx()` 做视口适配。
- 改 PC 时必须确认手机端没有被共用样式挤坏；涉及布局、弹框、导航、舞台时至少检查一版窄屏。

## 手机端规则

- 手机内容适配以 768px 为准，使用 `useMedia768()`、`vp-mobile()`、`vpMobileClampPx()`；1024px 的 `lg` 只用于布局壳和侧栏分叉。
- 手机布局不能直接压缩 PC 结构；信息结构不一致时必须拆实现，例如 `<Xxx>Mobile.tsx`、`components/mobile/`、`lg:hidden` / `hidden lg:block`、`ViewportMobileOnly` / `ViewportDesktopOnly`。
- 手机顶栏统一使用 `src/components/mobile/header/MobileHeader.tsx`，底栏统一使用 `src/components/mobile/footer/MobileFooter.tsx`，不要在页面里重复实现全局手机导航。
- 手机主导航使用底部 Tab；抽屉只放补充入口，如宠物、黑市、个人主页、登录退出等。
- 手机页面优先单列、触摸优先、无横向滚动；横向滑动只允许用于明确的卡片轨道，并要隐藏滚动条、保留触摸滚动体验。
- 手机左右 padding 推荐 12 / 16，页面间距通常用 `gap-3`，不要照搬 PC 的大间距和多列密度。
- 手机触摸目标至少接近 40px，关键操作按钮推荐 44 / 48px 高，并使用 `touch-manipulation` 或明确的 active 状态。
- 手机长标题、用户名、市场标题、按钮文案必须换行、截断或重排，不能挤压按钮，也不能和相邻内容重叠。
- 表格、排行榜、记录类内容在手机端必须改成卡片列表、摘要行或分段信息，不允许强塞完整 PC 表格。
- 手机弹框优先底部 sheet 或窄屏友好的居中弹框，底部按钮必须处理 `env(safe-area-inset-bottom)`。
- 手机 Header / Drawer / Footer 等 fixed 区域必须考虑 safe area，不能遮挡页面核心操作；底部 Tab 显示时内容区要预留底部 padding。
- 手机复杂视觉页必须单独校准舞台高度、层级和按钮位置；Spine、游戏、抽奖类元素必须明确背景层、角色层、特效层、按钮层的 `z-index`。
- 手机换图、换 DOM、游戏模式切换可以用 `useMedia768()`；单纯间距、字号、圆角优先放 CSS / SCSS，不要在 TSX 里堆响应式魔法数字。
- 手机 CSS Module 使用 `vp-mobile()`；禁止在 `src/index.css` 里引入 `.scss`。
- 只改手机布局时，以不改变 PC 端既有视觉和交互为前提；优先加手机专属分支或手机专属样式，不随意改 PC 共用样式。
- 手机端自检必须覆盖：无横向滚动、无文字重叠、按钮可点、弹框不挡底部操作、亮暗色都可读。

## 视口适配规则（布局必用）

页面、弹框、全屏舞台等**凡涉及尺寸与定位**，必须走项目视口适配体系（参考 Tian-Website 1920/375 双稿思路，与本项目 Tailwind + 布局壳融合）。细则见 `.cursor/rules/viewport-layout.mdc`。

- **768px（内容）**：`@/utils/viewport`、`src/styles/viewport.scss` 的 `vp-desktop()` / `vp-mobile()`；需换图/换结构时用 `useMedia768()`。
- **1024px（布局）**：侧栏与 PC 壳用 `lg:` / `VP_LAYOUT_DESKTOP_MIN_PX`，不与 768 混为一谈。
- **尺寸写法**：优先 `clamp`、`dvh`、`vpDesktopClampPx` / `vpMobileClampPx`；舞台/Spine/抽奖等尺寸集中在 `src/config/*` 或页面 `model.ts`（如 `shopSpineAssets.ts`），禁止在 TSX 里堆一长串魔法数字。
- **样式入口**：`index.css` 只引入 `viewport-global.css`；Sass 写在各组件 `index.module.scss` 并 `@import` `viewport.scss`（须带 `.scss` 后缀）。**禁止**在 `index.css` 里 `@import` 其它 `.scss`。
- **页面结构**：不强制给每个 `PageView` 包统一容器；适配由 `AppPageLayout`、模块常量与 SCSS 完成，页面保持现有 `section` + `view-xxx` 即可。
- **叠层**：多角色/特效/按钮同时存在时（如黑市开蛋），须约定 `z-index`（蛋舞台低于两侧法师等），避免放大后遮挡。
- **改手机不动 PC**：手机专属样式/组件分支实现；共用组件改尺寸时先确认 PC 视觉效果不变。
- **示例**：`docs/viewport-layout-example.md`；可参考组件 `src/components/common/layout/ViewportLayoutExample/`（未接入路由）。

## 宠物和能力规则

- 龟种能力展示以当前装备龟为准。
- 龟种 ID、名称、稀有度、能力描述应集中维护，避免多处硬编码。
- 装备、切换、抽取等操作必须走现有 pet request hook。
- 涉及龟币、体力、等级加成时，展示文案要和后端/规则表一致。

## 开撕台和下注规则

- 开撕台接口统一走 `usePkRequests.ts` 和 `pkTypes.ts`。
- 历史战绩、赛季记录、当前赛季对局记录要按接口字段归一化后展示。
- 下注必须弹框确认，参考暗盘下注体验。
- 下注 payload 必须包含后端需要的 `topicId`、`side`、`requestId`，金额字段按接口要求传。
- 下注成功后要刷新相关 topic / history / balance 缓存。

## 验证规则

- TypeScript 报错必须修复，不留未使用 import、未使用 props。
- 功能改动后至少跑 `yarn build`。
- 如果因为环境问题无法验证，要在交付说明里明确说明。
- 不要提交 `dist/` 构建产物作为源码改动，除非用户明确要求。

## Git 和改动边界

- 不要回滚用户已有改动。
- 不做和当前需求无关的大重构。
- 修改已有文件前先看上下文，沿用现有结构。
- 新增抽象必须有实际复用价值，不为了一次性需求过度封装。
