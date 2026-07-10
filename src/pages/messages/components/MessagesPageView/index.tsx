/** 文件说明：消息 Tab 页面展示组件（移动端一级页）。 */
import { MessagesMobilePage } from '../MessagesMobilePage';

export function MessagesPageView() {
  return (
    <section className="view-messages w-full min-h-full lg:hidden">
      <MessagesMobilePage />
    </section>
  );
}
