import type { Proveedor } from '../types/proveedor'

export const CLAVE_PROVEEDORES = 'nexo.proveedores.v1'
type Almacenamiento = Pick<Storage, 'getItem' | 'setItem'>

function esProveedor(valor: unknown): valor is Proveedor {
  if (typeof valor !== 'object' || valor === null) return false
  const p = valor as Record<string, unknown>
  const campos = ['id', 'nombre', 'razonSocial', 'nit', 'nrc', 'telefono', 'correo', 'direccion']
  return (
    campos.every((campo) => typeof p[campo] === 'string') &&
    !!p.id &&
    !!(p.nombre as string).trim() &&
    !!(p.nit as string).trim() &&
    (p.estado === 'activo' || p.estado === 'inactivo')
  )
}

export function leerProveedores(almacenamiento: Almacenamiento): Proveedor[] | null {
  const texto = almacenamiento.getItem(CLAVE_PROVEEDORES)
  if (texto === null) return null
  const datos: unknown = JSON.parse(texto)
  if (typeof datos !== 'object' || datos === null) throw new Error('Datos no reconocidos.')
  const contenido = datos as { version?: unknown; proveedores?: unknown }
  if (
    contenido.version !== 1 ||
    !Array.isArray(contenido.proveedores) ||
    !contenido.proveedores.every(esProveedor) ||
    new Set(contenido.proveedores.map((p) => p.id)).size !== contenido.proveedores.length
  ) {
    throw new Error('Los datos guardados no tienen el formato esperado.')
  }
  return contenido.proveedores
}

export function guardarProveedores(almacenamiento: Almacenamiento, proveedores: Proveedor[]) {
  almacenamiento.setItem(CLAVE_PROVEEDORES, JSON.stringify({ version: 1, proveedores }))
}
