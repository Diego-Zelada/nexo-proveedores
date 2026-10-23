import { useEffect, useState } from 'react'
import { proveedoresIniciales } from '../data/proveedores'
import { CLAVE_PROVEEDORES, guardarProveedores, leerProveedores } from '../lib/almacenamiento'
import type { DatosProveedor, Proveedor } from '../types/proveedor'

type Estado = { proveedores: Proveedor[]; error: string | null; lecturaBloqueada: boolean }

function crearId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Permite probar también desde una dirección HTTP en la red local.
  const numeros = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(numeros, (numero) => numero.toString(16).padStart(8, '0')).join('')
}

function cargar(): Estado {
  try {
    return {
      proveedores: leerProveedores(window.localStorage) ?? proveedoresIniciales,
      error: null,
      lecturaBloqueada: false,
    }
  } catch {
    // No se sobrescribe información que no pudo leerse.
    return {
      proveedores: [],
      error:
        'No pudimos leer los datos guardados. Permite el almacenamiento del navegador y vuelve a intentar. Si el problema continúa, conserva una copia de los datos antes de limpiar el almacenamiento.',
      lecturaBloqueada: true,
    }
  }
}

export function useProveedores() {
  const [estado, setEstado] = useState<Estado>(cargar)

  useEffect(() => {
    try {
      if (leerProveedores(window.localStorage) === null)
        guardarProveedores(window.localStorage, proveedoresIniciales)
    } catch {
      setEstado((actual) => ({
        ...actual,
        error:
          'El almacenamiento del navegador no está disponible. Los cambios solo se confirmarán cuando puedan guardarse.',
      }))
    }
    // Refresca el directorio cuando otra pestaña de esta misma dirección guarda cambios.
    const sincronizar = (evento: StorageEvent) => {
      if (
        (evento.key === CLAVE_PROVEEDORES || evento.key === null) &&
        evento.storageArea === window.localStorage
      )
        setEstado(cargar())
    }
    window.addEventListener('storage', sincronizar)
    return () => window.removeEventListener('storage', sincronizar)
  }, [])

  function actualizar(transformar: (actuales: Proveedor[]) => Proveedor[]) {
    if (estado.lecturaBloqueada)
      throw new Error('Primero resuelve el problema de lectura de los datos guardados.')
    try {
      const actuales = leerProveedores(window.localStorage) ?? estado.proveedores
      const siguientes = transformar(actuales)
      // Se escribe primero: un error de guardado nunca se anuncia como éxito.
      guardarProveedores(window.localStorage, siguientes)
      setEstado({ proveedores: siguientes, error: null, lecturaBloqueada: false })
    } catch (error) {
      const mensaje =
        error instanceof Error && error.message.startsWith('El proveedor')
          ? error.message
          : 'No se pudo guardar. Revisa el espacio y los permisos de almacenamiento del navegador e inténtalo de nuevo.'
      setEstado((actual) => ({ ...actual, error: mensaje }))
      throw new Error(mensaje)
    }
  }

  function guardar(datos: DatosProveedor, id?: string) {
    actualizar((actuales) => {
      if (id && !actuales.some((p) => p.id === id))
        throw new Error('El proveedor ya no está disponible. Actualiza la página.')
      // El formulario valida el NIT; la comprobación se repite con la versión más reciente.
      const nit = datos.nit.replace(/[\s-]/g, '').toLowerCase()
      if (actuales.some((p) => p.id !== id && p.nit.replace(/[\s-]/g, '').toLowerCase() === nit)) {
        throw new Error('El proveedor no se pudo guardar: otro registro ya utiliza ese NIT.')
      }
      return id
        ? actuales.map((p) => (p.id === id ? { ...datos, id } : p))
        : [...actuales, { ...datos, id: crearId() }]
    })
  }

  function cambiarEstado(proveedor: Proveedor) {
    actualizar((actuales) => {
      if (!actuales.some((p) => p.id === proveedor.id))
        throw new Error('El proveedor ya no está disponible. Actualiza la página.')
      return actuales.map((p) =>
        p.id === proveedor.id
          ? { ...p, estado: proveedor.estado === 'activo' ? 'inactivo' : 'activo' }
          : p,
      )
    })
  }

  return { ...estado, guardar, cambiarEstado, reintentar: () => setEstado(cargar()) }
}
