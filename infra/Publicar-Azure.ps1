param([string]$Grupo = 'rg-nexo-documentos')
$ErrorActionPreference = 'Stop'
if (!(Get-Command az -ErrorAction SilentlyContinue)) { throw 'Se necesita Azure CLI con la sesión iniciada.' }
if (!(Test-Path '.azure/recursos.json')) { throw 'Primero crea la infraestructura con Crear-Azure.ps1; falta .azure/recursos.json.' }
if (!(Test-Path '.paquetes/manifest.json')) { throw 'Usa el ZIP de entrega que incluye los paquetes compilados y su manifiesto.' }
$recursosNexo = Get-Content '.azure/recursos.json' -Raw | ConvertFrom-Json
$manifestNexo = Get-Content '.paquetes/manifest.json' -Raw | ConvertFrom-Json
$suscripcionNexo = az account show --query id --output tsv
if ($LASTEXITCODE -ne 0) { throw 'No se pudo comprobar la sesión de Azure.' }
if ($suscripcionNexo.Trim() -ne $recursosNexo.subscriptionId.value) { throw 'La suscripción activa no coincide con la infraestructura. Selecciona la correcta con az account set.' }
foreach ($tipoNexo in @('api','functions')) {
  $rutaNexo = ".paquetes/$tipoNexo.zip"
  if (!(Test-Path $rutaNexo)) { throw "Falta $rutaNexo." }
  $hashNexo = (Get-FileHash -LiteralPath $rutaNexo -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hashNexo -ne $manifestNexo.$tipoNexo.sha256) { throw "El paquete $tipoNexo no coincide con su manifiesto. Vuelve a extraer el ZIP de entrega." }
}
Write-Host 'Publicando API y frontend compilados en el App Service existente...'
az webapp deploy --resource-group $Grupo --name $recursosNexo.webAppName.value --src-path '.paquetes/api.zip' --type zip --async true --track-status false --output none
if ($LASTEXITCODE -ne 0) { throw 'Falló la carga de la API. Revisa el error de Azure antes de continuar.' }
Write-Host 'Publicando el paquete compilado de la Azure Function...'
az functionapp deployment source config-zip --resource-group $Grupo --name $recursosNexo.functionAppName.value --src '.paquetes/functions.zip' --build-remote false --timeout 600 --output none
if ($LASTEXITCODE -ne 0) { throw 'Falló la publicación de la Function. Revisa el error de Azure.' }
Write-Host 'Comprobando /api/health...'
$limiteNexo = [DateTime]::UtcNow.AddMinutes(3)
$apiListaNexo = $false
while ([DateTime]::UtcNow -lt $limiteNexo) {
  try {
    $saludNexo = Invoke-RestMethod -Uri "$($recursosNexo.apiUrl.value)/api/health" -TimeoutSec 10
    if ($saludNexo.status -eq 'ok') { $apiListaNexo = $true; break }
  } catch { }
  Start-Sleep -Seconds 5
}
if (!$apiListaNexo) { throw 'Los paquetes se enviaron, pero la API aún no responde correctamente. Revisa App Service > Log stream.' }
Write-Host 'Comprobando el registro del disparador procesarDocumento...'
$funcionListaNexo = $false
$limiteNexo = [DateTime]::UtcNow.AddMinutes(3)
while ([DateTime]::UtcNow -lt $limiteNexo) {
  $nombresNexo = az functionapp function list --resource-group $Grupo --name $recursosNexo.functionAppName.value --query '[].name' --output json
  if ($LASTEXITCODE -eq 0) {
    $listaNexo = @($nombresNexo | ConvertFrom-Json)
    if (@($listaNexo | Where-Object { ($_ -split '/')[-1] -eq 'procesarDocumento' }).Count -gt 0) { $funcionListaNexo = $true; break }
  }
  Start-Sleep -Seconds 5
}
if (!$funcionListaNexo) { throw 'La API responde, pero aún no se pudo confirmar procesarDocumento. Revisa Function App > Log stream.' }
if ($recursosNexo.eventGridRequired.value -eq $true) { & ./infra/Conectar-Evento.ps1 -Grupo $Grupo }
Write-Host "`nAPI y disparador registrados. Abre: $($recursosNexo.apiUrl.value)"
Write-Host 'Falta la prueba real: iniciar sesión, subir un documento, esperar disponible, verlo y descargarlo. Después comprobar versiones y recuperación.'
Write-Host 'La dirección anterior de Static Web Apps se actualiza al publicar el código en el mismo repositorio y configurar AZURE_API_URL.'
