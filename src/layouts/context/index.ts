/**
 * 文件说明：index，布局上下文，向页面暴露主题和登录弹窗等 layout 能力。
 */
// layouts/context 的统一出口。
// 页面层只需要关心这里暴露的 hook，不需要知道具体 context 文件名。
export {
  HomeLayoutProvider,
  useHomeLayoutContext,
} from './HomeLayoutContext';
