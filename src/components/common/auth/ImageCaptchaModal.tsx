/**
 * 文件说明：Image Captcha Modal，登录认证和验证码相关共享组件。
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X } from 'lucide-react';
import { useRequestImageCaptcha } from '@/hooks/useAuthRequests';
import type { CaptchaVerification, ImageCaptchaChallenge } from '@/hooks/authTypes';
import { normalizeCaptchaImage } from '@/utils/captcha';

interface ImageCaptchaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (payload: CaptchaVerification) => void;
}

export function ImageCaptchaModal({ open, onClose, onSuccess }: ImageCaptchaModalProps) {
  const [captcha, setCaptcha] = useState<ImageCaptchaChallenge | null>(null);
  const [captchaCode, setCaptchaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageCaptchaMutation = useRequestImageCaptcha();

  function resetModalState() {
    setCaptcha(null);
    setCaptchaCode('');
    setLoading(false);
    setError('');
  }

  async function loadCaptcha() {
    setLoading(true);
    setError('');

    try {
      const nextCaptcha = await imageCaptchaMutation.mutateAsync();
      setCaptcha(nextCaptcha);
      setCaptchaCode('');
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '验证码加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      resetModalState();
      return;
    }

    void loadCaptcha();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'Enter' && captcha && !loading) {
        const trimmedCode = captchaCode.trim();
        if (!trimmedCode) {
          setError('请输入验证码');
          return;
        }

        onSuccess({
          captchaId: captcha.captchaId,
          captchaCode: trimmedCode,
          captchaProtocol: 3,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, captcha, captchaCode, loading, onSuccess]);

  function handleConfirm() {
    if (!captcha) {
      setError('验证码加载失败，请刷新后重试');
      return;
    }

    const trimmedCode = captchaCode.trim();
    if (!trimmedCode) {
      setError('请输入验证码');
      inputRef.current?.focus();
      return;
    }

    onSuccess({
      captchaId: captcha.captchaId,
      captchaCode: trimmedCode,
      captchaProtocol: 3,
    });
  }

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[10px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-3 lg:p-4 max-lg:items-end max-lg:p-0 max-lg:pb-[env(safe-area-inset-bottom,0px)]">
        <div
          className="w-full max-w-[520px] max-lg:max-w-none overflow-hidden overscroll-y-contain rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#101114_52%,#0c0c0e_100%)] shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)] max-lg:max-h-[min(88dvh,760px)] max-lg:overflow-y-auto max-lg:rounded-t-[26px] max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-[max(12px,env(safe-area-inset-bottom,0px))] max-lg:shadow-[0_-12px_48px_rgba(0,0,0,0.45)] max-lg:touch-manipulation lg:rounded-[42px]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="relative flex items-start justify-between gap-3 p-3 lg:gap-4 lg:p-4">
            <div className="min-w-0 pr-10 lg:pr-2">
              <div className="mt-2 text-[18px] font-black tracking-[-0.03em] text-white lg:mt-3 lg:text-[22px]">请输入数字验证码</div>
              <div className="mt-1 text-[12px] leading-snug text-zinc-500 lg:text-[13px]">输入图片里的数字后继续登录或注册，看不清可以刷新。</div>
            </div>
            <button
              type="button"
              className="absolute right-3 top-3 grid h-10 w-10 shrink-0 touch-manipulation place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] lg:relative lg:right-auto lg:top-auto lg:h-12 lg:w-12"
              onClick={onClose}
            >
              <X className="h-5 w-5 lg:h-6 lg:w-6" />
            </button>
          </div>

          <div className="space-y-3 px-4 py-4 lg:space-y-4 lg:px-5 lg:py-5">
            <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,21,24,0.98),rgba(15,16,19,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)] lg:rounded-[26px] lg:p-5">
              <div className="flex min-h-[120px] items-center justify-center rounded-[16px] border border-white/8 bg-[rgba(8,8,10,0.82)] p-3 lg:min-h-[132px] lg:rounded-[22px] lg:p-4">
                {loading ? (
                  <div className="text-[13px] text-zinc-500">正在加载验证码...</div>
                ) : captcha ? (
                  <img
                    src={normalizeCaptchaImage(captcha.captchaBase64)}
                    alt="captcha"
                    className="h-[56px] w-auto max-w-full rounded-[10px] border border-white/10 bg-white object-contain lg:h-[52px]"
                  />
                ) : (
                  <div className="text-[13px] text-[#ff8e97]">{error || '验证码加载失败'}</div>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                <label className="flex min-h-[58px] flex-1 items-center rounded-[18px] border border-white/10 bg-[rgba(16,17,20,0.96)] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-lg:min-h-[60px] lg:h-[52px] lg:min-h-0 lg:rounded-[18px] lg:px-4 lg:py-0">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="text"
                    autoComplete="one-time-code"
                    value={captchaCode}
                    onChange={(event) => {
                      setCaptchaCode(event.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="请输入验证码"
                    className="h-full w-full bg-transparent py-1 text-[17px] font-semibold tabular-nums tracking-[0.06em] text-white outline-none placeholder:text-[15px] placeholder:font-medium placeholder:text-white/45 placeholder:tracking-normal lg:py-0 lg:text-[18px] lg:font-medium lg:tracking-[-0.02em]"
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex min-h-[58px] shrink-0 touch-manipulation items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-5 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 max-lg:min-h-[60px] sm:w-auto lg:h-[52px] lg:min-h-0 lg:min-w-[96px] lg:px-4 lg:text-[14px]"
                  onClick={() => void loadCaptcha()}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  刷新
                </button>
              </div>

              {error && captcha ? <div className="mt-3 text-[13px] text-[#ff8e97]">{error}</div> : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <button
                type="button"
                className="order-2 h-12 w-full touch-manipulation rounded-full border border-white/10 bg-white/5 text-[15px] font-semibold text-zinc-300 sm:order-1 sm:h-[48px] sm:w-auto sm:px-6 sm:text-[16px]"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="order-1 h-12 w-full touch-manipulation rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[16px] font-black tracking-[0.04em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60 sm:order-2 sm:h-[48px] sm:w-auto sm:px-8 sm:text-[18px]"
                onClick={handleConfirm}
                disabled={loading || !captcha}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
