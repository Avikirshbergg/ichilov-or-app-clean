import { Link } from "@tanstack/react-router";
import { Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { logInstallEvent } from "@/lib/analytics.functions";
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  getOrCreateAnonymousId,
  isSnoozed,
  isStandalone,
  snooze,
  subscribeToPrompt,
  type PromptEvent,
} from "@/lib/install-utils";

export function InstallBanner() {
  const [deferred, setDeferred] = useState<PromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const anonymousIdRef = useRef<string>("");

  useEffect(() => {
    anonymousIdRef.current = getOrCreateAnonymousId();
    setVisible(!isStandalone() && !isSnoozed());
    setDeferred(getDeferredPrompt());
    const unsubscribe = subscribeToPrompt(setDeferred);

    const onInstalled = () => {
      void logInstallEvent({
        data: {
          anonymous_id: anonymousIdRef.current,
          outcome: "appinstalled",
          platform: null,
          user_agent: window.navigator.userAgent,
        },
      });
      setVisible(false);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const close = () => {
    snooze();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/5 p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">התקנת האפליקציה בטלפון</p>
          <p className="mt-1 text-xs text-muted-foreground">
            האפליקציה תתווסף למסך הבית ותיפתח במסך מלא.
          </p>
          <div className="mt-3 flex gap-2">
            {deferred ? (
              <button
                onClick={async () => {
                  try {
                    await deferred.prompt();
                    const choice = await deferred.userChoice;
                    if (choice?.outcome) {
                      void logInstallEvent({
                        data: {
                          anonymous_id: anonymousIdRef.current,
                          outcome: choice.outcome,
                          platform: choice.platform || null,
                          user_agent: window.navigator.userAgent,
                        },
                      });
                    }
                  } catch {
                    // ignore
                  } finally {
                    clearDeferredPrompt();
                    close();
                  }
                }}
                className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground active:opacity-90"
              >
                התקן עכשיו
              </button>
            ) : null}
            <Link
              to="/install"
              className="flex-1 rounded-xl border border-primary/40 px-4 py-2 text-center text-sm font-semibold text-primary active:bg-primary/10"
            >
              הוראות התקנה
            </Link>
          </div>
        </div>
        <button onClick={close} aria-label="סגירה" className="text-muted-foreground/60">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
