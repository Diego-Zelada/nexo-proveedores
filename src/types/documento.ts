export type TipoDocumento = 'contrato' | 'identificacion' | 'constancia_fiscal' | 'otro'
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
  eliminado: boolean
  versionId?: string
}
export const tiposDocumento: Record<TipoDocumento, string> = {
  contrato: 'Contratos',
  identificacion: 'Identificaciones',
  constancia_fiscal: 'Constancias fiscales',
  otro: 'Otros',
}
export interface VersionDocumento {
  versionId: string
  actual: boolean
  eliminado: boolean
  fecha?: string
  tamano: number
}
