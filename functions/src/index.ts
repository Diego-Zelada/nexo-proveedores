import { app } from '@azure/functions'
import { AlmacenDocumentos } from '../../shared/azure.js'
import { procesarDocumento } from '../../shared/procesar.js'

let store: AlmacenDocumentos
let inicio: Promise<void> | undefined
app.storageBlob('procesarDocumento', {
  path: 'proveedores-documentos/{owner}/{proveedor}/{documento}/archivo',
  connection: 'DocumentStorage',
  source: process.env.BLOB_TRIGGER_SOURCE === 'EventGrid' ? 'EventGrid' : 'LogsAndContainerScan',
  handler: async (_blob: Buffer, context) => {
    store ??= new AlmacenDocumentos()
    inicio ??= store.iniciar().catch((e) => {
      inicio = undefined
      throw e
    })
    await inicio
    const { owner, proveedor, documento } = context.triggerMetadata ?? {}
    if (![owner, proveedor, documento].every((v) => typeof v === 'string'))
      throw new Error('El disparador no proporcionó los identificadores del blob.')
    const nombre = `${owner}/${proveedor}/${documento}/archivo`
    await procesarDocumento(store, nombre, Number(process.env.MAX_FILE_MB ?? 10) * 1048576, (m) =>
      context.log(m),
    )
  },
})
