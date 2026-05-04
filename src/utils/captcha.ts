/**
 * 文件说明：captcha 工具方法，封装跨模块复用的基础能力。
 */
export function normalizeCaptchaImage(rawValue: string) {
  const value = rawValue.trim();

  if (!value) {
    return '';
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value)) {
    return value;
  }

  return `data:image/png;base64,${value}`;
}
