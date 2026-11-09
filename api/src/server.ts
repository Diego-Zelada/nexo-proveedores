import { AlmacenDocumentos } from '../../shared/azure.js'
import { crearApp } from './app.js'
import { configuracion } from './config.js'

const config = configuracion()
const store = new AlmacenDocumentos()
await store.iniciar()
const port = Number(process.env.PORT ?? 3001)
const server = crearApp(store, config).listen(port, () =>
  console.info(JSON.stringify({ evento: 'api_iniciada', puerto: port })),
)
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => server.close(() => process.exit(0)))
