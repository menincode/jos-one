/** Brand tokens from https://josvn.com/ (JOSVN – Journey Of Steps). */

const brandAssetBase = import.meta.env.BASE_URL;

export const JOSVN_BRAND = {
  name: "JOSVN",
  appName: "JOS One",
  appVersion: "1.1.1",
  tagline: "Hành trình không ngừng bước tới",
  taglineEn: "Journey Of Steps",
  website: "https://josvn.com/",
  logoSrc: `${brandAssetBase}brand/josvn-logo.png`,
  logoAlt: "JOSVN – Hành trình không ngừng bước tới",
  iconSrc: `${brandAssetBase}brand/josvn-icon.png`,
  colors: {
    navy: "#1f2641",
    blue: "#0f3f76",
    blueMid: "#1a3568",
    gold: "#d2b592",
    goldHover: "#c4a67a",
  },
} as const;

/** AI-style mesh backdrop for login + logout transition (keeps brand navy/teal undertone). */
export const JOSVN_LOGIN_GRADIENT = [
  "radial-gradient(ellipse 95% 75% at 8% 0%, rgba(99, 102, 241, 0.62) 0%, transparent 52%)",
  "radial-gradient(ellipse 80% 65% at 95% 8%, rgba(6, 182, 212, 0.55) 0%, transparent 48%)",
  "radial-gradient(ellipse 70% 60% at 50% 108%, rgba(168, 85, 247, 0.48) 0%, transparent 50%)",
  "radial-gradient(ellipse 55% 50% at 68% 58%, rgba(236, 72, 153, 0.28) 0%, transparent 46%)",
  "radial-gradient(ellipse 45% 40% at 22% 62%, rgba(29, 185, 195, 0.4) 0%, transparent 48%)",
  "radial-gradient(ellipse 35% 30% at 50% 35%, rgba(79, 70, 229, 0.22) 0%, transparent 55%)",
  `linear-gradient(155deg, #020308 0%, ${JOSVN_BRAND.colors.navy} 28%, #0a1038 52%, #14082e 76%, #03040c 100%)`,
].join(", ");

export const JOSVN_LOGIN_COPY = {
  greeting: "Xin chào!",
  headline: "JOURNEY OF STEPS",
  subheadline: "Hành trình không ngừng bước tới",
  description:
    "JOS Co.,Ltd – Journey Of Steps là công ty truyền thông công nghệ chuyên sản xuất nội dung số với định hướng hoạt hình 2D, 3D chất lượng cao trên thị trường quốc tế.",
  welcomeTitle: "Chào mừng trở lại",
  welcomeSubtitle: "Đăng nhập để tiếp tục trên JOS One.",
  login: "Đăng nhập",
  signingIn: "Đang đăng nhập…",
  forgotPassword: "Quên mật khẩu?",
  saveAccount: "Lưu tài khoản",
} as const;
