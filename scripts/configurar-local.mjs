import { createInterface } from 'node:readline/promises'
import { randomBytes, scryptSync } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { Writable } from 'node:stream'

const azure = process.argv.includes('--azure')
const destino = azure ? '.azure/secretos.parameters.json' : '.env'
if (existsSync(destino)) {
  console.error(`Ya existe ${destino}. Consérvalo; no se sobrescribió.`)
  process.exit(1)
}
let ocultar = false
const salida = new Writable({
  write(chunk, _encoding, callback) {
    if (!ocultar) process.stdout.write(chunk)
    callback()
  },
})
const rl = createInterface({ input: process.stdin, output: salida, terminal: true })
const usuario = (
  await rl.question('Usuario (3 a 40 letras minúsculas, números, puntos o guiones): ')
)
  .trim()
  .toLowerCase()
if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) {
  rl.close()
  throw new Error('Usuario no válido.')
}
process.stdout.write('Contraseña (mínimo 12 caracteres, no se mostrará): ')
ocultar = true
const password = await rl.question('')
ocultar = false
process.stdout.write('\n')
rl.close()
if (password.length < 12 || password.length > 200)
  throw new Error('La contraseña debe tener entre 12 y 200 caracteres.')
const salt = randomBytes(16).toString('hex')
const hash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`
const usuarios = JSON.stringify([{ usuario, hash }])
const jwt = randomBytes(48).toString('hex')
if (azure) {
  mkdirSync('.azure', { recursive: true })
  writeFileSync(
    destino,
    JSON.stringify(
      {
        $schema:
          'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#',
        contentVersion: '1.0.0.0',
        parameters: { usersJson: { value: usuarios }, jwtSecret: { value: jwt } },
      },
      null,
      2,
    ),
    { mode: 0o600 },
  )
} else {
  writeFileSync(
    destino,
    `AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true\nAUTH_USERS_JSON='${usuarios}'\nAUTH_JWT_SECRET=${jwt}\nMAX_FILE_MB=10\nSAS_SECONDS=60\nALLOWED_ORIGINS=http://localhost:4173,http://127.0.0.1:4173\nPORT=3001\n`,
    { mode: 0o600 },
  )
}
console.log(
  `Configuración guardada en ${destino}. La contraseña no se guardó en texto; se guardó su hash. Este archivo está excluido de Git y no se comparte.`,
)
