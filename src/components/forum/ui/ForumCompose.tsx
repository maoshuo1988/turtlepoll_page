import React, { useState, useRef } from 'react';
import { Image, X, Smile, BarChart3, MapPin } from 'lucide-react';
import type { ForumPost } from '../../../data/mock_data';
import { FORUM_TAGS, SAMPLE_IMAGES } from '../../../data/mock_data';

interface ForumComposeProps {
  onPost: (content: string, tag: ForumPost['tag'], images: string[]) => Promise<void> | void;
  posting?: boolean;
}

const tags: ForumPost['tag'][] = ['讨论', '爆料', '分析'];
const visibilityOptions = ['所有人可见', '仅自己可见', '所有人不可见'] as const;

export const ForumCompose: React.FC<ForumComposeProps> = ({ onPost, posting = false }) => {
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<ForumPost['tag']>('讨论');
  const [images, setImages] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [visibility, setVisibility] = useState<(typeof visibilityOptions)[number]>('所有人可见');
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) return;
    await onPost(trimmed, tag, images);
    setContent('');
    setImages([]);
    setFocused(false);
    setVisibilityOpen(false);
  };

  const addImage = () => {
    if (images.length >= 4) return;
    // Pick a random sample image not already selected
    const available = SAMPLE_IMAGES.filter((s) => !images.includes(s));
    if (available.length === 0) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    setImages((prev) => [...prev, pick]);
    setFocused(true);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const canPost = content.trim().length > 0 || images.length > 0;
  const charCount = content.length;
  const MAX_CHARS = 280;

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
              disabled={posting || !canPost || charCount > MAX_CHARS}
              className="legacy-forum-compose-submit h-[36px] min-w-[86px] rounded-[8px] border-0 bg-gradient-to-b from-[#33c6bb] to-[#219f95] px-4 text-[14px] font-bold text-[#e8fff9] shadow-[0_0_12px_rgba(35,187,176,0.45)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              发布
            </button>
            </div>
          </div>

          {/* Image preview grid */}
          {images.length > 0 && (
            <div className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-rdark-border mb-3 grid gap-0.5 ${
              images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            } ${images.length <= 2 ? 'max-h-[200px]' : 'max-h-[300px]'}`}>
              {images.map((src, i) => (
                <div key={i} className={`relative group ${images.length === 3 && i === 0 ? 'row-span-2' : ''}`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0 backdrop-blur-sm"
                  >
                    <X size={14} />
                  </button>
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
            <div className="legacy-forum-compose-tools flex items-center gap-1">
              <button
                onClick={addImage}
                disabled={images.length >= 4}
                className="cursor-pointer rounded-full border-0 bg-transparent p-1.5 text-[#7fb6f6] transition-colors hover:bg-cyan-500/10 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
                title="添加图片"
              >
                <Image size={24} />
              </button>
              <button className="cursor-pointer rounded-full border-0 bg-transparent !p-1.5 text-[#7fb6f6] transition-colors hover:bg-cyan-500/10 hover:text-cyan-300">
                <BarChart3 size={24} />
              </button>
              <button className="cursor-pointer rounded-full border-0 bg-transparent !p-1.5 text-[#7fb6f6] transition-colors hover:bg-cyan-500/10 hover:text-cyan-300">
                <Smile size={24} />
              </button>
              <button className="cursor-pointer rounded-full border-0 bg-transparent !p-1.5 text-[#7fb6f6] transition-colors hover:bg-cyan-500/10 hover:text-cyan-300">
                <MapPin size={24} />
              </button>
            </div>

            {/* Right: char count + post button */}
            <div className="flex items-center gap-2">
              <button className="cursor-default border-0 bg-transparent text-[12px] font-medium text-[#8eb0da]">•••</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
