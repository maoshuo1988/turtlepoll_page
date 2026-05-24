/**
 * 文件说明：Auth Modal，登录认证和验证码相关共享组件。
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, Eye, EyeOff, LockKeyhole, LogOut, Mail, X } from 'lucide-react';
import { AuthDailySettleCard } from './AuthDailySettleCard';
import { ImageCaptchaModal } from './ImageCaptchaModal';
import { useRequestSignIn, useRequestSignUp } from '@/hooks/useAuthRequests';
import type { AuthUser, DailySettleSummary } from '@/hooks/authTypes';
import { getAuthToken, getStoredDailySettle, getStoredUserInfo, saveAuthToken, saveDailySettle, saveUserInfo } from '@/utils/authStorage';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSignOut: () => Promise<void>;
  onAuthSuccess?: () => void;
}

type AuthTab = 'login' | 'register';

type LoginFormState = {
  username: string;
  password: string;
  remember: boolean;
};

type RegisterFormState = {
  email: string;
  username: string;
  nickname: string;
  password: string;
  rePassword: string;
};

type CaptchaPayload = {
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
};

const initialLoginForm: LoginFormState = {
  username: '',
  password: '',
  remember: true,
};

const initialRegisterForm: RegisterFormState = {
  email: '',
  username: '',
  nickname: '',
  password: '',
  rePassword: '',
};

function Shell({
  children,
  onClose,
  maxWidth,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth: string;
}) {
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.72)] backdrop-blur-[10px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-3 lg:p-4 max-lg:items-end max-lg:p-0 max-lg:pb-[env(safe-area-inset-bottom,0px)]">
        <div
          className={`relative w-full ${maxWidth} max-lg:max-w-none overflow-hidden overscroll-y-contain rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#101114_52%,#0c0c0e_100%)] shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)] max-lg:max-h-[min(92dvh,840px)] max-lg:overflow-y-auto max-lg:rounded-t-[26px] max-lg:rounded-b-none max-lg:border-x-0 max-lg:border-b-0 max-lg:pb-[max(12px,env(safe-area-inset-bottom,0px))] max-lg:shadow-[0_-12px_48px_rgba(0,0,0,0.45)] max-lg:touch-manipulation lg:rounded-[42px]`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
          <button
            type="button"
            className="absolute right-3 top-3 z-[1] grid h-11 w-11 touch-manipulation place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] lg:right-[18px] lg:top-[14px] lg:h-[56px] lg:w-[56px]"
            onClick={onClose}
          >
            <X className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.8} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PrimaryInput({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  revealed = false,
  onToggleReveal,
  className = '',
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'password';
  revealed?: boolean;
  onToggleReveal?: () => void;
  className?: string;
}) {
  const actualType = type === 'password' ? (revealed ? 'text' : 'password') : type;

  return (
    <label
      className={`flex h-[46px] items-center rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,21,24,0.98),rgba(15,16,19,0.96))] !px-[10px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)] lg:h-[48px] lg:rounded-[36px] lg:!px-[12px] ${className}`}
    >
      <span className="!mr-[10px] shrink-0 text-zinc-500 lg:!mr-[12px]">{icon}</span>
      <input
        type={actualType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] font-medium tracking-[-0.02em] text-white outline-none placeholder:text-white/54 lg:text-[18px]"
      />
      {type === 'password' && onToggleReveal ? (
        <button
          type="button"
          onClick={onToggleReveal}
          className="ml-3 inline-flex h-9 w-9 touch-manipulation items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white lg:h-8 lg:w-8"
          aria-label={revealed ? '隐藏密码' : '显示密码'}
        >
          {revealed ? <EyeOff size={18} strokeWidth={2.1} /> : <Eye size={18} strokeWidth={2.1} />}
        </button>
      ) : null}
    </label>
  );
}

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="!mb-2 !pl-3 text-[15px] font-medium tracking-[-0.02em] text-zinc-400 lg:!mb-[10px] lg:!pl-[16px] lg:text-[18px]">{label}</div>
      {children}
    </label>
  );
}

function ErrorText({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  return <div className="mt-3 text-[14px] text-[#ff8e97] lg:mt-4 lg:text-[16px]">{text}</div>;
}

function LoginPanel({
  loginForm,
  setLoginForm,
  error,
  submitting,
  onSubmit,
  onSwitchToRegister,
}: {
  loginForm: LoginFormState;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginFormState>>;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  onSwitchToRegister: () => void;
}) {
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  return (
    <div className="!px-4 !pb-3 !pt-4 lg:!px-[22px] lg:!pb-[10px] lg:!pt-[22px]">
      <div className="rounded-[38px]">
        <div className="!mt-12 !px-2 !pb-4 !pt-2 lg:!mt-[50px] lg:!px-[22px] lg:!pb-[18px] lg:!pt-[18px]">
          <div className="!space-y-3 lg:!space-y-[20px]">
            <PrimaryInput
              icon={<Mail className="h-5 w-5 shrink-0 lg:h-6 lg:w-6" strokeWidth={2.1} />}
              value={loginForm.username}
              onChange={(value) => setLoginForm((prev) => ({ ...prev, username: value }))}
              placeholder="请输入用户名"
              type="email"
            />
            <PrimaryInput
              icon={<LockKeyhole className="h-5 w-5 shrink-0 lg:h-6 lg:w-6" strokeWidth={2.1} />}
              value={loginForm.password}
              onChange={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
              placeholder="请输入密码"
              type="password"
              revealed={showLoginPassword}
              onToggleReveal={() => setShowLoginPassword((prev) => !prev)}
            />
          </div>

          <div className="flex flex-col gap-3 !px-1 !pb-2 !pt-4 lg:flex-row lg:items-center lg:justify-between lg:!px-[8px] lg:!pb-[10px] lg:!pt-[18px]">
            <button
              type="button"
              className="inline-flex items-center gap-3 text-white lg:gap-[14px]"
              onClick={() => setLoginForm((prev) => ({ ...prev, remember: !prev.remember }))}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-[6px] border lg:h-[28px] lg:w-[28px] ${loginForm.remember ? 'border-white/18 bg-white/10 text-white' : 'border-white/12 text-transparent'}`}>
                ✓
              </span>
              <span className="text-[16px] font-medium tracking-[-0.03em] lg:text-[18px]">记住我</span>
            </button>

            <button type="button" className="inline-flex items-center gap-1 self-start text-[15px] font-semibold text-zinc-300 lg:gap-[8px] lg:self-auto lg:text-[18px]">
              忘记密码?
              <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.6} />
            </button>
          </div>

          <ErrorText text={error} />
        </div>

        <div className="border-t border-white/8 !px-5 !py-4 lg:!px-[34px] lg:!py-[20px]">
          <button
            type="button"
            disabled={submitting}
            className="h-12 w-full touch-manipulation rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[18px] font-black tracking-[0.06em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60 lg:h-[48px] lg:text-[24px] lg:tracking-[0.08em]"
            onClick={onSubmit}
          >
            {submitting ? '登录中' : '登录'}
          </button>
        </div>

        <div className="!px-4 !py-3 text-center text-[15px] text-zinc-500 lg:!px-[20px] lg:!py-[14px] lg:text-[22px]">
          还没有账户？
          <button type="button" className="ml-2 inline-flex items-center gap-1 font-semibold text-white lg:ml-[14px] lg:gap-[6px]" onClick={onSwitchToRegister}>
            立即注册
            <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RegisterPanel({
  registerForm,
  setRegisterForm,
  error,
  submitting,
  onSubmit,
  onBackToLogin,
}: {
  registerForm: RegisterFormState;
  setRegisterForm: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
  onBackToLogin: () => void;
}) {
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterRePassword, setShowRegisterRePassword] = useState(false);

  return (
    <div className="!px-4 !pb-4 !pt-5 lg:!px-[28px] lg:!pb-[12px] lg:!pt-[28px]">
      <div className="!pb-3 !pl-1 lg:!pb-[18px] lg:!pl-[10px]">
        <button
          type="button"
          className="!mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] !px-3 !py-2 text-[13px] font-medium text-zinc-300 lg:!mb-[14px] lg:gap-[8px] lg:!px-[14px] lg:!py-[8px] lg:text-[14px]"
          onClick={onBackToLogin}
        >
          <ArrowLeft className="h-5 w-5 lg:h-6 lg:w-6" />
          返回登录
        </button>
        <h2 className="text-[22px] font-bold tracking-[-0.05em] text-white lg:text-[28px]">创建账户</h2>
        <p className="mt-2 text-[13px] tracking-[-0.02em] text-zinc-500 lg:mt-[8px] lg:text-[14px]">注册一个新的 Turtle Pass 账户</p>
      </div>

      <div className="!space-y-3 !px-1 lg:!space-y-[18px] lg:!px-[4px]">
        <PrimaryInput
          icon={<Mail className="h-5 w-5 shrink-0 lg:h-6 lg:w-6" strokeWidth={2.1} />}
          value={registerForm.email}
          onChange={(value) => setRegisterForm((prev) => ({ ...prev, email: value }))}
          placeholder="请输入邮箱"
          type="email"
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:!gap-[18px]">
          <LabeledField label="用户名">
            <PrimaryInput
              icon={null}
              value={registerForm.username}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, username: value }))}
              placeholder="请输入用户名"
              className="!px-4 lg:px-[28px]"
            />
          </LabeledField>
          <LabeledField label="昵称">
            <PrimaryInput
              icon={null}
              value={registerForm.nickname}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, nickname: value }))}
              placeholder="请输入昵称"
              className="!px-4 lg:px-[28px]"
            />
          </LabeledField>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-[18px]">
          <LabeledField label="密码">
            <PrimaryInput
              icon={null}
              value={registerForm.password}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
              placeholder="请输入密码"
              type="password"
              revealed={showRegisterPassword}
              onToggleReveal={() => setShowRegisterPassword((prev) => !prev)}
              className="!px-4 lg:px-[28px]"
            />
          </LabeledField>
          <LabeledField label="确认密码">
            <PrimaryInput
              icon={null}
              value={registerForm.rePassword}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, rePassword: value }))}
              placeholder="请再次输入密码"
              type="password"
              revealed={showRegisterRePassword}
              onToggleReveal={() => setShowRegisterRePassword((prev) => !prev)}
              className="!px-4 lg:px-[28px]"
            />
          </LabeledField>
        </div>

        <div className="!px-2 text-[15px] tracking-[-0.02em] text-zinc-500 lg:!px-[14px] lg:text-[18px]">点击提交后会进入数字验证码验证</div>
        <ErrorText text={error} />
      </div>

      <div className="!my-5 border-t border-white/8 !px-2 !pt-4 lg:!my-[22px] lg:!px-[10px] lg:!pt-[16px]">
        <button
          type="button"
          disabled={submitting}
          className="h-12 w-full touch-manipulation rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[18px] font-black tracking-[0.06em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60 lg:h-[48px] lg:text-[24px] lg:tracking-[0.08em]"
          onClick={onSubmit}
        >
          {submitting ? '注册中' : '注册'}
        </button>
      </div>
    </div>
  );
}

function UserPanel({
  userinfo,
  dailySettle,
  onClose,
  onSignOut,
}: {
  userinfo: AuthUser;
  dailySettle?: DailySettleSummary | null;
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="!px-4 !pb-6 !pt-12 lg:!px-[28px] lg:!pb-[28px] lg:!pt-[40px]">
      <div className="rounded-[36px] !p-5 text-white lg:!p-[28px]">
        <div className="flex items-center gap-3 lg:gap-[18px]">
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#23252a,#101114)] text-[28px] font-black lg:h-[92px] lg:w-[92px] lg:text-[36px]">
            {userinfo?.nickname ? userinfo.nickname.slice(0, 1).toUpperCase() : "g"}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] text-zinc-400 lg:text-[18px]">当前已登录</div>
            <div className="truncate text-[18px] font-bold tracking-[-0.04em] lg:text-[24px]">{userinfo.email}</div>
          </div>
        </div>

        <div className="!mt-5 grid grid-cols-1 gap-3 lg:!mt-[24px] lg:grid-cols-2 lg:!gap-[14px]">
          <div className="rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.04)] !px-4 !py-3 lg:rounded-[24px] lg:!px-[20px] lg:!py-[18px]">
            <div className="text-[14px] text-zinc-400 lg:text-[16px]">用户名</div>
            <div className="!mt-2 truncate text-[22px] font-semibold lg:!mt-[10px] lg:text-[28px]">{String(userinfo?.username ?? '-')}</div>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.04)] !px-4 !py-3 lg:rounded-[24px] lg:!px-[20px] lg:!py-[18px]">
            <div className="text-[14px] text-zinc-400 lg:text-[16px]">昵称</div>
            <div className="!mt-2 truncate text-[22px] font-semibold lg:!mt-[10px] lg:text-[28px]">{String(userinfo?.nickname ?? '-')}</div>
          </div>
        </div>

        <div className="!mt-5 grid grid-cols-1 gap-3 lg:!mt-[22px] lg:grid-cols-2 lg:!gap-[14px]">
          <button
            type="button"
            className="h-12 rounded-[18px] border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[16px] font-bold lg:h-[48px] lg:rounded-[24px] lg:text-[18px]"
            onClick={onClose}
          >
            返回首页
          </button>
          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-[rgba(255,255,255,0.04)] text-[16px] font-bold lg:h-[48px] lg:gap-[10px] lg:rounded-[24px] lg:text-[18px]"
            onClick={() => void onSignOut()}
          >
            <LogOut className="h-5 w-5 lg:h-6 lg:w-6" />
            退出登录
          </button>
        </div>

        <div className="!mt-5 lg:!mt-[22px]">
          <AuthDailySettleCard dailySettle={dailySettle} />
        </div>
      </div>
    </div>
  );
}

export function AuthModal({
  open,
  onClose,
  onSignOut,
  onAuthSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('login');
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaMode, setCaptchaMode] = useState<AuthTab | null>(null);

  //注册请求
  const signUpMutation = useRequestSignUp();
  //登录请求
  const signInMutation = useRequestSignIn()
  const isMutating = signUpMutation.isLoading || signInMutation.isLoading || submitting;

  function resetFeedback() {
    setError('');
  }

  function validateActiveForm() {
    if (tab === 'login') {
      if (!loginForm.username.trim() || !loginForm.password) {
        setError('请输入用户名和密码');
        return false;
      }
      return true;
    }

    if (
      !registerForm.email.trim() ||
      !registerForm.username.trim() ||
      !registerForm.nickname.trim() ||
      !registerForm.password ||
      !registerForm.rePassword
    ) {
      setError('请完整填写注册信息');
      return false;
    }

    if (registerForm.password !== registerForm.rePassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  }

  useEffect(() => {
    if (!open) {
      resetFeedback();
      setSubmitting(false);
      setCaptchaMode(null);
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

  async function submitWithCaptcha(captcha: CaptchaPayload) {
    setCaptchaMode(null);
    setSubmitting(true);
    resetFeedback();

    try {
      if (tab === 'login') {

        const signInResult = await signInMutation.mutateAsync({
          username: loginForm.username.trim(),
          password: loginForm.password,
          redirect: '',
          ...captcha,
        });
        if (signInResult?.token) {
          saveAuthToken(signInResult.token);
          if (signInResult.user) {
            saveUserInfo(signInResult.user);
          }
          saveDailySettle(signInResult.dailySettle);
          onAuthSuccess?.();
          onClose();
        }
        return;
      }


      const signUpResult = await signUpMutation.mutateAsync({
        email: registerForm.email.trim(),
        username: registerForm.username.trim(),
        nickname: registerForm.nickname.trim(),
        password: registerForm.password,
        rePassword: registerForm.rePassword,
        redirect: '',
        ...captcha,
      });

      if (signUpResult?.token) {
        saveAuthToken(signUpResult.token);
        if (signUpResult.user) {
          saveUserInfo(signUpResult.user);
        }
        saveDailySettle(signUpResult.dailySettle);
        onAuthSuccess?.();
        onClose();
        return;
      }

      setTab('login');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return null;
  }

  const isAuthenticated = getAuthToken()
  const userinfo = getStoredUserInfo()
  const dailySettle = getStoredDailySettle()

  return createPortal(
    <>
      <Shell onClose={onClose} maxWidth={isAuthenticated ? 'max-w-[560px]' : tab === 'login' ? 'max-w-[560px]' : 'max-w-[640px]'}>
        {isAuthenticated && userinfo ? (
          <UserPanel userinfo={userinfo} dailySettle={dailySettle} onClose={onClose} onSignOut={onSignOut} />
        ) : tab === 'login' ? (
          <LoginPanel
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            error={error}
            submitting={isMutating}
            onSubmit={() => {
              resetFeedback();
              if (!validateActiveForm()) {
                return;
              }
              setCaptchaMode('login');
            }}
            onSwitchToRegister={() => {
              setTab('register');
              resetFeedback();
            }}
          />
        ) : (
          <RegisterPanel
            registerForm={registerForm}
            setRegisterForm={setRegisterForm}
            error={error}
            submitting={isMutating}
            onBackToLogin={() => {
              setTab('login');
              resetFeedback();
            }}
            onSubmit={() => {
              resetFeedback();
              if (!validateActiveForm()) {
                return;
              }
              setCaptchaMode('register');
            }}
          />
        )}
      </Shell>

      <ImageCaptchaModal
        open={captchaMode !== null}
        onClose={() => setCaptchaMode(null)}
        onSuccess={(payload) => {
          void submitWithCaptcha(payload);
        }}
      />
    </>,
    document.body,
  );
}
