/**
 * 文件说明：项目 iconfont 图标组件（来自 pencil/font_img）。
 */
import '@/assets/iconfont/iconfont.css';

export type IconFontName =
  | 'xiaoxi'
  | 'qianbi'
  | 'qianbi-'
  | 'xingyepaixing'
  | 'youxi1'
  | 'sen018'
  | 'wugui'
  | 'shichang'
  | 'myyingyong'
  | 'icon_jiaoyi_anpanjiaoyi'
  | 'honglanduikangxunlian'
  | 'quanjushezhi'
  | 'xinxi'
  | 'Up'
  | 'down'
  | 'arrow-right'
  | 'arrow-left'
  | 'iconfontzhizuobiaozhun023140'
  | 'shoucang'
  | '1tian'
  | 'fenzhong'
  | 'zhoubaotongji'
  | 'quanbu'
  | '4xiaoshi'
  | 'shebeikongzhi-zuocecaidanlan-piliangkongzhi'
  | 'baogao-1yuebao'
  | 'a-Property1nian'
  | 'a-1xiaoshi'
  | 'a-15fenzhong'
  | 'qushishangsheng'
  | 'fenshiqiehuan-panqianpanzhong'
  | 'guanbi'
  | 'jiantoudown'
  | 'sousuo'
  | 'icon_arrowright'
  | 'yingshijidi'
  | 'shijian'
  | 'youxi'
  | 'ziyuanjrit'
  | 'yinhang'
  | 'qianbao'
  | 'tongzhi'
  | 'anhei'
  | 'mingliang'
  | 'Gc_63_public-RiseOutlined'
  | 'zuqiu'
  | 'gengduo';

interface IconFontProps {
  name: IconFontName;
  className?: string;
  style?: React.CSSProperties;
  /** 无障碍文案；装饰性图标可不传 */
  label?: string;
}

/** 用法：`<IconFont name="sousuo" className="text-[18px] text-emerald-400" />` */
export function IconFont({ name, className = '', style, label }: IconFontProps) {
  return (
    <i
      className={`iconfont icon-${name} ${className}`.trim()}
      style={style}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    />
  );
}
