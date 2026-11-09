# Publicación en Azure · Segunda etapa

Primero completo la prueba local de [EMPEZAR_AQUI.md](../EMPEZAR_AQUI.md). Estos pasos crean recursos reales: el código preparado todavía no significa que los recursos estén creados o funcionando en mi suscripción.

## 1. Revisar cuenta, región y costos

1. Entro al portal de Azure con la suscripción que voy a utilizar.
2. Reviso que tenga permisos para crear recursos y asignar roles. Normalmente necesito **Owner**, o **Contributor** más **Role Based Access Control Administrator** en el ámbito correspondiente.
3. Reviso las regiones permitidas por mi suscripción y la disponibilidad de App Service y Windows Consumption Functions. Una región permitida por una política puede seguir sin tener cuota o disponibilidad para un plan.
4. Reviso precios y cuotas. El archivo de infraestructura usa **F1 Free** para App Service y **Consumption** para Functions. Blob, Table, Queue, operaciones y versiones almacenadas pueden generar consumo. Configuro un presupuesto con alertas en Cost Management; una alerta no corta automáticamente el gasto.

En la primera etapa apareció una restricción de regiones. Si vuelve a ocurrir, conservo el error completo y elijo una región que mi suscripción permita. El ejemplo usa `centralus`; no es una garantía de disponibilidad.

Si F1 o Y1 no están disponibles, **esos códigos no son requisitos de la aplicación**. Existe una [opción con un solo B1 compartido](ALTERNATIVA_B1.md), de pago, que mantiene App Service y Azure Functions. Primero compruebo cuota, región y precio; no se activa automáticamente.

Para reutilizar una API F1 creada por separado y sustituir Y1 por Functions Flex, uso [SERVICIOS_SEPARADOS.md](SERVICIOS_SEPARADOS.md). Esa opción usa eventos de Blob mediante Event Grid y requiere su propia comprobación de disponibilidad; no elimina las cuotas de la API F1.

## 2. Instalar Azure CLI e iniciar sesión

Instalo Azure CLI desde [la documentación oficial para Windows](https://learn.microsoft.com/cli/azure/install-azure-cli-windows), cierro y vuelvo a abrir la terminal de VS Code y compruebo:

```powershell
az version
az login
az account list --output table
```

Si hay varias suscripciones, selecciono la correcta sustituyendo el texto por su identificador:

```powershell
az account set --subscription "ID-DE-MI-SUSCRIPCION"
az account show --output table
```

El inicio de sesión ocurre en la ventana que abre Azure. No pego contraseñas, códigos ni tokens en el chat o el repositorio.

Si mi cuenta no ha registrado los proveedores necesarios, los registro una vez y espero a que Azure termine:

```powershell
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.Web
az provider register --namespace Microsoft.ManagedIdentity
```

## 3. Preparar el acceso de la aplicación

Desde la carpeta del proyecto:

```powershell
node scripts/configurar-local.mjs --azure
```

Elijo un usuario y una contraseña de al menos 12 caracteres para la aplicación publicada. Pueden ser distintos de los locales. El script genera `.azure/secretos.parameters.json` con el hash de la contraseña y una clave aleatoria de firma.

No comparto ese archivo. No se debe subir a GitHub. Si ya existe, el script no lo reemplaza.

La aplicación no usa la contraseña de mi cuenta Microsoft para iniciar sesión. Este configurador crea el acceso privado de Nexo.

## 4. Crear la infraestructura

Desde PowerShell en VS Code, uso una región revisada en el paso 1. Por ejemplo:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\infra\Crear-Azure.ps1 -Region centralus
```

`-ExecutionPolicy Bypass` se aplica únicamente a este proceso para ejecutar el script incluido que puedo revisar antes; no cambia la política global de Windows. No hace falta abrir VS Code como administrador.

El script crea el grupo `rg-nexo-documentos` y ejecuta `infra/main.bicep`. Puede tardar varios minutos. No cierro la terminal mientras trabaja.

Si uso PowerShell 7, también puedo ejecutar el archivo con `pwsh -File .\infra\Crear-Azure.ps1 -Region centralus`.

Si falla por política, cuota o disponibilidad, reviso el error. No selecciono B1 de pago sin decidirlo explícitamente. Una implementación fallida puede haber creado parte de los recursos: reviso el grupo antes de repetirla. Conservo el mismo grupo y prefijo para actualizar los mismos recursos.

### Recursos resultantes

| Recurso                     | Configuración                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Cuenta de documentos        | StorageV2, Standard LRS, HTTPS, acceso público deshabilitado y autenticación con identidad para la aplicación. |
| Contenedor                  | `proveedores-documentos`, privado.                                                                             |
| Protección de blobs         | Versionado habilitado; eliminación temporal de blobs y contenedores durante siete días.                        |
| Tablas                      | `DocumentosProveedores` y `EventosDocumentos`.                                                                 |
| App Service                 | Linux, Node 22, plan F1 por defecto; sirve frontend y API.                                                     |
| Function App                | Windows Consumption, runtime v4 y Node 22.                                                                     |
| Cuenta interna de Functions | Separada de los documentos; guarda datos internos del host.                                                    |
| Identidad `nexo-github`     | Credencial federada de GitHub para el repositorio y la rama `main`.                                            |

El resultado no secreto queda en `.azure/recursos.json`. La terminal muestra nombres, identificadores y la dirección final de App Service. **No muestra la contraseña ni la clave JWT.**

El versionado conserva versiones anteriores. Los siete días corresponden a la eliminación temporal, no a una regla que borre automáticamente todas las versiones antiguas. Sin una regla de ciclo de vida o limpieza, las versiones también ocupan almacenamiento y pueden seguir existiendo después de ese plazo.

### Roles de las identidades

| Identidad      | Roles en la cuenta de documentos                                                          |
| -------------- | ----------------------------------------------------------------------------------------- |
| App Service    | Storage Blob Data Contributor y Storage Table Data Contributor.                           |
| Azure Function | Storage Blob Data Owner, Storage Queue Data Contributor y Storage Table Data Contributor. |

La Function necesita también permisos de Queue para el disparador Blob. La identidad de GitHub tiene Contributor en **el grupo de esta etapa**, para publicar el código. No se le asigna acceso de datos a los documentos.

Las asignaciones pueden tardar varios minutos en propagarse. Un `403` inicial con la aplicación recién creada puede requerir esperar y reiniciar el recurso; no se resuelve haciendo público el contenedor.

## 5. Configurar GitHub

En [el repositorio](https://github.com/Diego-Zelada/nexo-proveedores), abro **Settings → Secrets and variables → Actions**.

En **Secrets → New repository secret** creo los tres valores que mostró el script:

| Nombre exacto           | Valor de `.azure/recursos.json` |
| ----------------------- | ------------------------------- |
| `AZURE_CLIENT_ID`       | `githubClientId.value`          |
| `AZURE_TENANT_ID`       | `tenantId.value`                |
| `AZURE_SUBSCRIPTION_ID` | `subscriptionId.value`          |

En **Variables → New repository variable** creo:

| Nombre exacto            | Valor                                                |
| ------------------------ | ---------------------------------------------------- |
| `AZURE_WEBAPP_NAME`      | `webAppName.value`, nombre de App Service.           |
| `AZURE_FUNCTIONAPP_NAME` | `functionAppName.value`, nombre de Function App.     |
| `AZURE_API_URL`          | `apiUrl.value`, dirección HTTPS sin una barra final. |

Estos identificadores no son contraseñas de Azure. El workflow recibe un token temporal de GitHub por OIDC. No necesito generar ni pegar una contraseña de service principal ni un publish profile.

Si el repositorio cambia de nombre o de propietario, ajusto el parámetro `repository` de Bicep antes de crear la credencial federada. La identidad está vinculada exactamente a `Diego-Zelada/nexo-proveedores` y `refs/heads/main`.

## 6. Incorporar los archivos al repositorio existente

Si probé desde un ZIP en otra carpeta, conservo mi carpeta original con su `.git` y no inicializo otro historial encima del proyecto anterior.

1. Abro mi repositorio original en VS Code y reviso `git status`. Guardo antes cualquier cambio propio pendiente.
2. Creo una rama de trabajo:

   ```powershell
   git switch -c etapa2-documentos
   ```

3. Copio el contenido de la carpeta de la segunda etapa sobre esa carpeta del repositorio. Incluyo las carpetas `.github`, `api`, `functions`, `shared`, `scripts`, `infra`, `pruebas`, `docs`, `src` y los archivos de raíz. El ZIP no contiene `.git`, `.env`, `.azure/` ni `node_modules`.
4. Creo en esta carpeta su configuración local o copio mi `.env` local anterior de la segunda etapa. Si generé `.azure/` en la carpeta de prueba, la traslado de forma privada a la carpeta donde ejecutaré el despliegue; no la agrego a Git.
5. Instalo y verifico:

   ```powershell
   npm.cmd ci
   npm.cmd test
   npm.cmd run test:integracion
   npm.cmd run build:todo
   git status
   ```

6. Compruebo que `.env` y `.azure/` no aparecen entre los cambios. Guardo el código:

   ```powershell
   git add .
   git commit -m "Agregar documentos privados con Azure Blob y Functions"
   ```

7. Cuando la configuración de Azure y GitHub esté lista, incorporo la rama a `main` y publico:

   ```powershell
   git switch main
   git merge etapa2-documentos
   git push origin main
   ```

Si Git informa conflictos o que el remoto cambió, reviso ese mensaje antes de continuar; no uso `push --force`.

## 7. Publicar y comprobar

1. Abro **GitHub → Actions → Publicar etapa 2**.
2. El push a `main` inicia el workflow. Si ya había subido el código, uso **Run workflow** sobre `main`.
3. Espero a que terminen pruebas, compilación, inicio de sesión OIDC, publicación de App Service y publicación de Functions.
4. Si el trabajo aparece omitido, compruebo las variables `AZURE_WEBAPP_NAME` y `AZURE_FUNCTIONAPP_NAME`.
5. Abro `apiUrl` del resultado. Esa dirección ya sirve la interfaz completa.
6. Abro su ruta `/api/health`: debe responder JSON con `status: "ok"`.
7. Inicio sesión en **Documentos**, cargo un archivo ficticio y espero a que pase de `pendiente` a `disponible`.

En Azure Portal, abro **Function App → Functions** y compruebo que exista `procesarDocumento`. El disparador usa sondeo de Blob Storage (`LogsAndContainerScan`), no Event Grid; una aplicación inactiva puede tardar varios minutos en detectar una carga. El frontend consulta cada cinco segundos, pero no fuerza la ejecución de la Function.

### Mantener la dirección anterior de Static Web Apps

Es opcional: App Service ya tiene su propia interfaz. El workflow anterior usa `AZURE_API_URL` durante la compilación para que Static Web Apps consulte la API nueva. Mantengo su secreto `AZURE_STATIC_WEB_APPS_API_TOKEN` original y vuelvo a ejecutar **Publicar en Azure** después de configurar la variable.

La API permite el origen de la Static Web App anterior configurado en Bicep. Si la dirección cambia, actualizo `ALLOWED_ORIGINS` en App Service con el origen HTTPS exacto, sin rutas ni barra final. No uso `*`.

Los proveedores de la dirección anterior y los de App Service pueden ser distintos porque cada dirección tiene su propio `localStorage`.

## 8. Comprobar versionado, eliminación y recuperación

Estas pruebas se hacen con archivos ficticios en Azure real:

1. Cargo el PDF de ejemplo y espero a que esté disponible.
2. Presiono **Nueva versión** y selecciono `contrato-ejemplo-v2.pdf`.
3. Espero otra vez a `disponible` y abro **Versiones**. Deben aparecer al menos dos versiones.
4. En la cuenta de almacenamiento, abro el contenedor y activo la vista de versiones para comprobarlas también en Azure.
5. Elimino el documento desde Nexo. Desaparece de la lista y aparece en **Papelera**.
6. Presiono **Recuperar**. La API busca una versión recuperable, la copia como versión actual y solicita validación. Espero a `disponible` y lo descargo.
7. Comparo el contenido descargado con la segunda versión del ejemplo.

La papelera de la aplicación conserva el registro; los bytes recuperables dependen de Blob Storage. Si las versiones se purgaron o ya no son recuperables, la API informa el problema. Eliminar el contenedor completo no se recupera desde Nexo: se restaura desde Azure con sus permisos y retención correspondientes.

## 9. Registros y problemas frecuentes

- **API no arranca / error 500:** App Service → Log stream. Reviso `AUTH_USERS_JSON`, `AUTH_JWT_SECRET`, identidad y roles. No agrego una conexión con clave a la cuenta de documentos en producción.
- **Carga pendiente:** Function App → Functions y Log stream. Reviso el disparador registrado, `DocumentStorage__blobServiceUri`, `DocumentStorage__queueServiceUri`, identidad y roles. La tabla `EventosDocumentos` muestra resultados de procesamiento. Los fallos repetidos del disparador pueden terminar en la cola `webjobs-blobtrigger-poison`.
- **OIDC falla:** reviso los tres secretos, tenant, suscripción, nombre exacto del repositorio y rama `main` en la credencial federada.
- **Origen no autorizado:** reviso el origen exacto de la web en `ALLOWED_ORIGINS`.
- **Enlace vencido:** solicito otro desde la interfaz. No cambio el contenedor a público.
- **Sin cuota o región bloqueada:** reviso la suscripción y el error de implementación; no supongo que una cuenta nueva lo resolverá.

Finalmente completo [PRUEBAS_Y_ENTREGA.md](PRUEBAS_Y_ENTREGA.md), guardo las capturas reales y actualizo el enlace de la segunda etapa en el README.
