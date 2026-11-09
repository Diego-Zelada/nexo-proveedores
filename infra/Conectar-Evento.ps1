#requires -Version 7.0
param([string]$Grupo = 'rg-nexo-documentos')
$ErrorActionPreference = 'Stop'
$recursosNexo = Get-Content '.azure/recursos.json' -Raw | ConvertFrom-Json
if ($recursosNexo.eventGridRequired.value -ne $true) { return }
$suscripcionNexo = az account show --query id --output tsv
if ($LASTEXITCODE -ne 0 -or $suscripcionNexo.Trim() -ne $recursosNexo.subscriptionId.value) { throw 'La suscripción activa no coincide con los recursos.' }
Write-Host 'Conectando los eventos de Blob Storage con la Azure Function...'
$claveNexo = $null
$limiteNexo = [DateTime]::UtcNow.AddMinutes(3)
while ([DateTime]::UtcNow -lt $limiteNexo) {
  $claveNexo = az functionapp keys list --resource-group $Grupo --name $recursosNexo.functionAppName.value --query systemKeys.blobs_extension --output tsv 2>$null
  if ($LASTEXITCODE -eq 0 -and $claveNexo -and $claveNexo.Trim() -ne 'null') { break }
  $claveNexo = $null
  Start-Sleep -Seconds 5
}
if (!$claveNexo) { throw 'La extensión Blob todavía no generó su clave. Revisa los registros de la Function; no envíes claves ni URLs privadas por el chat.' }
$endpointNexo = "https://$($recursosNexo.functionAppHostName.value)/runtime/webhooks/blobs?functionName=Host.Functions.procesarDocumento&code=$([Uri]::EscapeDataString($claveNexo.Trim()))"
$rutaNexo = '.azure/evento.parameters.json'
try {
  $parametrosNexo = @{ parameters = @{ storageAccountName = @{ value = $recursosNexo.storageAccountName.value }; blobEndpoint = @{ value = $endpointNexo } } }
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) $rutaNexo), ($parametrosNexo | ConvertTo-Json -Depth 5))
  if (!$IsWindows) { chmod 600 $rutaNexo }
  $resultadoNexo = az deployment group create --resource-group $Grupo --name nexo-evento-blob --template-file infra/evento-blob.bicep --parameters "@$rutaNexo" --output none 2>&1
  if ($LASTEXITCODE -ne 0) {
    $limpioNexo = ($resultadoNexo | Out-String) -replace '([?&]code=)[^&\s"<>]+', '$1[oculto]'
    throw "No se pudo conectar Event Grid: $limpioNexo"
  }
} finally {
  Remove-Item -LiteralPath $rutaNexo -Force -ErrorAction SilentlyContinue
  $claveNexo = $null
  $endpointNexo = $null
}
Write-Host 'Evento BlobCreated conectado. El contenedor sigue privado; las credenciales no se enviaron al frontend.'
