import { NAVIGATION_START_EVENT } from "@/lib/navigation/navigation-start-event";

/** Tells the top progress bar that a page change began (link click, router.push, back/forward). */
export function onRouterTransitionStart(url: string) {
  const target = new URL(url, window.location.href);
  // A link to the page already on screen never changes the URL, so nothing would hide the bar.
  if (target.pathname === window.location.pathname && target.search === window.location.search) return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
