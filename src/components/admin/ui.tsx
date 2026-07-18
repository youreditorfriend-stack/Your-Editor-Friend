import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Info, Loader2, X, XCircle } from "lucide-react";

/* ────────────────────────────────────────────────────────────────────────
   Design tokens (shared visual language for the whole Admin panel)
   ──────────────────────────────────────────────────────────────────────── */

export const tone = {
  danger: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", solid: "bg-[#E50914]", solidHover: "hover:bg-red-700" },
  success: { text: "text-[#25D366]", bg: "bg-[#25D366]/10", border: "border-[#25D366]/20", solid: "bg-[#25D366]", solidHover: "hover:bg-green-600" },
  info: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", solid: "bg-blue-500", solidHover: "hover:bg-blue-600" },
  neutral: { text: "text-zinc-300", bg: "bg-white/5", border: "border-white/10", solid: "bg-zinc-800", solidHover: "hover:bg-zinc-700" },
  amber: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", solid: "bg-amber-500", solidHover: "hover:bg-amber-600" },
};

/* ────────────────────────────────────────────────────────────────────────
   Card — the base surface used everywhere (replaces ad-hoc bg-zinc-950/40…)
   ──────────────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  padded = true,
  hoverable = false,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`bg-zinc-950/50 border border-white/[0.06] rounded-2xl ${padded ? "p-5" : ""} ${
        hoverable ? "transition-all duration-200 hover:border-white/[0.12] hover:bg-zinc-950/70" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-white/[0.05]">
      <div className="min-w-0">
        <h3 className="font-semibold text-[13px] text-zinc-200 uppercase tracking-wider">{title}</h3>
        {subtitle && <p className="text-[11px] text-zinc-500 font-light mt-1 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Button
   ──────────────────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "success" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled = false,
  icon,
  className = "",
  type = "button",
  title,
}: {
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-bold tracking-wide rounded-xl transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const sizes = size === "sm" ? "text-[11px] px-3 py-1.5" : "text-xs px-4 py-2.5";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[#E50914] hover:bg-red-600 text-white shadow-lg shadow-red-900/20 focus-visible:ring-[#E50914]",
    success: "bg-[#25D366] hover:bg-green-500 text-black shadow-lg shadow-green-900/10 focus-visible:ring-[#25D366]",
    secondary: "bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/10 focus-visible:ring-white/30",
    ghost: "bg-transparent hover:bg-white/[0.06] text-zinc-400 hover:text-white focus-visible:ring-white/20",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 focus-visible:ring-red-500",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes} ${variants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({
  onClick,
  icon,
  title,
  variant = "ghost",
  size = 30,
}: {
  onClick?: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  title?: string;
  variant?: "ghost" | "danger";
  size?: number;
}) {
  const variants =
    variant === "danger"
      ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
      : "bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/5";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ width: size, height: size }}
      className={`inline-flex items-center justify-center rounded-lg transition-all cursor-pointer active:scale-90 ${variants}`}
    >
      {icon}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Badge
   ──────────────────────────────────────────────────────────────────────── */

export function Badge({
  children,
  toneKey = "neutral",
  dot = false,
}: {
  children: React.ReactNode;
  toneKey?: keyof typeof tone;
  dot?: boolean;
}) {
  const t = tone[toneKey];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${t.bg} ${t.text} border ${t.border}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${t.solid}`} />}
      {children}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Form controls — consistent label + input + hint
   ──────────────────────────────────────────────────────────────────────── */

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{children}</label>;
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">{label}</label>}
      {children}
      {hint && <p className="text-[10px] text-zinc-600 font-light leading-relaxed">{hint}</p>}
    </div>
  );
}

const inputBase =
  "w-full bg-zinc-950 border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]/30";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => <input ref={ref} className={`${inputBase} ${className}`} {...props} />
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${inputBase} resize-y leading-relaxed ${className}`} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = "", children, ...props }, ref) => (
    <select ref={ref} className={`${inputBase} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

/* ────────────────────────────────────────────────────────────────────────
   Toggle
   ──────────────────────────────────────────────────────────────────────── */

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`w-10 h-[22px] rounded-full relative shrink-0 transition-colors duration-200 cursor-pointer ${
        value ? "bg-[#25D366]" : "bg-zinc-700"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-[3px] bg-white w-4 h-4 rounded-full shadow"
        style={{ left: value ? 21 : 3 }}
      />
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Empty state
   ──────────────────────────────────────────────────────────────────────── */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-14 px-6 border border-dashed border-white/10 rounded-2xl bg-white/[0.015]">
      {icon && <div className="mx-auto mb-3 text-zinc-600 flex items-center justify-center">{icon}</div>}
      <p className="text-zinc-300 text-sm font-semibold">{title}</p>
      {description && <p className="text-zinc-500 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Skeleton loading
   ──────────────────────────────────────────────────────────────────────── */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-white/5 rounded-lg animate-pulse ${className}`} />;
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="w-full aspect-square rounded-xl mb-3.5" />
      <Skeleton className="h-3 w-3/4 mb-2" />
      <Skeleton className="h-2.5 w-full mb-1.5" />
      <Skeleton className="h-2.5 w-1/2" />
    </Card>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="h-2 w-1/2" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────
   Toast system — usage: const toast = useToast(); toast.success("Saved!")
   ──────────────────────────────────────────────────────────────────────── */

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastCtx = createContext<{
  push: (kind: ToastKind, message: string) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setItems((cur) => [...cur, { id, kind, message }]);
    setTimeout(() => setItems((cur) => cur.filter((t) => t.id !== id)), 3200);
  }, []);

  const dismiss = (id: number) => setItems((cur) => cur.filter((t) => t.id !== id));

  const iconFor = (kind: ToastKind) =>
    kind === "success" ? <Check size={15} /> : kind === "error" ? <XCircle size={15} /> : <Info size={15} />;
  const styleFor = (kind: ToastKind) =>
    kind === "success"
      ? "bg-zinc-950 border-[#25D366]/30 text-[#25D366]"
      : kind === "error"
      ? "bg-zinc-950 border-red-500/30 text-red-400"
      : "bg-zinc-950 border-blue-500/30 text-blue-400";

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5 items-end pointer-events-none">
            <AnimatePresence>
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className={`pointer-events-auto flex items-center gap-2.5 border rounded-xl pl-3.5 pr-2.5 py-2.5 shadow-2xl shadow-black/50 min-w-[220px] max-w-sm ${styleFor(
                    t.kind
                  )}`}
                >
                  {iconFor(t.kind)}
                  <span className="text-xs font-semibold text-white flex-1">{t.message}</span>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="text-zinc-500 hover:text-white transition-colors cursor-pointer p-1"
                  >
                    <X size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    // Safe no-op fallback so components never crash if used outside provider
    return { success: () => {}, error: () => {}, info: () => {} };
  }
  return {
    success: (m: string) => ctx.push("success", m),
    error: (m: string) => ctx.push("error", m),
    info: (m: string) => ctx.push("info", m),
  };
}

/* ────────────────────────────────────────────────────────────────────────
   Dialog primitives — base Modal + ConfirmDialog + a promise-based helper
   hook (useConfirm) so call sites can do:  if (await confirm({...})) {...}
   instead of window.confirm(...)
   ──────────────────────────────────────────────────────────────────────── */

export function Modal({
  open,
  onClose,
  children,
  maxWidth = 440,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            style={{ maxWidth }}
            className="w-full bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

const ConfirmCtx = createContext<{
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmCtx.Provider value={{ confirm }}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} maxWidth={400}>
        {state && (
          <div className="p-6">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                state.danger ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
              }`}
            >
              <AlertTriangle size={20} />
            </div>
            <h3 className="text-white font-semibold text-base mb-1.5">{state.title}</h3>
            {state.description && (
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">{state.description}</p>
            )}
            <div className="flex justify-end gap-2.5 mt-2">
              <Button variant="secondary" onClick={() => close(false)}>
                {state.cancelLabel || "Cancel"}
              </Button>
              <Button variant={state.danger ? "primary" : "success"} onClick={() => close(true)}>
                {state.confirmLabel || "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) {
    // Fallback so it never crashes if used outside provider
    return async (opts: ConfirmOptions) => window.confirm(opts.title);
  }
  return ctx.confirm;
}

/* ────────────────────────────────────────────────────────────────────────
   PromptDialog — a styled replacement for window.prompt()
   ──────────────────────────────────────────────────────────────────────── */

interface PromptOptions {
  title: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  extraLabel?: string; // e.g. a second numeric field
  extraPlaceholder?: string;
}

const PromptCtx = createContext<{
  prompt: (opts: PromptOptions) => Promise<string | null>;
  promptPair: (opts: PromptOptions) => Promise<{ a: string; b: string } | null>;
} | null>(null);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<
    (PromptOptions & { resolve: (v: any) => void; pair: boolean }) | null
  >(null);
  const [val, setVal] = useState("");
  const [val2, setVal2] = useState("");

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setVal(opts.defaultValue || "");
      setState({ ...opts, resolve, pair: false });
    });
  }, []);

  const promptPair = useCallback((opts: PromptOptions) => {
    return new Promise<{ a: string; b: string } | null>((resolve) => {
      setVal("");
      setVal2("");
      setState({ ...opts, resolve, pair: true });
    });
  }, []);

  const close = (ok: boolean) => {
    if (!state) return;
    if (!ok) {
      state.resolve(null);
    } else if (state.pair) {
      state.resolve({ a: val, b: val2 });
    } else {
      state.resolve(val);
    }
    setState(null);
  };

  return (
    <PromptCtx.Provider value={{ prompt, promptPair }}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} maxWidth={420}>
        {state && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              close(true);
            }}
            className="p-6"
          >
            <h3 className="text-white font-semibold text-base mb-4">{state.title}</h3>
            <div className="space-y-3.5">
              <Field label={state.label || "Value"}>
                <Input
                  autoFocus
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder={state.placeholder}
                />
              </Field>
              {state.pair && (
                <Field label={state.extraLabel || "Value"}>
                  <Input
                    type="number"
                    value={val2}
                    onChange={(e) => setVal2(e.target.value)}
                    placeholder={state.extraPlaceholder}
                  />
                </Field>
              )}
            </div>
            <div className="flex justify-end gap-2.5 mt-6">
              <Button variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {state.confirmLabel || "Add"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </PromptCtx.Provider>
  );
}

export function usePrompt() {
  const ctx = useContext(PromptCtx);
  if (!ctx) {
    return {
      prompt: async (opts: PromptOptions) => window.prompt(opts.title, opts.defaultValue),
      promptPair: async () => null,
    };
  }
  return ctx;
}

/* ────────────────────────────────────────────────────────────────────────
   Small spinner used in loading buttons / boot screen
   ──────────────────────────────────────────────────────────────────────── */

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}
