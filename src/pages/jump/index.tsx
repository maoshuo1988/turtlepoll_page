/**
 * 文件说明：index 页面路由入口，负责组装当前页面的业务组件和页面级状态。
 */
import { useNavigate } from '@umijs/renderer-react';
import { JumpPageView } from './components/JumpPageView';

export default function JumpPage() {
  const navigate = useNavigate();

  return (
    <JumpPageView
      isMobileMode={typeof window !== 'undefined' ? window.innerWidth < 1024 : false}
      onBack={() => {
        navigate('/games');
      }}
    />
  );
}
