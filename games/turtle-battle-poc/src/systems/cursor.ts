// cursor.ts — F1 JS 跟随式像素手套光标 (有动作/动画)
// ════════════════════════════════════════════════════════════
// 网页 CSS 光标只能静态图; 要"动作"必须自绘一个跟随鼠标的 div。
// 本模块: 一个 fixed div (内含手套 SVG) 跟随指针, 按状态切换贴图 + 动画:
//   default 指向手套 / pointer 可点(放大+发光+悬停微浮) / press 按下(缩) /
//   grab 张开手 / grabbing 握拳 / disabled 红禁。
// 仅在有鼠标(pointer:fine)的设备启用; 触摸设备隐藏 (退回无光标)。
// 静态 CSS 手套 (index.html --glove) 作为 JS 未启用时的兜底。

// ── 龟爪/脚蹼像素 SVG (raw, encodeURIComponent 编码) ──
// 配色: 深绿描边 #1f6b3f / 绿 #3cba6e / 高光 #7fe6a0 / 奶白爪尖 #ffe9b0
// POINT: 绿脚蹼 + 3 奶白爪尖朝上 (24×24@2px, 中爪尖为热点 ~11,1)
const POINT_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' shape-rendering='crispEdges'>
<g fill='#ffe9b0'><rect x='4' y='0' width='2' height='4'/><rect x='10' y='0' width='2' height='4'/><rect x='16' y='0' width='2' height='4'/></g>
<g fill='#1f6b3f'><rect x='2' y='4' width='18' height='2'/><rect x='2' y='6' width='2' height='2'/><rect x='18' y='6' width='2' height='2'/><rect x='0' y='8' width='4' height='2'/><rect x='20' y='8' width='2' height='2'/><rect x='0' y='10' width='2' height='2'/><rect x='20' y='10' width='2' height='2'/><rect x='0' y='12' width='2' height='2'/><rect x='20' y='12' width='2' height='2'/><rect x='0' y='14' width='2' height='2'/><rect x='20' y='14' width='2' height='2'/><rect x='2' y='16' width='2' height='2'/><rect x='18' y='16' width='2' height='2'/><rect x='2' y='18' width='2' height='2'/><rect x='18' y='18' width='2' height='2'/><rect x='4' y='20' width='2' height='2'/><rect x='16' y='20' width='2' height='2'/><rect x='6' y='22' width='10' height='2'/></g>
<g fill='#3cba6e'><rect x='4' y='6' width='6' height='2'/><rect x='12' y='6' width='6' height='2'/><rect x='4' y='8' width='6' height='2'/><rect x='12' y='8' width='8' height='2'/><rect x='2' y='10' width='8' height='2'/><rect x='12' y='10' width='8' height='2'/><rect x='2' y='12' width='2' height='2'/><rect x='8' y='12' width='12' height='2'/><rect x='2' y='14' width='18' height='2'/><rect x='4' y='16' width='14' height='2'/><rect x='4' y='18' width='14' height='2'/><rect x='6' y='20' width='10' height='2'/></g>
<g fill='#7fe6a0'><rect x='10' y='6' width='2' height='2'/><rect x='10' y='8' width='2' height='2'/><rect x='10' y='10' width='2' height='2'/><rect x='4' y='12' width='4' height='2'/></g></svg>`;

// GRAB: 卷爪 (爪尖收起的脚蹼, 圆顶) — 抓取/握住时用, 与 POINT 区分
const FIST_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='22' shape-rendering='crispEdges'>
<g fill='#1f6b3f'><rect x='6' y='2' width='10' height='2'/><rect x='2' y='4' width='4' height='2'/><rect x='16' y='4' width='4' height='2'/><rect x='0' y='6' width='2' height='2'/><rect x='20' y='6' width='2' height='2'/><rect x='0' y='8' width='2' height='2'/><rect x='20' y='8' width='2' height='2'/><rect x='0' y='10' width='2' height='2'/><rect x='20' y='10' width='2' height='2'/><rect x='0' y='12' width='2' height='2'/><rect x='20' y='12' width='2' height='2'/><rect x='2' y='14' width='2' height='2'/><rect x='18' y='14' width='2' height='2'/><rect x='4' y='16' width='2' height='2'/><rect x='16' y='16' width='2' height='2'/><rect x='6' y='18' width='10' height='2'/></g>
<g fill='#3cba6e'><rect x='6' y='4' width='10' height='2'/><rect x='2' y='6' width='18' height='2'/><rect x='2' y='8' width='8' height='2'/><rect x='12' y='8' width='8' height='2'/><rect x='2' y='10' width='18' height='2'/><rect x='2' y='12' width='18' height='2'/><rect x='4' y='14' width='14' height='2'/><rect x='6' y='16' width='10' height='2'/></g>
<g fill='#7fe6a0'><rect x='10' y='8' width='2' height='2'/><rect x='4' y='6' width='4' height='2'/></g></svg>`;

const uri = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

type CurState = 'default' | 'pointer' | 'grab' | 'grabbing' | 'disabled';

let installed = false;

export function initCursor(): void {
  if (installed) return;
  installed = true;

  // 仅在有精确指针(鼠标)的环境启用; 纯触摸设备退回无自定义光标
  const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? true;

  // 样式: 隐藏系统光标(仅 JS 光标激活时) + 光标 div 本体/动画
  const st = document.createElement('style');
  st.textContent = `
    html.poc-jscursor, html.poc-jscursor * { cursor: none !important; }
    #poc-cursor {
      position: fixed; left: 0; top: 0; width: 26px; height: 26px;
      pointer-events: none; z-index: 2147483647;
      will-change: transform; transform: translate3d(-100px,-100px,0);
    }
    #poc-cursor .g {
      width: 100%; height: 100%;
      background: ${uri(POINT_SVG)} no-repeat center / contain;
      image-rendering: pixelated;
      transform-origin: 46% 6%;   /* 以中间爪尖附近为缩放锚 */
      transition: transform .08s ease-out, filter .12s ease;
    }
    /* 可点: 放大 + 青色发光 + 悬停微浮 */
    #poc-cursor.is-pointer .g {
      filter: drop-shadow(0 0 5px rgba(126,224,255,.9));
      animation: pocCurBob .9s ease-in-out infinite;
    }
    @keyframes pocCurBob { 0%,100%{transform:scale(1.12) translateY(0)} 50%{transform:scale(1.12) translateY(-2px)} }
    /* 按下: 收一下 */
    #poc-cursor.is-press .g { transform: scale(.8) !important; animation: none !important; }
    /* 抓取/握拳: 换拳贴图 */
    #poc-cursor.is-grab .g, #poc-cursor.is-grabbing .g {
      background-image: ${uri(FIST_SVG)};
      animation: none;
    }
    #poc-cursor.is-grabbing .g { transform: scale(.9); filter: drop-shadow(0 0 5px rgba(126,224,255,.9)); }
    /* 禁用: 红化 + 收 */
    #poc-cursor.is-disabled .g {
      filter: grayscale(1) brightness(.7) sepia(1) hue-rotate(-35deg) saturate(4);
      animation: none;
    }
  `;
  document.head.appendChild(st);

  const cur = document.createElement('div');
  cur.id = 'poc-cursor';
  const g = document.createElement('div');
  g.className = 'g';
  cur.appendChild(g);
  document.body.appendChild(cur);

  // 热点: 中间爪尖 (SVG 内 ~ x11,y1)。div 左上对齐鼠标点, 故偏移 -11,-1。
  const HOT_X = 11, HOT_Y = 1;
  let visible = false;
  const setVisible = (v: boolean) => {
    if (v === visible) return;
    visible = v;
    cur.style.opacity = v ? '1' : '0';
    document.documentElement.classList.toggle('poc-jscursor', v);
  };

  // 判断指针下元素的光标语义 (cheap: 标签/matches/内联 style; 含 Phaser 给 canvas 设的内联 cursor)
  const stateFor = (target: EventTarget | null): CurState => {
    let el = target as HTMLElement | null;
    for (let i = 0; i < 4 && el; i++, el = el.parentElement) {
      const inline = el.getAttribute?.('style') ?? '';
      if ((el as HTMLButtonElement).disabled || inline.includes('not-allowed')) return 'disabled';
      if (inline.includes('grabbing')) return 'grabbing';
      if (inline.includes('grab')) return 'grab';
      if (inline.includes('cursor:pointer') || inline.includes('cursor: pointer')) return 'pointer';
      if (typeof el.matches === 'function' &&
          el.matches('a,button,summary,[role="button"],input[type="button"],input[type="submit"],label[for],canvas')) {
        // canvas: Phaser 在 hover 交互对象时把 canvas.style.cursor 设成 pointer; 上面 inline 已覆盖。
        //   非 pointer 的 canvas (空白处) 视为 default。
        if (el.tagName === 'CANVAS') {
          const cc = (el as HTMLCanvasElement).style.cursor;
          return cc.includes('pointer') ? 'pointer' : 'default';
        }
        return 'pointer';
      }
    }
    return 'default';
  };

  let pressed = false;
  const applyState = (s: CurState) => {
    cur.classList.toggle('is-pointer', s === 'pointer' && !pressed);
    cur.classList.toggle('is-grab', s === 'grab' && !pressed);
    cur.classList.toggle('is-grabbing', s === 'grabbing');
    cur.classList.toggle('is-disabled', s === 'disabled');
  };

  let lastState: CurState = 'default';
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') { setVisible(false); return; }
    setVisible(true);
    cur.style.transform = `translate3d(${e.clientX - HOT_X}px, ${e.clientY - HOT_Y}px, 0)`;
    lastState = stateFor(e.target);
    applyState(lastState);
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    pressed = true;
    if (lastState === 'grab') applyState('grabbing');
    else cur.classList.add('is-press');
  }, { passive: true });
  const release = () => {
    pressed = false;
    cur.classList.remove('is-press');
    applyState(lastState);
  };
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  // 离开窗口/失焦 → 隐藏自定义光标
  document.addEventListener('mouseleave', () => setVisible(false));
  window.addEventListener('blur', () => setVisible(false));

  if (hasFinePointer) setVisible(false);   // 初始隐藏, 第一次 move 再显 (避免左上角闪一下)
}
