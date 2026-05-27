// ══════════════════════════════════════════════════════════
// feedback.ts — 游戏内反馈/上报 (类 Steam F11)
//   F11 (或右下 🐛 按钮) → 弹窗: 描述问题 + 自动抓当前战斗状态/控制台错误 + 截图
//   → 「复制到剪贴板」/「下载 JSON」, 把 bundle 交给开发者 (我) 定位。
//   纯前端 (PoC 无后端), 不上传服务器。
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';

const errorBuffer: string[] = [];
const MAX_ERRORS = 40;

/** 安装控制台错误 ring buffer (反馈时附带最近错误) */
function installErrorCapture(): void {
  const push = (s: string) => {
    errorBuffer.push(s.slice(0, 600));
    if (errorBuffer.length > MAX_ERRORS) errorBuffer.shift();
  };
  const origErr = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    try {
      push('[error] ' + args.map(a =>
        typeof a === 'string' ? a : a instanceof Error ? (a.stack || a.message) : JSON.stringify(a)
      ).join(' '));
    } catch { /* ignore */ }
    origErr(...args);
  };
  window.addEventListener('error', (e) => push(`[window.onerror] ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`));
  window.addEventListener('unhandledrejection', (e) =>
    push('[unhandledrejection] ' + String((e as PromiseRejectionEvent).reason)));
}

/** 抓当前游戏上下文 (活动场景 / 战斗状态 / 最近错误) */
function gatherContext(game: Phaser.Game): Record<string, unknown> {
  const ctx: Record<string, unknown> = {
    time: new Date().toISOString(),
    url: location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    recentErrors: errorBuffer.slice(-15),
  };
  try {
    ctx.activeScenes = game.scene.scenes.filter(s => s.scene.isActive()).map(s => s.scene.key);
    const bs = game.scene.getScene('BattleScene') as unknown as {
      views?: Array<{ fighter: Record<string, unknown> }>; turn?: number; mode?: string; coins?: number;
    } | null;
    if (bs && game.scene.isActive('BattleScene') && Array.isArray(bs.views)) {
      ctx.battle = {
        turn: bs.turn, mode: bs.mode, coins: bs.coins,
        fighters: bs.views.map(v => {
          const f = v.fighter as Record<string, unknown>;
          return {
            name: f.name, side: f.side, hp: f.hp, maxHp: f.maxHp, alive: f.alive,
            passive: (f.passive as { type?: string } | null)?.type,
            slot: f._slotKey, pos: f._position,
            buffs: (f.buffs as Array<{ type: string; value: number; duration: number }> ?? [])
              .map(b => `${b.type}:${b.value}/${b.duration}`),
          };
        }),
      };
    }
  } catch (e) { ctx.gatherError = String(e); }
  return ctx;
}

/** Phaser 画布截图 → dataURL (WebGL renderer snapshot 异步) */
function captureScreenshot(game: Phaser.Game): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      game.renderer.snapshot((img) => {
        resolve(img instanceof HTMLImageElement ? img.src : null);
      });
      setTimeout(() => resolve(null), 1500);   // 兜底超时
    } catch { resolve(null); }
  });
}

let cssInstalled = false;
function installCss(): void {
  if (cssInstalled) return;
  cssInstalled = true;
  const st = document.createElement('style');
  st.textContent = `
    /* v0.9.9 阶段0: 反馈是开发工具 → 右下角缩成小图标 + 半透明, 玩家无感 (hover 才显形) */
    #poc-fb-btn {
      position: fixed; right: 8px; bottom: 8px; z-index: 9000;
      background: rgba(20,24,34,.6); color: #ffd93d; border: 1px solid rgba(255,217,61,.3);
      border-radius: 7px; padding: 3px 6px; font-size: 11px; cursor: pointer;
      font-family: 'Segoe UI', system-ui, sans-serif; backdrop-filter: blur(4px);
      opacity: .25; transition: opacity .15s;
    }
    #poc-fb-btn:hover { background: rgba(40,46,60,.95); opacity: .95; }
    #poc-fb-modal {
      position: fixed; inset: 0; z-index: 9001; display: none;
      background: rgba(0,0,0,.55); align-items: center; justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }
    #poc-fb-modal.show { display: flex; }
    #poc-fb-card {
      background: #0f1420; color: #e6edf3; border: 1px solid rgba(255,255,255,.12);
      border-radius: 12px; padding: 16px; width: min(560px, 92vw); max-height: 88vh; overflow-y: auto;
    }
    #poc-fb-card h3 { margin: 0 0 8px; font-size: 16px; }
    #poc-fb-card .fb-hint { font-size: 12px; color: #8b949e; margin-bottom: 8px; }
    #poc-fb-card textarea {
      width: 100%; min-height: 90px; box-sizing: border-box; resize: vertical;
      background: rgba(255,255,255,.05); color: #e6edf3; border: 1px solid rgba(255,255,255,.15);
      border-radius: 6px; padding: 8px; font-size: 13px; font-family: inherit;
    }
    #poc-fb-card .fb-shot { width: 100%; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,.1); }
    #poc-fb-card .fb-ctx {
      font-size: 11px; color: #8b949e; background: rgba(255,255,255,.03); border-radius: 6px;
      padding: 8px; max-height: 140px; overflow: auto; white-space: pre-wrap; word-break: break-all; margin: 8px 0;
    }
    #poc-fb-card .fb-row { display: flex; gap: 8px; margin-top: 10px; }
    #poc-fb-card button {
      flex: 1; padding: 8px; border-radius: 6px; border: none; cursor: pointer;
      font-size: 13px; font-family: inherit; font-weight: 600;
    }
    #poc-fb-card .fb-copy { background: #58a6ff; color: #fff; }
    #poc-fb-card .fb-dl { background: #06d6a0; color: #04231b; }
    #poc-fb-card .fb-close { background: rgba(255,255,255,.1); color: #e6edf3; }
    #poc-fb-card .fb-ok { font-size: 12px; color: #06d6a0; margin-top: 6px; min-height: 16px; }
  `;
  document.head.appendChild(st);
}

/** 安装游戏内反馈系统. 在 main.ts 创建 game 后调一次. */
export function initFeedback(game: Phaser.Game): void {
  installErrorCapture();
  installCss();

  const btn = document.createElement('button');
  btn.id = 'poc-fb-btn';
  btn.textContent = '🐛 反馈 (F11)';
  document.body.appendChild(btn);

  const modal = document.createElement('div');
  modal.id = 'poc-fb-modal';
  modal.innerHTML = `
    <div id="poc-fb-card">
      <h3>🐛 问题反馈</h3>
      <div class="fb-hint">描述你看到的问题（哪只龟、放了什么、预期 vs 实际）。会自动附带当前战斗状态 + 截图 + 最近报错。</div>
      <textarea id="poc-fb-text" placeholder="例: 竹叶龟竹击打后排敌人，没有被击至前排（前排有空位）"></textarea>
      <img id="poc-fb-shot" class="fb-shot" alt="" style="display:none">
      <div class="fb-ctx" id="poc-fb-ctx"></div>
      <div class="fb-row">
        <button class="fb-copy" data-act="copy">📋 复制到剪贴板</button>
        <button class="fb-dl" data-act="download">⬇ 下载 JSON</button>
        <button class="fb-close" data-act="close">关闭</button>
      </div>
      <div class="fb-ok" id="poc-fb-ok"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const textEl = modal.querySelector('#poc-fb-text') as HTMLTextAreaElement;
  const ctxEl = modal.querySelector('#poc-fb-ctx') as HTMLElement;
  const shotEl = modal.querySelector('#poc-fb-shot') as HTMLImageElement;
  const okEl = modal.querySelector('#poc-fb-ok') as HTMLElement;
  let lastCtx: Record<string, unknown> = {};
  let lastShot: string | null = null;

  const open = async () => {
    lastCtx = gatherContext(game);
    ctxEl.textContent = JSON.stringify(lastCtx, null, 2);
    okEl.textContent = '';
    modal.classList.add('show');
    textEl.focus();
    lastShot = await captureScreenshot(game);
    if (lastShot) { shotEl.src = lastShot; shotEl.style.display = 'block'; }
    else shotEl.style.display = 'none';
  };
  const close = () => modal.classList.remove('show');

  const buildBundle = () => ({
    description: textEl.value.trim(),
    context: lastCtx,
    screenshot: lastShot,
  });

  btn.onclick = open;
  modal.querySelector('[data-act="close"]')!.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('[data-act="copy"]')!.addEventListener('click', async () => {
    // 剪贴板放文字版 (描述 + context; 截图太大不进剪贴板, 用下载)
    const txt = `# 反馈\n${textEl.value.trim()}\n\n## context\n${JSON.stringify(lastCtx, null, 2)}`;
    try { await navigator.clipboard.writeText(txt); okEl.textContent = '✓ 已复制 (含状态/报错; 截图请用下载)'; }
    catch { okEl.textContent = '✗ 复制失败, 请用下载'; }
  });
  modal.querySelector('[data-act="download"]')!.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(buildBundle(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `feedback-${Date.now()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    okEl.textContent = '✓ 已下载 (含截图), 把文件发给开发者';
  });

  // F11 热键 (拦截浏览器全屏); ESC 关闭
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      if (modal.classList.contains('show')) close(); else open();
    } else if (e.key === 'Escape' && modal.classList.contains('show')) {
      close();
    }
  });
}
