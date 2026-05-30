export function formatLoginError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "BridgeNotReadyError" || /pywebviewready/i.test(error.message)) {
      return "Ứng dụng desktop chưa sẵn sàng. Đợi vài giây rồi thử lại, hoặc khởi động lại bằng make dev / make start.";
    }
    if (error.message) {
      return error.message;
    }
  }
  if (!error || typeof error !== "object") {
    return "Sign in failed. Try again.";
  }
  const message = "message" in error ? String((error as { message: unknown }).message) : "";
  return message || "Sign in failed.";
}

export function formatLoginApiMessage(message: string): string {
  if (/incorrect|invalid|wrong|not found|không đúng|sai mật khẩu/i.test(message)) {
    return "Username or password is incorrect.";
  }
  if (/disabled|inactive|vô hiệu/i.test(message)) {
    return "This account is disabled.";
  }
  return message || "Sign in failed.";
}
