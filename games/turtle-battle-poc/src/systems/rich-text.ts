// ══════════════════════════════════════════════════════════
// rich-text.ts — v0.9.4.A Phaser 端富文本渲染 (多色行内 + 自动换行)
//
// Phaser 没原生 BBCode/HTML, 用多个 Text 对象按段拼接, 手动 wrap。
// 输入: skill-text.ts 的 parseRichText 输出 RichSegment[]
// 输出: 一个 Container, 包含若干 Text, 总高度 = 行数 × lineH
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';
import { parseRichText } from './skill-text';

export interface RichTextOptions {
  fontSize?: number;        // default 13
  fontFamily?: string;      // default m6x11 中文
  defaultColor?: string;    // default '#ffffff'
  lineHeight?: number;      // default fontSize * 1.6
  wrapWidth: number;        // 必填
  stroke?: string;
  strokeThickness?: number;
}

/**
 * 用多个 Text 对象渲染富文本到 container。
 * 起点 (0,0) 相对 container; 调用方负责 container 定位。
 * 返回值: 实际渲染高度 (像素), 方便调用方布局后续内容。
 */
export function renderRichText(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  html: string,
  opts: RichTextOptions,
): number {
  const segs = parseRichText(html);
  const fontSize = opts.fontSize ?? 13;
  const fontFamily = opts.fontFamily ?? 'm6x11, pixel-zh, Microsoft YaHei, system-ui';
  const lineH = opts.lineHeight ?? Math.round(fontSize * 1.6);
  const defaultColor = opts.defaultColor ?? '#ffffff';
  const wrapW = opts.wrapWidth;

  let curX = 0;
  let curY = 0;

  // 临时 Text 用来量字宽 (避免每次创建测量浪费)
  const probe = scene.add.text(0, 0, '', {
    fontSize: `${fontSize}px`, color: defaultColor, fontFamily,
  }).setVisible(false);

  for (const seg of segs) {
    if (seg.newline) { curX = 0; curY += lineH; continue; }
    if (!seg.text) continue;

    // 按字符逐一推进, 在 wrapW 处折行 (中文不便按词拆, 按字符更稳)
    let buf = '';
    for (const ch of seg.text) {
      probe.setText(buf + ch);
      const w = probe.width;
      if (curX + w > wrapW && buf.length > 0) {
        // flush buf
        emitText(scene, container, buf, curX, curY, fontSize, fontFamily, seg.color ?? defaultColor, seg.bold, opts.stroke, opts.strokeThickness);
        curX = 0;
        curY += lineH;
        buf = ch;
      } else {
        buf += ch;
      }
    }
    if (buf) {
      probe.setText(buf);
      const w = probe.width;
      emitText(scene, container, buf, curX, curY, fontSize, fontFamily, seg.color ?? defaultColor, seg.bold, opts.stroke, opts.strokeThickness);
      curX += w;
    }
  }

  probe.destroy();
  return curY + lineH;
}

function emitText(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fontFamily: string,
  color: string,
  bold: boolean | undefined,
  stroke?: string,
  strokeThickness?: number,
) {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontSize: `${fontSize}px`,
    color,
    fontFamily,
    fontStyle: bold ? 'bold' : 'normal',
  };
  if (stroke) { style.stroke = stroke; style.strokeThickness = strokeThickness ?? 2; }
  const t = scene.add.text(x, y, text, style).setOrigin(0, 0);
  container.add(t);
}
