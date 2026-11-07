import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

// Makes /admin installable as a phone app ("YEF Admin"). The manifest and
// service worker are only added on the admin route, so the shop is unaffected.
function useAdminPwa() {
  useEffect(() => {
    const add = (tag: string, attrs: Record<string, string>) => {
      if (document.head.querySelector(`${tag}[data-yef-admin="${attrs.rel || attrs.name}"]`)) return;
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      el.setAttribute("data-yef-admin", attrs.rel || attrs.name);
      document.head.appendChild(el);
    };
    add("link", { rel: "manifest", href: "/admin.webmanifest" });
    add("link", { rel: "apple-touch-icon", href: "/admin-icon-192.png" });
    add("meta", { name: "theme-color", content: "#0a0a0a" });
    add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
    add("meta", { name: "apple-mobile-web-app-title", content: "YEF Admin" });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => {});
  }, []);
}

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

export function InstallAppButton() {
  useAdminPwa();
  const [prompt, setPrompt] = useState<any>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const h = (e: any) => { e.preventDefault(); setPrompt(e); };
    const done = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("appinstalled", done);
    return () => { window.removeEventListener("beforeinstallprompt", h); window.removeEventListener("appinstalled", done); };
  }, []);

  if (installed) return null;
  const click = async () => {
    if (prompt) { prompt.prompt(); const r = await prompt.userChoice.catch(() => null); if (r?.outcome === "accepted") setInstalled(true); setPrompt(null); }
    else setHelp(true);
  };

  return (
    <>
      <button onClick={click} className="h-9 px-3 rounded-xl border border-[#FF7A1A]/50 text-[#FF7A1A] text-xs font-bold flex items-center gap-1.5 hover:bg-[#FF7A1A]/10 cursor-pointer">
        <Download size={14} /> <span className="hidden sm:inline">Install app</span><span className="sm:hidden">App</span>
      </button>
      {help && (
        <div className="fixed inset-0 z-[200] bg-black/80 grid place-items-center p-5" onClick={() => setHelp(false)}>
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#131313] p-5" onClick={e => e.stopPropagation()}>
            <button onClick={() => setHelp(false)} className="absolute top-3 right-3 text-zinc-500"><X size={18} /></button>
            <img src="/admin-icon-192.png" alt="" className="w-14 h-14 rounded-2xl" />
            <h3 className="text-lg font-extrabold mt-3">Install YEF Admin</h3>
            {isIOS() ? (
              <ol className="mt-3 space-y-2 text-sm text-zinc-300 list-decimal pl-5">
                <li>Open this page in <b>Safari</b>.</li>
                <li>Tap the <b>Share</b> button (square with arrow).</li>
                <li>Choose <b>Add to Home Screen</b> → Add.</li>
              </ol>
            ) : (
              <ol className="mt-3 space-y-2 text-sm text-zinc-300 list-decimal pl-5">
                <li>Open <b>youreditorfriend.in/admin</b> in <b>Chrome</b> on your phone.</li>
                <li>Tap the <b>⋮</b> menu (top right).</li>
                <li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li>
              </ol>
            )}
            <p className="text-xs text-zinc-500 mt-3">It opens full-screen like a normal app, always with live data.</p>
          </div>
        </div>
      )}
    </>
  );
}
