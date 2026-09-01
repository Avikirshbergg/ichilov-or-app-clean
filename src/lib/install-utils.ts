export type PromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const SNOOZE_KEY = "install-banner-snoozed-until";
export const SNOOZE_DAYS = 5;

let deferredPrompt: PromptEvent | null = null;
const listeners = new Set<(p: PromptEvent | null) => void>();

function emit() {
  listeners.forEach((fn) => fn(deferredPrompt));
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as PromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit();
  });
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function clearDeferredPrompt() {
  deferredPrompt = null;
  emit();
}

export function subscribeToPrompt(fn: (p: PromptEvent | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);
}

/** WhatsApp / Facebook / Instagram / Gmail in-app browsers cannot install apps. */
export function detectInAppBrowser(): string | null {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent;
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "פייסבוק";
  if (/Instagram/i.test(ua)) return "אינסטגרם";
  if (/WhatsApp/i.test(ua)) return "וואטסאפ";
  if (/Line\//i.test(ua)) return "Line";
  if (/GSA\//i.test(ua)) return "אפליקציית גוגל";
  if (/Telegram/i.test(ua)) return "טלגרם";
  // Android WebView (used by Gmail and many apps)
  if (/Android.*\bwv\b/i.test(ua)) return "דפדפן מוטמע";
  return null;
}

export function isSnoozed() {
  if (typeof window === "undefined") return true;
  const until = window.localStorage.getItem(SNOOZE_KEY);
  if (!until) return false;
  const ts = Number(until);
  return Number.isFinite(ts) && Date.now() < ts;
}

export function snooze(days = SNOOZE_DAYS) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
}

export function getOrCreateAnonymousId() {
  if (typeof window === "undefined") return "";
  const key = "pwa-anonymous-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id =
      window.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}
