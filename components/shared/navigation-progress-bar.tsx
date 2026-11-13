"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { NAVIGATION_START_EVENT } from "@/lib/navigation/navigation-start-event";

/** Fast page changes finish before this delay, so the bar never flashes for them. */
const SHOW_DELAY_MS = 100;
/** Hides the bar when a navigation is cancelled or lands back on the same URL. */
const GIVE_UP_MS = 15_000;

function Bar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let showTimer: number | undefined;
    let giveUpTimer: number | undefined;
    const clearTimers = () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(giveUpTimer);
    };
    const onStart = () => {
      clearTimers();
      showTimer = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      giveUpTimer = window.setTimeout(() => setVisible(false), GIVE_UP_MS);
    };
    window.addEventListener(NAVIGATION_START_EVENT, onStart);
    return () => {
      clearTimers();
      window.removeEventListener(NAVIGATION_START_EVENT, onStart);
    };
  }, []);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="Đang tải trang" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/15">
      <div className="h-full origin-left animate-progress bg-primary" />
    </div>
  );
}

function BarForCurrentUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A new URL means the page arrived: remounting drops the bar and any pending timer.
  return <Bar key={`${pathname}?${searchParams}`} />;
}

/** Thin bar at the top of the screen while the next page is being fetched. */
export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <BarForCurrentUrl />
    </Suspense>
  );
}
