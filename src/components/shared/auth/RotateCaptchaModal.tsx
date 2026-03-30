import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, X } from 'lucide-react';
import { normalizeCaptchaImage } from '@/utils/captcha';
import type { CaptchaChallenge, CaptchaVerification } from '@/hook/types';
import { useRequestRotateCaptcha} from '@/hook/useRequest';

interface RotateCaptchaModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (payload: CaptchaVerification) => void;
}

const DEFAULT_THUMB_SIZE = 84;
const DEFAULT_KNOB_WIDTH = 56;

type DragState = {
  dragging: boolean;
  startX: number;
  startLeft: number;
};

export function RotateCaptchaModal({ open, onClose, onSuccess }: RotateCaptchaModalProps) {
  const [captcha, setCaptcha] = useState<CaptchaChallenge | null>(null);
  const [angle, setAngle] = useState(0);
  const [sliderLeft, setSliderLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const trackRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLButtonElement | null>(null);
  //图形验证码请求
  const rotateCaptchaMutation = useRequestRotateCaptcha();
  
  const dragStateRef = useRef<DragState>({
    dragging: false,
    startX: 0,
    startLeft: 0,
  });

  function getMaxSliderLeft() {
    return Math.max(
      (trackRef.current?.clientWidth ?? 0) - (knobRef.current?.clientWidth ?? DEFAULT_KNOB_WIDTH),
      1,
    );
  }

  function resetModalState() {
    setCaptcha(null);
    setAngle(0);
    setSliderLeft(0);
    setLoading(false);
    setError('');
    dragStateRef.current.dragging = false;
  }

  function setSliderPosition(nextLeft: number) {
    const maxLeft = getMaxSliderLeft();
    const limitedLeft = Math.max(0, Math.min(nextLeft, maxLeft));
    const ratio = maxLeft <= 0 ? 0 : limitedLeft / maxLeft;
    setSliderLeft(limitedLeft);
    setAngle(Math.round(ratio * 360));
  }

  function getThumbSize() {
    return Number(captcha?.thumbSize ?? DEFAULT_THUMB_SIZE);
  }

  async function loadCaptcha(){
    setLoading(true);
    setError('');

    try {
      const nextCaptcha =  await rotateCaptchaMutation.mutateAsync();
      console.log('nextCaptcha ---- ', nextCaptcha);
      setCaptcha(nextCaptcha);
      setAngle(0);
      setSliderLeft(0);
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleResize = () => {
      setSliderPosition(sliderLeft);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, sliderLeft]);

  function beginDrag(clientX: number) {
    dragStateRef.current = {
      dragging: true,
      startX: clientX,
      startLeft: sliderLeft,
    };
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current.dragging) {
        return;
      }

      setSliderPosition(dragStateRef.current.startLeft + event.clientX - dragStateRef.current.startX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragStateRef.current.dragging) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      setSliderPosition(dragStateRef.current.startLeft + touch.clientX - dragStateRef.current.startX);
      event.preventDefault();
    };

    const handleEnd = () => {
      dragStateRef.current.dragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [open, sliderLeft]);

  function handleConfirm() {
    if (!captcha) {
      return;
    }

    onSuccess({
      captchaId: captcha.id,
      captchaCode: String(angle),
      captchaProtocol: 2,
    });
  }

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[110]">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[10px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center !p-4">
        <div
          className="w-full max-w-[640px] overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#101114_52%,#0c0c0e_100%)] shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)]"
          onClick={(event) => event.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-4 !p-4 ">
              <div>
                <div className="!mt-3 text-[22px] font-black tracking-[-0.03em] text-white">拖动滑块校正图块方向</div>
                <div className="!mt-1 text-[13px] text-zinc-500">把中间碎片旋转到正确角度后确认，完成后会继续登录或注册。</div>
              </div>
              <button
                type="button"
                className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
                onClick={onClose}
              >
                <X size={24} />
              </button>
            </div>

          <div className="space-y-4 !px-5 !py-5">
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,21,24,0.98),rgba(15,16,19,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)]">
              <div className="relative flex h-[280px] items-center justify-center overflow-hidden rounded-[22px] border border-white/8 bg-[rgba(8,8,10,0.82)]">
                {loading ? (
                  <div className="text-[13px] text-zinc-500">正在加载验证码...</div>
                ) : captcha ? (
                  <>
                    <img
                      src={normalizeCaptchaImage(captcha.imageBase64)}
                      alt="captcha"
                      className="h-[70%] w-[70%] object-contain"
                    />
                    <div
                      className="absolute left-1/2 top-1/2 transition-transform duration-75 ease-linear"
                      style={{
                        width: `${getThumbSize()}px`,
                        height: `${getThumbSize()}px`,
                        transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                      }}
                    >
                      <img
                        src={normalizeCaptchaImage(captcha.thumbBase64)}
                        alt="captcha-thumb"
                        className="h-full w-full object-contain drop-shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="text-[13px] text-[#ff8e97]">{error || '验证码加载失败'}</div>
                )}
              </div>
              {/* <div className="mt-3 flex items-center justify-between rounded-[18px] border border-[#31569e] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[12px] text-[#8ea5d7]">
                <span>让碎片与底图方向一致</span>
                <span className="font-bold text-[#00eaff]">{angle}°</span>
              </div> */}
            </div>

            <div className="!mt-4 rounded-[24px] p-4 ">
              {/* <div className="!mb-3 flex items-center justify-between text-[12px] font-bold tracking-[0.06em] text-[#8ea5d7]">
                <span>拖动滑块</span>
                <span>当前角度 {angle}°</span>
              </div> */}
              <div
                ref={trackRef}
                className="relative h-13 overflow-hidden rounded-full border border-white/10 bg-[rgba(16,17,20,0.96)]"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/10 via-white/8 to-white/5"
                  style={{ width: `${sliderLeft + (knobRef.current?.clientWidth ?? DEFAULT_KNOB_WIDTH) / 2}px` }}
                />
                <button
                  ref={knobRef}
                  type="button"
                  className="absolute top-[4px] grid h-[42px] w-14 place-items-center rounded-full border border-white/10 bg-gradient-to-r from-[#23262b] to-[#121316] text-sm font-black text-white shadow-[0_12px_24px_rgba(0,0,0,0.34)]"
                  style={{ left: `${sliderLeft}px` }}
                  onMouseDown={(event) => beginDrag(event.clientX)}
                  onTouchStart={(event) => {
                    const touch = event.touches[0];
                    if (touch) {
                      beginDrag(touch.clientX);
                    }
                  }}
                >
                  ↔
                </button>
              </div>
              <div className="!mt-3 text-[12px] text-zinc-500">
                向右拖动时图块会同步旋转，调到正确方向后点击确认。
              </div>
            </div>

            {/* {error ? (
              <div className="rounded-[18px] bg-[rgba(255,96,108,0.12)] px-4 py-3 text-[13px] text-[#ff8e97]">
                {error}
              </div>
            ) : null} */}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/8 !px-5 !py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[12px] text-zinc-500">
              验证成功后将自动返回账号流程
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.04)] !px-4 text-[13px] font-bold text-white transition"
              onClick={() => void loadCaptcha()}
            >
              <RefreshCw size={14} />
              刷新验证码
            </button>
            <button
              type="button"
              className="h-11 rounded-[18px] border border-white/10 !px-5 text-[13px] font-bold text-zinc-300 transition"
              onClick={onClose}
            >
              取消
            </button>
            <button
              type="button"
              className="h-11 rounded-[18px] border border-white/10 bg-gradient-to-r from-[#18191c] via-[#23262b] to-[#121316] !px-5 text-[13px] font-black text-white shadow-[0_12px_28px_rgba(0,0,0,0.32)] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!captcha || loading}
              onClick={handleConfirm}
            >
              确认验证
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
