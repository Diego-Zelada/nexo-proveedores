import { randomUUID } from 'node:crypto'
import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  SASProtocol,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'
import { DefaultAzureCredential } from '@azure/identity'
import { TableClient } from '@azure/data-tables'
import { CONTENEDOR, ErrorAplicacion, type Documento, type TipoDocumento } from './documentos.js'

export type Registro = Documento & {
  partitionKey: string
  rowKey: string
  blobName: string
  etag?: string
}
type Entrada = {
  proveedorId: string
  proveedorNombre: string
  nombre: string
  tipo: TipoDocumento
  mime: string
  bytes: Buffer
}
export const codigo = (error: unknown) => (error as { statusCode?: number })?.statusCode
export class AlmacenDocumentos {
  readonly blobs: BlobServiceClient
  readonly tabla: TableClient
  readonly eventos: TableClient
  readonly cuenta: string
  private readonly sharedKey?: StorageSharedKeyCredential
  constructor(env: NodeJS.ProcessEnv = process.env) {
    const connection = env.AZURE_STORAGE_CONNECTION_STRING
    const tableName = env.DOCUMENT_TABLE ?? 'DocumentosProveedores'
    const auditName = env.AUDIT_TABLE ?? 'EventosDocumentos'
    if (connection) {
      if (env.NODE_ENV === 'production')
        throw new Error(
          'En producción utiliza AZURE_STORAGE_ACCOUNT_NAME e identidad administrada; no una clave de almacenamiento.',
        )
      this.blobs = BlobServiceClient.fromConnectionString(connection)
      this.tabla = TableClient.fromConnectionString(connection, tableName)
      this.eventos = TableClient.fromConnectionString(connection, auditName)
      const credential = this.blobs.credential
      if (credential instanceof StorageSharedKeyCredential) this.sharedKey = credential
    } else {
      const account = env.AZURE_STORAGE_ACCOUNT_NAME ?? ''
      if (!/^[a-z0-9]{3,24}$/.test(account))
        throw new Error(
          'Configura AZURE_STORAGE_ACCOUNT_NAME para Azure, o la conexión local de Azurite.',
        )
      const credential = new DefaultAzureCredential()
      this.blobs = new BlobServiceClient(`https://${account}.blob.core.windows.net`, credential)
      this.tabla = new TableClient(
        `https://${account}.table.core.windows.net`,
        tableName,
        credential,
      )
      this.eventos = new TableClient(
        `https://${account}.table.core.windows.net`,
        auditName,
        credential,
      )
    }
    this.cuenta = this.blobs.accountName
  }
  get container() {
    return this.blobs.getContainerClient(CONTENEDOR)
  }
  async iniciar() {
    await this.container.createIfNotExists()
    // Get Properties informa del acceso público y funciona con Blob Data Contributor.
    // Get ACL exige getAcl/action, que ese rol no incluye.
    const policy = await this.container.getProperties()
    if (policy.blobPublicAccess)
      throw new Error(
        'El contenedor debe ser privado. Deshabilita el acceso público antes de continuar.',
      )
    await Promise.all(
      [this.tabla.createTable(), this.eventos.createTable()].map((p) =>
        p.catch((e) => {
          if (codigo(e) !== 409) throw e
        }),
      ),
    )
  }
  publico(r: Registro): Documento {
    const {
      id,
      proveedorId,
      proveedorNombre,
      nombre,
      tipo,
      tamano,
      mime,
      fechaCarga,
      actualizado,
      estado,
      detalle,
      revision,
      eliminado,
      versionId,
    } = r
    return {
      id,
      proveedorId,
      proveedorNombre,
      nombre,
      tipo,
      tamano,
      mime,
      fechaCarga,
      actualizado,
      estado,
      detalle,
      revision,
      eliminado,
      ...(versionId ? { versionId } : {}),
    }
  }
  async obtener(owner: string, id: string): Promise<Registro> {
    try {
      return await this.tabla.getEntity<Registro>(owner, id)
    } catch (error) {
      if (codigo(error) === 404) throw new ErrorAplicacion(404, 'Documento no encontrado.')
      throw error
    }
  }
  async cambiar(
    owner: string,
    id: string,
    transformar: (r: Registro) => Partial<Registro> | null,
  ): Promise<Registro> {
    for (let intento = 0; intento < 5; intento++) {
      const actual = await this.obtener(owner, id)
      const cambio = transformar(actual)
      if (!cambio) return actual
      try {
        await this.tabla.updateEntity(
          { ...cambio, partitionKey: owner, rowKey: id, actualizado: new Date().toISOString() },
          'Merge',
          { etag: actual.etag },
        )
        return await this.obtener(owner, id)
      } catch (error) {
        if (codigo(error) !== 412) throw error
      }
    }
    throw new ErrorAplicacion(409, 'El documento está cambiando. Actualiza e inténtalo de nuevo.')
  }
  async listar(
    owner: string,
    opciones: { proveedorId?: string; tipo?: string; eliminados?: boolean } = {},
  ) {
    let filter = `PartitionKey eq '${owner}' and eliminado eq ${opciones.eliminados ? 'true' : 'false'}`
    if (opciones.proveedorId) filter += ` and proveedorId eq '${opciones.proveedorId}'`
    if (opciones.tipo) filter += ` and tipo eq '${opciones.tipo}'`
    const salida: Documento[] = []
    for await (const r of this.tabla.listEntities<Registro>({ queryOptions: { filter } }))
      salida.push(this.publico(r))
    return salida.sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga))
  }
  async registrar(owner: string, entrada: Entrada) {
    const id = randomUUID()
    const revision = randomUUID()
    const fecha = new Date().toISOString()
    const blobName = `${owner}/${entrada.proveedorId}/${id}/archivo`
    const r: Registro = {
      partitionKey: owner,
      rowKey: id,
      id,
      blobName,
      proveedorId: entrada.proveedorId,
      proveedorNombre: entrada.proveedorNombre,
      nombre: entrada.nombre,
      tipo: entrada.tipo,
      tamano: entrada.bytes.length,
      mime: entrada.mime,
      fechaCarga: fecha,
      actualizado: fecha,
      estado: 'pendiente',
      detalle: 'Esperando la validación automática.',
      revision,
      eliminado: false,
    }
    await this.tabla.createEntity(r)
    try {
      await this.container
        .getBlockBlobClient(blobName)
        .uploadData(entrada.bytes, {
          blobHTTPHeaders: { blobContentType: entrada.mime },
          metadata: { owner, proveedor: entrada.proveedorId, documento: id, revision },
          conditions: { ifNoneMatch: '*' },
        })
      await this.auditar('carga', owner, id)
      return this.publico(await this.obtener(owner, id))
    } catch (error) {
      await this.cambiar(owner, id, (actual) =>
        actual.revision === revision
          ? {
              estado: 'error',
              detalle:
                'No se completó la carga. Puedes eliminar este registro y volver a intentarlo.',
            }
          : null,
      )
      throw error
    }
  }
  async reemplazar(
    owner: string,
    id: string,
    entrada: Omit<Entrada, 'proveedorId' | 'proveedorNombre' | 'tipo'>,
  ) {
    const revision = randomUUID()
    const r = await this.cambiar(owner, id, (actual) => {
      if (actual.eliminado || ['pendiente', 'procesando', 'eliminando'].includes(actual.estado))
        throw new ErrorAplicacion(
          409,
          'Espera a que termine la operación actual antes de subir otra versión.',
        )
      return {
        nombre: entrada.nombre,
        tamano: entrada.bytes.length,
        mime: entrada.mime,
        revision,
        estado: 'pendiente',
        detalle: 'Esperando la validación de la nueva versión.',
      }
    })
    try {
      await this.container
        .getBlockBlobClient(r.blobName)
        .uploadData(entrada.bytes, {
          blobHTTPHeaders: { blobContentType: entrada.mime },
          metadata: { owner, proveedor: r.proveedorId, documento: id, revision },
        })
      await this.auditar('nueva_version', owner, id)
      return this.publico(await this.obtener(owner, id))
    } catch (error) {
      await this.cambiar(owner, id, (actual) =>
        actual.revision === revision
          ? { estado: 'error', detalle: 'No se pudo subir la nueva versión.' }
          : null,
      )
      throw error
    }
  }
  async eliminar(owner: string, id: string) {
    const revision = randomUUID()
    const r = await this.cambiar(owner, id, (actual) => {
      if (actual.eliminado) return null
      if (actual.estado === 'eliminando')
        throw new ErrorAplicacion(409, 'La eliminación ya está en curso.')
      if (actual.estado === 'pendiente' || actual.estado === 'procesando')
        throw new ErrorAplicacion(409, 'Espera a que termine el procesamiento antes de eliminar.')
      return { estado: 'eliminando', revision }
    })
    if (r.eliminado) return
    try {
      await this.container.getBlobClient(r.blobName).deleteIfExists({ deleteSnapshots: 'include' })
      await this.cambiar(owner, id, (actual) =>
        actual.revision === revision
          ? {
              eliminado: true,
              estado: 'eliminado',
              detalle: 'Documento eliminado. Su recuperación depende de la retención de Azure.',
            }
          : null,
      )
      await this.auditar('eliminacion', owner, id)
    } catch (error) {
      await this.cambiar(owner, id, (actual) =>
        actual.revision === revision
          ? { estado: 'error', detalle: 'No se completó la eliminación. Vuelve a intentarlo.' }
          : null,
      )
      throw error
    }
  }
  async versiones(owner: string, id: string) {
    const r = await this.obtener(owner, id)
    const versiones = []
    for await (const blob of this.container.listBlobsFlat({
      prefix: r.blobName,
      includeVersions: true,
      includeDeleted: true,
    })) {
      if (blob.name === r.blobName && blob.versionId)
        versiones.push({
          versionId: blob.versionId,
          actual: blob.isCurrentVersion ?? false,
          eliminado: blob.deleted ?? false,
          fecha: blob.properties.lastModified?.toISOString(),
          tamano: blob.properties.contentLength ?? 0,
        })
    }
    return versiones.sort((a, b) => b.versionId.localeCompare(a.versionId))
  }
  async sas(r: Registro, segundos: number, descargar: boolean, versionId?: string) {
    const startsOn = new Date(Date.now() - 60000)
    const expiresOn = new Date(Date.now() + segundos * 1000)
    const disposition = `${descargar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(r.nombre).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16))}`
    const options = {
      containerName: CONTENEDOR,
      blobName: r.blobName,
      permissions: BlobSASPermissions.parse('r'),
      startsOn,
      expiresOn,
      protocol: this.sharedKey ? SASProtocol.HttpsAndHttp : SASProtocol.Https,
      contentType: r.mime,
      contentDisposition: disposition,
      ...(versionId ? { versionId } : {}),
    }
    const token = this.sharedKey
      ? generateBlobSASQueryParameters(options, this.sharedKey)
      : generateBlobSASQueryParameters(
          options,
          await this.blobs.getUserDelegationKey(startsOn, new Date(expiresOn.getTime() + 60000)),
          this.cuenta,
        )
    const url = new URL(this.container.getBlobClient(r.blobName).url)
    url.search = token.toString()
    if (versionId) url.searchParams.set('versionid', versionId)
    return { url: url.toString(), expira: expiresOn.toISOString() }
  }
  async enlace(owner: string, id: string, segundos: number, descargar: boolean) {
    const r = await this.obtener(owner, id)
    if (r.estado !== 'disponible' || r.eliminado)
      throw new ErrorAplicacion(409, 'Solo se pueden abrir documentos disponibles y validados.')
    // En Azure el enlace queda fijado a la versión que ya validó la función.
    // Un enlace anterior no puede abrir una nueva versión todavía pendiente.
    const enlace = await this.sas(r, segundos, descargar, r.versionId)
    await this.auditar(descargar ? 'descarga' : 'visualizacion', owner, id)
    return enlace
  }
  async restaurar(owner: string, id: string) {
    const r = await this.obtener(owner, id)
    if (!r.eliminado) throw new ErrorAplicacion(409, 'El documento no está eliminado.')
    try {
      await this.container.getBlobClient(r.blobName).undelete()
    } catch (e) {
      if (codigo(e) !== 404) throw e
    }
    const versiones = (await this.versiones(owner, id)).filter((v) => !v.eliminado)
    if (!versiones.length)
      throw new ErrorAplicacion(
        409,
        'No quedan versiones recuperables. Revisa la retención y el versionado de la cuenta en Azure.',
      )
    const fuente = await this.sas(r, 60, false, versiones[0].versionId)
    const revision = randomUUID()
    await this.cambiar(owner, id, (actual) => {
      if (!actual.eliminado)
        throw new ErrorAplicacion(409, 'Otro proceso ya restauró el documento.')
      return {
        revision,
        estado: 'pendiente',
        eliminado: false,
        detalle: 'Restaurando y validando el documento.',
      }
    })
    try {
      const copia = await this.container
        .getBlobClient(r.blobName)
        .beginCopyFromURL(fuente.url, {
          metadata: { owner, proveedor: r.proveedorId, documento: id, revision },
        })
      await copia.pollUntilDone()
      await this.auditar('restauracion', owner, id)
      return this.publico(await this.obtener(owner, id))
    } catch (error) {
      await this.cambiar(owner, id, (actual) =>
        actual.revision === revision
          ? { eliminado: true, estado: 'eliminado', detalle: 'No se completó la recuperación.' }
          : null,
      )
      throw error
    }
  }
  async auditar(operacion: string, owner: string, documentoId: string, detalle = '') {
    const evento = {
      partitionKey: owner,
      rowKey: `${Date.now()}-${randomUUID()}`,
      operacion,
      documentoId,
      detalle: detalle.slice(0, 500),
      fecha: new Date().toISOString(),
    }
    console.info(JSON.stringify({ evento: operacion, documentoId, fecha: evento.fecha }))
    try {
      await this.eventos.createEntity(evento)
    } catch {
      console.error(JSON.stringify({ evento: 'error_registro_auditoria', documentoId }))
    }
  }
}
