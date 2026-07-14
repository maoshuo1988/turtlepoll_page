/** 文件说明：消息详情页展示组件（移动端二级页）。 */
import { MessagesDetailMobilePage } from '../MessagesDetailMobilePage';

export function MessagesDetailPageView() {
  return (
    <section className="view-messages-detail w-full min-h-full lg:hidden">
      <MessagesDetailMobilePage />
    </section>
  );
}
