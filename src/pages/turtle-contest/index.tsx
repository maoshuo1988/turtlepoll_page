/**
 * 文件说明：turtle-contest 页面路由入口，负责挂载新的龟战 Arena 游戏。
 */
import { useNavigate } from '@umijs/renderer-react';
import { TurtleContestPageView } from './components/TurtleContestPageView';

export default function TurtleContestPage() {
  const navigate = useNavigate();

  return (
    <TurtleContestPageView
      isMobileMode={typeof window !== 'undefined' ? window.innerWidth < 1024 : false}
      onBack={() => {
        navigate('/');
      }}
    />
  );
}
