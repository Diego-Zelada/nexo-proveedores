import { Ellipsis, Pencil, Power, PowerOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Proveedor } from '@/types/proveedor'

export type AccionesProps = {
  proveedor: Proveedor
  onEditar: (proveedor: Proveedor) => void
  onCambiarEstado: (proveedor: Proveedor) => void
}

export function AccionesProveedor({ proveedor, onEditar, onCambiarEstado }: AccionesProps) {
  const activo = proveedor.estado === 'activo'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-slate-400 hover:text-slate-700"
          aria-label={`Acciones de ${proveedor.nombre}`}
        >
          <Ellipsis className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => onEditar(proveedor)}>
          <Pencil className="size-4" />
          Editar proveedor
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => onCambiarEstado(proveedor)}
          className={
            activo
              ? 'text-amber-700 focus:text-amber-800'
              : 'text-emerald-700 focus:text-emerald-800'
          }
        >
          {activo ? <PowerOff className="size-4" /> : <Power className="size-4" />}
          {activo ? 'Inactivar proveedor' : 'Activar proveedor'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
