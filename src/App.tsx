import { useMemo, useState } from 'react'
import { AlertCircle, Building2, HardDrive, Plus, SearchX } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { AppLayout } from '@/components/layout/AppLayout'
import { ResumenProveedores } from '@/components/proveedores/ResumenProveedores'
import { FiltrosProveedores } from '@/components/proveedores/FiltrosProveedores'
import { TablaProveedores } from '@/components/proveedores/TablaProveedores'
import { TarjetasProveedores } from '@/components/proveedores/TarjetasProveedores'
import { Paginacion } from '@/components/proveedores/Paginacion'
import { FormularioProveedor } from '@/components/proveedores/FormularioProveedor'
import { ConfirmarEstado } from '@/components/proveedores/ConfirmarEstado'
import { useProveedores } from '@/hooks/useProveedores'
import { filtrarProveedores } from '@/lib/proveedores'
import type { DatosProveedor, FiltroEstado, Proveedor } from '@/types/proveedor'

const POR_PAGINA = 6

export default function App() {
  const { proveedores, error, lecturaBloqueada, guardar, cambiarEstado, reintentar } =
    useProveedores()
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const [pagina, setPagina] = useState(1)
  // undefined: cerrado; null: registro nuevo; Proveedor: edición.
  const [formulario, setFormulario] = useState<Proveedor | null | undefined>(undefined)
  const [cambioPendiente, setCambioPendiente] = useState<Proveedor | null>(null)
  const filtrados = useMemo(
    () => filtrarProveedores(proveedores, busqueda, filtro),
    [proveedores, busqueda, filtro],
  )
  const paginaActual = Math.min(pagina, Math.max(1, Math.ceil(filtrados.length / POR_PAGINA)))
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)
  const activos = proveedores.filter((p) => p.estado === 'activo').length

  function guardarFormulario(datos: DatosProveedor, id?: string) {
    guardar(datos, id)
    setFormulario(undefined)
    setBusqueda('')
    setFiltro('todos')
    setPagina(1)
    toast.success(id ? 'Proveedor actualizado' : 'Proveedor registrado', {
      description: `${datos.nombre}. Los cambios se guardaron correctamente.`,
    })
  }

  function confirmarCambio() {
    if (!cambioPendiente) return
    try {
      cambiarEstado(cambioPendiente)
      toast.success(
        cambioPendiente.estado === 'activo' ? 'Proveedor inactivado' : 'Proveedor activado',
        { description: 'Su información se conserva en el directorio.' },
      )
      setCambioPendiente(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar el estado.')
    }
  }

  function limpiarFiltros() {
    setBusqueda('')
    setFiltro('todos')
    setPagina(1)
  }

  return (
    <AppLayout>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-[10px] font-semibold tracking-[.16em] text-primary">
            ORGANIZA TUS CONEXIONES
          </div>
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[34px]">
            Proveedores
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Administra tus contactos y mantén cada detalle en orden.
          </p>
        </div>
        <Button
          className="h-11 w-full gap-2 px-5 shadow-sm shadow-blue-500/10 sm:w-auto"
          onClick={() => setFormulario(null)}
          disabled={lecturaBloqueada}
        >
          <Plus className="size-4" />
          Nuevo proveedor
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
        >
          <AlertCircle className="size-5 shrink-0" />
          <p className="flex-1 leading-relaxed">{error}</p>
          <Button variant="outline" onClick={reintentar}>
            Reintentar lectura
          </Button>
        </div>
      )}
      <ResumenProveedores total={proveedores.length} activos={activos} />
      <section
        className="mt-7 overflow-hidden rounded-xl border bg-white shadow-[0_2px_8px_0_rgba(20,40,70,0.025)]"
        aria-labelledby="titulo-directorio"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Building2 className="size-[18px] text-slate-400" />
            <h2 id="titulo-directorio" className="text-[15px] font-semibold">
              Directorio de proveedores
            </h2>
          </div>
          <span className="rounded-md border border-slate-200/70 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
            {proveedores.length} registros
          </span>
        </div>
        <FiltrosProveedores
          busqueda={busqueda}
          estado={filtro}
          onBusqueda={(valor) => {
            setBusqueda(valor)
            setPagina(1)
          }}
          onEstado={(valor) => {
            setFiltro(valor)
            setPagina(1)
          }}
          conteos={{
            todos: proveedores.length,
            activo: activos,
            inactivo: proveedores.length - activos,
          }}
        />
        {visibles.length ? (
          <>
            <TablaProveedores
              proveedores={visibles}
              onEditar={setFormulario}
              onCambiarEstado={setCambioPendiente}
            />
            <TarjetasProveedores
              proveedores={visibles}
              onEditar={setFormulario}
              onCambiarEstado={setCambioPendiente}
            />
          </>
        ) : (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-slate-100">
              <SearchX className="size-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold">
              {lecturaBloqueada
                ? 'No se pudo cargar el directorio'
                : proveedores.length
                  ? 'No encontramos coincidencias'
                  : 'Tu directorio empieza aquí'}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              {lecturaBloqueada
                ? 'Revisa el aviso de almacenamiento para recuperar tus datos.'
                : proveedores.length
                  ? 'Prueba con otro nombre, NIT o correo, o cambia el filtro de estado.'
                  : 'Registra tu primer proveedor para tener su información a mano.'}
            </p>
            {!lecturaBloqueada && (
              <Button
                variant="outline"
                className="mt-5"
                onClick={proveedores.length ? limpiarFiltros : () => setFormulario(null)}
              >
                {proveedores.length ? 'Limpiar filtros' : 'Nuevo proveedor'}
              </Button>
            )}
          </div>
        )}
        <Paginacion
          pagina={paginaActual}
          total={filtrados.length}
          porPagina={POR_PAGINA}
          onPagina={setPagina}
        />
      </section>
      <div className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-slate-400">
        <HardDrive className="mt-0.5 size-3.5 shrink-0" />
        <p>
          {error
            ? 'Hay un aviso sobre el almacenamiento de tus datos.'
            : 'Tus cambios se guardan en este navegador y se conservan al actualizar la página.'}
        </p>
      </div>
      {formulario !== undefined && (
        <FormularioProveedor
          proveedor={formulario}
          proveedores={proveedores}
          onCerrar={() => setFormulario(undefined)}
          onGuardar={guardarFormulario}
        />
      )}
      {cambioPendiente && (
        <ConfirmarEstado
          proveedor={cambioPendiente}
          onCerrar={() => setCambioPendiente(null)}
          onConfirmar={confirmarCambio}
        />
      )}
      <Toaster richColors position="bottom-right" closeButton />
    </AppLayout>
  )
}
