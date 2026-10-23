const colores = [
  'bg-blue-50 text-blue-600',
  'bg-violet-50 text-violet-600',
  'bg-amber-50 text-amber-700',
  'bg-emerald-50 text-emerald-700',
  'bg-rose-50 text-rose-600',
]

export function ProveedorAvatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => Array.from(p)[0])
    .join('')
    .toUpperCase()
  const indice =
    Array.from(nombre).reduce((suma, letra) => suma + (letra.codePointAt(0) ?? 0), 0) %
    colores.length
  return (
    <div
      aria-hidden="true"
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${colores[indice]}`}
    >
      {iniciales}
    </div>
  )
}
