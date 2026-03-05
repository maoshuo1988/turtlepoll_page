import React, { useState, useRef } from 'react';
import { Image, X, Smile, BarChart3, MapPin } from 'lucide-react';
import type { ForumPost } from '../data/mock_data';
import { FORUM_TAGS, SAMPLE_IMAGES } from '../data/mock_data';

interface ForumComposeProps {
  onPost: (content: string, tag: ForumPost['tag'], images: string[]) => void;
}

const tags: ForumPost['tag'][] = ['讨论', '爆料', '分析'];

export const ForumCompose: React.FC<ForumComposeProps> = ({ onPost }) => {
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<ForumPost['tag']>('讨论');
  const [images, setImages] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed && images.length === 0) return;
    onPost(trimmed, tag, images);
    setContent('');
    setImages([]);
    setFocused(false);
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
    <div className="px-4 py-3">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-rdark-input grid place-items-center text-xl shrink-0 mt-1">
          🦊
        </div>

        {/* Compose area */}
        <div className="flex-1 min-w-0">
          {/* Audience selector (visual only) */}
          {focused && (
            <button className="text-[13px] font-bold text-blue-500 border border-blue-200 dark:border-blue-800 rounded-full px-3 py-0.5 mb-2 bg-transparent cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              所有人可见 ▾
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder="有什么新鲜事？"
            rows={focused ? 4 : 2}
            className="w-full resize-none bg-transparent border-0 outline-none text-[20px] text-slate-900 dark:text-rdark-text placeholder:text-slate-500/60 dark:placeholder:text-rdark-text2/60 leading-relaxed font-light"
          />

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
            <div className="flex items-center gap-1.5 pb-3 mb-3 border-b border-slate-100 dark:border-rdark-border">
              <span className="text-[12px] text-slate-400 dark:text-rdark-text2 mr-1">标签:</span>
              {tags.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`text-[12px] font-semibold px-3 py-1 rounded-full cursor-pointer transition-all border ${
                    tag === t
                      ? `${FORUM_TAGS[t]} border-transparent`
                      : 'bg-transparent text-slate-500 dark:text-rdark-text2 border-slate-200 dark:border-rdark-border hover:bg-slate-50 dark:hover:bg-rdark-hover'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between">
            {/* Media buttons */}
            <div className="flex items-center -ml-2">
              <button
                onClick={addImage}
                disabled={images.length >= 4}
                className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 cursor-pointer border-0 bg-transparent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="添加图片"
              >
                <Image size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 cursor-pointer border-0 bg-transparent transition-colors">
                <BarChart3 size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 cursor-pointer border-0 bg-transparent transition-colors">
                <Smile size={18} />
              </button>
              <button className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 cursor-pointer border-0 bg-transparent transition-colors">
                <MapPin size={18} />
              </button>
            </div>

            {/* Right: char count + post button */}
            <div className="flex items-center gap-3">
              {/* Circular character counter */}
              {focused && charCount > 0 && (
                <div className="relative w-6 h-6">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"
                      className="text-slate-200 dark:text-rdark-border" />
                    <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2"
                      strokeDasharray={`${Math.min(charCount / MAX_CHARS, 1) * 62.8} 62.8`}
                      className={charCount > MAX_CHARS ? 'text-red-500' : charCount > MAX_CHARS * 0.8 ? 'text-amber-500' : 'text-blue-500'}
                      strokeLinecap="round" />
                  </svg>
                </div>
              )}

              {focused && <div className="w-px h-6 bg-slate-200 dark:bg-rdark-border" />}

              <button
                onClick={handleSubmit}
                disabled={!canPost || charCount > MAX_CHARS}
                className="px-5 py-2 rounded-full text-[15px] font-bold cursor-pointer transition-all border-0 bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                发帖
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
