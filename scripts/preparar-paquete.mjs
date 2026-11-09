import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const tipo = process.argv[2]
if (!['api', 'functions'].includes(tipo)) throw new Error('Usa api o functions.')
const carpeta = resolve('.paquetes', tipo)
if (!existsSync(`${tipo}/dist`)) throw new Error('Primero ejecuta npm run build:todo.')
rmSync(carpeta, { recursive: true, force: true })
mkdirSync(carpeta, { recursive: true })
const root = JSON.parse(readFileSync('package.json', 'utf8'))
if (tipo === 'api') root.scripts.start = 'node api/dist/api/src/server.js'
else root.main = 'functions/dist/functions/src/index.js'
writeFileSync(resolve(carpeta, 'package.json'), JSON.stringify(root, null, 2))
cpSync('package-lock.json', resolve(carpeta, 'package-lock.json'))
for (const workspace of ['api', 'functions']) {
  mkdirSync(resolve(carpeta, workspace))
  cpSync(`${workspace}/package.json`, resolve(carpeta, workspace, 'package.json'))
}
cpSync(`${tipo}/dist`, resolve(carpeta, tipo, 'dist'), { recursive: true })
if (tipo === 'api') cpSync('dist', resolve(carpeta, 'web'), { recursive: true })
else cpSync('functions/host.json', resolve(carpeta, 'host.json'))
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
execFileSync(
  npm,
  [
    'ci',
    '--omit=dev',
    '--ignore-scripts',
    '--include-workspace-root=false',
    '--workspace',
    `@nexo/${tipo}`,
    '--no-audit',
    '--no-fund',
  ],
  { cwd: carpeta, stdio: 'inherit', shell: process.platform === 'win32' },
)
rmSync(resolve(carpeta, 'node_modules', '@nexo'), { recursive: true, force: true })
console.log(`Paquete de ${tipo} preparado en ${carpeta}. No incluye .env ni credenciales.`)
