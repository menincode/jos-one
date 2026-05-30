import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { JOSVN_BRAND, JOSVN_LOGIN_COPY } from "@/features/auth/brand/josvn-brand";
import { LoginAiBackground } from "@/features/auth/components/login-ai-background";
import { LoginBrandingPanel } from "@/features/auth/components/login-branding-panel";
import {
  clearSavedCredentials,
  loadSavedCredentials,
  saveSavedCredentials,
} from "@/lib/auth/saved-credentials";
import { getDefaultAppPath } from "@/lib/auth/scopes";
import { preloadAppSettings } from "@/lib/settings/app-settings-api";
import { usePywebviewReady } from "@/lib/pywebview";
import { TypingText } from "@/components/ui/typing-text";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

const { blue, gold, goldHover } = JOSVN_BRAND.colors;

const loginSchema = z.object({
  username: z.string().min(1, "Nhập tên đăng nhập"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

type LoginValues = z.infer<typeof loginSchema>;

const inputClassName =
  "h-12 w-full rounded-full border border-[#E5E7EB] bg-white px-5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f3f76]/35";

const LOGIN_FORM_ID = "jos-login-form";

export function LoginPage() {
  const navigate = useNavigate();
  const signIn = useAuthStore((s) => s.signIn);
  const { ready: bridgeReady, error: bridgeError, isDesktop } = usePywebviewReady();
  const bridgeBlocking = isDesktop && !bridgeReady;
  const [rememberAccount, setRememberAccount] = useState(false);
  const [credentialsReady, setCredentialsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    if (isDesktop && !bridgeReady) {
      return;
    }

    let cancelled = false;
    setCredentialsReady(false);
    void (async () => {
      try {
        await preloadAppSettings();
        const saved = await loadSavedCredentials();
        if (cancelled) {
          return;
        }
        if (saved) {
          reset({ username: saved.username, password: saved.password });
          setRememberAccount(true);
        }
      } finally {
        if (!cancelled) {
          setCredentialsReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reset, bridgeReady, isDesktop]);

  const handleRememberChange = (checked: boolean) => {
    setRememberAccount(checked);
  };

  const onSubmit = async (values: LoginValues) => {
    setIsSubmitting(true);
    try {
      await signIn(values.username, values.password);
      if (rememberAccount) {
        await saveSavedCredentials(values.username, values.password);
      } else {
        await clearSavedCredentials();
      }
      toast.success("Đăng nhập thành công");
      const user = useAuthStore.getState().user;
      navigate(getDefaultAppPath(user), { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đăng nhập thất bại. Kiểm tra lại thông tin.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isSubmitting || bridgeBlocking || !credentialsReady;
  const submitLabel = bridgeBlocking
    ? bridgeError
      ? "Không kết nối được ứng dụng"
      : "Đang kết nối…"
    : !credentialsReady
      ? "Đang tải…"
      : isSubmitting
        ? JOSVN_LOGIN_COPY.signingIn
        : JOSVN_LOGIN_COPY.login;

  return (
    <LoginAiBackground>
    <div className="flex min-h-screen flex-col font-[family-name:var(--font-login)] lg:flex-row">
      <div className="flex min-h-[220px] flex-col justify-center lg:min-h-screen lg:w-1/2 lg:max-w-[52%]">
        <LoginBrandingPanel />
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 lg:w-1/2 lg:px-12 lg:py-16">
        <div className="w-full max-w-[420px] rounded-[40px] border border-white/20 bg-white/95 px-8 py-10 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-10 sm:py-12">
          <div className="mb-6 flex justify-center lg:hidden">
            <img
              src={JOSVN_BRAND.logoSrc}
              alt={JOSVN_BRAND.logoAlt}
              className="h-10 w-auto max-w-[200px] object-contain"
              width={200}
              height={86}
            />
          </div>

          <TypingText
            as="h1"
            text={JOSVN_LOGIN_COPY.welcomeTitle}
            className="text-[26px] font-bold tracking-tight text-[#111827]"
            speedMs={65}
          />
          <p className="mt-2 text-sm text-[#6B7280]">{JOSVN_LOGIN_COPY.welcomeSubtitle}</p>

          <div className="mt-8 space-y-4">
            <form
              id={LOGIN_FORM_ID}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              <div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Tên đăng nhập"
                  className={cn(inputClassName, errors.username && "ring-2 ring-red-400")}
                  {...register("username")}
                />
                {errors.username ? (
                  <p className="mt-1 px-2 text-xs text-red-500">{errors.username.message}</p>
                ) : null}
              </div>

              <div>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Mật khẩu"
                  className={cn(inputClassName, errors.password && "ring-2 ring-red-400")}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="mt-1 px-2 text-xs text-red-500">{errors.password.message}</p>
                ) : null}
              </div>
            </form>

            <div className="flex items-center justify-between gap-3 px-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-[#4B5563]">
                <input
                  type="checkbox"
                  checked={rememberAccount}
                  onChange={(e) => handleRememberChange(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D1D5DB] accent-[#0f3f76]"
                />
                <span>{JOSVN_LOGIN_COPY.saveAccount}</span>
              </label>
              <button
                type="button"
                className="shrink-0 text-xs font-medium transition hover:opacity-80"
                style={{ color: blue }}
                onClick={() => toast.info("Tính năng khôi phục mật khẩu sẽ có sớm.")}
              >
                {JOSVN_LOGIN_COPY.forgotPassword}
              </button>
            </div>

            <button
              type="submit"
              form={LOGIN_FORM_ID}
              disabled={submitDisabled}
              className="h-12 w-full rounded-full bg-gradient-to-r from-[#0f3f76] via-[#4f46e5] to-[#0891b2] text-sm font-semibold text-white transition hover:from-[#1a3568] hover:via-[#4338ca] hover:to-[#0e7490] disabled:opacity-60"
              style={{
                boxShadow: "0 8px 28px rgba(79, 70, 229, 0.35)",
              }}
            >
              {submitLabel}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-[#6B7280]">
            {JOSVN_LOGIN_COPY.noAccount}{" "}
            <button
              type="button"
              className="font-semibold transition hover:opacity-80"
              style={{ color: gold }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = goldHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = gold;
              }}
              onClick={() => toast.info("Tính năng đăng ký sẽ có sớm.")}
            >
              {JOSVN_LOGIN_COPY.signUp}
            </button>
          </p>
        </div>
      </div>
    </div>
    </LoginAiBackground>
  );
}
