# API de documentos

Base local: `http://localhost:3001/api`. En App Service: la dirección HTTPS del recurso, seguida de `/api`.

## Autenticación

`POST /auth/login`, contenido `application/json`:

```json
{ "usuario": "mi-usuario", "password": "mi-contraseña" }
```

Respuesta `200`: `{ "token": "…", "usuario": "mi-usuario", "expiraEn": 3600 }`. El token se envía como `Authorization: Bearer …` en todas las demás rutas, excepto `GET /health`.

`GET /auth/me` devuelve `{ "usuario": "…", "limiteBytes": 10485760 }`. Un token ausente, inválido o vencido devuelve `401`. No publico tokens reales en ejemplos o capturas.

## Carga

`POST /proveedores/:proveedorId/documentos` acepta `multipart/form-data`:

| Campo             | Contenido                                                   |
| ----------------- | ----------------------------------------------------------- |
| `archivo`         | Un PDF, JPG/JPEG o PNG. Máximo 10 MB por defecto.           |
| `tipo`            | `contrato`, `identificacion`, `constancia_fiscal` u `otro`. |
| `proveedorNombre` | Nombre del proveedor, entre 1 y 150 caracteres.             |

`proveedorId` admite hasta 80 letras, números, guiones y guiones bajos. La asociación se toma del directorio local; la API no ofrece un CRUD central de proveedores.

Respuesta `202`: `{ "documento": { …, "estado": "pendiente" } }`. El procesamiento ocurre después de la carga, no dentro de la solicitud HTTP.

## Consultas

- `GET /documentos`: documentos propios no eliminados.
- `GET /documentos?proveedorId=prov-001&tipo=contrato`: filtro combinado.
- `GET /documentos?eliminados=true`: papelera del usuario.
- `GET /documentos/:id`: datos del documento.
- `GET /documentos/:id/estado`: `id`, `estado`, `detalle` y `actualizado`.
- `GET /documentos/:id/versiones`: `{ "versiones": [{ "versionId": "…", "actual": true, "eliminado": false, "fecha": "…", "tamano": 1000 }] }`. Requiere versionado real de Azure.

El listado devuelve `{ "documentos": […] }`, ordenado por fecha de carga descendente. La búsqueda por texto de nombre/proveedor se realiza en la interfaz sobre ese listado.

## Visualizar o descargar

`GET /documentos/:id/enlace` solicita visualización. Con `?descargar=true` solicita descarga.

Respuesta `200`: `{ "url": "enlace SAS temporal", "expira": "fecha ISO" }`. No devuelve una URL permanente ni hace público el archivo. El SAS permite leer la versión validada, durante 60 segundos por defecto. Quien lo posea puede usarlo mientras no venza; no se registra su firma en los logs de aplicación.

Un documento que no está `disponible` devuelve `409`.

## Versiones, eliminación y recuperación

- `PUT /documentos/:id/contenido`: multipart con un campo `archivo`. Responde `202` y vuelve a `pendiente`. En Azure, escribir el mismo blob crea una versión nueva.
- `DELETE /documentos/:id`: responde `204`, elimina el blob actual y conserva su registro en papelera.
- `POST /documentos/:id/restaurar`: sin cuerpo, responde `202`. Recupera una versión disponible y vuelve a validar. Si no quedan versiones recuperables responde `409`.

No se puede reemplazar ni eliminar mientras el archivo está pendiente o procesándose. No hay un endpoint público para vaciar la papelera o purgar versiones.

## Estados

| Estado       | Significado                                       |
| ------------ | ------------------------------------------------- |
| `pendiente`  | Carga registrada, esperando validación.           |
| `procesando` | La función está validando el contenido.           |
| `disponible` | Validación completada; permite generar enlaces.   |
| `rechazado`  | El archivo no cumple los requisitos.              |
| `error`      | Fallo técnico; se revisan registros y reintentos. |
| `eliminando` | Eliminación en curso.                             |
| `eliminado`  | Registro en papelera.                             |

## Errores

Respuesta normal de error: `{ "error": "mensaje", "requestId": "referencia" }`. Los límites de solicitudes pueden devolver un mensaje sin referencia.

| Código | Situación                                             |
| ------ | ----------------------------------------------------- |
| `400`  | Datos o campos incorrectos.                           |
| `401`  | Sesión ausente, inválida o vencida.                   |
| `403`  | Origen no permitido.                                  |
| `404`  | Documento inexistente o perteneciente a otro usuario. |
| `409`  | Estado incompatible u operación simultánea.           |
| `413`  | Tamaño excesivo.                                      |
| `422`  | Extensión, MIME o contenido no válidos.               |
| `429`  | Demasiados intentos o solicitudes.                    |
| `500`  | Error técnico; revisar logs usando la referencia.     |

Los errores transitorios de infraestructura se ocultan al cliente y se registran con una referencia. Los endpoints no devuelven conexiones de Azure, contraseñas ni claves de firma.
