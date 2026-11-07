import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy, Download, FolderOpen, Lock, Play, X } from 'lucide-react';
import type { Product, PromptKitPublic, PromptKitPrivate } from '../src/lib/store';
import { formatPrice } from '../src/lib/store';
import { loadKitPrivate, loadKitPublic, loadProgress, saveProgress } from '../src/lib/promptKit';
import { useAuth } from '../src/lib/auth';
import { usePurchase } from '../src/lib/purchase';

const C = 2 * Math.PI * 12;
const Ring: React.FC<{ p: number; label: string }> = ({ p, label }) => (
  <svg viewBox="0 0 30 30" className="absolute right-1.5 top-1.5 w-[30px] h-[30px]">
    <circle cx="15" cy="15" r="12" fill="rgba(0,0,0,.55)" stroke="rgba(255,255,255,.18)" strokeWidth="3.2" />
    <circle cx="15" cy="15" r="12" fill="none" stroke="#3DDC84" strokeWidth="3.2" strokeLinecap="round"
      strokeDasharray={C} strokeDashoffset={C * (1 - p)} style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)' }} />
    <text x="15" y="15" fill="#fff" fontSize="9" fontWeight="800" textAnchor="middle" dominantBaseline="central">{label}</text>
  </svg>
);

// One product = one video. Shows the PSD files used in it → their layers →
// each layer's reference images + prompt, with one-click copy and "done" ticks.
export const PromptKitViewer: React.FC<{ product: Product }> = ({ product }) => {
  const { user, profile } = useAuth();
  const { buy, claimFree, isLoggedIn, paying } = usePurchase();
  const [kit, setKit] = useState<PromptKitPublic | null>(null);
  const [priv, setPriv] = useState<PromptKitPrivate | null>(null);
  const [locked, setLocked] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [fIdx, setFIdx] = useState(0);
  const [lIdx, setLIdx] = useState(0);
  const [refIdx, setRefIdx] = useState(0);
  const [exploded, setExploded] = useState(true);
  const [swap, setSwap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);
  const doneBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => { loadKitPublic(product.id).then(setKit).catch(() => setKit(null)); }, [product.id]);
  // Prompt text: re-check whenever ownership changes (e.g. right after paying).
  useEffect(() => {
    let alive = true;
    loadKitPrivate(product.id)
      .then(p => { if (alive) { setPriv(p); setLocked(false); } })
      .catch(() => { if (alive) { setPriv(null); setLocked(true); } });
    return () => { alive = false; };
  }, [product.id, user?.uid, profile?.purchases?.length]);
  useEffect(() => { loadProgress(user?.uid, product.id).then(setDone); }, [user?.uid, product.id]);

  const files = kit?.files || [];
  const file = files[fIdx];
  const layer = file?.layers[lIdx];
  const allLayers = useMemo(() => files.flatMap(f => f.layers), [files]);
  const doneCount = allLayers.filter(l => done[l.id]).length;
  const fileDone = (i: number) => files[i].layers.filter(l => done[l.id]).length;

  const flash = (t: string) => { setToast(t); window.clearTimeout((flash as any)._t); (flash as any)._t = window.setTimeout(() => setToast(''), 1800); };

  const selectLayer = useCallback((i: number, instant = false) => {
    if (!file) return;
    const n = Math.max(0, Math.min(i, file.layers.length - 1));
    if (instant) { setLIdx(n); setRefIdx(0); setCopied(false); return; }
    setSwap(true);
    window.setTimeout(() => { setLIdx(n); setRefIdx(0); setCopied(false); setSwap(false); }, 170);
  }, [file]);

  const goFile = (i: number) => {
    const f = files[i]; if (!f) return;
    const first = f.layers.findIndex(l => !done[l.id]);
    setFIdx(i); setLIdx(first >= 0 ? first : 0); setRefIdx(0); setCopied(false);
  };

  const promptText = layer ? priv?.prompts?.[layer.id] : undefined;

  // Editable parts: the admin writes {{Name}} / {{Brand}} in a prompt; the
  // customer types their own text and it's swapped in before copying.
  const tokens = useMemo(() => {
    const t = new Set<string>();
    (promptText?.prompt || '').replace(/\{\{\s*([^{}]{1,40}?)\s*\}\}/g, (_m, k) => { t.add(k); return ''; });
    return [...t];
  }, [promptText?.prompt]);
  const fieldsKey = `yef-kit-fields-${product.id}`;
  const [fields, setFields] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(fieldsKey) || '{}'); } catch { return {}; } });
  const setField = (k: string, v: string) => {
    const next = { ...fields, [k]: v.slice(0, 60) };
    setFields(next);
    try { localStorage.setItem(fieldsKey, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const fill = (s: string) => s.replace(/\{\{\s*([^{}]{1,40}?)\s*\}\}/g, (_m, k) => fields[k]?.trim() || k);

  const copy = async () => {
    if (!layer || !promptText?.prompt) return;
    const text = [fill(promptText.prompt), promptText.params].filter(Boolean).join(' ');
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    setCopied(true); flash('Prompt copied — Mark done when finished');
    window.setTimeout(() => setCopied(false), 1800);
  };

  const burst = () => {
    const b = doneBtn.current?.getBoundingClientRect(); if (!b) return;
    const x = b.left + b.width / 2, y = b.top + b.height / 2;
    for (let i = 0; i < 16; i++) {
      const s = document.createElement('i'); s.className = 'kit-spark';
      const a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 60;
      s.style.cssText = `left:${x}px;top:${y}px;background:${['#3DDC84', '#FF7A1A', '#fff'][i % 3]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 20}px;--r:${Math.random() * 360}deg`;
      document.body.appendChild(s); window.setTimeout(() => s.remove(), 950);
    }
  };

  const toggleDone = (at: number = lIdx) => {
    const lay = file?.layers[at];
    if (!lay || !file) return;
    const next = { ...done };
    if (next[lay.id]) delete next[lay.id]; else next[lay.id] = true;
    setDone(next); saveProgress(user?.uid, product.id, next);
    if (!next[lay.id]) return;
    burst();
    const fileComplete = file.layers.every(l => next[l.id]);
    if (fileComplete) {
      flash(`${file.fileName} complete 🎉`);
      const nf = files.findIndex((f, i) => i > fIdx && f.layers.some(l => !next[l.id]));
      if (nf >= 0) window.setTimeout(() => goFile(nf), 1100);
    } else {
      const nx = file.layers.findIndex((l, i) => i > at && !next[l.id]);
      const first = file.layers.findIndex(l => !next[l.id]);
      window.setTimeout(() => selectLayer(nx >= 0 ? nx : first), 650);
    }
  };

  // Keyboard: ← → layers, C copy, D done
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea')) return;
      if (lightbox) { if (e.key === 'Escape') setLightbox(null); return; }
      if (e.key === 'ArrowRight') selectLayer(lIdx + 1);
      else if (e.key === 'ArrowLeft') selectLayer(lIdx - 1);
      else if (e.key.toLowerCase() === 'c' && !locked) copy();
      else if (e.key.toLowerCase() === 'd' && !locked) toggleDone();
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });

  if (!kit || !files.length || !file || !layer) return null;
  const ratio = `${file.width} / ${file.height}`;
  const isDone = !!done[layer.id];
  const refs = layer.refs || [];

  return (
    <section className="mb-10 md:mb-14">
      {/* Head */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative w-24 md:w-36 aspect-video rounded-xl overflow-hidden border border-white/10 shrink-0">
            <img src={product.image} alt="" className="w-full h-full object-cover" />
            <span className="absolute inset-0 grid place-items-center bg-black/25"><Play size={16} /></span>
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[10px] md:text-[11px] font-bold tracking-[0.14em] text-[#FF7A1A] bg-[#FF7A1A]/[0.12] px-3 py-1 rounded-full">✦ PROMPT KIT</span>
            <h1 className="text-2xl md:text-[34px] font-extrabold tracking-tight leading-tight mt-1.5">{product.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[13px] text-zinc-500 mt-1">
              <span><b className="text-white">{files.length}</b> Photoshop files</span>
              <span><b className="text-white">{allLayers.length}</b> layers</span>
              {!locked && <span><b className="text-white">{doneCount}</b> done</span>}
            </div>
          </div>
        </div>
        {!locked && (
          <div className="flex items-center gap-2.5 text-xs text-zinc-500 whitespace-nowrap">
            {doneCount}/{allLayers.length}
            <span className="w-28 h-1.5 rounded-full bg-[#1b1b1b] overflow-hidden"><i className="block h-full bg-[#3DDC84] transition-all duration-700" style={{ width: `${(doneCount / allLayers.length) * 100}%` }} /></span>
          </div>
        )}
      </div>

      {/* PSD strip */}
      <div className="flex items-baseline justify-between gap-3 mb-2.5 text-[11px] md:text-xs font-bold tracking-wider text-zinc-500">
        <span className="flex items-center gap-1.5"><FolderOpen size={13} /> PHOTOSHOP FILES INSIDE THIS VIDEO</span>
        <span className="hidden sm:inline font-medium tracking-normal">tap a file to open its layers</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-3 -mx-4 px-4 md:mx-0 md:px-0">
        {files.map((f, i) => {
          const d = fileDone(i), t = f.layers.length, on = i === fIdx;
          return (
            <button key={f.id} onClick={() => i !== fIdx && goFile(i)}
              className={`shrink-0 w-[132px] md:w-[168px] text-left rounded-2xl border overflow-hidden bg-[#131313] transition hover:-translate-y-0.5 ${on ? 'border-[#FF7A1A] ring-1 ring-[#FF7A1A]' : 'border-white/[0.08]'}`}>
              <div className="relative aspect-[16/10] overflow-hidden">
                <img src={f.cover} alt="" className={`w-full h-full object-cover transition-opacity ${on ? '' : 'opacity-55'}`} />
                <span className="absolute left-1.5 top-1.5 text-[10px] font-extrabold bg-black/70 px-1.5 py-0.5 rounded">PSD {i + 1}</span>
                {!locked && <Ring p={d / t} label={d === t ? '✓' : `${d}/${t}`} />}
              </div>
              <div className="px-2.5 pt-2 pb-2.5">
                <span className="block font-mono text-[10px] text-zinc-500 truncate">{f.fileName}</span>
                <b className="block text-[13px] truncate">{f.name}</b>
                <small className={`text-[11px] ${!locked && d === t ? 'text-[#3DDC84]' : 'text-zinc-500'}`}>{locked ? `${t} layers` : d === t ? 'Complete' : `${d} of ${t} done`}</small>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-5 lg:gap-6 mt-2">
        {/* Stage */}
        <div>
          <div className={`kit-stage ${exploded ? 'exploded' : ''} relative lg:sticky lg:top-28 rounded-[20px] border border-white/[0.08] bg-[#131313] overflow-hidden aspect-square grid place-items-center`}>
            <div className="absolute top-3 left-3 z-10 flex bg-black/65 border border-white/10 rounded-[10px] p-[3px] backdrop-blur">
              {(['layers', 'final'] as const).map(m => (
                <button key={m} onClick={() => setExploded(m === 'layers')}
                  className={`h-[30px] px-3 rounded-[7px] text-xs font-bold transition ${(m === 'layers') === exploded ? 'bg-[#FF7A1A] text-black' : 'text-zinc-400'}`}>
                  {m === 'layers' ? 'Layers' : 'Final'}
                </button>
              ))}
            </div>
            <div className="relative w-[60%]" style={{ aspectRatio: ratio }}>
              {file.layers.map((l, i) => (
                <div key={l.id} onClick={() => exploded && selectLayer(i)}
                  className={`kit-layer ${i === lIdx ? 'sel' : 'dim'} ${!locked && done[l.id] ? 'isdone' : ''}`}
                  style={{ ['--i' as any]: i, mixBlendMode: (l.blend as any) || 'normal' }}>
                  <img src={l.image} alt="" className="w-full h-full object-contain" />
                  <span className="kit-lbl absolute left-1.5 top-1.5 text-[10px] font-extrabold bg-black/75 px-1.5 py-0.5 rounded flex gap-1">
                    {!locked && done[l.id] && <span className="text-[#3DDC84]">✓</span>}{i + 1}. {l.name}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute bottom-3 inset-x-0 text-center text-xs text-zinc-500 truncate px-4">PSD {fIdx + 1} · {file.fileName}</div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-[18px] border border-white/[0.08] bg-[#131313]">
            <div className="flex justify-between px-4 pt-3.5 pb-1.5 text-xs font-bold tracking-wider text-zinc-500">
              <span>LAYERS</span>{!locked && <span>{fileDone(fIdx)}/{file.layers.length} done</span>}
            </div>
            <ul className="flex lg:flex-col gap-2 lg:gap-0 overflow-x-auto no-scrollbar px-3 lg:px-2 pb-3 lg:pb-2 pt-1">
              {[...file.layers].map((l, i) => ({ l, i })).reverse().map(({ l, i }) => {
                const sel = i === lIdx, d = !locked && !!done[l.id];
                return (
                  <li key={l.id} onClick={() => selectLayer(i)}
                    className={`relative shrink-0 w-[86px] lg:w-auto flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 p-2 rounded-xl cursor-pointer text-center lg:text-left transition-colors ${
                      sel ? 'bg-[#FF7A1A]/10 shadow-[inset_0_-3px_0_#FF7A1A] lg:shadow-[inset_3px_0_0_#FF7A1A]' : 'hover:bg-[#1b1b1b]'}`}>
                    {!locked && (
                      <span onClick={e => { e.stopPropagation(); if (i !== lIdx) selectLayer(i, true); toggleDone(i); }}
                        className={`absolute lg:static top-1 right-1.5 w-5 h-5 lg:w-6 lg:h-6 rounded-md lg:rounded-[7px] border-2 grid place-items-center shrink-0 transition ${d ? 'bg-[#3DDC84] border-[#3DDC84]' : 'border-[#444]'}`}>
                        {d && <Check size={13} strokeWidth={3.5} className="text-black" />}
                      </span>
                    )}
                    <span className="kit-checker relative w-[50px] h-[62px] lg:w-[38px] lg:h-[48px] rounded-md overflow-hidden border border-[#333] shrink-0">
                      <img src={l.image} alt="" className="absolute inset-0 w-full h-full object-contain" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <b className={`block text-[11px] lg:text-sm font-semibold truncate ${d ? 'text-zinc-500 line-through decoration-[#3DDC84]/60' : ''}`}>{l.name}</b>
                    </span>
                    {(l.refs?.length || 0) > 0 && <span className="hidden lg:inline text-[11px] text-zinc-500">🖼 {l.refs.length}</span>}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-[18px] border border-white/[0.08] bg-[#131313] p-4">
            <div className={`kit-fade ${swap ? 'swap' : ''}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <b className="text-base">{lIdx + 1}. {layer.name}</b>
                <small className="text-xs text-zinc-500">PSD {fIdx + 1} · layer {lIdx + 1} of {file.layers.length}</small>
              </div>

              <div className={`grid ${refs.length ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1 max-w-[220px]'} gap-2.5 items-center mb-3`}>
                {refs.length > 0 && (
                  <>
                    <figure onClick={() => setLightbox(refs[refIdx])} className="relative rounded-xl overflow-hidden border border-white/[0.08] aspect-[4/5] bg-[#0d0d0d] cursor-zoom-in group">
                      <img src={refs[refIdx]} alt="Reference" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <figcaption className="absolute left-1.5 top-1.5 text-[10px] font-extrabold bg-black/75 px-1.5 py-0.5 rounded">REFERENCE</figcaption>
                      <a href={refs[refIdx]} download target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="absolute right-1.5 bottom-1.5 text-[10px] font-bold bg-black/75 px-2 py-1 rounded-md flex items-center gap-1"><Download size={11} /> Save</a>
                    </figure>
                    <span className="text-[#FF7A1A] text-xl font-extrabold">→</span>
                  </>
                )}
                <figure onClick={() => setLightbox(layer.image)} className="kit-checker relative rounded-xl overflow-hidden border border-white/[0.08] aspect-[4/5] cursor-zoom-in">
                  <img src={layer.image} alt="Result" className="w-full h-full object-contain" />
                  <figcaption className="absolute left-1.5 top-1.5 text-[10px] font-extrabold bg-black/75 px-1.5 py-0.5 rounded">RESULT</figcaption>
                </figure>
              </div>
              {refs.length > 1 && (
                <div className="flex gap-1.5 -mt-1 mb-3">
                  {refs.map((r, k) => (
                    <button key={k} onClick={() => setRefIdx(k)} className={`w-[34px] h-[34px] rounded-md overflow-hidden border-2 transition ${k === refIdx ? 'border-[#FF7A1A]' : 'border-transparent opacity-60'}`}>
                      <img src={r} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {locked ? (
                <div className="relative rounded-xl border border-white/[0.08] bg-[#0d0d0d] overflow-hidden">
                  <p className="font-mono text-[13px] leading-relaxed p-4 blur-[5px] select-none text-zinc-400" aria-hidden>
                    Cinematic layered prompt with lighting, lens, texture and colour details written for this exact layer so you can recreate it in one go.
                  </p>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-center px-4">
                    <span className="flex items-center gap-1.5 text-sm font-bold"><Lock size={14} /> {allLayers.length} prompts unlock after purchase</span>
                    <button
                      onClick={() => (product.free ? claimFree(product) : buy(product))}
                      disabled={paying === product.id}
                      className="yef-shine h-11 px-5 rounded-xl bg-[#FF7A1A] text-black font-extrabold text-sm disabled:opacity-60">
                      {paying === product.id ? 'Opening payment…' : !isLoggedIn ? 'Login to unlock' : product.free ? 'Get free' : `Unlock all — ${formatPrice(product.price)}`}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {tokens.length > 0 && (
                    <div className="mb-3 rounded-xl border border-[#FF7A1A]/30 bg-[#FF7A1A]/[0.05] p-3">
                      <div className="text-[11px] font-bold tracking-wider text-[#FF7A1A] mb-2">✎ MAKE IT YOURS</div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {tokens.map(k => (
                          <label key={k} className="block">
                            <span className="text-[11px] text-zinc-400">{k}</span>
                            <input value={fields[k] || ''} onChange={e => setField(k, e.target.value)} placeholder={`Type your ${k.toLowerCase()}`}
                              className="mt-0.5 w-full h-10 rounded-lg bg-[#0d0d0d] border border-white/10 px-3 text-sm outline-none focus:border-[#FF7A1A]" />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="font-mono text-[13px] leading-relaxed text-[#e8e8e8] bg-[#0d0d0d] border border-white/[0.08] rounded-xl px-4 py-3.5 max-h-[220px] overflow-auto whitespace-pre-wrap">
                    {promptText?.prompt
                      ? promptText.prompt.split(/(\{\{\s*[^{}]{1,40}?\s*\}\})/g).map((part, i) => {
                          const m = part.match(/^\{\{\s*([^{}]{1,40}?)\s*\}\}$/);
                          return m
                            ? <mark key={i} className="bg-[#FF7A1A]/20 text-[#ffb27a] rounded px-1">{fields[m[1]]?.trim() || m[1]}</mark>
                            : <React.Fragment key={i}>{part}</React.Fragment>;
                        })
                      : <span className="text-zinc-500">No prompt for this layer yet.</span>}
                  </div>
                  {promptText?.params && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {promptText.params.split(/\s+(?=--)/).map((p, k) => (
                        <span key={k} className="font-mono text-[11px] text-[#ffb27a] bg-[#FF7A1A]/[0.08] border border-[#FF7A1A]/25 px-2 py-0.5 rounded-md">{p}</span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {!locked && (
              <div className="sticky bottom-[116px] lg:static z-10 grid grid-cols-2 gap-2 mt-3.5 bg-[#131313] p-1.5 -mx-1.5 rounded-2xl lg:p-0 lg:mx-0 shadow-[0_10px_30px_rgba(0,0,0,.7)] lg:shadow-none">
                <button onClick={copy} disabled={!promptText?.prompt}
                  className={`h-[50px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition active:scale-[.97] disabled:opacity-40 ${copied ? 'bg-white text-black' : 'bg-[#FF7A1A] text-black'}`}>
                  <Copy size={15} /> {copied ? 'Copied ✓' : 'Copy prompt'}
                </button>
                <button ref={doneBtn} onClick={() => toggleDone()}
                  className={`h-[50px] rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 border-2 border-[#3DDC84] transition active:scale-[.97] ${isDone ? 'bg-[#3DDC84] text-black' : 'text-[#3DDC84]'}`}>
                  <Check size={16} strokeWidth={3} /> {isDone ? 'Done' : 'Mark done'}
                </button>
              </div>
            )}
            <div className="flex justify-between mt-2.5 text-xs text-zinc-500">
              <button onClick={() => selectLayer(lIdx - 1)} className="flex items-center gap-0.5 hover:text-white"><ChevronLeft size={14} /> Prev layer</button>
              <button onClick={() => selectLayer(lIdx + 1)} className="flex items-center gap-0.5 hover:text-white">Next layer <ChevronRight size={14} /></button>
            </div>
            {!locked && <div className="hidden lg:block text-[11px] text-zinc-600 text-center mt-2">Keyboard: ← → layers · C copy · D done</div>}
            {!locked && !user && <div className="text-[11px] text-zinc-500 text-center mt-2">Ticks are saved on this device. Log in to keep them on every device.</div>}
          </div>
        </div>
      </div>

      {/* Lightbox + toast */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-[90] bg-black/90 grid place-items-center p-4 cursor-zoom-out">
          <img src={lightbox} alt="" className="max-w-full max-h-[86vh] rounded-xl" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 grid place-items-center"><X size={18} /></button>
        </div>
      )}
      <div className={`fixed left-1/2 bottom-6 z-[95] -translate-x-1/2 bg-white text-black font-bold text-sm px-4 py-3 rounded-xl whitespace-nowrap transition-transform duration-500 ${toast ? 'translate-y-0' : 'translate-y-[140px]'}`}>
        {toast}
      </div>
    </section>
  );
};
