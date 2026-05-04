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
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          className={`relative w-full ${maxWidth} overflow-hidden rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,#0b0b0d_0%,#101114_52%,#0c0c0e_100%)] shadow-[0_28px_110px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.06)]`}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
          <button
            type="button"
            className="absolute right-[18px] top-[14px] grid h-[56px] w-[56px] place-items-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_30%,#24262c_0%,#17181c_45%,#101114_100%)] text-white shadow-[0_10px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]"
            onClick={onClose}
          >
            <X size={24} strokeWidth={2.8} />
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
      className={`flex h-[48px] items-center rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,21,24,0.98),rgba(15,16,19,0.96))] !px-[12px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_6px_20px_rgba(0,0,0,0.24)] ${className}`}
    >
      <span className="!mr-[12px] text-zinc-500">{icon}</span>
      <input
        type={actualType}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-[18px] font-medium tracking-[-0.02em] text-white outline-none placeholder:text-white/54"
      />
      {type === 'password' && onToggleReveal ? (
        <button
          type="button"
          onClick={onToggleReveal}
          className="ml-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-white"
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
      <div className="!mb-[10px] !pl-[16px] text-[18px] font-medium tracking-[-0.02em] text-zinc-400">{label}</div>
      {children}
    </label>
  );
}

function ErrorText({ text }: { text: string }) {
  if (!text) {
    return null;
  }

  return <div className="mt-4 text-[16px] text-[#ff8e97]">{text}</div>;
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
    <div className="!px-[22px] !pb-[10px] !pt-[22px]">
      <div className="rounded-[38px]">
        <div className="!mt-[50px] !px-[22px] !pb-[18px] !pt-[18px]">
          <div className="!space-y-[20px]">
            <PrimaryInput
              icon={<Mail size={24} strokeWidth={2.1} />}
              value={loginForm.username}
              onChange={(value) => setLoginForm((prev) => ({ ...prev, username: value }))}
              placeholder="请输入用户名"
              type="email"
            />
            <PrimaryInput
              icon={<LockKeyhole size={24} strokeWidth={2.1} />}
              value={loginForm.password}
              onChange={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
              placeholder="请输入密码"
              type="password"
              revealed={showLoginPassword}
              onToggleReveal={() => setShowLoginPassword((prev) => !prev)}
            />
          </div>

          <div className="flex items-center justify-between !px-[8px] !pb-[10px] !pt-[18px]">
            <button
              type="button"
              className="inline-flex items-center gap-[14px] text-white"
              onClick={() => setLoginForm((prev) => ({ ...prev, remember: !prev.remember }))}
            >
              <span className={`grid h-[28px] w-[28px] place-items-center rounded-[6px] border ${loginForm.remember ? 'border-white/18 bg-white/10 text-white' : 'border-white/12 text-transparent'}`}>
                ✓
              </span>
              <span className="text-[18px] font-medium tracking-[-0.03em]">记住我</span>
            </button>

            <button type="button" className="inline-flex items-center gap-[8px] text-[18px] font-semibold text-zinc-300">
              忘记密码?
              <ChevronRight size={24} strokeWidth={2.6} />
            </button>
          </div>

          <ErrorText text={error} />
        </div>

        <div className="border-t border-white/8 !px-[34px] !py-[20px]">
          <button
            type="button"
            disabled={submitting}
            className="h-[48px] w-full rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[24px] font-black tracking-[0.08em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
          >
            {submitting ? '登录中' : '登录'}
          </button>
        </div>

        <div className=" !px-[20px] !py-[14px] text-center text-[22px] text-zinc-500">
          还没有账户？
          <button type="button" className="ml-[14px] inline-flex items-center gap-[6px] font-semibold text-white" onClick={onSwitchToRegister}>
            立即注册
            <ChevronRight size={24} strokeWidth={2.6} />
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
    <div className="!px-[28px] !pb-[12px] !pt-[28px]">
      <div className="!pb-[18px] !pl-[10px]">
        <button
          type="button"
          className="!mb-[14px] inline-flex items-center gap-[8px] rounded-full border border-white/10 bg-[rgba(255,255,255,0.04)] !px-[14px] !py-[8px] text-[14px] font-medium text-zinc-300"
          onClick={onBackToLogin}
        >
          <ArrowLeft size={24} />
          返回登录
        </button>
        <h2 className="text-[28px] font-bold tracking-[-0.05em] text-white">创建账户</h2>
        <p className="mt-[8px] text-[14px] tracking-[-0.02em] text-zinc-500">注册一个新的 Turtle Pass 账户</p>
      </div>

      <div className="!space-y-[18px] !px-[4px]">
        <PrimaryInput
          icon={<Mail size={24} strokeWidth={2.1} />}
          value={registerForm.email}
          onChange={(value) => setRegisterForm((prev) => ({ ...prev, email: value }))}
          placeholder="请输入邮箱"
          type="email"
        />

        <div className="grid grid-cols-2 !gap-[18px]">
          <LabeledField label="用户名">
            <PrimaryInput
              icon={null}
              value={registerForm.username}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, username: value }))}
              placeholder="请输入用户名"
              className="px-[28px]"
            />
          </LabeledField>
          <LabeledField label="昵称">
            <PrimaryInput
              icon={null}
              value={registerForm.nickname}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, nickname: value }))}
              placeholder="请输入昵称"
              className="px-[28px]"
            />
          </LabeledField>
        </div>

        <div className="grid grid-cols-2 gap-[18px]">
          <LabeledField label="密码">
            <PrimaryInput
              icon={null}
              value={registerForm.password}
              onChange={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
              placeholder="请输入密码"
              type="password"
              revealed={showRegisterPassword}
              onToggleReveal={() => setShowRegisterPassword((prev) => !prev)}
              className="px-[28px]"
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
              className="px-[28px]"
            />
          </LabeledField>
        </div>

        <div className="!px-[14px] text-[18px] tracking-[-0.02em] text-zinc-500">点击提交后会进入数字验证码验证</div>
        <ErrorText text={error} />
      </div>

      <div className="!my-[22px] border-t border-white/8 !px-[10px] !pt-[16px]">
        <button
          type="button"
          disabled={submitting}
          className="h-[48px] w-full rounded-full border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[24px] font-black tracking-[0.08em] text-white shadow-[0_18px_34px_rgba(0,0,0,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="!px-[28px] !pb-[28px] !pt-[40px]">
      <div className="rounded-[36px] ! p-[28px] text-white">
        <div className="flex items-center gap-[18px]">
          <div className="grid h-[92px] w-[92px] place-items-center rounded-full border border-white/10 bg-[linear-gradient(135deg,#23252a,#101114)] text-[36px] font-black">
            {userinfo?.nickname ? userinfo.nickname.slice(0, 1).toUpperCase() : "g"}
          </div>
          <div className="min-w-0">
            <div className="text-[18px] text-zinc-400">当前已登录</div>
            <div className="truncate text-[24px] font-bold tracking-[-0.04em]">{userinfo.email}</div>
          </div>
        </div>

        <div className="!mt-[24px] grid grid-cols-2 !gap-[14px]">
          <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] !px-[20px] !py-[18px]">
            <div className="text-[16px] text-zinc-400">用户名</div>
            <div className="!mt-[10px] text-[28px] font-semibold">{String(userinfo?.username ?? '-')}</div>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] !px-[20px] !py-[18px]">
            <div className="text-[16px] text-zinc-400">昵称</div>
            <div className="!mt-[10px] text-[28px] font-semibold">{String(userinfo?.nickname ?? '-')}</div>
          </div>
        </div>

        <div className="!mt-[22px] grid grid-cols-2 !gap-[14px]">
          <button
            type="button"
            className="h-[48px] rounded-[24px] border border-white/10 bg-[linear-gradient(90deg,#18191c_0%,#23262b_50%,#121316_100%)] text-[18px] font-bold"
            onClick={onClose}
          >
            返回首页
          </button>
          <button
            type="button"
            className="inline-flex h-[48px] items-center justify-center gap-[10px] rounded-[24px] border border-white/10 bg-[rgba(255,255,255,0.04)] text-[18px] font-bold"
            onClick={() => void onSignOut()}
          >
            <LogOut size={24} />
            退出登录
          </button>
        </div>

        <div className="!mt-[22px]">
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
