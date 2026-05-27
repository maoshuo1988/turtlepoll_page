// ══════════════════════════════════════════════════════════
// dom-text.ts — v0.9.5.A9 DOM overlay 文字 helper
//
// Phaser canvas-text 永远做不到 HTML 原生质量 (字体 hinting / subpixel AA / 操作系统字体引擎).
// 对于静态 UI 文字 (标题/按钮/卡片), 用 Phaser DOMElement 包真实 <span>:
//   - 浏览器原生渲染
//   - 仍受 Phaser 相机 + Container 变换 (位置/旋转/scale 跟随)
//   - 不影响 Phaser pointer events (设 pointer-events:none 让点击穿透到底层 bg)
//
// 动态文字 (VFX / 浮动伤害数字 / 频繁变化) 继续走 Phaser Text — 不值得 DOM 开销.
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';

export interface DomTextOptions {
  fontSize?: number | string;       // 13 → '13px'; or '1.2em'
  color?: string;                   // CSS color
  fontFamily?: string;              // default m6x11
  fontWeight?: 'normal' | 'bold' | number;
  textAlign?: 'left' | 'center' | 'right';
  stroke?: { color: string; width: number };  // text-shadow 模拟 stroke
  letterSpacing?: number;
  /** 让 DOM 元素不拦截鼠标事件 (用于按钮 label 上, 点击穿透到 Phaser bg) */
  pointerThrough?: boolean;
}

/**
 * 在 scene 创建一段 HTML 文字, 位置 (x, y) 是 Phaser 游戏坐标.
 * 返回 Phaser.GameObjects.DOMElement, 可以加进 Container, 自动跟随 Container.x tween.
 */
export function addDomText(
  scene: Phaser.Scene,
  x: number, y: number,
  text: string,
  opts: DomTextOptions = {},
): Phaser.GameObjects.DOMElement {
  const fontSize = typeof opts.fontSize === 'number' ? `${opts.fontSize}px` : (opts.fontSize ?? '14px');
  const fontFamily = opts.fontFamily ?? 'm6x11, pixel-zh, "Microsoft YaHei", system-ui, sans-serif';
  const fontWeight = opts.fontWeight ?? 'normal';
  const color = opts.color ?? '#ffffff';
  const textAlign = opts.textAlign ?? 'center';
  const pe = opts.pointerThrough ? 'none' : 'auto';

  let textShadow = '';
  if (opts.stroke) {
    const c = opts.stroke.color, w = opts.stroke.width;
    // 简单 stroke 模拟: 4 方向 text-shadow
    textShadow = `text-shadow: -${w}px -${w}px 0 ${c}, ${w}px -${w}px 0 ${c}, -${w}px ${w}px 0 ${c}, ${w}px ${w}px 0 ${c};`;
  }

  const style = [
    `font-size:${fontSize}`,
    `color:${color}`,
    `font-family:${fontFamily}`,
    `font-weight:${fontWeight}`,
    `text-align:${textAlign}`,
    `pointer-events:${pe}`,
    `user-select:none`,
    `white-space:nowrap`,
    `line-height:1`,
    opts.letterSpacing != null ? `letter-spacing:${opts.letterSpacing}px` : '',
    textShadow,
  ].filter(Boolean).join(';');

  const el = scene.add.dom(x, y, 'span', style, text);
  el.setOrigin(0.5);
  return el;
}

/**
 * v0.9.5.A13: DOM HTML 容器 — 直接吃 renderSkillTemplate 输出的 HTML 字符串
 * (含 <span class="val-normal"> 等), 浏览器原生解析渲染 val-* 配色;
 * 取代 parseRichText + 多段 Phaser.Text 的实现, 中文质量 = HTML 原生.
 */
export interface DomHTMLOptions {
  width: number;                    // 容器宽 (CSS px)
  fontSize?: number | string;
  fontFamily?: string;
  defaultColor?: string;
  lineHeight?: number | string;     // 推荐 1.5
  textAlign?: 'left' | 'center' | 'right';
  pointerThrough?: boolean;
}
export function addDomHTML(
  scene: Phaser.Scene,
  x: number, y: number,
  html: string,
  opts: DomHTMLOptions,
): Phaser.GameObjects.DOMElement {
  const fontSize = typeof opts.fontSize === 'number' ? `${opts.fontSize}px` : (opts.fontSize ?? '13px');
  const fontFamily = opts.fontFamily ?? 'm6x11, pixel-zh, "Microsoft YaHei", system-ui, sans-serif';
  const color = opts.defaultColor ?? '#ccc';
  const align = opts.textAlign ?? 'left';
  const lh = opts.lineHeight != null ? (typeof opts.lineHeight === 'number' ? String(opts.lineHeight) : opts.lineHeight) : '1.5';
  const pe = opts.pointerThrough ? 'none' : 'auto';
  const style = [
    `width:${opts.width}px`,
    `font-size:${fontSize}`,
    `color:${color}`,
    `font-family:${fontFamily}`,
    `line-height:${lh}`,
    `text-align:${align}`,
    `pointer-events:${pe}`,
    `user-select:none`,
    `white-space:normal`,
  ].join(';');
  const el = scene.add.dom(x, y, 'div', style, html);
  // 用 innerHTML 让浏览器解析 <span class="val-*">; createFromHTML 不接收 style 第三个 arg 时走 innerText, 这里我们想要 HTML
  (el.node as HTMLElement).innerHTML = html;
  el.setOrigin(0, 0);
  return el;
}

/** DOM <img> overlay — 浏览器原生图片渲染, 高质量 resampling, 不走 Phaser WebGL 纹理采样
 *  crisp:true 时用 image-rendering:pixelated 锐利放大 (像素美术专用)
 */
export function addDomImage(
  scene: Phaser.Scene,
  x: number, y: number,
  src: string, displayW: number, displayH: number,
  opts: { pointerThrough?: boolean; crisp?: boolean; circle?: boolean; objectFit?: 'cover' | 'contain' } = {},
): Phaser.GameObjects.DOMElement {
  const pe = opts.pointerThrough !== false ? 'none' : 'auto';
  const rendering = opts.crisp ? 'image-rendering:pixelated;' : '';
  // P147: circle → 圆头 (border-radius:50%); object-fit:cover 保持长宽比 (裁切填满, 不拉伸).
  //   头像源非方形 (e.g. 195×147), 之前强制 W×H 会拉伸变形. cover 居中裁切成圆.
  const fit = opts.objectFit ? `object-fit:${opts.objectFit};` : (opts.circle ? 'object-fit:cover;' : '');
  const radius = opts.circle ? 'border-radius:50%;' : '';
  const style = `width:${displayW}px;height:${displayH}px;pointer-events:${pe};user-select:none;display:block;${rendering}${fit}${radius}`;
  const el = scene.add.dom(x, y, 'img', style);
  (el.node as HTMLImageElement).src = src;
  el.setOrigin(0.5);
  return el;
}
