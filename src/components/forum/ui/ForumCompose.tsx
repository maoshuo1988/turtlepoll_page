import React, { useRef, useState } from 'react';
import { Image, X, Smile, BarChart3, MapPin, ChevronUp } from 'lucide-react';
import type { TopicPostTag } from './TopicPostCard';
import { FORUM_TAGS } from '../../../data/mock_data';
import { useRequestUploadImage } from '@/hook/useRequest';

interface ForumComposeProps {
  onPost: (content: string, tag: TopicPostTag, images: string[]) => Promise<void> | void;
  posting?: boolean;
}

const tags: TopicPostTag[] = ['讨论', '爆料', '分析'];
const visibilityOptions = ['所有人可见', '仅自己可见', '所有人不可见'] as const;
const emojiOptions = ['😀', '🔥', '🐢', '🎯', '💡', '🚀', '👏', '🍉'] as const;
const locationOptions = ['上海', '北京', '深圳', '杭州', '广州'] as const;
const MAX_IMAGES = 9;
const MAX_CHARS = 280;

type LocalComposeImage = {
  file: File;
  previewUrl: string;
};

export const ForumCompose: React.FC<ForumComposeProps> = ({ onPost, posting = false }) => {
  const uploadImageMutation = useRequestUploadImage();
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<TopicPostTag>('讨论');
  const [images, setImages] = useState<LocalComposeImage[]>([]);
  const [focused, setFocused] = useState(false);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>('所有人可见');
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [location, setLocation] = useState<(typeof locationOptions)[number] | ''>('');
  const [pollEnabled, setPollEnabled] = useState(false);
  const [toolbarHint, setToolbarHint] = useState('支持本地上传最多 9 张图片');
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) return;

    try {
      setSubmitting(true);
      setToolbarHint('正在发布帖子...');

      const uploadedImageUrls = await Promise.all(
        images.map(async (item) => {
          const result = await uploadImageMutation.mutateAsync(item.file);
          return result.url;
        }),
      );

      await onPost(trimmed, tag, uploadedImageUrls.filter(Boolean));
      images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setContent('');
      setImages([]);
      setFocused(false);
      setMobileComposerOpen(false);
      setVisibilityOpen(false);
      setEmojiOpen(false);
      setLocationOpen(false);
      setLocation('');
      setPollEnabled(false);
      setToolbarHint('发布成功');
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

  const appendEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    setFocused(true);
    textareaRef.current?.focus();
  };

  const togglePoll = () => {
    setPollEnabled((prev) => {
      const next = !prev;
      setToolbarHint(next ? '投票功能先做占位，后面可以直接接正式表单' : '已关闭投票草稿');
      return next;
    });
    setFocused(true);
  };

  const selectLocation = (nextLocation: (typeof locationOptions)[number]) => {
    setLocation(nextLocation);
    setLocationOpen(false);
    setToolbarHint(`已附带位置：${nextLocation}`);
    setFocused(true);
  };

  const canPost = content.trim().length > 0 || images.length > 0;
  const charCount = content.length;

  return (
    <div className="legacy-forum-compose rounded-[28px] border border-white/8 bg-[#0f1013] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.24)] md:rounded-none md:border-0 md:bg-transparent md:px-4 md:py-4 md:shadow-none">
      <div className="legacy-forum-compose-row">
        <div className="min-w-0">
          {!mobileComposerOpen && (
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

          <div className={mobileComposerOpen ? 'block md:block' : 'hidden md:block'}>
          {mobileComposerOpen && (
            <div className="mb-2 flex justify-end md:hidden">
              <button
                type="button"
                onClick={() => {
                  setMobileComposerOpen(false);
                  setFocused(false);
                  setVisibilityOpen(false);
                  setEmojiOpen(false);
                  setLocationOpen(false);
                }}
                className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-[#14161a] px-3 py-1.5 text-[12px] font-semibold text-zinc-300"
              >
                <ChevronUp size={14} />
                收起
              </button>
            </div>
          )}
          {/* Audience selector (visual only) */}
          {focused && (
            <div className="relative  !mb-2 inline-block">
              <button
                onClick={() => setVisibilityOpen((v) => !v)}
                className="cursor-pointer rounded bg-cyan-500/10 !px-3 !py-1 text-[12px] font-bold text-cyan-200 transition-colors hover:bg-cyan-500/20"
              >
                {visibility} ▾
              </button>
              {visibilityOpen && (
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 w-[min(180px,calc(100vw-48px))] overflow-hidden rounded-md border border-cyan-300/25 bg-[#0c1f3f] shadow-lg">
                  {visibilityOptions.map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setVisibility(option);
                        setVisibilityOpen(false);
                      }}
                      className={`block w-full cursor-pointer border-0 px-3 py-1.5 text-left text-[12px] transition-colors ${
                        visibility === option
                          ? 'bg-cyan-500/20 text-cyan-100'
                          : 'bg-transparent text-cyan-200 hover:bg-cyan-500/12'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                rows={ 5 }
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

          {/* Image preview grid */}
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

          {/* Tag selector */}
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

          {/* Bottom toolbar */}
          <div className="legacy-forum-compose-foot flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between md:pt-1">
            {/* Media buttons */}
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

              <button
                type="button"
                onClick={togglePoll}
                className={`flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[12px] font-semibold transition-all md:text-[13px] ${
                  pollEnabled
                    ? 'bg-emerald-500/12 text-emerald-300'
                    : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                }`}
                title="切换投票草稿"
              >
                <BarChart3 size={18} />
                <span className="hidden sm:inline">投票</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setEmojiOpen((prev) => !prev);
                    setLocationOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[12px] font-semibold transition-all md:text-[13px] ${
                    emojiOpen
                      ? 'bg-cyan-500/12 text-cyan-200'
                      : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                  title="插入表情"
                >
                  <Smile size={18} />
                  <span className="hidden sm:inline">表情</span>
                </button>
                {emojiOpen && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 grid w-[min(196px,calc(100vw-48px))] grid-cols-4 gap-2 rounded-2xl border border-cyan-300/20 bg-[#0b1e3d] !p-2 shadow-xl">
                    {emojiOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => appendEmoji(emoji)}
                        className="grid h-10 w-10 place-items-center rounded-xl border-0 bg-white/5 text-[20px] transition-colors hover:bg-cyan-500/12"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setLocationOpen((prev) => !prev);
                    setEmojiOpen(false);
                  }}
                  className={`flex max-w-[112px] items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[12px] font-semibold transition-all md:max-w-none md:text-[13px] ${
                    location
                      ? 'bg-violet-500/12 text-violet-200'
                      : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                  title="附带位置"
                >
                  <MapPin size={18} />
                  <span className="truncate">{location || '位置'}</span>
                </button>
                {locationOpen && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-[min(180px,calc(100vw-48px))] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0b1e3d] shadow-xl">
                    {locationOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => selectLocation(option)}
                        className={`block w-full border-0 !px-3 !py-2 text-left text-[13px] transition-colors ${
                          location === option
                            ? 'bg-cyan-500/14 text-cyan-100'
                            : 'bg-transparent text-[#c3ddff] hover:bg-cyan-500/10'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                    {location && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocation('');
                          setLocationOpen(false);
                          setToolbarHint('已移除位置');
                        }}
                        className="block w-full border-0 border-t border-cyan-300/10 !px-3 !py-2 text-left text-[13px] text-rose-200 transition-colors hover:bg-rose-500/10"
                      >
                        不显示位置
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: char count + post button */}
            <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
              <div className="text-left md:text-right">
                <div className="text-[12px] text-[#8eb0da]">{toolbarHint}</div>
                <div className={`text-[11px] ${charCount > MAX_CHARS ? 'text-rose-300' : 'text-[#6f8fb8]'}`}>
                  {charCount}/{MAX_CHARS}
                </div>
              </div>
            </div>
          </div>

          {pollEnabled && (
            <div className="!mt-3 rounded-2xl border border-emerald-400/18 bg-emerald-500/6 !p-3 text-[13px] text-emerald-100">
              <div className="font-semibold">投票草稿已开启</div>
              <div className="!mt-1 text-emerald-200/80">这一版先保留交互入口，后面接正式投票字段时可以直接扩展这里。</div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
