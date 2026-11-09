export interface Configuracion {
  usuarios: { usuario: string; hash: string }[]
  jwtSecret: string
  origenes: string[]
  limite: number
  sasSegundos: number
}
export function configuracion(env: NodeJS.ProcessEnv = process.env): Configuracion {
  const jwtSecret = env.AUTH_JWT_SECRET ?? ''
  if (jwtSecret.length < 48)
    throw new Error('Configura AUTH_JWT_SECRET con al menos 48 caracteres aleatorios.')
  let usuarios: Configuracion['usuarios']
  try {
    usuarios = JSON.parse(env.AUTH_USERS_JSON ?? '[]')
  } catch {
    throw new Error('AUTH_USERS_JSON no es un JSON válido.')
  }
  if (
    !Array.isArray(usuarios) ||
    !usuarios.length ||
    usuarios.some(
      (u) =>
        !/^[a-z0-9._-]{3,40}$/.test(u.usuario) ||
        !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(u.hash),
    ) ||
    new Set(usuarios.map((u) => u.usuario)).size !== usuarios.length
  )
    throw new Error(
      'Configura usuarios únicos y hashes scrypt mediante el script de configuración.',
    )
  const limite = Number(env.MAX_FILE_MB ?? 10) * 1048576
  if (!Number.isSafeInteger(limite) || limite < 1048576 || limite > 20 * 1048576)
    throw new Error('MAX_FILE_MB debe estar entre 1 y 20.')
  const sasSegundos = Number(env.SAS_SECONDS ?? 60)
  if (!Number.isInteger(sasSegundos) || sasSegundos < 15 || sasSegundos > 300)
    throw new Error('SAS_SECONDS debe estar entre 15 y 300.')
  const origenes = (env.ALLOWED_ORIGINS ?? 'http://localhost:4173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  for (const origen of origenes)
    if (new URL(origen).origin !== origen)
      throw new Error('ALLOWED_ORIGINS debe contener orígenes completos, sin rutas ni barra final.')
  return { usuarios, jwtSecret, origenes, limite, sasSegundos }
}
