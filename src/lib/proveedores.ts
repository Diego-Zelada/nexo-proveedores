import type { DatosProveedor, ErroresProveedor, FiltroEstado, Proveedor } from '../types/proveedor'

export function normalizarTexto(texto: string) {
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function normalizarNit(nit: string) {
  return nit.replace(/[\s-]/g, '').toLowerCase()
}

export function filtrarProveedores(
  proveedores: Proveedor[],
  busqueda: string,
  estado: FiltroEstado,
) {
  const texto = normalizarTexto(busqueda)
  const nit = normalizarNit(texto)
  return proveedores
    .filter((proveedor) => {
      const coincideEstado = estado === 'todos' || proveedor.estado === estado
      const coincideTexto =
        !texto ||
        normalizarTexto(proveedor.nombre).includes(texto) ||
        normalizarTexto(proveedor.correo).includes(texto) ||
        normalizarTexto(proveedor.nit).includes(texto) ||
        (nit.length > 0 && normalizarNit(proveedor.nit).includes(nit))
      return coincideEstado && coincideTexto
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function limpiarDatos(datos: DatosProveedor): DatosProveedor {
  return {
    nombre: datos.nombre.trim(),
    razonSocial: datos.razonSocial.trim(),
    nit: datos.nit.trim(),
    nrc: datos.nrc.trim(),
    telefono: datos.telefono.trim(),
    correo: datos.correo.trim(),
    direccion: datos.direccion.trim(),
    estado: datos.estado,
  }
}

export function validarProveedor(
  datos: DatosProveedor,
  proveedores: Proveedor[],
  idActual?: string,
): ErroresProveedor {
  const errores: ErroresProveedor = {}
  if (!datos.nombre.trim()) errores.nombre = 'Ingresa el nombre del proveedor.'
  if (!datos.nit.trim()) errores.nit = 'Ingresa el NIT del proveedor.'
  else if (
    proveedores.some((p) => p.id !== idActual && normalizarNit(p.nit) === normalizarNit(datos.nit))
  ) {
    errores.nit = 'Ya existe un proveedor con este NIT.'
  }
  if (datos.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo.trim())) {
    errores.correo = 'Ingresa un correo válido, por ejemplo: nombre@empresa.com.'
  }
  return errores
}
