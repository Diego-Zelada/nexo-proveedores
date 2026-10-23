export type EstadoProveedor = 'activo' | 'inactivo'
export type FiltroEstado = EstadoProveedor | 'todos'

export interface Proveedor {
  id: string
  nombre: string
  razonSocial: string
  nit: string
  nrc: string
  telefono: string
  correo: string
  direccion: string
  estado: EstadoProveedor
}

export type DatosProveedor = Omit<Proveedor, 'id'>
export type ErroresProveedor = Partial<Record<keyof DatosProveedor, string>>
