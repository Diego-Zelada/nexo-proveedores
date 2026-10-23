import { describe, expect, it } from 'vitest'
import { proveedoresIniciales } from '../data/proveedores'
import { filtrarProveedores, limpiarDatos, validarProveedor } from './proveedores'
import { CLAVE_PROVEEDORES, guardarProveedores, leerProveedores } from './almacenamiento'

describe('Búsqueda y filtros del directorio', () => {
  it('encuentra nombres sin exigir tildes o mayúsculas', () => {
    expect(
      filtrarProveedores(proveedoresIniciales, ' TECNOLOGIA ', 'todos').map((p) => p.id),
    ).toEqual(['demo-02'])
  })
  it('acepta NIT con o sin guiones', () => {
    expect(
      filtrarProveedores(proveedoresIniciales, '06140101241010', 'todos').map((p) => p.id),
    ).toEqual(['demo-01'])
  })
  it('busca por correo y combina la búsqueda con el estado', () => {
    expect(
      filtrarProveedores(proveedoresIniciales, 'EMPAQUESVERDE.EXAMPLE', 'activo'),
    ).toHaveLength(0)
    expect(
      filtrarProveedores(proveedoresIniciales, 'EMPAQUESVERDE.EXAMPLE', 'inactivo'),
    ).toHaveLength(1)
  })
  it('devuelve los registros activos o inactivos sin modificar la lista original', () => {
    expect(filtrarProveedores(proveedoresIniciales, '', 'activo')).toHaveLength(6)
    expect(filtrarProveedores(proveedoresIniciales, '', 'inactivo')).toHaveLength(2)
    expect(proveedoresIniciales).toHaveLength(8)
  })
})

describe('Formulario de proveedores', () => {
  it('rechaza los campos obligatorios vacíos o compuestos por espacios', () => {
    expect(
      validarProveedor({ ...proveedoresIniciales[0], nombre: '   ', nit: '' }, []),
    ).toHaveProperty('nombre')
    expect(
      validarProveedor({ ...proveedoresIniciales[0], nombre: '   ', nit: '' }, []),
    ).toHaveProperty('nit')
  })
  it('permite correo vacío y rechaza un correo incompleto', () => {
    expect(validarProveedor({ ...proveedoresIniciales[0], correo: '' }, [])).not.toHaveProperty(
      'correo',
    )
    expect(validarProveedor({ ...proveedoresIniciales[0], correo: 'correo@' }, [])).toHaveProperty(
      'correo',
    )
  })
  it('impide duplicar un NIT, aunque se omitan sus guiones', () => {
    expect(
      validarProveedor({ ...proveedoresIniciales[0], nit: '06140101241010' }, proveedoresIniciales),
    ).toHaveProperty('nit')
  })
  it('permite editar un proveedor conservando su propio NIT', () => {
    expect(validarProveedor(proveedoresIniciales[0], proveedoresIniciales, 'demo-01')).toEqual({})
  })
  it('quita los espacios que rodean a los datos antes de guardarlos', () => {
    const datos = limpiarDatos({
      ...proveedoresIniciales[0],
      nombre: '  Nuevo proveedor  ',
      correo: '  hola@empresa.example  ',
    })
    expect(datos.nombre).toBe('Nuevo proveedor')
    expect(datos.correo).toBe('hola@empresa.example')
  })
})

function crearAlmacenamiento() {
  const valores = new Map<string, string>()
  return {
    getItem: (clave: string) => valores.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      valores.set(clave, valor)
    },
  }
}

describe('Persistencia y conservación de la información', () => {
  it('distingue la primera visita de un directorio guardado vacío', () => {
    const almacenamiento = crearAlmacenamiento()
    expect(leerProveedores(almacenamiento)).toBeNull()
    guardarProveedores(almacenamiento, [])
    expect(leerProveedores(almacenamiento)).toEqual([])
  })
  it('conserva todos los campos y el estado al guardar y volver a leer', () => {
    const almacenamiento = crearAlmacenamiento()
    const modificados = proveedoresIniciales.map((p, i) =>
      i === 0 ? { ...p, nombre: 'Nombre editado', estado: 'inactivo' as const } : p,
    )
    guardarProveedores(almacenamiento, modificados)
    expect(leerProveedores(almacenamiento)).toEqual(modificados)
    expect(leerProveedores(almacenamiento)).toHaveLength(8)
  })
  it('rechaza datos corruptos sin sobrescribirlos', () => {
    const almacenamiento = crearAlmacenamiento()
    almacenamiento.setItem(CLAVE_PROVEEDORES, '{datos incompletos')
    expect(() => leerProveedores(almacenamiento)).toThrow()
    expect(almacenamiento.getItem(CLAVE_PROVEEDORES)).toBe('{datos incompletos')
  })
  it('rechaza registros con campos faltantes o identificadores repetidos', () => {
    const almacenamiento = crearAlmacenamiento()
    almacenamiento.setItem(
      CLAVE_PROVEEDORES,
      JSON.stringify({ version: 1, proveedores: [{ id: '1' }] }),
    )
    expect(() => leerProveedores(almacenamiento)).toThrow()
    guardarProveedores(almacenamiento, [proveedoresIniciales[0], proveedoresIniciales[0]])
    expect(() => leerProveedores(almacenamiento)).toThrow()
  })
  it('propaga un fallo de escritura para no anunciar un guardado inexistente', () => {
    const almacenamiento = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Sin espacio')
      },
    }
    expect(() => guardarProveedores(almacenamiento, proveedoresIniciales)).toThrow('Sin espacio')
  })
})
