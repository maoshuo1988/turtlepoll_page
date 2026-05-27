/** 嵌入主站 iframe 时，通知父页面关闭游戏并回到暗盘。 */
export const TURTLE_CONTEST_CLOSE_MESSAGE = 'turtle-contest:close';

export function isEmbeddedInHost() {
  try {
    return window.parent !== window;
  } catch {
    return true;
  }
}

export function exitToHostApp() {
  try {
    if (isEmbeddedInHost()) {
      window.parent.postMessage({ type: TURTLE_CONTEST_CLOSE_MESSAGE }, window.location.origin);
      return;
    }
  } catch {
    /* ignore cross-origin access errors */
  }

  try {
    window.location.href = '/';
  } catch {
    /* ignore */
  }
}
