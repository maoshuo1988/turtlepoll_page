import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight, LockKeyhole, LogOut, Mail, UserRound } from 'lucide-react';
import { RotateCaptchaModal } from '@/components/shared/auth/RotateCaptchaModal';
import type { CaptchaVerification } from '@/hook/types';
import { useRequestSignIn, useRequestSignUp } from '@/hook/useRequest';
import { getAuthToken, getStoredUserInfo, saveAuthToken, saveUserInfo } from '@/utils/authStorage';

type MobileAuthTab = 'login' | 'register';

type MobileLoginFormState = {
  username: string;
  password: string;
};

type MobileRegisterFormState = {
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

const initialMobileLoginForm: MobileLoginFormState = {
  username: '',
  password: '',
};

const initialMobileRegisterForm: MobileRegisterFormState = {
  email: '',
  username: '',
  nickname: '',
  password: '',
  rePassword: '',
};

interface MobileProfileAuthPageProps {
  onBack: () => void;
  onAuthSuccess: () => void;
  onSignOut: () => Promise<void>;
}

function MobileAuthInput({
  icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'email' | 'password';
}) {
  return (
    <label className="flex h-12 items-center rounded-[18px] border border-white/8 bg-[#111315] px-4">
      <span className="mr-3 text-[#6f7881]">{icon}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent text-[15px] font-medium text-white outline-none placeholder:text-[#66707a]"
      />
    </label>
  );
}

export function MobileProfileAuthPage({
  onBack,
  onAuthSuccess,
  onSignOut,
}: MobileProfileAuthPageProps) {
  const [tab, setTab] = useState<MobileAuthTab>('login');
  const [loginForm, setLoginForm] = useState(initialMobileLoginForm);
  const [registerForm, setRegisterForm] = useState(initialMobileRegisterForm);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaMode, setCaptchaMode] = useState<MobileAuthTab | null>(null);

  const signInMutation = useRequestSignIn();
  const signUpMutation = useRequestSignUp();
  const isAuthenticated = Boolean(getAuthToken());
  const storedUser = getStoredUserInfo();
  const isMutating = signInMutation.isLoading || signUpMutation.isLoading || submitting;

  const panelTitle = useMemo(() => {
    if (isAuthenticated) return '账号中心';
    return tab === 'login' ? '登录' : '注册';
  }, [isAuthenticated, tab]);

  useEffect(() => {
    setError('');
  }, [tab]);

  function validateActiveForm() {
    if (tab === 'login') {
      if (!loginForm.username.trim() || !loginForm.password) {
        setError('请输入用户名和密码');
        return false;
      }
      return true;
    }

    if (!registerForm.email.trim() || !registerForm.username.trim() || !registerForm.nickname.trim() || !registerForm.password || !registerForm.rePassword) {
      setError('请完整填写注册信息');
      return false;
    }

    if (registerForm.password !== registerForm.rePassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  }

  async function submitWithCaptcha(captcha: CaptchaPayload) {
    setSubmitting(true);
    setCaptchaMode(null);
    setError('');

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
          saveUserInfo(signInResult.user);
          onAuthSuccess();
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
        onAuthSuccess();
        return;
      }

      setTab('login');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-3">
      {/*
        MobileProfileAuthPage:
        手机端登录 / 注册独立页面。
        这个页面把原来 modal 里的登录流程单独抽出来，让“我的”只负责入口，认证流程单独归档到 mobile/profile。
        后面如果要接短信登录、找回密码、第三方登录，都从这里继续扩展。
      */}
      <div className="flex items-center gap-3 rounded-[24px] border border-white/8 bg-[#0f1113] px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-black/30 text-[#c5ced6]"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <div className="text-[18px] font-black text-white">{panelTitle}</div>
          <div className="mt-1 text-[12px] text-[#7f8993]">移动端账号流程单独收口到这里，避免继续混在“我的”首页里。</div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/8 bg-[#0f1113] p-4">
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="rounded-[22px] border border-white/8 bg-[#111315] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-[#171a1d] text-[20px] font-black text-white">
                  {storedUser?.nickname ? String(storedUser.nickname).slice(0, 1).toUpperCase() : 'G'}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-bold text-white">{storedUser?.nickname || storedUser?.username || '已登录用户'}</div>
                  <div className="mt-1 truncate text-[12px] text-[#8b949e]">{storedUser?.email || '当前账号信息已同步到本地缓存。'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[20px] border border-white/8 bg-[#111315] px-4 py-3">
                <div className="text-[11px] text-[#7f8993]">用户名</div>
                <div className="mt-2 truncate text-[15px] font-bold text-white">{String(storedUser?.username ?? '-')}</div>
              </div>
              <div className="rounded-[20px] border border-white/8 bg-[#111315] px-4 py-3">
                <div className="text-[11px] text-[#7f8993]">昵称</div>
                <div className="mt-2 truncate text-[15px] font-bold text-white">{String(storedUser?.nickname ?? '-')}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onSignOut()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-rose-500/18 bg-rose-500/10 text-[15px] font-bold text-rose-200"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-[20px] bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`rounded-[16px] px-4 py-2.5 text-[14px] font-bold transition-colors ${tab === 'login' ? 'bg-[#179b45] text-white' : 'text-[#95a0aa]'}`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`rounded-[16px] px-4 py-2.5 text-[14px] font-bold transition-colors ${tab === 'register' ? 'bg-[#179b45] text-white' : 'text-[#95a0aa]'}`}
              >
                注册
              </button>
            </div>

            {tab === 'login' ? (
              <div className="space-y-3">
                <MobileAuthInput
                  icon={<Mail size={18} />}
                  value={loginForm.username}
                  onChange={(value) => setLoginForm((prev) => ({ ...prev, username: value }))}
                  placeholder="请输入用户名"
                  type="email"
                />
                <MobileAuthInput
                  icon={<LockKeyhole size={18} />}
                  value={loginForm.password}
                  onChange={(value) => setLoginForm((prev) => ({ ...prev, password: value }))}
                  placeholder="请输入密码"
                  type="password"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <MobileAuthInput
                  icon={<Mail size={18} />}
                  value={registerForm.email}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, email: value }))}
                  placeholder="请输入邮箱"
                  type="email"
                />
                <MobileAuthInput
                  icon={<UserRound size={18} />}
                  value={registerForm.username}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, username: value }))}
                  placeholder="请输入用户名"
                />
                <MobileAuthInput
                  icon={<UserRound size={18} />}
                  value={registerForm.nickname}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, nickname: value }))}
                  placeholder="请输入昵称"
                />
                <MobileAuthInput
                  icon={<LockKeyhole size={18} />}
                  value={registerForm.password}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, password: value }))}
                  placeholder="请输入密码"
                  type="password"
                />
                <MobileAuthInput
                  icon={<LockKeyhole size={18} />}
                  value={registerForm.rePassword}
                  onChange={(value) => setRegisterForm((prev) => ({ ...prev, rePassword: value }))}
                  placeholder="请再次输入密码"
                  type="password"
                />
              </div>
            )}

            {error ? <div className="rounded-[18px] border border-rose-500/18 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-200">{error}</div> : null}

            <button
              type="button"
              disabled={isMutating}
              onClick={() => {
                setError('');
                if (!validateActiveForm()) return;
                setCaptchaMode(tab);
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[#179b45] text-[15px] font-black text-white shadow-[0_10px_28px_rgba(23,155,69,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMutating ? (tab === 'login' ? '登录中...' : '注册中...') : tab === 'login' ? '继续登录' : '提交注册'}
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <RotateCaptchaModal
        open={captchaMode !== null}
        onClose={() => setCaptchaMode(null)}
        onSuccess={(payload: CaptchaVerification) => {
          void submitWithCaptcha(payload);
        }}
      />
    </section>
  );
}
