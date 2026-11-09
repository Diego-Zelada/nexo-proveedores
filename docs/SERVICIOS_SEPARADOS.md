# App Service F1, almacenamiento y Function por separado

La publicación sigue pendiente hasta que Azure acepte y ejecute estos recursos. Abrir el formulario de creación no demuestra que la implementación termine. Este procedimiento usa el App Service **F1 gratuito existente**, Storage y una Function **Flex Consumption**, sin un plan Basic ni instancias Always Ready. Storage, eventos y ejecuciones tienen consumo medido: reviso los beneficios y el crédito disponible, mantengo el límite de gasto y no convierto la suscripción a Pago por uso.

## 1. Crear y comprobar la API F1

En la cuenta elegida abro **App Services > Crear > Aplicación web**. Uso Código, Node 22 LTS, Linux y Free F1. No agrego una base de datos. El ejemplo usa el grupo `rg-nexo-documentos`, nombre `nexo-api-dz261109` y región `westus3`, pero la disponibilidad depende de la suscripción y la región reales.

Si Azure rechaza también F1 en esta región, guardo ese error: crear los recursos por separado no elimina el límite. No continúo como si la API ya existiera ni cambio a un plan de pago.

## 2. Subir el paquete a Cloud Shell

El ZIP incluye el código fuente y paquetes compilados con sus dependencias. No necesito instalar las dependencias en Cloud Shell. Después de subir `Nexo_Proveedores_Servicios_Separados.zip`, ejecuto en Cloud Shell PowerShell:

```powershell
Expand-Archive -LiteralPath (Join-Path $HOME 'Nexo_Proveedores_Servicios_Separados.zip') -DestinationPath (Join-Path $HOME 'nexo-separado') -Force
Set-Location (Join-Path $HOME 'nexo-separado/nexo-proveedores-etapa2')
az account show --query '{Cuenta:user.name,Suscripcion:name,Id:id}' --output table
node scripts/configurar-local.mjs --azure
```

Compruebo que la suscripción sea la misma donde creé la API. Escribo mi usuario y contraseña de aplicación en privado. Si Cloud Shell se reinició en modo efímero, debo volver a subir los archivos y configurar el acceso; no son los recursos publicados los que se borran, sino los archivos de esa sesión.

## 3. Configurar almacenamiento y Function

Con la API F1 creada correctamente:

```powershell
pwsh -File ./infra/Configurar-Separados.ps1 -Aplicacion nexo-api-dz261109 -Grupo rg-nexo-documentos -Region westus3
```

Si elegí otro nombre o región, sustituyo los valores. La región de Storage y Functions debe estar permitida y ofrecer Flex Consumption; puede ser distinta de la API. El script comprueba que el plan de la API sea F1 en Linux, registra proveedores, habilita su identidad administrada, valida la plantilla y crea Storage y Functions. No cambia el plan de la API ni la suscripción. `-SoloValidar` permite preparar proveedores e identidad y validar sin crear las nuevas cuentas o la Function.

Se crean el contenedor privado `proveedores-documentos`, las tablas, las protecciones de versionado y recuperación y una cuenta separada del host. La Function usa Node 22, 512 MB y ninguna instancia Always Ready. **Flex tiene una cuota distinta de Y1**, pero su disponibilidad debe comprobarse en la suscripción: no está garantizada por el código.

## 4. Publicar código y conectar el evento

```powershell
pwsh -File ./infra/Publicar-Azure.ps1
```

Se publican los dos paquetes, se comprueba `/api/health` y se consulta el registro de `procesarDocumento`. Para Flex, el publicador ejecuta `Conectar-Evento.ps1` y conecta el evento BlobCreated al disparador Blob mediante Event Grid. La clave de extensión se obtiene en la sesión de Azure, se pasa como parámetro seguro y el archivo temporal se elimina. No se imprime esa clave ni se incorpora al frontend o al repositorio. No comparto claves o URLs de webhook completas en capturas.

La Function admite tanto el disparador por sondeo de la configuración anterior como el disparador Event Grid; la plantilla separada configura `BLOB_TRIGGER_SOURCE=EventGrid`. El procesador de validación, los estados, la autorización y la recuperación son los mismos.

### Si una versión anterior falla al iniciar con Storage 403

Una versión anterior comprobaba la privacidad con `getAccessPolicy()` (Get Container ACL). Esa operación necesita `containers/getAcl/action`, que no está incluido en Storage Blob Data Contributor. La versión corregida utiliza `getProperties()`: devuelve el nivel de acceso público y conserva el rechazo de contenedores públicos con los permisos de lectura ya asignados. La identidad de la API sigue usando Blob Data Contributor y Table Data Contributor; no necesita claves de almacenamiento.

Para recuperar una instalación anterior sin volver a cargar paquetes mientras SCM está bloqueado, se puede conceder a la identidad administrada de esa API **Storage Blob Data Owner únicamente en el contenedor `proveedores-documentos`**. Es un permiso de compatibilidad para ese código anterior, más amplio que la lectura de propiedades. Después de publicar la versión corregida y comprobar su arranque, se retira esa asignación adicional. No se cambia el acceso público ni el plan de App Service. El permiso de compatibilidad no elimina una cuota de uso agotada: si `QuotaExceeded` persiste, se consulta su estado por separado.

Referencias de permisos: [Get Container ACL](https://learn.microsoft.com/rest/api/storageservices/get-container-acl#permissions), [Get Container Properties](https://learn.microsoft.com/rest/api/storageservices/get-container-properties#permissions).

## 5. Completar la entrega

Abro la URL indicada, inicio sesión, subo un archivo ficticio y espero `disponible`. Compruebo Ver, Descargar, Nueva versión, Versiones, Eliminar y Recuperar. Tomo capturas reales del contenedor privado, la configuración de protección, App Service, la Function, el evento y los registros. Las pruebas con Azurite no sustituyen estas comprobaciones.

Configuro los tres secretos OIDC y las tres variables de GitHub que muestra el configurador. Incorporo los archivos a mi repositorio original conservando `.git`, reviso los cambios y publico en la misma rama `main`, como indica [AZURE_PASO_A_PASO.md](AZURE_PASO_A_PASO.md). El workflow existente admite Flex mediante OIDC y debe finalizar correctamente. `AZURE_API_URL` permite actualizar la Static Web App anterior conservando su dirección. No debo entregar la etapa 2 como publicada hasta verificar el enlace y GitHub Actions.

Referencias: [Flex Consumption](https://learn.microsoft.com/azure/azure-functions/flex-consumption-plan), [disparador Blob mediante Event Grid](https://learn.microsoft.com/azure/azure-functions/functions-event-grid-blob-trigger), [GitHub Action oficial](https://github.com/Azure/functions-action).
