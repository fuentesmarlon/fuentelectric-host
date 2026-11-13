export default function Loading() {
  return (
    <div role="status" aria-label="Cargando contenido" className="space-y-5 motion-safe:animate-pulse">
      <span className="sr-only">Cargando contenido del tablero…</span>
      <div className="flex items-center gap-4"><div className="size-12 rounded-xl bg-primary/10" /><div className="space-y-2"><div className="h-7 w-56 rounded bg-slate-200" /><div className="h-4 w-64 max-w-[60vw] rounded bg-slate-200/70" /></div></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-24 rounded-xl border border-border bg-white" />)}</div>
      <div className="space-y-4 rounded-xl border border-border bg-white p-5"><div className="h-5 w-44 rounded bg-slate-200" /><div className="h-10 rounded bg-slate-100" />{[1, 2, 3, 4, 5].map(item => <div key={item} className="h-8 rounded bg-slate-100/70" />)}</div>
    </div>
  )
}
