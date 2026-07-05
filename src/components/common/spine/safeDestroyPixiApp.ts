/**
 * 文件说明：安全销毁 Pixi Application，避免重复 destroy 抛错。
 */
import type { Application } from 'pixi.js';

export function safeDestroyPixiApp(app: Application | null | undefined) {
  if (!app) return;

  try {
    app.stop();
  } catch {
    // ignore
  }

  try {
    app.destroy(true, { children: true });
  } catch {
    // ignore double-destroy
  }
}
