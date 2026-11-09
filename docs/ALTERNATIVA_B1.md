# API y Azure Function en un solo B1

Esta opción conserva el código y los servicios solicitados. Sustituye los dos planes F1 y Y1 por **un único App Service Linux Basic B1**, compartido por la API y la Azure Function. No cambia el repositorio ni elimina la Static Web App anterior.

**B1 tiene costo mientras el plan exista, incluso si las aplicaciones se detienen.** Storage, operaciones y versiones también generan consumo. La cuenta de estudiante puede usar su crédito disponible, pero hay que comprobar su saldo, cuota, regiones permitidas y precio antes de crear nada. Esta alternativa no garantiza que Azure permita la creación; la validación debe confirmarlo.

## Comprobar antes de crear

En Azure Portal, selecciono mi cuenta y suscripción correctas. En **Cuotas > App Service**, busco B1 en las regiones permitidas por mi suscripción. Necesito al menos una instancia disponible. También verifico en Cost Management el crédito y el precio estimado del plan Linux B1.

En Cloud Shell PowerShell puedo subir y extraer el ZIP de entrega, que ya incluye la API y la Function compiladas, sin instalar `node_modules` allí. Selecciono mi suscripción con `az account set --subscription ID`, entro a `nexo-proveedores-etapa2` y genero en privado los parámetros:

```powershell
node scripts/configurar-local.mjs --azure
```

Uso una región que haya revisado. Ejemplo para Canada Central:

```powershell
pwsh -File ./infra/Crear-Azure.ps1 -Region canadacentral -Plan B1 -CompartirB1 -SoloValidar
```

`SoloValidar` prepara un grupo de recursos vacío y comprueba la plantilla con Azure. **No crea los planes, aplicaciones ni almacenamiento.** No se debe interpretar un error de lectura o de permisos como una cuota de cero. Si hay rechazo por cuota o política, conservo el error y no ejecuto el siguiente paso. La validación no reserva capacidad ni garantiza el funcionamiento final.

## Crear y publicar después de decidir el costo

Una vez comprobados cuota, región y costo, la opción se elige explícitamente:

```powershell
pwsh -File ./infra/Crear-Azure.ps1 -Region canadacentral -Plan B1 -CompartirB1
pwsh -File ./infra/Publicar-Azure.ps1
```

La API usa Node 22 LTS; la Function usa runtime v4 y Node 22 en Linux, con Always On. Sigue siendo una Azure Function con un disparador Blob real. La cuenta de documentos, el contenedor privado, el versionado, la eliminación temporal y las identidades administradas se mantienen. El host utiliza su propia cuenta interna de almacenamiento.

El publicador verifica los hashes de los paquetes incluidos, publica los archivos, consulta `/api/health` y comprueba que Azure registre `procesarDocumento`. Aún debo completar las pruebas reales de carga, validación automática, lectura privada, descarga, versiones, eliminación y recuperación. Compilar localmente o enviar los ZIP no demuestra que esas pruebas hayan pasado.

## Automatización y dirección anterior

Conservo el workflow `.github/workflows/azure-documentos.yml`. Configuro los secretos OIDC y las variables indicados en [AZURE_PASO_A_PASO.md](AZURE_PASO_A_PASO.md), incorporo los cambios al mismo repositorio GitHub y compruebo el despliegue automático. La variable `AZURE_API_URL` permite que el workflow de la Static Web App anterior conserve su dirección y use esta API.

## Referencias

- [Azure Functions en un plan Dedicated: Basic y planes compartidos con web apps](https://learn.microsoft.com/azure/azure-functions/dedicated-plan).
- [Configuración de aplicaciones Function en Linux](https://learn.microsoft.com/azure/azure-functions/functions-infrastructure-as-code).
- [Publicación ZIP de Azure Functions](https://learn.microsoft.com/azure/azure-functions/deployment-zip-push).
- [Precios de App Service Linux](https://azure.microsoft.com/pricing/details/app-service/linux/).

El paquete está preparado para esta alternativa; su publicación en mi suscripción sigue pendiente hasta ejecutar la validación, decidir el costo y comprobar el servicio real.
