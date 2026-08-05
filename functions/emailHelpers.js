export function renderTemplate(template, variables) {
  return Object.entries(variables).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    template
  );
}

export function friendlyEmailError(error) {
  const code = String(error?.code || "");
  if (code === "EAUTH") return "寄件帳號驗證失敗。";
  if (code === "EENVELOPE") return "收件人 Email 格式不正確。";
  if (code === "ETIMEDOUT" || code === "ECONNECTION") return "寄件服務連線逾時。";
  return "寄送失敗，請稍後重試。";
}
