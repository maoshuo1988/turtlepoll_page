/**
 * 文件说明：Forum Compose，论坛发帖表单（标题、标签、正文、配图）。
 */
import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Image as ImageIcon, SendHorizonal, X } from 'lucide-react';
import type { TopicPostTag } from './TopicPostCard';
import { FORUM_TAGS } from '@/data/mockData';
import { useRequestUploadImage } from '@/hooks/useAuthRequests';
import { compressImageForUpload } from '@/utils/imageCompress';

export type ForumComposeSubmitPayload = {
  title: string;
  content: string;
  tag: TopicPostTag;
  images: string[];
};

interface ForumComposeProps {
  onPost: (payload: ForumComposeSubmitPayload) => Promise<void> | void;
  posting?: boolean;
  openSignal?: number;
  onCloseComposer?: () => void;
  showEntryButton?: boolean;
  mobileBottomSheet?: boolean;
}

const categoryTags: TopicPostTag[] = ['讨论', '爆料', '分析'];
const MAX_IMAGES = 9;
const TITLE_MAX = 100;
const CONTENT_MAX = 3000;

type LocalComposeImage = {
  /** 稳定 key，避免列表调和异常导致末尾图「丢失」 */
  id: string;
  file: File;
  previewUrl: string;
};

const composeInputShell =
  'w-full rounded-lg border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-[13px] text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 md:text-[13px]';

const composerCard =
  'rounded-xl border border-white/[0.08] bg-[#0f1013]/95 p-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.22)] md:p-3 dark:bg-[#0f1013]/98';

/** 配图缩略图（略收紧以降低发帖卡片总高度） */
const COMPOSE_THUMB_CLASS = 'h-[60px] w-[60px] md:h-[68px] md:w-[68px]';

export const ForumCompose: React.FC<ForumComposeProps> = ({
  onPost,
  posting = false,
  openSignal,
  onCloseComposer,
  showEntryButton = true,
  mobileBottomSheet = false,
}) => {
  const uploadImageMutation = useRequestUploadImage();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<TopicPostTag>('讨论');
  const [images, setImages] = useState<LocalComposeImage[]>([]);
  const [mobileComposerOpen, setMobileComposerOpen] = useState(false);
  const [toolbarHint, setToolbarHint] = useState(
    '支持 JPG / PNG / GIF，大图自动压缩至约 1MB 内，最多 9 张',
  );
  const [submitting, setSubmitting] = useState(false);
  /** 本地选图后压缩处理中 */
  const [imageProcessing, setImageProcessing] = useState(false);
  /** 发帖配图大图预览（索引对应 images） */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previousOpenSignalRef = useRef<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const focusComposeTitle = () => {
    window.requestAnimationFrame(() => {
      const sheet = document.getElementById('forum-compose-title-sheet');
      const mobile = document.getElementById('forum-compose-title-mobile');
      const el =
        (sheet instanceof HTMLInputElement ? sheet : null) ??
        (mobile instanceof HTMLInputElement ? mobile : null) ??
        titleInputRef.current;
      el?.focus();
    });
  };

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
    setTimeout(() => focusComposeTitle(), 50);
  }, [openSignal]);

  useEffect(() => {
    if (previewIndex === null) return;
    if (images.length === 0) {
      setPreviewIndex(null);
      return;
    }
    if (previewIndex > images.length - 1) {
      setPreviewIndex(images.length - 1);
    }
  }, [previewIndex, images.length]);

  useEffect(() => {
    if (previewIndex === null) return;
    const max = images.length - 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewIndex(null);
        return;
      }
      if (max <= 0) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPreviewIndex((i) => (i === null ? i : Math.max(0, i - 1)));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPreviewIndex((i) => (i === null ? i : Math.min(max, i + 1)));
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewIndex, images.length]);

  const closeMobileComposer = () => {
    setMobileComposerOpen(false);
    onCloseComposer?.();
  };

  const handleSubmit = async () => {
    const trimmedTitle = title.trim().slice(0, TITLE_MAX);
    const trimmedContent = content.trim().slice(0, CONTENT_MAX);
    if (!trimmedTitle && !trimmedContent && images.length === 0) return;

    try {
      setSubmitting(true);
      setToolbarHint('正在发布…');

      const uploadedImageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        setToolbarHint(`上传配图 ${i + 1}/${images.length}…`);
        try {
          const result = await uploadImageMutation.mutateAsync(images[i].file);
          if (result?.url) uploadedImageUrls.push(result.url);
        } catch {
          setToolbarHint(`第 ${i + 1} 张图上传失败，可删掉该图或换一张后重试`);
          return;
        }
      }

      await onPost({
        title: trimmedTitle,
        content: trimmedContent || trimmedTitle,
        tag,
        images: uploadedImageUrls,
      });
      images.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setTitle('');
      setContent('');
      setImages([]);
      setPreviewIndex(null);
      setMobileComposerOpen(false);
      setToolbarHint('发布成功');
      onCloseComposer?.();
    } catch (error) {
      setToolbarHint(error instanceof Error ? error.message || '发布失败，请稍后重试' : '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const openFilePicker = () => {
    if (images.length >= MAX_IMAGES || imageProcessing) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = '';

    if (picked.length === 0) return;

    const imageFiles = picked.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setToolbarHint('只能选择图片文件');
      return;
    }

    void (async () => {
      try {
        setImageProcessing(true);
        const remainStart = MAX_IMAGES - imagesRef.current.length;
        if (remainStart <= 0) {
          setToolbarHint(`已达到 ${MAX_IMAGES} 张上限，请先删除再继续添加`);
          return;
        }

        const take = imageFiles.slice(0, remainStart);
        const compressedFiles: File[] = [];
        for (let i = 0; i < take.length; i++) {
          setToolbarHint(`正在压缩图片 ${i + 1}/${take.length}…`);
          compressedFiles.push(await compressImageForUpload(take[i]));
        }

        setImages((prev) => {
          const remain = MAX_IMAGES - prev.length;
          if (remain <= 0) return prev;
          const slice = compressedFiles.slice(0, remain);
          const nextImages: LocalComposeImage[] = slice.map((file) => ({
            id: `compose-img-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`}`,
            file,
            previewUrl: URL.createObjectURL(file),
          }));

          const hint =
            imageFiles.length > remainStart
              ? `已达 ${MAX_IMAGES} 张上限，本次加入 ${slice.length} 张`
              : slice.length === 1
                ? '已添加 1 张'
                : `已添加 ${slice.length} 张`;
          queueMicrotask(() => setToolbarHint(hint));

          return [...prev, ...nextImages];
        });
      } catch (err) {
        setToolbarHint(err instanceof Error ? err.message : '图片处理失败');
      } finally {
        setImageProcessing(false);
      }
    })();
  };

  const removeImage = (idx: number) => {
    setPreviewIndex((pi) => {
      if (pi === null) return null;
      if (pi === idx) return null;
      if (pi > idx) return pi - 1;
      return pi;
    });
    setImages((prev) => {
      const target = prev[idx];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const canPost = Boolean(title.trim() || content.trim() || images.length > 0);
  const contentOverLimit = content.length > CONTENT_MAX;
  const publishDisabled =
    posting || submitting || imageProcessing || !canPost || contentOverLimit;

  const bodyCounterWrap =
    'pointer-events-none absolute bottom-1.5 right-2 rounded bg-[#0a0a0c]/88 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-400 ring-1 ring-white/[0.08]';

  const renderComposeBodyTextarea = (opts: {
    rows: number;
    minHeightClass: string;
    wrapperClass?: string;
    paddingTopClass?: string;
  }) => (
    <div className={opts.wrapperClass ?? 'mt-2.5'}>
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX))}
          placeholder="正文：观点、数据、引用来源…"
          aria-label="正文"
          maxLength={CONTENT_MAX}
          rows={opts.rows}
          className={`${composeInputShell} w-full resize-y py-1.5 pb-8 pr-[4.5rem] leading-relaxed ${opts.minHeightClass} ${opts.paddingTopClass ?? ''}`}
        />
        <span className={bodyCounterWrap} aria-live="polite">
          {content.length}/{CONTENT_MAX}
        </span>
      </div>
    </div>
  );

  const scrollbarHide =
    '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

  const renderTagSection = () => (
    <div
      className="mt-1.5 flex items-center gap-2"
      title={categoryTags.length > 3 ? '标签较多时可横向滑动' : undefined}
    >
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        标签
      </span>
      <div className="min-w-0 flex-1 rounded-md border border-white/[0.07] bg-black/22 px-1 py-1">
        <div className={`flex flex-nowrap gap-1.5 overflow-x-auto overflow-y-visible ${scrollbarHide}`}>
          {categoryTags.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTag(item)}
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all md:px-2.5 md:text-[11px] ${
                tag === item
                  ? `${FORUM_TAGS[item]} border-transparent shadow-[0_0_12px_rgba(16,185,129,0.14)]`
                  : 'border-white/10 bg-white/[0.05] text-zinc-400 hover:border-emerald-400/22 hover:text-emerald-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const thumbnailEls = images.map((image, index) => (
    <div
      key={image.id}
      role="button"
      tabIndex={0}
      title="点击预览大图"
      className={`relative shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-white/12 bg-[#111215] outline-none ring-emerald-400/25 transition hover:border-emerald-400/35 focus-visible:ring-2 ${COMPOSE_THUMB_CLASS}`}
      onClick={() => setPreviewIndex(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPreviewIndex(index);
        }
      }}
    >
      <img src={image.previewUrl} alt="" className="pointer-events-none h-full w-full object-cover" />
      <button
        type="button"
        aria-label="移除该配图"
        onClick={(ev) => {
          ev.stopPropagation();
          removeImage(index);
        }}
        className="absolute right-1 top-1 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/80 text-white backdrop-blur-sm transition hover:bg-black"
      >
        <X size={15} />
      </button>
    </div>
  ));

  const composeActions = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-stretch">
          {/* 配图区：缩略图 + 上传固定在同一横条内横向滑动，始终挨在一起 */}
          <div
            className={`flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible rounded-lg border border-white/[0.1] bg-black/30 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${scrollbarHide}`}
          >
            {thumbnailEls}
            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={openFilePicker}
                disabled={submitting || imageProcessing}
                title={
                  imageProcessing
                    ? '正在压缩…'
                    : `上传配图（还可 ${MAX_IMAGES - images.length} 张）`
                }
                aria-label="上传配图"
                className={`grid shrink-0 place-items-center rounded-xl border border-dashed border-emerald-400/35 bg-emerald-500/[0.07] text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/12 disabled:opacity-35 ${COMPOSE_THUMB_CLASS}`}
              >
                <ImageIcon size={22} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={publishDisabled}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 text-[13px] font-bold text-[#04130c] shadow-[0_6px_18px_rgba(16,185,129,0.22)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <SendHorizonal size={16} strokeWidth={2.25} className="opacity-90" aria-hidden />
            {submitting ? '发布中…' : '发布'}
          </button>
        </div>
      </div>
      <p className="text-[10px] leading-snug text-zinc-600">
        {toolbarHint}
        {images.length > 0 ? ` · 配图 ${images.length}/${MAX_IMAGES}` : ''}
      </p>
    </>
  );

  const sharedHiddenInput = (
    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
  );

  const mobileSheetComposer = (
    <AnimatePresence>
      {mobileBottomSheet && mobileComposerOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeMobileComposer}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="absolute inset-x-0 bottom-0 top-[12%] flex flex-col overflow-hidden rounded-t-[26px] border border-white/10 border-b-0 bg-[linear-gradient(180deg,#111318_0%,#0a0b0e_100%)] shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <button
                type="button"
                onClick={closeMobileComposer}
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[13px] font-semibold text-zinc-300"
              >
                取消
              </button>
              <span className="text-[15px] font-bold text-white">发布线报</span>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={publishDisabled}
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-1.5 text-[13px] font-bold text-[#04130c] shadow-[0_8px_24px_rgba(16,185,129,0.35)] disabled:opacity-40"
              >
                {submitting ? '…' : '发布'}
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
                <input
                  id="forum-compose-title-sheet"
                  type="text"
                  value={title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                  placeholder="标题（可与正文择一）"
                  aria-label="标题"
                  className={composeInputShell}
                />

                {renderTagSection()}

                {renderComposeBodyTextarea({
                  rows: 3,
                  minHeightClass: 'min-h-[96px]',
                  wrapperClass: 'mt-1.5',
                })}
              </div>

              <div className="shrink-0 space-y-1.5 border-t border-white/8 bg-[#0c0d10]/98 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2">
                {composeActions}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const desktopComposer = (
    <div className={composerCard}>
      <input
        id="forum-compose-title-desktop"
        ref={titleInputRef}
        type="text"
        value={title}
        maxLength={TITLE_MAX}
        onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
        placeholder="标题（可与正文择一）"
        aria-label="标题"
        className={composeInputShell}
      />

      {renderTagSection()}

      {renderComposeBodyTextarea({
        rows: 2,
        minHeightClass: 'min-h-[52px] md:min-h-[60px]',
        wrapperClass: 'mt-1.5',
      })}

      <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">{composeActions}</div>
    </div>
  );

  const previewItem =
    previewIndex !== null && previewIndex < images.length ? images[previewIndex] : undefined;
  const previewCount = images.length;
  const canPreviewPrev = previewIndex !== null && previewIndex > 0;
  const canPreviewNext = previewIndex !== null && previewIndex < previewCount - 1;

  return (
    <>
      {sharedHiddenInput}
      {previewItem && previewIndex !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="配图预览"
          className="fixed inset-0 z-[140] flex flex-col items-center justify-center bg-black/45 p-4 backdrop-blur-[10px]"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            type="button"
            aria-label="关闭预览"
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/12 text-white shadow-lg transition hover:bg-white/22"
            onClick={() => setPreviewIndex(null)}
          >
            <X size={20} strokeWidth={2} />
          </button>

          <div
            className="relative w-full max-w-[min(96vw,920px)] px-11 sm:px-14"
            onClick={(e) => e.stopPropagation()}
          >
            {previewCount > 1 && (
              <button
                type="button"
                aria-label="上一张"
                disabled={!canPreviewPrev}
                className="absolute left-0 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-25"
                onClick={() =>
                  setPreviewIndex((i) => (i === null ? i : Math.max(0, i - 1)))
                }
              >
                <ChevronLeft className="h-7 w-7" strokeWidth={2} aria-hidden />
              </button>
            )}
            {previewCount > 1 && (
              <button
                type="button"
                aria-label="下一张"
                disabled={!canPreviewNext}
                className="absolute right-0 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/18 bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-25"
                onClick={() =>
                  setPreviewIndex((i) =>
                    i === null ? i : Math.min(previewCount - 1, i + 1),
                  )
                }
              >
                <ChevronRight className="h-7 w-7" strokeWidth={2} aria-hidden />
              </button>
            )}
            <img
              src={previewItem.previewUrl}
              alt={`配图预览 ${previewIndex + 1}/${previewCount}`}
              className="mx-auto max-h-[min(85vh,900px)] max-w-full rounded-xl object-contain shadow-2xl ring-1 ring-white/15"
            />
            {previewCount > 1 && (
              <p className="mt-3 text-center text-[13px] font-medium tabular-nums text-zinc-300">
                {previewIndex + 1} / {previewCount}
              </p>
            )}
          </div>

          <p className="mt-2 text-center text-[12px] text-zinc-500">
            {previewCount > 1 ? '点击空白处关闭 · Esc · ← → 切换' : '点击空白处关闭 · Esc'}
          </p>
        </div>
      ) : null}
      {mobileSheetComposer}
      <div className="hidden md:block">{desktopComposer}</div>
      {!mobileBottomSheet && (
        <div className="md:hidden">
          {!mobileComposerOpen && showEntryButton ? (
            <button
              type="button"
              onClick={() => {
                setMobileComposerOpen(true);
                setTimeout(() => focusComposeTitle(), 50);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#121418]/95 px-3 py-2.5 text-left shadow-[0_6px_22px_rgba(0,0,0,0.28)] transition hover:border-emerald-400/20"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/12 text-base text-emerald-300">
                ✍️
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white">写一条线报</div>
                <div className="truncate text-[11px] text-zinc-500">标题 · 标签 · 正文 · 配图</div>
              </div>
            </button>
          ) : (
            <div className={composerCard}>
              <input
                id="forum-compose-title-mobile"
                type="text"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="标题（可与正文择一）"
                aria-label="标题"
                className={composeInputShell}
              />

              {renderTagSection()}

              {renderComposeBodyTextarea({
                rows: 3,
                minHeightClass: 'min-h-[88px]',
                wrapperClass: 'mt-1.5',
              })}

              <div className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-2">{composeActions}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
