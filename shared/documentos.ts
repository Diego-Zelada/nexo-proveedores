import { extname } from 'node:path'

export const CONTENEDOR = 'proveedores-documentos'
export const TIPOS = ['contrato', 'identificacion', 'constancia_fiscal', 'otro'] as const
export type TipoDocumento = (typeof TIPOS)[number]
export type EstadoDocumento =
  'pendiente' | 'procesando' | 'disponible' | 'rechazado' | 'error' | 'eliminando' | 'eliminado'
export interface Documento {
  id: string
  proveedorId: string
  proveedorNombre: string
  nombre: string
  tipo: TipoDocumento
  tamano: number
  mime: string
  fechaCarga: string
  actualizado: string
  estado: EstadoDocumento
  detalle: string
  revision: string
  eliminado: boolean
  versionId?: string
}
export class ErrorAplicacion extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export function identificador(value: unknown, campo = 'Identificador'): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))
    throw new ErrorAplicacion(400, `${campo} no válido.`)
  return value
}
export function tipoDocumento(value: unknown): TipoDocumento {
  if (!(TIPOS as readonly unknown[]).includes(value))
    throw new ErrorAplicacion(400, 'Selecciona un tipo de documento válido.')
  return value as TipoDocumento
}
export function nombreArchivo(value: string) {
  const nombre = value
    .normalize('NFC')
    .replace(/[\\/\x00-\x1f\x7f]/g, '_')
    .trim()
  if (!nombre || nombre.length > 180)
    throw new ErrorAplicacion(400, 'El nombre del archivo debe tener entre 1 y 180 caracteres.')
  return nombre
}
// Se comprueban extensión, MIME y firma; cambiar el nombre de un ejecutable no lo convierte en PDF.
export function validarArchivo(
  bytes: Buffer,
  nombre: string,
  mimeDeclarado: string,
  limite: number,
) {
  if (!bytes.length) throw new ErrorAplicacion(422, 'El archivo está vacío.')
  if (bytes.length > limite)
    throw new ErrorAplicacion(413, `El límite es ${Math.floor(limite / 1048576)} MB por archivo.`)
  const extension = extname(nombre).toLowerCase()
  const formatos: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  }
  const mime = formatos[extension]
  if (!mime) throw new ErrorAplicacion(422, 'Solo se permiten archivos PDF, JPG y PNG.')
  if (mimeDeclarado && mimeDeclarado !== 'application/octet-stream' && mimeDeclarado !== mime)
    throw new ErrorAplicacion(422, 'El tipo del archivo no coincide con su extensión.')
  const pdf =
    bytes.subarray(0, 5).toString('ascii') === '%PDF-' &&
    bytes.subarray(Math.max(0, bytes.length - 1024)).includes(Buffer.from('%%EOF'))
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (!(
    (mime === 'application/pdf' && pdf) ||
    (mime === 'image/jpeg' && jpg) ||
    (mime === 'image/png' && png)
  ))
    throw new ErrorAplicacion(422, 'El contenido no corresponde a un PDF, JPG o PNG válido.')
  return mime
}
