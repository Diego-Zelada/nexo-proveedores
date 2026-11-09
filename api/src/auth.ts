import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { SignJWT, jwtVerify } from 'jose'
import type { RequestHandler } from 'express'
import type { Configuracion } from './config.js'
import { ErrorAplicacion } from '../../shared/documentos.js'

const scrypt = promisify(scryptCallback)
export async function crearHash(password: string, salt = randomBytes(16).toString('hex')) {
  const hash = (await scrypt(password, salt, 64)) as Buffer
  return `scrypt$${salt}$${hash.toString('hex')}`
}
export async function comprobarPassword(password: string, hash: string) {
  const [, salt, expected] = hash.split('$')
  const actual = (await scrypt(password, salt, 64)) as Buffer
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'))
}
export function identidad(usuario: string) {
  return createHash('sha256').update(usuario).digest('hex').slice(0, 32)
}
export function autenticacion(config: Configuracion) {
  const key = new TextEncoder().encode(config.jwtSecret)
  // Un usuario inexistente recorre la misma función de hash para no responder instantáneamente.
  const hashFalso = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`
  const proteger: RequestHandler = async (req, res, next) => {
    try {
      const authorization = req.headers.authorization
      if (!authorization?.startsWith('Bearer ')) throw new Error()
      const { payload } = await jwtVerify(authorization.slice(7), key, {
        algorithms: ['HS256'],
        issuer: 'nexo',
        audience: 'nexo-api',
      })
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.usuario !== 'string' ||
        !config.usuarios.some(
          (u) => u.usuario === payload.usuario && identidad(u.usuario) === payload.sub,
        )
      )
        throw new Error()
      res.locals.owner = payload.sub
      res.locals.usuario = payload.usuario
      next()
    } catch {
      next(new ErrorAplicacion(401, 'Inicia sesión para acceder a los documentos.'))
    }
  }
  async function login(usuario: unknown, password: unknown) {
    if (typeof usuario !== 'string' || typeof password !== 'string' || password.length > 200)
      throw new ErrorAplicacion(401, 'Usuario o contraseña incorrectos.')
    const registro = config.usuarios.find((u) => u.usuario === usuario.toLowerCase().trim())
    const valido = await comprobarPassword(password, registro?.hash ?? hashFalso)
    if (!registro || !valido) throw new ErrorAplicacion(401, 'Usuario o contraseña incorrectos.')
    const token = await new SignJWT({ usuario: registro.usuario })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(identidad(registro.usuario))
      .setIssuer('nexo')
      .setAudience('nexo-api')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key)
    return { token, usuario: registro.usuario, expiraEn: 3600 }
  }
  return { proteger, login }
}
