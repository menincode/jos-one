import { JOSVN_BRAND, JOSVN_LOGIN_COPY } from "@/features/auth/brand/josvn-brand";

export function LoginBrandingPanel() {
  return (
    <div className="flex flex-1 flex-col justify-center px-8 py-12 sm:px-12 lg:px-16 xl:px-20">
      <a
        href={JOSVN_BRAND.website}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block w-fit transition opacity-95 hover:opacity-100"
        aria-label={JOSVN_BRAND.logoAlt}
      >
        <img
          src={JOSVN_BRAND.logoSrc}
          alt={JOSVN_BRAND.logoAlt}
          className="h-12 w-auto max-w-[220px] object-contain object-left sm:h-14 sm:max-w-[260px]"
          width={260}
          height={112}
        />
      </a>

      <p className="mt-2 bg-gradient-to-r from-[#d2b592] via-[#a5f3fc] to-[#c4b5fd] bg-clip-text text-sm font-semibold tracking-[0.2em] text-transparent uppercase">
        {JOSVN_LOGIN_COPY.headline}
      </p>

      <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
        {JOSVN_LOGIN_COPY.greeting}
      </h1>
      <p className="mt-4 max-w-md text-lg font-medium text-white/95">
        {JOSVN_LOGIN_COPY.subheadline}
      </p>
      <p className="mt-6 max-w-lg text-sm leading-relaxed text-white/70">
        {JOSVN_LOGIN_COPY.description}
      </p>
    </div>
  );
}
