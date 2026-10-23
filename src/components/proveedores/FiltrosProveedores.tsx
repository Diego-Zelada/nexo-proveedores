import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FiltroEstado } from '@/types/proveedor'
import { cn } from '@/lib/utils'

type Props = {
  busqueda: string
  estado: FiltroEstado
  onBusqueda: (valor: string) => void
  onEstado: (valor: FiltroEstado) => void
  conteos: Record<FiltroEstado, number>
}

export function FiltrosProveedores({ busqueda, estado, onBusqueda, onEstado, conteos }: Props) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b px-4 py-4 sm:px-5 min-[1200px]:flex-row min-[1200px]:items-center">
      <div
        role="group"
        aria-label="Filtrar por estado"
        className="flex w-fit max-w-full gap-1 rounded-lg bg-slate-100/80 p-1"
      >
        {(['todos', 'activo', 'inactivo'] as const).map((opcion) => (
          <Button
            key={opcion}
            variant="ghost"
            size="sm"
            aria-pressed={estado === opcion}
            onClick={() => onEstado(opcion)}
            className={cn(
              'h-8 gap-1.5 rounded-md px-2.5 text-xs text-slate-500 sm:px-3',
              estado === opcion && 'bg-white font-semibold text-slate-800 shadow-sm hover:bg-white',
            )}
          >
            {opcion === 'todos' ? 'Todos' : opcion === 'activo' ? 'Activos' : 'Inactivos'}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px]',
                estado === opcion ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/50 text-slate-500',
              )}
            >
              {conteos[opcion]}
            </span>
          </Button>
        ))}
      </div>
      <div className="relative w-full min-[1200px]:w-[345px]">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
        <label htmlFor="buscar-proveedor" className="sr-only">
          Buscar por nombre, NIT o correo
        </label>
        <Input
          id="buscar-proveedor"
          value={busqueda}
          onChange={(e) => onBusqueda(e.target.value)}
          className="h-10 bg-white pl-9 pr-10 text-sm shadow-none"
          placeholder="Buscar por nombre, NIT o correo..."
          autoComplete="off"
        />
        {busqueda && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-8"
            aria-label="Limpiar búsqueda"
            onClick={() => onBusqueda('')}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
