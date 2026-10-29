"use client";

import { useSyncExternalStore } from "react";
import { ROMAJI_EVENT as EVENT, ROMAJI_KEY } from "@/lib/romaji-pref";

const read = () => document.documentElement.getAttribute("data-romaji") !== "off";
const subscribe = (onChange: () => void) => {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
};

function setRomaji(on: boolean) {
  document.documentElement.setAttribute("data-romaji", on ? "on" : "off");
  try {
    localStorage.setItem(ROMAJI_KEY, on ? "on" : "off");
  } catch {
    // Not persisted; still applies for this page view.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Header switch for showing romaji under kana readings. On by default. */
export function RomajiToggle() {
  const on = useSyncExternalStore(subscribe, read, () => true);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => setRomaji(!on)}
      title={on ? "Hide romaji under kana readings" : "Show romaji under kana readings"}
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
        on ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:text-foreground"
      }`}
    >
      Romaji {on ? "on" : "off"}
    </button>
  );
}
