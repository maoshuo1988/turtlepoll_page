/**
 * 文件说明：论坛标签展示样式映射。
 */
export type ForumTag = '讨论' | '爆料' | '分析';

export const FORUM_TAGS: Record<ForumTag, string> = {
  讨论: 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/20',
  爆料: 'bg-amber-500/10 text-amber-300 border border-amber-400/20',
  分析: 'bg-sky-500/10 text-sky-300 border border-sky-400/20',
};

export const DEFAULT_FORUM_TAG_CLASS = FORUM_TAGS['讨论'];

export function getForumTagClass(tag?: string) {
  return FORUM_TAGS[tag as ForumTag] ?? DEFAULT_FORUM_TAG_CLASS;
}
