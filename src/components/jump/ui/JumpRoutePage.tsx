/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { TurtleJumpPixel } from '@/components/shared/lab';

export default function JumpPage() {
  return (
    <div className="h-screen overflow-hidden bg-[#05070b]">
      <TurtleJumpPixel
        mobileMode={typeof window !== 'undefined' ? window.innerWidth < 1024 : false}
        onBack={() => {
          window.location.href = '/games';
        }}
      />
    </div>
  );
}

