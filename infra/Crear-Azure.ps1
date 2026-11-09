param(
  [string]$Grupo = 'rg-nexo-documentos',
  [string]$Region = 'centralus',
  [ValidatePattern('^[a-z0-9]{3,8}$')][string]$Prefijo = 'nexo',
  [ValidateSet('F1','B1')][string]$Plan = 'F1',
  [switch]$CompartirB1,
  [switch]$SoloValidar
)
$ErrorActionPreference = 'Stop'
if ($CompartirB1 -and $Plan -ne 'B1') { throw 'CompartirB1 requiere elegir explícitamente -Plan B1. B1 tiene costo.' }
if (!(Test-Path 'package.json')) { throw 'Ejecuta este script desde la carpeta principal del proyecto.' }
if (!(Get-Command az -ErrorAction SilentlyContinue)) { throw 'Instala Azure CLI y ejecuta az login antes de continuar.' }
if (!(Test-Path '.azure/secretos.parameters.json')) { throw 'Primero ejecuta: node scripts/configurar-local.mjs --azure' }
az account show --query '{suscripcion:name,id:id}' --output table
if ($LASTEXITCODE -ne 0) { throw 'Inicia sesión con az login.' }
if ($CompartirB1) {
  Write-Host 'Modo B1 compartido: API y Azure Function usarán UN plan Linux Basic B1 de pago, con Always On. No se crea un plan Y1.'
}
Write-Host "Grupo: $Grupo. Región: $Region. App Service: $Plan. Storage y operaciones tienen consumo medido."
az bicep install --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar Bicep.' }
az group create --name $Grupo --location $Region --output none
if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear el grupo. Revisa la región permitida.' }
$compartidoNexo = $CompartirB1.IsPresent.ToString().ToLowerInvariant()
az deployment group validate --resource-group $Grupo --template-file infra/main.bicep --parameters '@.azure/secretos.parameters.json' "location=$Region" "prefix=$Prefijo" "webSku=$Plan" "sharedBasicPlan=$compartidoNexo" --validation-level Provider --output none
if ($LASTEXITCODE -ne 0) { throw 'Azure rechazó la validación. No se ejecutó la creación de los servicios. Revisa cuota, política o permisos en el error anterior.' }
Write-Host 'VALIDACION CORRECTA'
if ($SoloValidar) {
  Write-Host 'SoloValidar: se comprobó la plantilla y se preparó el grupo; no se crearon planes, sitios ni cuentas de almacenamiento.'
  return
}
az deployment group create --resource-group $Grupo --name nexo-etapa2 --template-file infra/main.bicep --parameters '@.azure/secretos.parameters.json' "location=$Region" "prefix=$Prefijo" "webSku=$Plan" "sharedBasicPlan=$compartidoNexo" --query properties.outputs --output json > .azure/recursos.json
if ($LASTEXITCODE -ne 0) { throw 'Azure no pudo completar la infraestructura. No se cambió automáticamente a un plan de pago. Revisa el error del portal.' }
$r = Get-Content '.azure/recursos.json' -Raw | ConvertFrom-Json
Write-Host "`nEn GitHub > Settings > Secrets and variables > Actions, configura:"
Write-Host "Secret AZURE_CLIENT_ID = $($r.githubClientId.value)"
Write-Host "Secret AZURE_TENANT_ID = $($r.tenantId.value)"
Write-Host "Secret AZURE_SUBSCRIPTION_ID = $($r.subscriptionId.value)"
Write-Host "Variable AZURE_WEBAPP_NAME = $($r.webAppName.value)"
Write-Host "Variable AZURE_FUNCTIONAPP_NAME = $($r.functionAppName.value)"
Write-Host "Variable AZURE_API_URL = $($r.apiUrl.value)"
Write-Host "`nLuego ejecuta el workflow Publicar etapa 2. Dirección final: $($r.apiUrl.value)"
