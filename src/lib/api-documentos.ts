// La URL de la API es pública. Ninguna clave de Azure se envía al frontend.
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
let token = '' // Solo memoria: al recargar se vuelve a iniciar sesión.
export class ErrorAPI extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}
export async function solicitar<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  if (base && !base.startsWith('https://') && !import.meta.env.DEV)
    throw new Error('La API debe utilizar una dirección HTTPS.')
  const headers = new Headers(opciones.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (opciones.body && !(opciones.body instanceof FormData))
    headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${base}/api${ruta}`, {
      ...opciones,
      headers,
      cache: 'no-store',
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error(
      'No se pudo conectar con el servicio de documentos. Comprueba que la API esté disponible.',
    )
  }
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: 'El servicio no pudo completar la operación.' }))
    if (response.status === 401) {
      token = ''
      window.dispatchEvent(new Event('nexo:sesion-caducada'))
    }
    throw new ErrorAPI(
      response.status,
      `${data.error ?? 'No se pudo completar la operación.'}${data.requestId ? ` Referencia: ${data.requestId}` : ''}`,
    )
  }
  if (response.status === 204) return undefined as T
  if (!response.headers.get('content-type')?.includes('application/json'))
    throw new Error('La dirección configurada no está respondiendo como API de documentos.')
  return response.json() as Promise<T>
}
export async function iniciarSesion(usuario: string, password: string) {
  const sesion = await solicitar<{ token: string; usuario: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ usuario, password }),
  })
  token = sesion.token
  return sesion.usuario
}
export function cerrarSesion() {
  token = ''
}
