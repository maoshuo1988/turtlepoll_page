// ══════════════════════════════════════════════════════════
// icon-scale.ts — 图标去糊工具
//   源 PNG 巨大(数百 px)直接显示到十几 px = WebGL LINEAR 无 mipmap 严重缩混(糊)。
//   这里用 2D canvas 多步折半 + imageSmoothingQuality:'high'(面积平均)预降采样到 ~targetPx,
//   缓存为 `${key}@sm{target}` 纹理。之后以小尺寸显示就清晰。
//   (正解是构建期出小图; 这是运行时一次性缓存的创可贴, 跨场景共用。)
// ══════════════════════════════════════════════════════════
import Phaser from 'phaser';

/** 返回降采样后的纹理 key (已够小则原样返回, 不浪费). */
export function smallIconKey(scene: Phaser.Scene, key: string, targetPx = 40): string {
  const tm = scene.textures;
  if (!tm.exists(key)) return key;
  const smKey = `${key}@sm${targetPx}`;
  if (tm.exists(smKey)) return smKey;
  const src = tm.get(key).getSourceImage() as HTMLImageElement;
  const sw = src.width, sh = src.height;
  if (!sw || !sh) return key;
  // 源已接近目标 (≤1.5×) → 直接用原图, 不必降采样
  if (Math.max(sw, sh) <= targetPx * 1.5) return key;
  const scale = Math.min(targetPx / sw, targetPx / sh);
  // 多步折半降采样 (每步不低于目标), 比单步 30:1 更锐
  let cur: HTMLCanvasElement | HTMLImageElement = src, cw = sw, ch = sh;
  while (cw * 0.5 > sw * scale && ch * 0.5 > sh * scale) {
    const nw = Math.round(cw * 0.5), nh = Math.round(ch * 0.5);
    const c = document.createElement('canvas'); c.width = nw; c.height = nh;
    const cx = c.getContext('2d')!; cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh;
  }
  const dw = Math.max(1, Math.round(sw * scale)), dh = Math.max(1, Math.round(sh * scale));
  const out = document.createElement('canvas'); out.width = dw; out.height = dh;
  const o = out.getContext('2d')!; o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
  o.drawImage(cur, 0, 0, dw, dh);
  tm.addCanvas(smKey, out);
  return smKey;
}
