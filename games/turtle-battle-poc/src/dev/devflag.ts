// ══════════════════════════════════════════════════════════
// devflag.ts — 单一构建 + 运行时 DEV gate (用户 2026-05-30):
//   "不分测试/正式版"。同一个 zip, 玩家默认看不到调试入口;
//   开发者访问 URL 加 `?dev=1` (写入 localStorage 持久化) → 显示全部调试入口。
// ══════════════════════════════════════════════════════════
// 解锁 / 关闭:
//   解锁: 访问 https://你的网址/?dev=1 (一次即可, 之后任何 URL 都解锁)
//   关闭: 访问 https://你的网址/?dev=0  (清掉)
//   也可控制台: localStorage.setItem('poc-dev','1') / removeItem('poc-dev')
// ══════════════════════════════════════════════════════════
// gate 哪些:
//   - 战斗顶栏 🛠 按钮 + D 键 (DebugOverlay)
//   - 主菜单 → 自定义模式 → 「测试模式」「快速单体调试」
//   - 联机模式按钮: 这俩不藏, 改成灰色「敬请期待」(单独 UI 处理, 跟 DEV 无关)
// 不 gate (用户 2026-05-30 "图鉴右上🛠先加入正式版"):
//   - 图鉴右上 🛠 (MenuDebugOverlay) — 保留正式版可见, 设龟等级/加币/重置进度等 power-user 工具。

const LS_KEY = 'poc-dev';

// 模块顶层 side-effect: 任何 scene import 本模块即触发 URL→localStorage 写入,
//   保证下面 DEV_VISIBLE 常量赋值前 localStorage 已最新。
//   (放 main.ts 的 initDevFlag 函数里太晚 — 那时 scene 的 DEV_VISIBLE 已 freeze。)
try {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('dev');
  if (v === '1') localStorage.setItem(LS_KEY, '1');
  else if (v === '0') localStorage.removeItem(LS_KEY);
} catch { /* ignore — SSR / privacy mode */ }

function readDevFlag(): boolean {
  try { return localStorage.getItem(LS_KEY) === '1'; } catch { return false; }
}

/** 是否显示调试入口 — 在每个 gate 点 import 用。
 *  注意: 模块加载时一次性读 (避免每次 cb 都查 localStorage)。改值后需刷新页面。 */
export const DEV_VISIBLE: boolean = readDevFlag();
