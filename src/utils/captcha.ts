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
