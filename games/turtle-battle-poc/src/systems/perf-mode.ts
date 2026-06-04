// ══════════════════════════════════════════════════════════
// perf-mode.ts — 低画质/性能模式 (PERF-PLAN P0: blur 降级)
//
// 战斗中多个半透明浮层各带 backdrop-filter: blur(4–8px), 全屏后期模糊在弱机/移动端
// 开销极大且叠加 (掉帧主因之一)。开「低画质」时给 <html> 加 .perf-lite, 一条全局规则
// 关掉所有 backdrop-filter (面板退化为纯半透明实色, 可读但不花哨)。
//
// 默认: 移动端(pointer:coarse / 触屏)自动开; 桌面默认关。用户可在设置里手动切, 存 localStorage。
// 卡顿的机器(包括普通桌面)开此模式即可显著提帧。
// ══════════════════════════════════════════════════════════

const LS_PERF = 'turtle-poc-perf-lite-v1';
let cssInjected = false;

function isTouchDevice(): boolean {
  return (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
    || ((navigator.maxTouchPoints ?? 0) > 0);
}

/** 当前是否低画质。未显式设置过 → 移动端默认开, 桌面默认关。 */
export function isPerfLite(): boolean {
  try {
    const v = localStorage.getItem(LS_PERF);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch { /* ignore */ }
  return isTouchDevice();
}

/** 是否用户已显式设置过 (用于设置页区分"默认"和"手动")。 */
export function isPerfLiteExplicit(): boolean {
  try { return localStorage.getItem(LS_PERF) != null; } catch { return false; }
}

function injectCss(): void {
  if (cssInjected || typeof document === 'undefined') return;
  cssInjected = true;
  const style = document.createElement('style');
  style.id = 'poc-perf-lite-css';
  // 低画质: 关掉所有 backdrop-filter 模糊。backdrop-filter 是纯视觉, 关掉不影响布局/交互。
  style.textContent =
    'html.perf-lite *, html.perf-lite *::before, html.perf-lite *::after {' +
    ' backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
  (document.head ?? document.documentElement).appendChild(style);
}

/** 按当前设置把 .perf-lite class 同步到 <html> (并确保全局 CSS 已注入)。 */
export function applyPerfMode(): void {
  injectCss();
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('perf-lite', isPerfLite());
  }
}

/** 设置低画质开关 (写 localStorage + 立即生效)。 */
export function setPerfLite(on: boolean): void {
  try { localStorage.setItem(LS_PERF, on ? '1' : '0'); } catch { /* ignore */ }
  applyPerfMode();
}

let fpsTimer: ReturnType<typeof setInterval> | null = null;

function showPerfToast(): void {
  if (typeof document === 'undefined') return;
  try {
    const t = document.createElement('div');
    t.textContent = '检测到卡顿，已自动开启低画质模式（可在设置中关闭）';
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:99999;'
      + 'background:rgba(20,30,50,.92);color:#cfe6ff;padding:10px 18px;border-radius:10px;font-size:14px;'
      + 'font-family:system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.45);pointer-events:none;max-width:90vw;';
    document.body.appendChild(t);
    setTimeout(() => { try { t.remove(); } catch { /* ignore */ } }, 4500);
  } catch { /* ignore */ }
}

/** 运行时 FPS 自动降级: 机器跑不动(持续低帧)且用户没显式设置过 → 自动开低画质。
 *  治"部署版在别人(较弱)电脑上卡"——他们不会手动开, 这里自动救。
 *  已是低画质(移动端默认/用户已开)则不监控。opts 仅供测试注入。 */
export function startFpsAutoDetect(
  game: { loop: { actualFps: number } },
  opts?: { warmupMs?: number; windowSize?: number; lowFps?: number; intervalMs?: number; fpsFn?: () => number },
): void {
  if (fpsTimer) { clearInterval(fpsTimer); fpsTimer = null; }
  if (isPerfLite()) return;   // 已低画质, 无需监控
  const warmupMs = opts?.warmupMs ?? 4000;     // 开局加载/解码会掉帧, 跳过
  const windowSize = opts?.windowSize ?? 5;     // 连续 N 次采样取均值
  const lowFps = opts?.lowFps ?? 45;
  const intervalMs = opts?.intervalMs ?? 1000;
  const fpsFn = opts?.fpsFn ?? (() => game.loop.actualFps || 60);
  const samples: number[] = [];
  const start = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  fpsTimer = setInterval(() => {
    if (isPerfLiteExplicit()) { if (fpsTimer) clearInterval(fpsTimer); fpsTimer = null; return; }  // 用户期间手动设过 → 停
    if (now() - start < warmupMs) return;
    samples.push(fpsFn());
    if (samples.length > windowSize) samples.shift();
    if (samples.length >= windowSize) {
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      if (avg < lowFps) {
        if (fpsTimer) clearInterval(fpsTimer);
        fpsTimer = null;
        setPerfLite(true);
        showPerfToast();
      }
    }
  }, intervalMs);
}
