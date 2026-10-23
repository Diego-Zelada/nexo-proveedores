import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Paginacion({
  pagina,
  total,
  porPagina,
  onPagina,
}: {
  pagina: number
  total: number
  porPagina: number
  onPagina: (pagina: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-5">
      <p className="text-xs text-slate-500" role="status">
        Mostrando{' '}
        <strong className="font-medium text-slate-700">
          {total ? (pagina - 1) * porPagina + 1 : 0}–{Math.min(pagina * porPagina, total)}
        </strong>{' '}
        de <strong className="font-medium text-slate-700">{total}</strong> proveedores
      </p>
      <nav aria-label="Páginas del directorio" className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-8 shadow-none"
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-14 text-center text-xs text-slate-500">
          {pagina} de {paginas}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8 shadow-none"
          disabled={pagina >= paginas}
          onClick={() => onPagina(pagina + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" />
        </Button>
      </nav>
    </div>
  )
}
