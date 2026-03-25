import React, { useRef, useState } from 'react';
import { Image, X, Smile, BarChart3, MapPin } from 'lucide-react';
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
    <div className="legacy-forum-compose !p-4">
      <div className="legacy-forum-compose-row">
        <div className="min-w-0">
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
                <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[132px] overflow-hidden rounded-md border border-cyan-300/25 bg-[#0c1f3f] shadow-lg">
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

          <div className="flex  gap-4 rounded-xl border border-cyan-300/22 bg-[#0a1d3c]/72 !px-3 !py-2 backdrop-blur-sm">
            <div className="grid h-15 w-15 shrink-0 place-items-center rounded-full bg-[#142f58] text-cyan-300">💬</div>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="写点什么..."
              rows={ 5 }
              className="legacy-forum-compose-input max-h-100 w-full resize-none border-0 bg-transparent text-[14px] leading-relaxed text-[#d9e8ff] outline-none placeholder:text-[#7f9bc4]"
            />
            <div className='flex items-end'>
              <button
              onClick={handleSubmit}
              disabled={posting || submitting || !canPost || charCount > MAX_CHARS}
              className="legacy-forum-compose-submit h-[36px] min-w-[86px] rounded-[8px] border-0 bg-gradient-to-b from-[#33c6bb] to-[#219f95] px-4 text-[14px] font-bold text-[#e8fff9] shadow-[0_0_12px_rgba(35,187,176,0.45)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="!mb-2 !mt-2 flex items-center gap-1.5 border-b border-cyan-400/20 !pb-2">
              <span className="!mr-1 text-[16px] text-[#8eb0da]">标签:</span>
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`cursor-pointer rounded-full border !px-3 !py-1 text-[16px] font-semibold transition-all ${
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
          <div className="legacy-forum-compose-foot flex items-center justify-between !pt-1">
            {/* Media buttons */}
            <div className="legacy-forum-compose-tools flex items-center gap-2">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={submitting || images.length >= MAX_IMAGES}
                className={`group relative flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[13px] font-semibold transition-all ${
                  images.length > 0
                    ? 'bg-cyan-500/12 text-cyan-200'
                    : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                } disabled:cursor-not-allowed disabled:opacity-30`}
                title="添加图片"
              >
                <Image size={18} />
                <span>图片</span>
                <span className="rounded-full bg-white/8 !px-1.5 !py-0.5 text-[11px] text-[#b8dcff]">{images.length}/{MAX_IMAGES}</span>
              </button>

              <button
                type="button"
                onClick={togglePoll}
                className={`flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[13px] font-semibold transition-all ${
                  pollEnabled
                    ? 'bg-emerald-500/12 text-emerald-300'
                    : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                }`}
                title="切换投票草稿"
              >
                <BarChart3 size={18} />
                <span>投票</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setEmojiOpen((prev) => !prev);
                    setLocationOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[13px] font-semibold transition-all ${
                    emojiOpen
                      ? 'bg-cyan-500/12 text-cyan-200'
                      : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                  title="插入表情"
                >
                  <Smile size={18} />
                  <span>表情</span>
                </button>
                {emojiOpen && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 grid w-[196px] grid-cols-4 gap-2 rounded-2xl border border-cyan-300/20 bg-[#0b1e3d] !p-2 shadow-xl">
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
                  className={`flex items-center gap-2 rounded-full border border-cyan-300/15 !px-3 !py-2 text-[13px] font-semibold transition-all ${
                    location
                      ? 'bg-violet-500/12 text-violet-200'
                      : 'bg-transparent text-[#7fb6f6] hover:bg-cyan-500/10 hover:text-cyan-300'
                  }`}
                  title="附带位置"
                >
                  <MapPin size={18} />
                  <span>{location || '位置'}</span>
                </button>
                {locationOpen && (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 min-w-[148px] overflow-hidden rounded-2xl border border-cyan-300/20 bg-[#0b1e3d] shadow-xl">
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
            <div className="flex items-center gap-3">
              <div className="text-right">
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
  );
};
