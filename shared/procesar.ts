import { AlmacenDocumentos, codigo } from './azure.js'
import { ErrorAplicacion, validarArchivo } from './documentos.js'

export async function procesarDocumento(
  store: AlmacenDocumentos,
  blobName: string,
  limite = 10 * 1048576,
  log: (m: string) => void = console.info,
) {
  const partes = blobName.split('/')
  if (partes.length !== 4 || partes[3] !== 'archivo') {
    log(JSON.stringify({ evento: 'blob_sin_asociacion', rutaValida: false }))
    return
  }
  const [owner, proveedor, id] = partes
  let r
  try {
    r = await store.obtener(owner, id)
  } catch (e) {
    if (e instanceof ErrorAplicacion && e.status === 404) {
      log(JSON.stringify({ evento: 'documento_sin_registro', documentoId: id }))
      return
    }
    throw e
  }
  if (
    r.blobName !== blobName ||
    r.proveedorId !== proveedor ||
    r.eliminado ||
    !['pendiente', 'procesando', 'error'].includes(r.estado)
  )
    return
  const blob = store.container.getBlobClient(blobName)
  let props
  try {
    props = await blob.getProperties()
  } catch (e) {
    if (codigo(e) === 404) return
    throw e
  }
  const revision = props.metadata?.revision
  if (
    !revision ||
    revision !== r.revision ||
    props.metadata?.owner !== owner ||
    props.metadata?.documento !== id
  ) {
    await store.auditar(
      'rechazo_metadatos',
      owner,
      id,
      'El blob no coincide con el registro de la aplicación.',
    )
    return
  }
  await store.cambiar(owner, id, (actual) =>
    actual.revision === revision &&
    !actual.eliminado &&
    ['pendiente', 'procesando', 'error'].includes(actual.estado)
      ? { estado: 'procesando', detalle: 'Validando tipo, tamaño y contenido.' }
      : null,
  )
  const finalizar = async (estado: 'disponible' | 'rechazado' | 'error', detalle: string) =>
    store.cambiar(owner, id, (actual) =>
      actual.revision === revision &&
      !actual.eliminado &&
      ['pendiente', 'procesando', 'error'].includes(actual.estado)
        ? { estado, detalle, ...(props.versionId ? { versionId: props.versionId } : {}) }
        : null,
    )
  try {
    if ((props.contentLength ?? 0) > limite)
      throw new ErrorAplicacion(413, 'El archivo excede el tamaño permitido.')
    // If-Match impide validar una versión diferente si el archivo cambia durante la descarga.
    const bytes = await blob.downloadToBuffer(0, undefined, {
      conditions: { ifMatch: props.etag },
      maxRetryRequestsPerBlock: 0,
    })
    validarArchivo(bytes, r.nombre, props.contentType ?? '', limite)
    if (bytes.length !== r.tamano)
      throw new ErrorAplicacion(422, 'El tamaño no coincide con el registro de carga.')
    await finalizar('disponible', 'Archivo validado y listo para consultar.')
    await store.auditar('validacion_correcta', owner, id)
  } catch (error) {
    if (codigo(error) === 412) throw error // Azure reintenta; no se sobrescribe un estado con datos antiguos.
    if (error instanceof ErrorAplicacion) {
      await finalizar('rechazado', error.message)
      await store.auditar('validacion_rechazada', owner, id, error.message)
    } else {
      await finalizar(
        'error',
        'Ocurrió un error de procesamiento. El servicio volverá a intentarlo.',
      )
      await store.auditar('error_procesamiento', owner, id)
      throw error // Reintentos y cola de fallos del disparador Blob.
    }
  }
  log(JSON.stringify({ evento: 'procesamiento_finalizado', documentoId: id }))
}
