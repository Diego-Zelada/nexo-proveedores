import { spawn } from 'node:child_process'
import { createConnection } from 'node:net'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Un emulador aislado para estas pruebas: nunca usa una cuenta de Azure.
const carpeta = await mkdtemp(join(tmpdir(), 'nexo-azurite-'))
const emulador = spawn(
  process.execPath,
  [
    resolve('node_modules/azurite/dist/src/azurite.js'),
    '--silent',
    '--location',
    carpeta,
    '--skipApiVersionCheck',
    '--disableTelemetry',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)
let fallo = ''
emulador.stderr.on('data', (data) => {
  fallo += data.toString()
})
emulador.on('error', (error) => {
  fallo += error.message
})

const puertoListo = (puerto) =>
  new Promise((resolvePromise) => {
    const socket = createConnection({ host: '127.0.0.1', port: puerto })
    socket.setTimeout(200)
    socket.on('connect', () => {
      socket.destroy()
      resolvePromise(true)
    })
    socket.on('error', () => resolvePromise(false))
    socket.on('timeout', () => {
      socket.destroy()
      resolvePromise(false)
    })
  })

try {
  let listo = false
  for (let intento = 0; intento < 40; intento++) {
    if (emulador.exitCode !== null) throw new Error(`Azurite no inició: ${fallo}`)
    if ((await puertoListo(10000)) && (await puertoListo(10002))) {
      listo = true
      break
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250))
  }
  if (!listo)
    throw new Error(`No se pudo iniciar Azurite. Revisa los puertos 10000–10002. ${fallo}`)
  console.log('Azurite temporal listo, con telemetría desactivada.')
  const pruebas = spawn(
    process.execPath,
    [resolve('node_modules/vitest/vitest.mjs'), 'run', '--config', 'vitest.integration.config.ts'],
    { stdio: 'inherit' },
  )
  process.exitCode = await new Promise((resolvePromise) =>
    pruebas.on('exit', (code) => resolvePromise(code ?? 1)),
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
} finally {
  if (emulador.exitCode === null) {
    const terminado = new Promise((resolvePromise) => emulador.once('exit', resolvePromise))
    emulador.kill('SIGTERM')
    await terminado
  }
  await rm(carpeta, { recursive: true, force: true })
}
