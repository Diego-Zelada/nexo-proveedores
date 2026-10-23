import { Building2, CircleCheck, CirclePause, type LucideIcon } from 'lucide-react'

function Indicador({
  titulo,
  valor,
  icono: Icono,
  color,
  detalle,
}: {
  titulo: string
  valor: number
  icono: LucideIcon
  color: string
  detalle: string
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-xl border bg-white p-4 sm:p-5">
      <div className="min-w-0">
        <p className="min-h-8 text-xs font-medium text-slate-500 sm:min-h-0 sm:text-[13px]">
          {titulo}
        </p>
        <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight sm:text-[32px]">
          {valor.toString().padStart(2, '0')}
        </p>
        <p className="mt-3 hidden text-[11px] text-slate-400 sm:block">{detalle}</p>
      </div>
      <span
        className={`hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex ${color}`}
      >
        <Icono className="size-[19px]" />
      </span>
    </div>
  )
}

export function ResumenProveedores({ total, activos }: { total: number; activos: number }) {
  return (
    <section className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="Resumen del directorio">
      <Indicador
        titulo="Total de proveedores"
        valor={total}
        icono={Building2}
        color="bg-blue-50 text-blue-600"
        detalle="Todos tus contactos registrados"
      />
      <Indicador
        titulo="Activos"
        valor={activos}
        icono={CircleCheck}
        color="bg-emerald-50 text-emerald-600"
        detalle="Disponibles para trabajar contigo"
      />
      <Indicador
        titulo="Inactivos"
        valor={total - activos}
        icono={CirclePause}
        color="bg-slate-100 text-slate-500"
        detalle="Conservados en tu directorio"
      />
    </section>
  )
}
