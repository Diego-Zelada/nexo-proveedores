import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContainerClient } from '@azure/storage-blob'
import { AlmacenDocumentos } from '../../shared/azure.js'

afterEach(() => vi.restoreAllMocks())

function almacen() {
  const store = new AlmacenDocumentos({
    AZURE_STORAGE_CONNECTION_STRING: 'UseDevelopmentStorage=true',
  })
  const contenedor = {
    createIfNotExists: vi.fn().mockResolvedValue({}),
    getProperties: vi.fn().mockResolvedValue({}),
    getAccessPolicy: vi.fn().mockRejectedValue(
      Object.assign(new Error('AuthorizationPermissionMismatch'), { statusCode: 403 }),
    ),
  }
  vi.spyOn(store.blobs, 'getContainerClient').mockReturnValue(
    contenedor as unknown as ContainerClient,
  )
  vi.spyOn(store.tabla, 'createTable').mockResolvedValue(undefined)
  vi.spyOn(store.eventos, 'createTable').mockResolvedValue(undefined)
  return { store, contenedor }
}

describe('Inicio con los permisos de datos asignados a la API', () => {
  it('inicia con un contenedor privado aunque la identidad no pueda leer ACL', async () => {
    const { store, contenedor } = almacen()
    await expect(store.iniciar()).resolves.toBeUndefined()
    expect(contenedor.getAccessPolicy).not.toHaveBeenCalled()
  })

  it.each(['blob', 'container'])('rechaza el acceso público de tipo %s', async (acceso) => {
    const { store, contenedor } = almacen()
    contenedor.getProperties.mockResolvedValue({ blobPublicAccess: acceso })
    await expect(store.iniciar()).rejects.toThrow('El contenedor debe ser privado')
    expect(store.tabla.createTable).not.toHaveBeenCalled()
  })

  it('mantiene el fallo si no puede comprobar las propiedades del contenedor', async () => {
    const { store, contenedor } = almacen()
    const error = Object.assign(new Error('AuthorizationPermissionMismatch'), { statusCode: 403 })
    contenedor.getProperties.mockRejectedValue(error)
    await expect(store.iniciar()).rejects.toBe(error)
    expect(store.tabla.createTable).not.toHaveBeenCalled()
  })
})
