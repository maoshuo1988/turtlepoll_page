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
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className="w-full max-w-[520px] overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#101114_52%,#0c0c0e_100%)] shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 p-4">
            <div>
              <div className="mt-3 text-[22px] font-black tracking-[-0.03em] text-white">请输入数字验证码</div>
              <div className="mt-1 text-[13px] text-zinc-500">输入图片里的数字后继续登录或注册，看不清可以刷新。</div>
            </div>
            <button
              type="button"
              className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
              onClick={onClose}
            >
              <X size={24} />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,21,24,0.98),rgba(15,16,19,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)]">
              <div className="flex min-h-[132px] items-center justify-center rounded-[22px] border border-white/8 bg-[rgba(8,8,10,0.82)] p-4">
                {loading ? (
                  <div className="text-[13px] text-zinc-500">正在加载验证码...</div>
                ) : captcha ? (
                  <img
                    src={normalizeCaptchaImage(captcha.captchaBase64)}
                    alt="captcha"
                    className="h-[52px] w-auto max-w-full rounded-[10px] border border-white/10 bg-white object-contain"
                  />
                ) : (
                  <div className="text-[13px] text-[#ff8e97]">{error || '验证码加载失败'}</div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex h-[52px] flex-1 items-center rounded-[18px] border border-white/10 bg-[rgba(16,17,20,0.96)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <input
                    ref={inputRef}
                    type="text"
                    value={captchaCode}
                    onChange={(event) => {
                      setCaptchaCode(event.target.value);
                      if (error) {
                        setError('');
                      }
                    }}
                    placeholder="请输入验证码"
                    className="h-full w-full bg-transparent text-[18px] font-medium tracking-[-0.02em] text-white outline-none placeholder:text-white/40"
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/5 px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void loadCaptcha()}
                  disabled={loading}
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                  刷新
                </button>
              </div>

              {error && captcha ? <div className="mt-3 text-[13px] text-[#ff8e97]">{error}</div> : null}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="h-[48px] rounded-full border border-white/10 bg-white/5 px-6 text-[16px] font-semibold text-zinc-300"
                onClick={onClose}
              >
                取消
              </button>
              <button
                type="button"
                className="h-[48px] rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] px-8 text-[18px] font-black tracking-[0.04em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
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
