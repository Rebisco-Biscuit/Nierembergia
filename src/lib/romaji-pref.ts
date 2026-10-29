// The "show romaji" preference, stored per browser and applied as
// `data-romaji` on <html>. Shared by the root layout (server) and the toggle.

export const ROMAJI_KEY = "nierembergia:romaji";
export const ROMAJI_EVENT = "nierembergia:romaji";

/** Runs in <head> before the first paint, so a saved "off" never flashes romaji in. */
export const ROMAJI_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("${ROMAJI_KEY}")==="off")document.documentElement.setAttribute("data-romaji","off")}catch(e){}})()`;
