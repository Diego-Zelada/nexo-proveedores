#requires -Version 7.0
param(
  [string]$Grupo = 'rg-nexo-documentos',
  [string]$Aplicacion = 'nexo-api-dz261109',
  [string]$Region = 'westus3',
  [switch]$SoloValidar
)
$ErrorActionPreference = 'Stop'
if (!(Test-Path 'package.json')) { throw 'Ejecuta desde la raíz de nexo-proveedores-etapa2.' }
if (!(Test-Path '.azure/secretos.parameters.json')) { throw 'Primero ejecuta: node scripts/configurar-local.mjs --azure' }
$webNexo = az webapp show --resource-group $Grupo --name $Aplicacion --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or !$webNexo.serverFarmId) { throw 'Primero debe existir la aplicación web F1. Revisa cuenta, grupo y nombre.' }
$planNexo = az resource show --ids $webNexo.serverFarmId --output json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar el plan de la API.' }
if ($planNexo.sku.name -ne 'F1' -or $webNexo.kind -notlike '*linux*') { throw 'Este procedimiento requiere una API Linux en F1. No cambia ni crea un plan de pago para la API.' }
Write-Host "API F1 comprobada: $Aplicacion. Functions y almacenamiento se configurarán en $Region con consumo medido, sin plan Basic ni instancias Always Ready."
$proveedoresNexo = @('Microsoft.Storage','Microsoft.Web','Microsoft.ManagedIdentity','Microsoft.App','Microsoft.EventGrid')
foreach ($proveedorNexo in $proveedoresNexo) {
  az provider register --namespace $proveedorNexo --output none
  if ($LASTEXITCODE -ne 0) { throw "No se pudo registrar $proveedorNexo." }
}
$pendientesNexo = @($proveedoresNexo)
$limiteNexo = [DateTime]::UtcNow.AddMinutes(5)
while ($pendientesNexo.Count -gt 0 -and [DateTime]::UtcNow -lt $limiteNexo) {
  $pendientesNexo = @($pendientesNexo | Where-Object {
    $estadoNexo = az provider show --namespace $_ --query registrationState --output tsv
    if ($LASTEXITCODE -ne 0) { throw "No se pudo consultar el proveedor $_." }
    $estadoNexo.Trim() -ne 'Registered'
  })
  if ($pendientesNexo.Count -gt 0) { Write-Host ('Registrando: ' + ($pendientesNexo -join ', ')); Start-Sleep -Seconds 5 }
}
if ($pendientesNexo.Count -gt 0) { throw 'Los proveedores aún se están registrando. Repite el mismo comando cuando terminen; no se han creado Storage ni Functions.' }
az webapp identity assign --resource-group $Grupo --name $Aplicacion --output none
if ($LASTEXITCODE -ne 0) { throw 'No se pudo habilitar la identidad de la API.' }
az bicep install --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar Bicep.' }
az deployment group validate --resource-group $Grupo --template-file infra/servicios-separados.bicep --parameters '@.azure/secretos.parameters.json' "apiAppName=$Aplicacion" "location=$Region" --validation-level Provider --output none
if ($LASTEXITCODE -ne 0) { throw 'Azure rechazó Storage o Functions Flex. La API F1 existente se conserva. Revisa el error para distinguir cuota, región o permisos.' }
if ($SoloValidar) {
  Write-Host 'VALIDACION CORRECTA. Se prepararon proveedores e identidad; no se ejecutó la creación de Storage ni Functions.'
  return
}
$salidaNexo = '.azure/recursos-separados.tmp.json'
az deployment group create --resource-group $Grupo --name nexo-servicios-separados --template-file infra/servicios-separados.bicep --parameters '@.azure/secretos.parameters.json' "apiAppName=$Aplicacion" "location=$Region" --query properties.outputs --output json > $salidaNexo
if ($LASTEXITCODE -ne 0) { throw 'La creación no terminó. Revisa el grupo: puede haber recursos parciales. No se cambió de plan ni suscripción.' }
Move-Item -LiteralPath $salidaNexo -Destination '.azure/recursos.json' -Force
$recursosNexo = Get-Content '.azure/recursos.json' -Raw | ConvertFrom-Json
Write-Host "Recursos preparados. Siguiente comando: pwsh -File ./infra/Publicar-Azure.ps1"
Write-Host "API: $($recursosNexo.apiUrl.value)"
Write-Host "GitHub secret AZURE_CLIENT_ID = $($recursosNexo.githubClientId.value)"
Write-Host "GitHub secret AZURE_TENANT_ID = $($recursosNexo.tenantId.value)"
Write-Host "GitHub secret AZURE_SUBSCRIPTION_ID = $($recursosNexo.subscriptionId.value)"
Write-Host "GitHub variable AZURE_WEBAPP_NAME = $($recursosNexo.webAppName.value)"
Write-Host "GitHub variable AZURE_FUNCTIONAPP_NAME = $($recursosNexo.functionAppName.value)"
Write-Host "GitHub variable AZURE_API_URL = $($recursosNexo.apiUrl.value)"
