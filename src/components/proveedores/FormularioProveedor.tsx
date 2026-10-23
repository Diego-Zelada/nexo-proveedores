import { useState, type FormEvent, type ReactNode } from 'react'
import { Building2, Check, Contact, LoaderCircle, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { limpiarDatos, validarProveedor } from '@/lib/proveedores'
import type { DatosProveedor, ErroresProveedor, Proveedor } from '@/types/proveedor'

const datosVacios: DatosProveedor = {
  nombre: '',
  razonSocial: '',
  nit: '',
  nrc: '',
  telefono: '',
  correo: '',
  direccion: '',
  estado: 'activo',
}

function Campo({
  id,
  label,
  obligatorio = false,
  error,
  children,
}: {
  id: string
  label: string
  obligatorio?: boolean
  error?: string
  children: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="text-[13px] font-medium">
        {label}
        {obligatorio && (
          <span className="text-primary" aria-hidden="true">
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs leading-5 text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

type Props = {
  proveedor: Proveedor | null
  proveedores: Proveedor[]
  onCerrar: () => void
  onGuardar: (datos: DatosProveedor, id?: string) => void
}

export function FormularioProveedor({ proveedor, proveedores, onCerrar, onGuardar }: Props) {
  const [datos, setDatos] = useState<DatosProveedor>(
    proveedor ? { ...proveedor } : { ...datosVacios },
  )
  const [errores, setErrores] = useState<ErroresProveedor>({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  function cambiar<K extends keyof DatosProveedor>(campo: K, valor: DatosProveedor[K]) {
    setDatos((actual) => ({ ...actual, [campo]: valor }))
    setErrores((actual) => ({ ...actual, [campo]: undefined }))
    setErrorGeneral('')
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const limpios = limpiarDatos(datos)
    const nuevosErrores = validarProveedor(limpios, proveedores, proveedor?.id)
    setErrores(nuevosErrores)
    const primerError = Object.keys(nuevosErrores)[0]
    if (primerError) {
      requestAnimationFrame(() => document.getElementById(`proveedor-${primerError}`)?.focus())
      return
    }
    setGuardando(true)
    try {
      onGuardar(limpios, proveedor?.id)
    } catch (error) {
      setErrorGeneral(error instanceof Error ? error.message : 'No se pudo guardar el proveedor.')
    } finally {
      setGuardando(false)
    }
  }

  function campo(campo: keyof DatosProveedor) {
    return {
      id: `proveedor-${campo}`,
      name: campo,
      value: datos[campo],
      'aria-invalid': !!errores[campo],
      'aria-describedby': errores[campo] ? `proveedor-${campo}-error` : undefined,
      className: 'h-10 bg-white text-sm shadow-none',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        cambiar(campo, e.target.value),
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onCerrar()
      }}
    >
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
            <Building2 className="size-4" />
            DIRECTORIO DE PROVEEDORES
          </div>
          <DialogTitle className="text-xl">
            {proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}
          </DialogTitle>
          <DialogDescription>
            {proveedor
              ? 'Actualiza la información de este proveedor.'
              : 'Agrega un nuevo contacto a tu directorio.'}{' '}
            Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 space-y-6 overflow-y-auto px-6 py-5">
            {errorGeneral && (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {errorGeneral}
              </p>
            )}
            {Object.values(errores).some(Boolean) && (
              <p role="alert" className="text-xs text-destructive">
                Revisa los campos señalados antes de guardar.
              </p>
            )}
            <section aria-labelledby="datos-generales">
              <h3
                id="datos-generales"
                className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <Building2 className="size-3.5" />
                INFORMACIÓN GENERAL
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  id="proveedor-nombre"
                  label="Nombre del proveedor"
                  obligatorio
                  error={errores.nombre}
                >
                  <Input
                    {...campo('nombre')}
                    maxLength={100}
                    autoComplete="organization"
                    placeholder="Ej. Suministros Nova"
                    aria-required="true"
                  />
                </Campo>
                <Campo id="proveedor-razonSocial" label="Razón social">
                  <Input
                    {...campo('razonSocial')}
                    maxLength={150}
                    placeholder="Nombre legal de la empresa"
                  />
                </Campo>
                <Campo id="proveedor-nit" label="NIT" obligatorio error={errores.nit}>
                  <Input
                    {...campo('nit')}
                    maxLength={25}
                    placeholder="Ej. 0614-010124-101-0"
                    aria-required="true"
                  />
                </Campo>
                <Campo id="proveedor-nrc" label="NRC">
                  <Input {...campo('nrc')} maxLength={25} placeholder="Registro de contribuyente" />
                </Campo>
              </div>
            </section>
            <section aria-labelledby="datos-contacto">
              <h3
                id="datos-contacto"
                className="mb-4 flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <Contact className="size-3.5" />
                DATOS DE CONTACTO
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="proveedor-telefono" label="Teléfono">
                  <Input
                    {...campo('telefono')}
                    type="tel"
                    autoComplete="tel"
                    maxLength={30}
                    placeholder="Ej. 2200-0000"
                  />
                </Campo>
                <Campo id="proveedor-correo" label="Correo electrónico" error={errores.correo}>
                  <Input
                    {...campo('correo')}
                    type="email"
                    autoComplete="email"
                    maxLength={160}
                    placeholder="nombre@empresa.com"
                  />
                </Campo>
              </div>
            </section>
            <section className="space-y-4" aria-labelledby="datos-ubicacion">
              <h3
                id="datos-ubicacion"
                className="flex items-center gap-2 text-xs font-semibold text-slate-500"
              >
                <MapPin className="size-3.5" />
                UBICACIÓN Y ESTADO
              </h3>
              <Campo id="proveedor-direccion" label="Dirección">
                <Textarea
                  {...campo('direccion')}
                  maxLength={250}
                  autoComplete="street-address"
                  placeholder="Dirección del proveedor"
                  className="min-h-20 resize-none text-sm shadow-none"
                />
              </Campo>
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-slate-50 p-3">
                <div>
                  <Label htmlFor="proveedor-estado" className="text-sm">
                    Estado del proveedor
                  </Label>
                  <p className="mt-1 text-xs text-slate-500">
                    Puedes cambiarlo en cualquier momento.
                  </p>
                </div>
                <select
                  id="proveedor-estado"
                  name="estado"
                  value={datos.estado}
                  onChange={(e) => cambiar('estado', e.target.value as DatosProveedor['estado'])}
                  className="h-10 rounded-md border bg-white px-3 text-sm focus:outline-2 focus:outline-ring"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </section>
          </div>
          <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t bg-white px-6 py-4 sm:flex-row">
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {proveedor ? 'Guardar cambios' : 'Guardar proveedor'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
