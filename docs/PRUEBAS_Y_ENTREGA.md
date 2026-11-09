# Pruebas, evidencias y demostración

Esta lista se completa con el sistema desplegado en la cuenta de Azure. Las pruebas locales no reemplazan las capturas ni la demostración de servicios reales.

## Relación con la evaluación

| Criterio                   |  Puntos | Implementación                                                        | Evidencia que debo obtener                                                                            |
| -------------------------- | ------: | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Azure Blob Storage         |      25 | Contenedor privado, rutas por proveedor, carga y SAS temporal.        | Captura del contenedor, permisos privados, archivos y descarga autorizada.                            |
| Azure Functions            |      20 | Disparador Blob, doble validación, actualización de estado y eventos. | Función registrada, ejecución real, log y cambio de pendiente a disponible.                           |
| Seguridad                  |      20 | JWT, propietario, identidad administrada, permisos y validación.      | Solicitudes sin token rechazadas, otro usuario sin acceso, archivo falso rechazado y roles asignados. |
| API REST e integración     |      15 | Node/TypeScript en App Service y panel React.                         | URL pública, carga/listado/estado/descarga/eliminación desde el navegador.                            |
| Versionado y recuperación  |      10 | Versionado, soft delete y recuperación desde papelera.                | Dos versiones, eliminación, recuperación y contenido correcto en Azure real.                          |
| Despliegue y documentación |      10 | GitHub Actions, Bicep, README y diagrama.                             | Workflow exitoso, repositorio, enlace final y documentación actualizada.                              |
| **Total**                  | **100** |                                                                       |                                                                                                       |

## Pruebas automáticas

Con el emulador de desarrollo detenido:

```powershell
npm.cmd test
npm.cmd run test:integracion
npm.cmd run build:todo
```

Guardo una captura del resultado. La integración inicia su propio Azurite temporal, sin credenciales de Azure y con telemetría desactivada.

## Ocho recorridos para la demostración

| N.º | Acción                                                                                                         | Resultado esperado                                                                                                               |
| --: | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Iniciar sesión y cargar `contrato-ejemplo.pdf` para Alimentos del Valle.                                       | Respuesta de carga aceptada y estado pendiente.                                                                                  |
|   2 | Mostrar la ejecución de `procesarDocumento` y volver al navegador.                                             | Estado disponible y evento de validación registrado.                                                                             |
|   3 | Cargar el PNG y JPG ficticios para otros proveedores y tipos; filtrar y buscar.                                | Cada archivo aparece asociado al proveedor correcto, con nombre, tamaño, fecha y tipo.                                           |
|   4 | Visualizar y descargar el PDF; después volver a usar ese mismo enlace cuando venza.                            | Lectura autorizada primero, enlace vencido después. Un enlace nuevo vuelve a funcionar.                                          |
|   5 | Cerrar sesión e intentar la API sin token; probar el ID con un segundo usuario autorizado en su propia sesión. | API sin token devuelve 401; documento ajeno devuelve 404.                                                                        |
|   6 | Intentar subir `archivo-no-permitido.txt` y `pdf-falso.pdf`; probar un archivo mayor a 10 MB.                  | Se rechazan formato/contenido/tamaño. La prueba de integración también verifica rechazo por la función al evitar el filtro HTTP. |
|   7 | Subir `contrato-ejemplo-v2.pdf` mediante Nueva versión y consultar Versiones.                                  | Vuelve a pendiente, luego disponible; Azure muestra al menos dos versiones.                                                      |
|   8 | Eliminar el documento, abrir Papelera, recuperarlo y descargarlo.                                              | Deja de estar en la lista activa; después de recuperar y validar, devuelve el contenido de la última versión.                    |

Los archivos de ejemplo contienen únicamente texto ficticio. Para la demostración no necesito subir una identificación real ni una constancia con datos personales.

Para comprobar un segundo usuario preparo otro hash con el configurador en una carpeta de prueba y agrego su objeto `{usuario,hash}` a `AUTH_USERS_JSON` en App Service, conservando el primero. No cambio la clave JWT ni comparto las contraseñas en el repositorio. Los dos usuarios deben iniciar sesión por separado. Esta configuración no crea un registro público de usuarios.

## Capturas que debo guardar

Creo `docs/evidencias/` para las capturas reales y uso nombres descriptivos:

1. `01-recursos-azure.png`: recursos de la segunda etapa.
2. `02-contenedor-privado.png`: contenedor `proveedores-documentos`, acceso privado y configuración de acceso público deshabilitado.
3. `03-proteccion-datos.png`: versionado habilitado y soft delete de siete días.
4. `04-identidades-roles.png`: identidades de App Service y Function, con roles de datos.
5. `05-app-service.png`: App Service ejecutándose, con dirección pública.
6. `06-function-ejecucion.png`: función `procesarDocumento` y registro real de una ejecución.
7. `07-documentos.png`: archivos de distintos tipos y proveedores, con estado disponible.
8. `08-versiones-recuperacion.png`: historial y documento recuperado.
9. `09-seguridad.png`: solicitud sin token y archivo rechazado, sin mostrar credenciales.
10. `10-github-actions.png`: publicación completa y exitosa de la segunda etapa.

No capturo `.env`, claves de cuenta, valores privados de App Settings, contraseñas, tokens JWT ni firmas SAS. Los ejemplos del README no son evidencia de que Azure ya esté configurado.

## Entrega final

- [ ] Agregar al README la dirección real de App Service y la fecha de verificación.
- [ ] Comprobar el enlace desde un navegador fuera del entorno local.
- [ ] Subir los cambios al repositorio existente y comprobar que no contiene secretos.
- [ ] Confirmar el workflow exitoso de App Service y Functions.
- [ ] Adjuntar capturas reales de Azure.
- [ ] Entregar `docs/arquitectura.svg` y el README de instalación/despliegue.
- [ ] Ensayar los ocho recorridos y reservar tiempo para la detección del disparador.
- [ ] Probar recuperación en Azure antes del día de la presentación.
- [ ] Compartir el acceso de demostración por un canal privado, separado del repositorio público.

El plazo indicado es de 14 días calendario desde la asignación. Confirmo la fecha de inicio para calcular mi fecha exacta; no doy por hecho que empiece el día en que abro este documento.
