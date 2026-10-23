import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AccionesProveedor, type AccionesProps } from './AccionesProveedor'
import { EstadoBadge } from './EstadoBadge'
import { ProveedorAvatar } from './ProveedorAvatar'
import type { Proveedor } from '@/types/proveedor'

export type ListadoProps = Pick<AccionesProps, 'onEditar' | 'onCambiarEstado'> & {
  proveedores: Proveedor[]
}

export function TablaProveedores({ proveedores, ...acciones }: ListadoProps) {
  return (
    <div className="hidden lg:block">
      <Table className="w-full table-fixed">
        <caption className="sr-only">Directorio de proveedores y sus datos de contacto</caption>
        <TableHeader>
          <TableRow className="bg-slate-50/70 hover:bg-slate-50/70">
            <TableHead className="w-[26%] pl-5 text-[10px] tracking-wider text-slate-500">
              PROVEEDOR / RAZÓN SOCIAL
            </TableHead>
            <TableHead className="w-[18%] text-[10px] tracking-wider text-slate-500">
              NIT / NRC
            </TableHead>
            <TableHead className="w-[23%] text-[10px] tracking-wider text-slate-500">
              CONTACTO
            </TableHead>
            <TableHead className="w-[17%] text-[10px] tracking-wider text-slate-500">
              DIRECCIÓN
            </TableHead>
            <TableHead className="w-[11%] text-[10px] tracking-wider text-slate-500">
              ESTADO
            </TableHead>
            <TableHead className="w-[5%]">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proveedores.map((proveedor) => (
            <TableRow key={proveedor.id} className="hover:bg-blue-50/30">
              <TableCell className="whitespace-normal py-5 pl-5">
                <div className="flex items-center gap-3">
                  <ProveedorAvatar nombre={proveedor.nombre} />
                  <div className="min-w-0">
                    <p className="break-words text-[13px] font-semibold leading-5">
                      {proveedor.nombre}
                    </p>
                    <p className="mt-1 break-words text-[11px] leading-4 text-slate-500">
                      {proveedor.razonSocial || 'Sin razón social'}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="break-all text-xs tabular-nums text-slate-600">{proveedor.nit}</p>
                <p className="mt-1.5 break-all text-[11px] text-slate-400">
                  NRC: {proveedor.nrc || '—'}
                </p>
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="break-all text-xs leading-5 text-slate-600">
                  {proveedor.correo || 'Sin correo'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {proveedor.telefono || 'Sin teléfono'}
                </p>
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="break-words text-xs leading-5 text-slate-500">
                  {proveedor.direccion || 'Sin dirección'}
                </p>
              </TableCell>
              <TableCell>
                <EstadoBadge estado={proveedor.estado} />
              </TableCell>
              <TableCell className="pr-3">
                <AccionesProveedor proveedor={proveedor} {...acciones} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
