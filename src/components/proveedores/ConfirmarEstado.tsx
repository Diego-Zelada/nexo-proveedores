import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Proveedor } from '@/types/proveedor'

export function ConfirmarEstado({
  proveedor,
  onCerrar,
  onConfirmar,
}: {
  proveedor: Proveedor
  onCerrar: () => void
  onConfirmar: () => void
}) {
  const activo = proveedor.estado === 'activo'
  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {activo ? '¿Inactivar' : '¿Activar'} a {proveedor.nombre}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {activo
              ? 'Su información permanecerá en el directorio. Podrás encontrarlo en el filtro de inactivos y volver a activarlo cuando lo necesites.'
              : 'El proveedor volverá a aparecer en el listado de activos. Su información se conservará.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={activo ? 'bg-amber-600 text-white hover:bg-amber-700' : ''}
            onClick={(e) => {
              e.preventDefault()
              onConfirmar()
            }}
          >
            {activo ? 'Sí, inactivar' : 'Sí, activar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
