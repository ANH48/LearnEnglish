import type { ReactNode } from "react";
import { BrandLogo, BrandMark } from "@/components/brand/brand-logo";
import { LearningShowcase } from "./learning-showcase";

/**
 * Sign-in / sign-up screen: the animated learning canvas on the left (large
 * screens only), the form centred on the right.
 */
export function AuthSplitLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 bg-background lg:p-3">
      <LearningShowcase className="hidden w-[52%] rounded-3xl lg:flex" />

      <main className="relative isolate flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-8">
        {/* soft colour behind the form on phones, where the canvas is hidden */}
        <div aria-hidden="true" className="absolute -top-32 -right-24 -z-10 size-80 rounded-full bg-teal-300/30 blur-3xl lg:hidden" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-24 -z-10 size-80 rounded-full bg-orange-200/50 blur-3xl lg:hidden" />
        <div className="lg:hidden">
          <BrandLogo />
        </div>
        <div className="m-auto grid w-full max-w-sm gap-6 py-10">
          <div className="grid justify-items-center gap-3 text-center">
            <BrandMark className="hidden size-14 animate-rise lg:block" />
            <h1 className="animate-rise font-heading text-3xl font-extrabold tracking-tight" style={{ animationDelay: "0.08s" }}>
              {title}
            </h1>
            <p className="animate-rise text-sm text-muted-foreground" style={{ animationDelay: "0.16s" }}>
              {subtitle}
            </p>
          </div>
          <div className="animate-rise" style={{ animationDelay: "0.24s" }}>
            {children}
          </div>
          {footer && (
            <div className="grid animate-rise gap-2 text-center text-sm text-muted-foreground" style={{ animationDelay: "0.32s" }}>
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
