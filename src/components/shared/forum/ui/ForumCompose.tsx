import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Image, Smile, X } from 'lucide-react';
import type { TopicPostTag } from './TopicPostCard';
import { FORUM_TAGS } from '@/data/mock_data';
import { useRequestUploadImage } from '@/hook/useRequest';

interface ForumComposeProps {
  onPost: (content: string, tag: TopicPostTag, images: string[]) => Promise<void> | void;
  posting?: boolean;
  openSignal?: number;
  onCloseComposer?: () => void;
  showEntryButton?: boolean;
  mobileBottomSheet?: boolean;
}

const tags: TopicPostTag[] = ['讨论', '爆料', '分析'];
const visibilityOptions = ['所有人可见', '仅自己可见', '所有人不可见'] as const;
const emojiOptions = ['😀', '🔥', '🐢', '🎯', '💡', '🚀', '👏', '🍉'] as const;
const topicOptions = ['# 我心中引进最成功的外援', '# 大热必聊'] as const;
const MAX_IMAGES = 9;
const MAX_CHARS = 280;

type LocalComposeImage = {
  file: File;
  previewUrl: string;
};

export const ForumCompose: React.FC<ForumComposeProps> = ({
  onPost,
  posting = false,
  openSignal,
  onCloseComposer,
  showEntryButton = true,
  mobileBottomSheet = false,
}) => {
  const uploadImageMutation = useRequestUploadImage();
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [tag, setTag] = useState<TopicPostTag>('讨论');
  const [images, setImages] = useState<LocalComposeImage[]>([]);
  const [focused, setFocused] = useState(false);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>('所有人可见');
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [toolbarHint, setToolbarHint] = useState('支持本地上传最多 9 张图片');
  const [submitting, setSubmitting] = useState(false);
  const previousOpenSignalRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Mobile publish entry:
   * 当手机端底部中间“发布”按钮被点击时，外层会递增 openSignal。
   * 这里只有 signal 相比上一次“真的变大”时才打开。
   * 这样刷新、初始化挂载、同值重渲染都不会误触发发布弹层。
   * 这样中间发布按钮就只负责“发帖子”，不会混入其他导航含义。
   */
  useEffect(() => {
    if (typeof openSignal !== 'number') return;
    if (previousOpenSignalRef.current === null) {
      previousOpenSignalRef.current = openSignal;
      return;
    }
    const hasIncreased = openSignal > previousOpenSignalRef.current;
    previousOpenSignalRef.current = openSignal;
    if (!hasIncreased) return;
    setMobileComposerOpen(true);
    setFocused(true);
  }, [openSignal]);

  /**
   * closeMobileComposer:
   * 手机端底部发帖弹层的统一关闭入口。
   *
   * 以后如果你要补“关闭动画结束后清理草稿”之类的逻辑，
   * 优先从这个函数下手，不要分散到多个按钮里分别维护。
   */
  const closeMobileComposer = () => {
    setMobileComposerOpen(false);
    setFocused(false);
    onCloseComposer?.();
  };

  const handleSubmit = async () => {
    const trimmedContent = content.trim();
    const mergedContent = [selectedTopic.trim(), trimmedContent].filter(Boolean).join(' ');
    if (!mergedContent && images.length === 0) return;

    try {
      setSubmitting(true);
      setToolbarHint('正在发布帖子...');

      const uploadedImageUrls = await Promise.all(
        images.map(async (item) => {
          const result = await uploadImageMutation.mutateAsync(item.file);
          return result.url;
        }),
      );

      await onPost(mergedContent, tag, uploadedImageUrls.filter(Boolean));
      images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setContent('');
      setSelectedTopic('');
      setImages([]);
      setFocused(false);
      setMobileComposerOpen(false);
      setVisibilityOpen(false);
      setEmojiOpen(false);
      setToolbarHint('发布成功');
      onCloseComposer?.();
    } catch (error) {
      setToolbarHint(error instanceof Error ? error.message || '发布失败，请稍后重试' : '发布失败，请稍后重试');
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const openFilePicker = () => {
    if (images.length >= MAX_IMAGES) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remain = MAX_IMAGES - images.length;
    const selectedFiles = files.filter((file) => file.type.startsWith('image/')).slice(0, remain);
    if (selectedFiles.length === 0) {
      setToolbarHint('只能选择图片文件');
      e.target.value = '';
      return;
    }

    try {
      const nextImages = selectedFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImages((prev) => [...prev, ...nextImages]);
      setToolbarHint(
        files.length > remain
          ? `最多上传 ${MAX_IMAGES} 张，已为你保留前 ${remain} 张`
          : `已添加 ${selectedFiles.length} 张图片`
      );
    } catch {
      setToolbarHint('图片读取失败，请重试');
    }

    setFocused(true);
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      const target = prev[idx];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  /**
   * appendEmoji:
   * 手机端发帖层的表情插入入口。
   * 这里统一把表情追加到正文末尾，避免以后在多个按钮里分散维护插入逻辑。
   */
  const appendEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    setFocused(true);
    textareaRef.current?.focus();
  };

  /**
   * prependTopic:
   * 话题和正文分开维护。
   * 点击话题时只替换当前话题，不把话题混进输入框正文里。
   */
  const prependTopic = (topic: string) => {
    setSelectedTopic(topic);
    setFocused(true);
    textareaRef.current?.focus();
  };

  const canPost = content.trim().length > 0 || images.length > 0;
  const charCount = content.length;

  /**
   * mobileSheetComposer:
   * 手机端专用的底部发帖弹层。
   *
   * 这里恢复到改参考图 UI 之前那一版：
   * - 黑色背景
   * - 绿色强调色
   * - 保留补充说明、图片区、添加专区、公开、帖子、添加话题
   * - 底部保留帖子 / 投票 / 模板和固定发布按钮
   */
  const mobileSheetComposer = (
    <AnimatePresence>
      {mobileBottomSheet && mobileComposerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] md:hidden"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-[4px]"
            onClick={closeMobileComposer}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute inset-x-0 bottom-0 top-[20px] flex flex-col overflow-hidden rounded-t-[30px] border-t border-white/10 bg-[linear-gradient(180deg,#0f1013_0%,#0a0b0d_100%)] shadow-[0_-24px_64px_rgba(0,0,0,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
              <button
                type="button"
                onClick={closeMobileComposer}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/6 text-zinc-200"
              >
                <X size={18} />
              </button>
              <div className="text-[15px] font-bold text-white">发布帖子</div>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[12px] font-semibold text-zinc-300"
              >
                草稿箱
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4">
              <div className="mb-4 flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setVisibilityOpen((prev) => !prev);
                      setEmojiOpen(false);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-zinc-300"
                  >
                    {visibility}
                  </button>
                  {visibilityOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[150px] overflow-hidden rounded-2xl border border-white/10 bg-[#15161a] shadow-xl">
                      {visibilityOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setVisibility(option);
                            setVisibilityOpen(false);
                          }}
                          className={`block w-full px-4 py-3 text-left text-[13px] transition-colors ${
                            visibility === option
                              ? 'bg-emerald-500/12 text-emerald-300'
                              : 'text-zinc-300 hover:bg-white/[0.04]'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEmojiOpen((prev) => !prev);
                      setVisibilityOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] font-semibold text-zinc-300"
                  >
                    <Smile size={16} />
                    表情
                  </button>
                  {emojiOpen && (
                    <div className="absolute left-0 top-[calc(100%+8px)] z-20 grid w-[188px] grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-[#15161a] p-3 shadow-xl">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => appendEmoji(emoji)}
                          className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-[20px] transition-colors hover:bg-emerald-500/12"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/8 bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {selectedTopic ? (
                  <div className="mb-2 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-[14px] font-semibold text-emerald-300">
                    {selectedTopic}
                  </div>
                ) : null}
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                  onFocus={() => setFocused(true)}
                  placeholder="分享你的心情、观点和经历..."
                  rows={4}
                  className="w-full resize-none border-0 bg-transparent text-[18px] leading-[1.7] tracking-[-0.01em] text-white outline-none placeholder:text-zinc-500"
                />
                <div className="mt-3 flex items-center justify-end">
                  <div className={`text-[11px] ${charCount > MAX_CHARS ? 'text-rose-300' : 'text-zinc-500'}`}>{charCount}/{MAX_CHARS}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative h-[104px] w-[104px] overflow-hidden rounded-[22px] border border-white/10 bg-[#111215]">
                      <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-white/[0.03] text-zinc-400"
                    >
                      <Image size={24} />
                      <span className="mt-2 text-[12px] font-medium">添加图片</span>
                    </button>
                  )}
                </div>
                <div className="mt-3 text-[12px] text-zinc-500">已添加 {images.length}/{MAX_IMAGES} 张图片</div>
              </div>

              {/* <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[14px] font-semibold text-zinc-200"
                >
                  添加专区
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[14px] font-semibold text-zinc-300"
                >
                  公开
                </button>
                <button
                  type="button"
                  className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-[14px] font-semibold text-emerald-300"
                >
                  帖子
                </button>
              </div> */}

              <div className="mt-4 rounded-[22px] border border-white/8 bg-white/[0.02] p-4">
                <div className="mb-3 text-[15px] font-semibold text-zinc-200">添加话题</div>
                <div className="flex flex-wrap items-center gap-2">
                  {topicOptions.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => prependTopic(topic)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-zinc-300 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {tags.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTag(item)}
                    className={`rounded-full px-3 py-2 text-[12px] font-semibold transition-colors ${
                      tag === item
                        ? `${FORUM_TAGS[item]} border-transparent`
                        : 'border border-white/10 bg-white/[0.04] text-zinc-300'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/8 bg-[#0b0c0f]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={posting || submitting || !canPost || charCount > MAX_CHARS}
                className="h-13 w-full rounded-[18px] bg-[linear-gradient(135deg,#34d399,#10b981)] text-[18px] font-bold text-[#04130c] shadow-[0_10px_30px_rgba(16,185,129,0.28)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? '发布中...' : '发布'}
              </button>
              <div className="mt-3 text-[12px] text-zinc-500">{toolbarHint}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const desktopComposer = (
    <div className="legacy-forum-compose rounded-[28px] border border-white/8 bg-[#0f1013] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.24)] md:rounded-none md:border-0 md:bg-transparent md:px-4 md:py-4 md:shadow-none">
      <div className="legacy-forum-compose-row">
        <div className="min-w-0">
          {!mobileComposerOpen && showEntryButton && (
            <button
              type="button"
              onClick={() => {
                setMobileComposerOpen(true);
                setFocused(true);
              }}
              className="flex w-full items-center gap-3 rounded-[22px] border border-white/8 bg-[#14161a] px-3 py-3 text-left md:hidden"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#142f58] text-[20px] text-cyan-300">
                ✍️
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-white">发布帖子</div>
                <div className="mt-0.5 text-[12px] text-[#7f9bc4]">点一下，发你的新观点或爆料</div>
              </div>
            </button>
          )}

          <div className={mobileComposerOpen || !showEntryButton ? 'block md:block' : 'hidden md:block'}>
          
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col gap-3 rounded-[22px] border border-white/8 bg-[#14161a] px-3 py-3 backdrop-blur-sm md:flex-row md:gap-4 md:rounded-xl md:border-cyan-300/22 md:bg-[#0a1d3c]/72 md:px-3 md:py-2">
              <div className="flex min-w-0 gap-3 md:flex-1">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#142f58] text-[20px] text-cyan-300 md:h-15 md:w-15">💬</div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onFocus={() => setFocused(true)}
                  placeholder="写点什么..."
                  rows={5}
                  className="legacy-forum-compose-input max-h-100 w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-[#d9e8ff] outline-none placeholder:text-[#7f9bc4] md:text-[14px]"
                />
              </div>
              <div className="flex justify-end md:items-end">
                <button
                  onClick={handleSubmit}
                  disabled={posting || submitting || !canPost || charCount > MAX_CHARS}
                  className="legacy-forum-compose-submit h-[38px] w-full rounded-full border-0 bg-gradient-to-b from-[#33c6bb] to-[#219f95] px-3 text-[14px] font-bold text-[#e8fff9] shadow-[0_0_12px_rgba(35,187,176,0.45)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 md:h-[36px] md:w-auto md:min-w-[86px] md:rounded-[8px] md:px-4"
                >
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="!mb-2 flex items-center justify-between text-[12px] text-[#8eb0da]">
                <span>已添加 {images.length}/{MAX_IMAGES} 张图片</span>
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={images.length >= MAX_IMAGES}
                  className="cursor-pointer border-0 bg-transparent font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  继续添加
                </button>
              </div>
            )}
            {images.length > 0 && (
              <div className="!mb-3 grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-slate-200 dark:border-rdark-border md:grid-cols-4">
                {images.map((image, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden bg-[#09182f]">
                    <img src={image.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full border-0 bg-black/70 text-white opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/80"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/55 !px-2 !py-0.5 text-[11px] text-white">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {focused && (
              <div className="!mb-2 !mt-2 flex flex-wrap items-center gap-1.5 border-b border-cyan-400/20 !pb-2">
                <span className="!mr-1 text-[14px] text-[#8eb0da] md:text-[16px]">标签:</span>
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTag(t)}
                    className={`cursor-pointer rounded-full border !px-3 !py-1 text-[13px] font-semibold transition-all md:text-[16px] ${
                      tag === t
                        ? `${FORUM_TAGS[t]} border-transparent`
                        : 'border-cyan-300/20 bg-transparent text-[#9eb8da] hover:bg-cyan-500/10'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="legacy-forum-compose-foot flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between md:pt-1">
              <div className="legacy-forum-compose-tools flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={submitting || images.length >= MAX_IMAGES}
                  className={`group relative flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[12px] font-semibold transition-all md:text-[13px] ${
                    images.length > 0
                      ? 'bg-cyan-500/12 text-cyan-200'
                      : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                  } disabled:cursor-not-allowed disabled:opacity-30`}
                  title="添加图片"
                >
                  <Image size={18} />
                  <span className="hidden sm:inline">图片</span>
                  <span className="rounded-full bg-white/8 !px-1.5 !py-0.5 text-[10px] text-[#b8dcff] md:text-[11px]">{images.length}/{MAX_IMAGES}</span>
                </button>
              </div>

              <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
                <div className="text-left md:text-right">
                  <div className="text-[12px] text-[#8eb0da]">{toolbarHint}</div>
                  <div className={`text-[11px] ${charCount > MAX_CHARS ? 'text-rose-300' : 'text-[#6f8fb8]'}`}>
                    {charCount}/{MAX_CHARS}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileSheetComposer}
      <div className="hidden md:block">{desktopComposer}</div>
      {!mobileBottomSheet && <div className="md:hidden">{desktopComposer}</div>}
    </>
  );
};
