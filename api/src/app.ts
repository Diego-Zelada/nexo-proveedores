import express, { type ErrorRequestHandler } from 'express'
import helmet from 'helmet'
import multer from 'multer'
import { rateLimit } from 'express-rate-limit'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { autenticacion } from './auth.js'
import type { Configuracion } from './config.js'
import { AlmacenDocumentos } from '../../shared/azure.js'
import {
  ErrorAplicacion,
  identificador,
  nombreArchivo,
  tipoDocumento,
  validarArchivo,
} from '../../shared/documentos.js'

export function crearApp(store: AlmacenDocumentos, config: Configuracion) {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com'],
          'img-src': ["'self'", 'data:', 'blob:'],
          'connect-src': ["'self'", ...config.origenes],
        },
      },
    }),
  )
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID()
    res.setHeader('X-Request-Id', res.locals.requestId)
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store')
    const origin = req.headers.origin
    if (origin) {
      const propio = `${req.protocol}://${req.get('host')}`
      if (!config.origenes.includes(origin) && origin !== propio)
        return next(new ErrorAplicacion(403, 'Origen no autorizado.'))
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Vary', 'Origin')
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204)
      return
    }
    res.on('finish', () => {
      if (req.path.startsWith('/api'))
        console.info(
          JSON.stringify({
            evento: 'http',
            requestId: res.locals.requestId,
            metodo: req.method,
            ruta: req.path,
            estado: res.statusCode,
          }),
        )
    })
    next()
  })
  app.use(express.json({ limit: '16kb' }))
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', servicio: 'nexo-documentos' }))
  const auth = autenticacion(config)
  const loginLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Vuelve a intentarlo en 15 minutos.' },
  })
  app.post('/api/auth/login', loginLimit, async (req, res) => {
    try {
      res.json(await auth.login(req.body?.usuario, req.body?.password))
    } catch (error) {
      console.warn(JSON.stringify({ evento: 'login_rechazado', requestId: res.locals.requestId }))
      throw error
    }
  })
  app.use('/api', auth.proteger)
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 120,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Demasiadas solicitudes. Espera un minuto.' },
    }),
  )
  app.get('/api/auth/me', (_req, res) =>
    res.json({ usuario: res.locals.usuario, limiteBytes: config.limite }),
  )
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.limite, files: 1, fields: 4, parts: 5, fieldSize: 1000 },
  }).single('archivo')
  const leerArchivo = (req: express.Request) => {
    if (!req.file) throw new ErrorAplicacion(400, 'Selecciona un archivo.')
    const nombre = nombreArchivo(req.file.originalname)
    const mime = validarArchivo(req.file.buffer, nombre, req.file.mimetype, config.limite)
    return { nombre, mime, bytes: req.file.buffer }
  }
  app.get('/api/documentos', async (req, res) => {
    const proveedorId = req.query.proveedorId
      ? identificador(req.query.proveedorId, 'Proveedor')
      : undefined
    const tipo = req.query.tipo ? tipoDocumento(req.query.tipo) : undefined
    res.json({
      documentos: await store.listar(res.locals.owner, {
        proveedorId,
        tipo,
        eliminados: req.query.eliminados === 'true',
      }),
    })
  })
  app.post('/api/proveedores/:proveedorId/documentos', upload, async (req, res) => {
    const proveedorId = identificador(req.params.proveedorId, 'Proveedor')
    const proveedorNombre = req.body?.proveedorNombre
    if (
      typeof proveedorNombre !== 'string' ||
      !proveedorNombre.trim() ||
      proveedorNombre.length > 150
    )
      throw new ErrorAplicacion(400, 'El proveedor debe tener un nombre válido.')
    const documento = await store.registrar(res.locals.owner, {
      ...leerArchivo(req),
      proveedorId,
      proveedorNombre: proveedorNombre.trim(),
      tipo: tipoDocumento(req.body.tipo),
    })
    res.status(202).json({ documento })
  })
  app.get('/api/documentos/:id', async (req, res) =>
    res.json({
      documento: store.publico(await store.obtener(res.locals.owner, identificador(req.params.id))),
    }),
  )
  app.get('/api/documentos/:id/estado', async (req, res) => {
    const r = await store.obtener(res.locals.owner, identificador(req.params.id))
    res.json({ id: r.id, estado: r.estado, detalle: r.detalle, actualizado: r.actualizado })
  })
  app.get('/api/documentos/:id/enlace', async (req, res) =>
    res.json(
      await store.enlace(
        res.locals.owner,
        identificador(req.params.id),
        config.sasSegundos,
        req.query.descargar === 'true',
      ),
    ),
  )
  app.get('/api/documentos/:id/versiones', async (req, res) =>
    res.json({ versiones: await store.versiones(res.locals.owner, identificador(req.params.id)) }),
  )
  app.put('/api/documentos/:id/contenido', upload, async (req, res) =>
    res.status(202).json({
      documento: await store.reemplazar(
        res.locals.owner,
        identificador(req.params.id),
        leerArchivo(req),
      ),
    }),
  )
  app.delete('/api/documentos/:id', async (req, res) => {
    await store.eliminar(res.locals.owner, identificador(req.params.id))
    res.sendStatus(204)
  })
  app.post('/api/documentos/:id/restaurar', async (req, res) =>
    res
      .status(202)
      .json({ documento: await store.restaurar(res.locals.owner, identificador(req.params.id)) }),
  )
  app.use('/api', (_req, _res, next) =>
    next(new ErrorAplicacion(404, 'Ruta de API no encontrada.')),
  )
  const web = resolve(process.env.STATIC_DIR ?? 'web')
  if (existsSync(resolve(web, 'index.html'))) {
    app.use(express.static(web, { index: false, maxAge: '1h' }))
    app.get('/{*ruta}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile('index.html', { root: web })
    })
  }
  const errores: ErrorRequestHandler = (error, _req, res, _next) => {
    let status = error instanceof ErrorAplicacion ? error.status : 500
    let message =
      error instanceof ErrorAplicacion
        ? error.message
        : 'No se pudo completar la operación. Consulta el identificador de error con el administrador.'
    if (error instanceof multer.MulterError) {
      status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
      message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `El límite es ${config.limite / 1048576} MB por archivo.`
          : 'Envía un solo archivo con los campos indicados.'
    }
    if (error instanceof SyntaxError && 'body' in error) {
      status = 400
      message = 'El cuerpo JSON no es válido.'
    }
    if (error?.type === 'entity.too.large') {
      status = 413
      message = 'La solicitud JSON excede el tamaño permitido.'
    }
    console.error(
      JSON.stringify({
        evento: 'error_api',
        requestId: res.locals.requestId,
        status,
        codigo: error?.code ?? 'Error',
        ...(status < 500 ? { detalle: message } : {}),
      }),
    )
    res.status(status).json({ error: message, requestId: res.locals.requestId })
  }
  app.use(errores)
  return app
}
