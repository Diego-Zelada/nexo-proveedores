import { Mail, MapPin, Phone } from 'lucide-react'
import { AccionesProveedor } from './AccionesProveedor'
import { EstadoBadge } from './EstadoBadge'
import { ProveedorAvatar } from './ProveedorAvatar'
import type { ListadoProps } from './TablaProveedores'

export function TarjetasProveedores({ proveedores, ...acciones }: ListadoProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 bg-slate-50/60 p-3 sm:grid-cols-2 sm:p-4 lg:hidden">
      {proveedores.map((proveedor) => (
        <article key={proveedor.id} className="min-w-0 rounded-xl border bg-white p-4">
          <div className="flex items-start gap-3">
            <ProveedorAvatar nombre={proveedor.nombre} />
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-sm font-semibold leading-5">{proveedor.nombre}</h3>
              <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                {proveedor.razonSocial || 'Sin razón social'}
              </p>
            </div>
            <AccionesProveedor proveedor={proveedor} {...acciones} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2.5">
            <div className="min-w-0 text-xs">
              <p className="break-all text-slate-600">
                <span className="font-medium">NIT</span> {proveedor.nit}
              </p>
              <p className="mt-1 break-all text-[11px] text-slate-400">
                NRC {proveedor.nrc || '—'}
              </p>
            </div>
            <EstadoBadge estado={proveedor.estado} />
          </div>
          <dl className="mt-4 space-y-2.5 text-xs text-slate-500">
            <div className="flex min-w-0 items-start gap-2.5">
              <dt>
                <Mail className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                <span className="sr-only">Correo</span>
              </dt>
              <dd className="min-w-0 break-all">{proveedor.correo || 'Sin correo'}</dd>
            </div>
            <div className="flex gap-2.5">
              <dt>
                <Phone className="size-3.5 text-slate-400" />
                <span className="sr-only">Teléfono</span>
              </dt>
              <dd className="min-w-0 break-all">{proveedor.telefono || 'Sin teléfono'}</dd>
            </div>
            <div className="flex items-start gap-2.5">
              <dt>
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                <span className="sr-only">Dirección</span>
              </dt>
              <dd className="min-w-0 break-words leading-5">
                {proveedor.direccion || 'Sin dirección'}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  )
}
