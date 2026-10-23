import { Badge } from '@/components/ui/badge'
import type { EstadoProveedor } from '@/types/proveedor'

export function EstadoBadge({ estado }: { estado: EstadoProveedor }) {
  const activo = estado === 'activo'
  return (
    <Badge
      variant="outline"
      className={
        activo
          ? 'gap-1.5 rounded-full border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700'
          : 'gap-1.5 rounded-full border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600'
      }
    >
      <span className={`size-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </Badge>
  )
}
