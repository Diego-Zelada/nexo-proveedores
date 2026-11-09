import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Download,
  Eye,
  FileCheck2,
  FileText,
  History,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { cerrarSesion, iniciarSesion, solicitar } from '@/lib/api-documentos'
import {
  tiposDocumento,
  type Documento,
  type TipoDocumento,
  type VersionDocumento,
} from '@/types/documento'
import type { Proveedor } from '@/types/proveedor'

const campo =
  'h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30'
const formatoFecha = (s: string) =>
  new Date(s).toLocaleString('es-SV', { dateStyle: 'medium', timeStyle: 'short' })
const formatoTamano = (bytes: number) =>
  bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(2)} MB`
const estadoColor: Record<string, string> = {
  disponible: 'bg-emerald-50 text-emerald-700',
  rechazado: 'bg-rose-50 text-rose-700',
  error: 'bg-rose-50 text-rose-700',
  pendiente: 'bg-amber-50 text-amber-800',
  procesando: 'bg-blue-50 text-blue-700',
  eliminando: 'bg-slate-100 text-slate-600',
  eliminado: 'bg-slate-100 text-slate-600',
}
export function PanelDocumentos({
  proveedores,
  proveedor,
  onCerrar,
}: {
  proveedores: Proveedor[]
  proveedor: Proveedor | null
  onCerrar: () => void
}) {
  const [sesion, setSesion] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [proveedorFiltro, setProveedorFiltro] = useState(proveedor?.id ?? '')
  const [tipoFiltro, setTipoFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [eliminados, setEliminados] = useState(false)
  const [proveedorCarga, setProveedorCarga] = useState(proveedor?.id ?? proveedores[0]?.id ?? '')
  const [tipoCarga, setTipoCarga] = useState<TipoDocumento>('contrato')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [versionNueva, setVersionNueva] = useState<Documento | null>(null)
  const [versiones, setVersiones] = useState<{
    documento: Documento
    lista: VersionDocumento[]
  } | null>(null)
  const [confirmar, setConfirmar] = useState<Documento | null>(null)
  const [limite, setLimite] = useState(10 * 1048576)
  const inputArchivo = useRef<HTMLInputElement>(null)
  const inputVersion = useRef<HTMLInputElement>(null)
  useEffect(() => {
    solicitar<{ usuario: string; limiteBytes: number }>('/auth/me')
      .then((r) => {
        setSesion(r.usuario)
        setLimite(r.limiteBytes)
      })
      .catch(() => {})
    const expirar = () => {
      setSesion('')
      setDocumentos([])
      setVersiones(null)
    }
    window.addEventListener('nexo:sesion-caducada', expirar)
    return () => window.removeEventListener('nexo:sesion-caducada', expirar)
  }, [])
  const cargar = useCallback(
    async (signal?: AbortSignal, silencioso = false) => {
      if (!sesion) return
      if (!silencioso) setCargando(true)
      try {
        const query = new URLSearchParams({ eliminados: String(eliminados) })
        if (proveedorFiltro) query.set('proveedorId', proveedorFiltro)
        if (tipoFiltro) query.set('tipo', tipoFiltro)
        const r = await solicitar<{ documentos: Documento[] }>(`/documentos?${query}`, { signal })
        if (!signal?.aborted) {
          setDocumentos(r.documentos)
          setError('')
        }
      } catch (e) {
        if (!signal?.aborted)
          setError(e instanceof Error ? e.message : 'No se pudieron cargar los documentos.')
      } finally {
        if (!signal?.aborted) setCargando(false)
      }
    },
    [sesion, proveedorFiltro, tipoFiltro, eliminados],
  )
  useEffect(() => {
    const controller = new AbortController()
    void cargar(controller.signal)
    const interval = setInterval(() => void cargar(controller.signal, true), 5000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [cargar])
  async function acceder(event: FormEvent) {
    event.preventDefault()
    setOcupado(true)
    setError('')
    try {
      setSesion(await iniciarSesion(usuario, password))
      setPassword('')
      const me = await solicitar<{ limiteBytes: number }>('/auth/me')
      setLimite(me.limiteBytes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.')
    } finally {
      setOcupado(false)
    }
  }
  const comprobar = (file: File) => {
    if (file.size > limite) throw new Error(`El límite es ${limite / 1048576} MB por archivo.`)
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) throw new Error('Selecciona un PDF, JPG o PNG.')
    if (file.size === 0) throw new Error('El archivo está vacío.')
  }
  async function ejecutar(operacion: () => Promise<void>) {
    setOcupado(true)
    setError('')
    try {
      await operacion()
      await cargar(undefined, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la operación.')
    } finally {
      setOcupado(false)
    }
  }
  async function subir(event: FormEvent) {
    event.preventDefault()
    await ejecutar(async () => {
      const p = proveedores.find((p) => p.id === proveedorCarga)
      if (!archivo || !p) throw new Error('Selecciona un proveedor y un archivo.')
      comprobar(archivo)
      const form = new FormData()
      form.append('archivo', archivo)
      form.append('tipo', tipoCarga)
      form.append('proveedorNombre', p.nombre)
      await solicitar(`/proveedores/${p.id}/documentos`, { method: 'POST', body: form })
      setArchivo(null)
      if (inputArchivo.current) inputArchivo.current.value = ''
      toast.success('Archivo recibido', {
        description: 'Su estado cambiará cuando termine la validación.',
      })
      setEliminados(false)
    })
  }
  async function abrir(d: Documento, descargar: boolean) {
    // La ventana se abre con el clic del usuario para que el navegador no la bloquee tras la petición.
    const ventana = window.open('about:blank', '_blank')
    if (ventana) ventana.opener = null
    await ejecutar(async () => {
      try {
        const r = await solicitar<{ url: string; expira: string }>(
          `/documentos/${d.id}/enlace?descargar=${descargar}`,
        )
        const url = new URL(r.url)
        if (url.protocol !== 'https:' && !(import.meta.env.DEV && url.hostname === '127.0.0.1'))
          throw new Error('El enlace de descarga no es seguro.')
        if (ventana) ventana.location.replace(r.url)
        else throw new Error('Permite las ventanas emergentes y vuelve a intentarlo.')
      } catch (e) {
        ventana?.close()
        throw e
      }
    })
  }
  const nombres = new Map(proveedores.map((p) => [p.id, p.nombre]))
  for (const d of documentos)
    if (!nombres.has(d.proveedorId)) nombres.set(d.proveedorId, d.proveedorNombre)
  const buscados = documentos.filter((d) =>
    `${d.nombre} ${d.proveedorNombre}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .includes(
        busqueda
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase(),
      ),
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !ocupado) onCerrar()
      }}
    >
      <DialogContent
        className="max-h-[92dvh] max-w-5xl overflow-y-auto p-4 sm:p-6"
        onInteractOutside={(e) => {
          if (ocupado) e.preventDefault()
        }}
      >
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">
            <ShieldCheck className="size-4" />
            ARCHIVO DE PROVEEDORES
          </div>
          <DialogTitle className="pr-7 text-2xl">
            {proveedor ? `Documentos · ${proveedor.nombre}` : 'Documentos de proveedores'}
          </DialogTitle>
          <DialogDescription>
            Contratos, identificaciones y constancias, organizados y con acceso privado.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div
            role="alert"
            className="break-words rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}
        {!sesion ? (
          <div className="mx-auto w-full max-w-sm py-5">
            <div className="mb-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <LockKeyhole className="mt-1 size-6 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-slate-600">
                Inicia sesión con las credenciales que te proporcionó el administrador para
                gestionar tus documentos.
              </p>
            </div>
            <form onSubmit={acceder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="doc-usuario">Usuario</Label>
                <Input
                  id="doc-usuario"
                  autoComplete="username"
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  required
                  maxLength={40}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-password">Contraseña</Label>
                <Input
                  id="doc-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={200}
                />
              </div>
              <Button type="submit" disabled={ocupado} className="w-full">
                {ocupado && <LoaderCircle className="size-4 animate-spin" />}Iniciar sesión
              </Button>
            </form>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-y py-3">
              <p className="text-xs text-slate-500">
                Sesión de <strong className="text-slate-700">{sesion}</strong>
              </p>
              <Button
                variant="ghost"
                size="sm"
                disabled={ocupado}
                onClick={() => {
                  cerrarSesion()
                  setSesion('')
                  setDocumentos([])
                  setVersiones(null)
                }}
              >
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
            </div>
            <form
              onSubmit={subir}
              className="space-y-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4"
            >
              <div className="flex items-center gap-2">
                <Upload className="size-4 text-primary" />
                <h3 className="text-sm font-semibold">Subir un documento</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doc-proveedor">Proveedor</Label>
                  <select
                    id="doc-proveedor"
                    className={campo}
                    value={proveedorCarga}
                    onChange={(e) => setProveedorCarga(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-tipo">Tipo de documento</Label>
                  <select
                    id="doc-tipo"
                    className={campo}
                    value={tipoCarga}
                    onChange={(e) => setTipoCarga(e.target.value as TipoDocumento)}
                  >
                    {Object.entries(tiposDocumento).map(([valor, texto]) => (
                      <option key={valor} value={valor}>
                        {texto}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-archivo">Archivo PDF, JPG o PNG</Label>
                <input
                  id="doc-archivo"
                  type="file"
                  ref={inputArchivo}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium"
                  onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                  required
                />
                <p className="text-xs text-slate-500">
                  Máximo {limite / 1048576} MB. El archivo se podrá abrir cuando termine la
                  validación.
                </p>
              </div>
              <Button type="submit" disabled={ocupado || !archivo}>
                {ocupado ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Subir documento
              </Button>
            </form>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {eliminados ? 'Documentos eliminados' : 'Tus documentos'}{' '}
                <span className="font-normal text-slate-400">({buscados.length})</span>
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ocupado}
                  onClick={() => setEliminados(!eliminados)}
                >
                  {eliminados ? <FileText className="size-4" /> : <Trash2 className="size-4" />}
                  {eliminados ? 'Ver documentos' : 'Papelera'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={cargando || ocupado}
                  onClick={() => void cargar()}
                  aria-label="Actualizar documentos"
                >
                  <RefreshCw className={`size-4 ${cargando ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="doc-filtro-proveedor" className="sr-only">
                  Filtrar por proveedor
                </Label>
                <select
                  id="doc-filtro-proveedor"
                  className={campo}
                  value={proveedorFiltro}
                  onChange={(e) => setProveedorFiltro(e.target.value)}
                >
                  <option value="">Todos los proveedores</option>
                  {Array.from(nombres).map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="doc-filtro-tipo" className="sr-only">
                  Filtrar por tipo
                </Label>
                <select
                  id="doc-filtro-tipo"
                  className={campo}
                  value={tipoFiltro}
                  onChange={(e) => setTipoFiltro(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {Object.entries(tiposDocumento).map(([valor, texto]) => (
                    <option key={valor} value={valor}>
                      {texto}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-slate-400" />
                <Input
                  aria-label="Buscar documentos por nombre o proveedor"
                  placeholder="Nombre o proveedor…"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-3" aria-live="polite">
              {cargando && documentos.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">Cargando documentos…</p>
              ) : buscados.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-9 text-center">
                  <FileText className="mx-auto mb-3 size-8 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    {eliminados
                      ? 'No hay documentos eliminados.'
                      : 'No hay documentos que coincidan con estos filtros.'}
                  </p>
                </div>
              ) : (
                buscados.map((d) => (
                  <article key={d.id} className="min-w-0 rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <FileCheck2 className="mt-1 size-6 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold">{d.nombre}</p>
                        <p className="mt-1 break-words text-xs text-slate-500">
                          {d.proveedorNombre} · {tiposDocumento[d.tipo]}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${estadoColor[d.estado] ?? 'bg-slate-100'}`}
                      >
                        {d.estado}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">
                      {formatoTamano(d.tamano)} · Cargado el {formatoFecha(d.fechaCarga)}
                    </p>
                    <p
                      className={`mt-2 text-xs leading-5 ${['rechazado', 'error'].includes(d.estado) ? 'text-rose-700' : 'text-slate-500'}`}
                    >
                      {d.detalle}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.eliminado ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ocupado}
                          onClick={() =>
                            void ejecutar(async () => {
                              await solicitar(`/documentos/${d.id}/restaurar`, { method: 'POST' })
                              toast.success('Recuperación solicitada')
                            })
                          }
                        >
                          <RotateCcw className="size-4" />
                          Recuperar
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ocupado || d.estado !== 'disponible'}
                            onClick={() => void abrir(d, false)}
                          >
                            <Eye className="size-4" />
                            Ver
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ocupado || d.estado !== 'disponible'}
                            onClick={() => void abrir(d, true)}
                          >
                            <Download className="size-4" />
                            Descargar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              ocupado ||
                              ['pendiente', 'procesando', 'eliminando'].includes(d.estado)
                            }
                            onClick={() => {
                              setVersionNueva(d)
                              inputVersion.current?.click()
                            }}
                          >
                            <Upload className="size-4" />
                            Nueva versión
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={
                              ocupado ||
                              ['pendiente', 'procesando', 'eliminando'].includes(d.estado)
                            }
                            onClick={() => setConfirmar(d)}
                            className="text-rose-700 hover:text-rose-800"
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={ocupado}
                        onClick={() =>
                          void ejecutar(async () => {
                            const r = await solicitar<{ versiones: VersionDocumento[] }>(
                              `/documentos/${d.id}/versiones`,
                            )
                            setVersiones({ documento: d, lista: r.versiones })
                          })
                        }
                      >
                        <History className="size-4" />
                        Versiones
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </div>
            {versiones && (
              <section className="rounded-xl bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="break-words text-sm font-semibold">
                    Versiones de {versiones.documento.nombre}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setVersiones(null)}>
                    Ocultar
                  </Button>
                </div>
                {versiones.lista.length ? (
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    {versiones.lista.map((v) => (
                      <li key={v.versionId} className="break-all">
                        {v.fecha ? formatoFecha(v.fecha) : v.versionId} · {formatoTamano(v.tamano)}{' '}
                        {v.actual ? '· Actual' : ''} {v.eliminado ? '· Eliminada' : ''}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-500">
                    Todavía no hay versiones guardadas para mostrar.
                  </p>
                )}
              </section>
            )}
            <input
              type="file"
              ref={inputVersion}
              aria-label="Seleccionar nueva versión"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file || !versionNueva) return
                void ejecutar(async () => {
                  comprobar(file)
                  const form = new FormData()
                  form.append('archivo', file)
                  await solicitar(`/documentos/${versionNueva.id}/contenido`, {
                    method: 'PUT',
                    body: form,
                  })
                  toast.success('Nueva versión recibida')
                  setVersionNueva(null)
                  setVersiones(null)
                })
              }}
            />
          </>
        )}
        <AlertDialog
          open={!!confirmar}
          onOpenChange={(open) => {
            if (!open) setConfirmar(null)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
              <AlertDialogDescription>
                Se quitará «{confirmar?.nombre}» de la lista. Podrás recuperarlo mientras Azure
                conserve sus versiones. El proveedor se mantiene.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const d = confirmar
                  setConfirmar(null)
                  if (d)
                    void ejecutar(async () => {
                      await solicitar(`/documentos/${d.id}`, { method: 'DELETE' })
                      toast.success('Documento eliminado')
                    })
                }}
              >
                Eliminar documento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
