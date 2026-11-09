import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { crearApp } from '../src/app.js'
import { crearHash, comprobarPassword, identidad } from '../src/auth.js'
import { configuracion } from '../src/config.js'
import {
  identificador,
  nombreArchivo,
  tipoDocumento,
  validarArchivo,
} from '../../shared/documentos.js'
import type { AlmacenDocumentos } from '../../shared/azure.js'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const pdf = Buffer.from('%PDF-1.4\nEjemplo\n%%EOF')
describe('validación de documentos', () => {
  it('rechaza extensión falsa, MIME falso, vacío y exceso de tamaño', () => {
    expect(validarArchivo(pdf, 'contrato.pdf', 'application/pdf', 1024)).toBe('application/pdf')
    expect(() =>
      validarArchivo(Buffer.from('un ejecutable'), 'contrato.pdf', 'application/pdf', 1024),
    ).toThrow('contenido')
    expect(() => validarArchivo(pdf, 'contrato.exe', 'application/pdf', 1024)).toThrow('Solo')
    expect(() => validarArchivo(pdf, 'contrato.png', 'image/png', 1024)).toThrow('contenido')
    expect(() => validarArchivo(pdf, 'contrato.pdf', 'text/html', 1024)).toThrow('tipo')
    expect(() => validarArchivo(Buffer.alloc(0), 'contrato.pdf', 'application/pdf', 1024)).toThrow(
      'vacío',
    )
    expect(() => validarArchivo(pdf, 'contrato.pdf', 'application/pdf', 10)).toThrow('límite')
  })
  it('valida tipos e identificadores antes de construir filtros de Azure', () => {
    expect(() => identificador("abc' or true")).toThrow()
    expect(() => identificador('../otra-carpeta')).toThrow()
    expect(identificador('prov-001')).toBe('prov-001')
    expect(() => tipoDocumento('ejecutable')).toThrow()
    expect(tipoDocumento('constancia_fiscal')).toBe('constancia_fiscal')
    expect(nombreArchivo('../documento.pdf')).toBe('.._documento.pdf')
  })
})
describe('autenticación y configuración', () => {
  it('sirve el frontend y sus rutas desde una carpeta de publicación, incluso con directorios ocultos', async () => {
    const web = await mkdtemp(join(tmpdir(), '.nexo-web-'))
    const anterior = process.env.STATIC_DIR
    try {
      await writeFile(
        join(web, 'index.html'),
        '<html><body><div id="root">Nexo</div></body></html>',
      )
      await writeFile(join(web, 'estilo.css'), 'body { color: navy; }')
      process.env.STATIC_DIR = web
      const app = crearApp({} as AlmacenDocumentos, {
        usuarios: [{ usuario: 'prueba', hash: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}` }],
        jwtSecret: 's'.repeat(64),
        origenes: [],
        limite: 1048576,
        sasSegundos: 60,
      })
      for (const ruta of ['/', '/proveedores']) {
        const respuesta = await request(app).get(ruta)
        expect(respuesta.status).toBe(200)
        expect(respuesta.text).toContain('id="root"')
      }
      expect((await request(app).get('/estilo.css')).text).toContain('navy')
      expect((await request(app).get('/api/documentos')).status).toBe(401)
    } finally {
      if (anterior === undefined) delete process.env.STATIC_DIR
      else process.env.STATIC_DIR = anterior
      await rm(web, { recursive: true, force: true })
    }
  })
  it('guarda hashes con sal y verifica la contraseña sin guardarla en texto', async () => {
    const hash = await crearHash('clave-local-para-prueba')
    expect(hash).not.toContain('clave-local-para-prueba')
    expect(await comprobarPassword('clave-local-para-prueba', hash)).toBe(true)
    expect(await comprobarPassword('otra-clave', hash)).toBe(false)
    expect(await crearHash('clave-local-para-prueba')).not.toBe(hash)
    expect(identidad('diego')).not.toBe(identidad('docente'))
  })
  it('no inicia con secretos por defecto o usuarios sin hash', () => {
    expect(() => configuracion({})).toThrow('AUTH_JWT_SECRET')
    expect(() => configuracion({ AUTH_JWT_SECRET: 's'.repeat(64), AUTH_USERS_JSON: '[]' })).toThrow(
      'usuarios',
    )
  })
  it('protege consulta, carga, estado, enlaces, versiones, eliminación y recuperación sin tocar Azure', async () => {
    const store = new Proxy(
      {},
      {
        get() {
          throw new Error('No debe consultar Azure sin autorización')
        },
      },
    ) as AlmacenDocumentos
    const app = crearApp(store, {
      usuarios: [{ usuario: 'prueba', hash: `scrypt$${'a'.repeat(32)}$${'b'.repeat(128)}` }],
      jwtSecret: 's'.repeat(64),
      origenes: ['http://localhost:4173'],
      limite: 1048576,
      sasSegundos: 60,
    })
    for (const path of [
      '/api/documentos',
      '/api/documentos/id',
      '/api/documentos/id/estado',
      '/api/documentos/id/enlace',
      '/api/documentos/id/versiones',
    ])
      expect((await request(app).get(path)).status).toBe(401)
    expect((await request(app).delete('/api/documentos/id')).status).toBe(401)
    expect((await request(app).post('/api/documentos/id/restaurar')).status).toBe(401)
    expect((await request(app).post('/api/proveedores/p1/documentos')).status).toBe(401)
    expect((await request(app).put('/api/documentos/id/contenido')).status).toBe(401)
    expect(
      (await request(app).get('/api/documentos').set('Authorization', 'Bearer inventado')).status,
    ).toBe(401)
    expect((await request(app).get('/api/health')).status).toBe(200)
    expect(
      (await request(app).get('/api/documentos').set('Origin', 'https://otro.example')).status,
    ).toBe(403)
  })
})
