interface MobileSettingsSwitchProps {
  checked: boolean;
  onCheckedChange: (nextChecked: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  className?: string;
}

export function MobileSettingsSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  id,
  className = '',
}: MobileSettingsSwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      onClick={() => {
        if (disabled) return;
        onCheckedChange(!checked);
      }}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39d56a]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1113] ${
        checked ? 'bg-[#179b45] shadow-[0_0_0_1px_rgba(122,245,170,0.16),0_6px_18px_rgba(23,155,69,0.22)]' : 'bg-white/12'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      {/*
        MobileSettingsSwitch:
        手机端设置页统一使用的开关组件。
        这个组件只关心“当前是否开启”和“切换后要通知外部什么状态”，
        所以页面层只需要传 checked 和 onCheckedChange，不要再在页面里重复拼 switch 的交互语义。
      */}
      <span
        aria-hidden="true"
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.22)] transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
