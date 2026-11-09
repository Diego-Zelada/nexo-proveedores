// Simulador local: utiliza el mismo procesador de la Azure Function, con Azurite.
// En Azure este sondeo NO se ejecuta: el disparador Blob se encarga de invocar la función.
import { AlmacenDocumentos } from '../shared/azure.js'
import { procesarDocumento } from '../shared/procesar.js'
import type { Registro } from '../shared/azure.js'

if (process.env.AZURE_STORAGE_CONNECTION_STRING !== 'UseDevelopmentStorage=true')
  throw new Error('El procesador local solo puede utilizar el emulador Azurite.')
const store = new AlmacenDocumentos()
await store.iniciar()
console.log('Procesador local listo. En Azure se utiliza la Azure Function.')
const ejecutar = async () => {
  try {
    for await (const r of store.tabla.listEntities<Registro>({
      queryOptions: {
        filter: "eliminado eq false and (estado eq 'pendiente' or estado eq 'error')",
      },
    })) {
      await procesarDocumento(store, r.blobName, Number(process.env.MAX_FILE_MB ?? 10) * 1048576)
    }
  } catch {
    console.error(
      JSON.stringify({
        evento: 'error_procesador_local',
        detalle: 'Comprueba que Azurite está iniciado.',
      }),
    )
  }
}
while (true) {
  await ejecutar()
  await new Promise((resolve) => setTimeout(resolve, 3000))
}
