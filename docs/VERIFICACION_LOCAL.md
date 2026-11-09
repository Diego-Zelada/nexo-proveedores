# Verificación local de la segunda etapa

Fecha de actualización: 9 de noviembre de 2026. Base del repositorio: `f918266`. Entorno de prueba: Linux, Node.js 24.22.1 y Azurite 3.37.0.

| Comprobación | Resultado observado |
| --- | --- |
| `npm test` | 24 pruebas aprobadas: lógica original, validación, autenticación, frontend desde la API y arranque sin permiso de lectura de ACL. |
| `npm run test:integracion` | 8 pruebas aprobadas con Blob/Table emulados y el procesador compartido. Incluye PDF, PNG, JPG, acceso entre usuarios, SAS, rechazo, reemplazo y eliminación. |
| Compilación | Frontend React, API y Azure Function compilados con TypeScript. |
| Bicep | `infra/main.bicep` compiló sin errores con Bicep CLI. No se ejecutó una implementación en Azure. |
| Alternativa B1 | Plantilla compilada para un plan Linux B1 compartido; Function Linux Node 22 y Always On. No se comprobó su cuota ni se desplegó en la suscripción. |
| Servicios separados | Plantillas de Storage/Flex y evento Blob compiladas. La ruta exige una API Linux F1 existente y configura el disparador Event Grid. Seis comprobaciones con Azure simulado verificaron el guard de F1, validación sin crear, parada ante rechazo, reutilización de API, conexión del webhook y limpieza/redacción de su clave. La disponibilidad y el recorrido con el host real de Azure siguen pendientes. |
| Scripts PowerShell | Ambos analizados con PowerShell 7.5.4. Siete comprobaciones con Azure simulado verificaron elección explícita de B1, validación sin despliegue, parada al rechazar la validación, conservación del valor F1 por defecto, parámetros de creación, publicación de ambos paquetes y rechazo de un ZIP alterado. No sustituyen la prueba con Azure real. |
| Paquetes | API con frontend y Function generados con dependencias de producción, sin `.env` ni `.azure/`. |
| Paquete API por HTTP | Respuesta correcta de salud, frontend y ruta interna; sesión, carga de PDF, estado disponible mediante procesador local, descarga con bytes idénticos y eliminación. |
| Configuradores | Generación local y de parámetros Azure comprobada; contraseña oculta y hash scrypt verificado. |
| Revisión visual | Directorio original y ventana de acceso a Documentos comprobados en navegador de escritorio. No se realizó el recorrido autenticado completo desde el navegador. |
| Prueba Windows del autor | El autor confirmó la instalación, el inicio de sesión, la carga del PDF, su estado disponible y las acciones Ver y Descargar en localhost. |
| Arranque con identidad administrada | Se corrigió `getAccessPolicy()` por `getProperties()`. Cuatro pruebas verifican inicio sin permiso ACL, rechazo de los dos niveles de acceso público y rechazo si no se pueden leer las propiedades. No se ha confirmado todavía el arranque de esta corrección en Azure. |
| Dependencias de producción | `npm audit --omit=dev` informó 0 vulnerabilidades en esta revisión. |
| Archivos | `git diff --check` sin errores de espacios. Configuraciones JSON/YAML analizadas correctamente. |

## Comprobaciones que siguen pendientes

- Recuperación del App Service tras el estado `QuotaExceeded` y confirmación de los permisos efectivos. El autor completó la configuración de los recursos, pero el arranque de la API anterior registró un 403 de Storage.
- Publicación real mediante GitHub Actions y funcionamiento en una URL pública.
- Ejecución del disparador de Azure Functions en la nube.
- SAS de delegación con identidad administrada, versionado y recuperación en Azure real.
- Capturas reales de los servicios y demostración en vivo.

El procesador local ejecuta la misma lógica de validación, pero no sustituye al host de Azure Functions. La cuenta de Azure del autor no se utilizó durante estas pruebas. No se subieron cambios al repositorio remoto ni se modificaron sus recursos publicados.
