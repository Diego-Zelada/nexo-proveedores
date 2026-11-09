import { afterAll, beforeAll, describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import request from 'supertest'
import { AlmacenDocumentos } from '../shared/azure.js'
import { procesarDocumento } from '../shared/procesar.js'
import { crearApp } from '../api/src/app.js'
import { crearHash, identidad } from '../api/src/auth.js'

// Necesita Azurite iniciado. No utiliza ni modifica una cuenta de Azure.
const nonce = randomBytes(5).toString('hex')
const store = new AlmacenDocumentos({
  AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true',
  DOCUMENT_TABLE: `PruebaDoc${nonce}`,
  AUDIT_TABLE: `PruebaLog${nonce}`,
})
const password = randomBytes(20).toString('hex')
const pdf = Buffer.from('%PDF-1.4\nDocumento de prueba\n%%EOF')
let app: ReturnType<typeof crearApp>, token: string, otroToken: string, id: string
const owner = identidad(`usuario-${nonce}`)
beforeAll(async () => {
  await store.iniciar()
  const hash = await crearHash(password)
  app = crearApp(store, {
    usuarios: [
      { usuario: `usuario-${nonce}`, hash },
      { usuario: `otro-${nonce}`, hash },
    ],
    jwtSecret: randomBytes(48).toString('hex'),
    origenes: ['http://localhost:4173'],
    limite: 1048576,
    sasSegundos: 60,
  })
  token = (
    await request(app)
      .post('/api/auth/login')
      .send({ usuario: `usuario-${nonce}`, password })
  ).body.token
  otroToken = (
    await request(app)
      .post('/api/auth/login')
      .send({ usuario: `otro-${nonce}`, password })
  ).body.token
})
afterAll(async () => {
  for await (const blob of store.container.listBlobsFlat({ prefix: owner + '/' }))
    await store.container.deleteBlob(blob.name, { deleteSnapshots: 'include' })
  await Promise.all([store.tabla.deleteTable(), store.eventos.deleteTable()])
})
describe('API + Blob + Tables + procesador real, usando Azurite', () => {
  it('acepta el PDF y lo deja pendiente hasta la ejecución de la función', async () => {
    const r = await request(app)
      .post('/api/proveedores/prov-001/documentos')
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'contrato')
      .field('proveedorNombre', 'Proveedor ficticio')
      .attach('archivo', pdf, { filename: 'contrato.pdf', contentType: 'application/pdf' })
    expect(r.status).toBe(202)
    id = r.body.documento.id
    expect(r.body.documento.estado).toBe('pendiente')
    expect(
      (
        await request(app)
          .get(`/api/documentos/${id}/enlace`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(409)
    const registro = await store.obtener(owner, id)
    const anonimo = await fetch(store.container.getBlobClient(registro.blobName).url)
    expect([403, 404]).toContain(anonimo.status)
    await procesarDocumento(store, registro.blobName, 1048576)
    expect((await store.obtener(owner, id)).estado).toBe('disponible')
  })
  it('consulta y filtra; niega el acceso a otro usuario aunque conozca el ID', async () => {
    const lista = await request(app)
      .get('/api/documentos?proveedorId=prov-001&tipo=contrato')
      .set('Authorization', `Bearer ${token}`)
    expect(lista.body.documentos).toHaveLength(1)
    expect(lista.body.documentos[0].nombre).toBe('contrato.pdf')
    expect(
      (await request(app).get('/api/documentos?tipo=otro').set('Authorization', `Bearer ${token}`))
        .body.documentos,
    ).toHaveLength(0)
    for (const suffix of ['', '/estado', '/enlace', '/versiones'])
      expect(
        (
          await request(app)
            .get(`/api/documentos/${id}${suffix}`)
            .set('Authorization', `Bearer ${otroToken}`)
        ).status,
      ).toBe(404)
    expect(
      (
        await request(app)
          .delete(`/api/documentos/${id}`)
          .set('Authorization', `Bearer ${otroToken}`)
      ).status,
    ).toBe(404)
    expect(
      (
        await request(app)
          .post(`/api/documentos/${id}/restaurar`)
          .set('Authorization', `Bearer ${otroToken}`)
      ).status,
    ).toBe(404)
  })
  it('genera un SAS de solo lectura que descarga el archivo, pero no permite escribir', async () => {
    const r = await request(app)
      .get(`/api/documentos/${id}/enlace?descargar=true`)
      .set('Authorization', `Bearer ${token}`)
    expect(r.status).toBe(200)
    const url = new URL(r.body.url)
    expect(url.searchParams.get('sp')).toBe('r')
    expect(Date.parse(r.body.expira) - Date.now()).toBeLessThanOrEqual(60000)
    const descarga = await fetch(r.body.url)
    expect(descarga.status).toBe(200)
    expect(Buffer.from(await descarga.arrayBuffer()).equals(pdf)).toBe(true)
    expect((await fetch(r.body.url, { method: 'DELETE' })).status).toBe(403)
    const caducado = await store.sas(await store.obtener(owner, id), -1, true)
    expect((await fetch(caducado.url)).status).toBe(403)
  })
  it('rechaza contenido falso y tamaño excesivo en la API', async () => {
    const fallo = await request(app)
      .post('/api/proveedores/prov-001/documentos')
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'contrato')
      .field('proveedorNombre', 'Proveedor ficticio')
      .attach('archivo', Buffer.from('ejecutable'), {
        filename: 'falso.pdf',
        contentType: 'application/pdf',
      })
    expect(fallo.status).toBe(422)
    const grande = await request(app)
      .post('/api/proveedores/prov-001/documentos')
      .set('Authorization', `Bearer ${token}`)
      .field('tipo', 'otro')
      .field('proveedorNombre', 'Proveedor ficticio')
      .attach('archivo', Buffer.alloc(1048577), {
        filename: 'grande.png',
        contentType: 'image/png',
      })
    expect(grande.status).toBe(413)
  })
  it('revalida en la función y registra un rechazo incluso si alguien evita el filtro HTTP', async () => {
    const d = await store.registrar(owner, {
      proveedorId: 'prov-002',
      proveedorNombre: 'Prueba de función',
      tipo: 'otro',
      nombre: 'falso.pdf',
      mime: 'application/pdf',
      bytes: Buffer.from('no es un pdf'),
    })
    const r = await store.obtener(owner, d.id)
    await procesarDocumento(store, r.blobName, 1048576)
    expect((await store.obtener(owner, d.id)).estado).toBe('rechazado')
    expect(
      (
        await request(app)
          .get(`/api/documentos/${d.id}/enlace`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(409)
  })
  it('nueva versión vuelve a pendiente; los eventos repetidos no cambian un resultado validado', async () => {
    const r = await request(app)
      .put(`/api/documentos/${id}/contenido`)
      .set('Authorization', `Bearer ${token}`)
      .attach('archivo', pdf, { filename: 'contrato-v2.pdf', contentType: 'application/pdf' })
    expect(r.status).toBe(202)
    expect(r.body.documento.estado).toBe('pendiente')
    await procesarDocumento(store, (await store.obtener(owner, id)).blobName, 1048576)
    const primera = await store.obtener(owner, id)
    await procesarDocumento(store, primera.blobName, 1048576)
    expect((await store.obtener(owner, id)).actualizado).toBe(primera.actualizado)
  })
  it('elimina el blob y conserva el registro en papelera sin permitir nuevos enlaces', async () => {
    expect(
      (await request(app).delete(`/api/documentos/${id}`).set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(204)
    expect((await store.obtener(owner, id)).eliminado).toBe(true)
    expect(
      (
        await request(app)
          .get(`/api/documentos/${id}/enlace`)
          .set('Authorization', `Bearer ${token}`)
      ).status,
    ).toBe(409)
    const papelera = await request(app)
      .get('/api/documentos?eliminados=true')
      .set('Authorization', `Bearer ${token}`)
    expect(papelera.body.documentos.some((d: { id: string }) => d.id === id)).toBe(true)
    await procesarDocumento(store, (await store.obtener(owner, id)).blobName, 1048576)
    expect((await store.obtener(owner, id)).estado).toBe('eliminado')
  })
  it('sube, valida y descarga PNG y JPG reales sin modificar sus bytes', async () => {
    for (const [nombre, mime] of [
      ['identificacion-ficticia.png', 'image/png'],
      ['constancia-ficticia.jpg', 'image/jpeg'],
    ]) {
      const bytes = await readFile(new URL(`./archivos/${nombre}`, import.meta.url))
      const carga = await request(app)
        .post('/api/proveedores/prov-003/documentos')
        .set('Authorization', `Bearer ${token}`)
        .field('tipo', 'otro')
        .field('proveedorNombre', 'Proveedor de imágenes')
        .attach('archivo', bytes, { filename: nombre, contentType: mime })
      expect(carga.status).toBe(202)
      const registro = await store.obtener(owner, carga.body.documento.id)
      await procesarDocumento(store, registro.blobName, 1048576)
      const enlace = await store.enlace(owner, registro.id, 60, true)
      const descarga = await fetch(enlace.url)
      expect(descarga.status).toBe(200)
      expect(Buffer.from(await descarga.arrayBuffer()).equals(bytes)).toBe(true)
    }
  })
})
