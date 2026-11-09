targetScope = 'resourceGroup'

@description('Usar una región permitida por la suscripción y disponible para App Service y Functions.')
param location string = resourceGroup().location
@minLength(3)
@maxLength(8)
param prefix string = 'nexo'
@allowed(['F1', 'B1'])
@description('F1 es Free. B1 es de pago y solo debe elegirse de forma explícita.')
param webSku string = 'F1'
@description('Opción explícita de pago: compartir el plan Linux B1 entre la API y Azure Functions. Requiere webSku=B1; no crea un plan Y1.')
param sharedBasicPlan bool = false
param repository string = 'Diego-Zelada/nexo-proveedores'
param frontendOrigin string = 'https://kind-mud-024de6410.6.azurestaticapps.net'
@secure()
param usersJson string
@secure()
param jwtSecret string

var suffix = uniqueString(subscription().subscriptionId, resourceGroup().id, prefix)
var accountName = '${prefix}doc${suffix}'
var hostAccountName = '${prefix}h${suffix}'
var webName = '${prefix}-api-${suffix}'
var functionName = '${prefix}-func-${suffix}${sharedBasicPlan ? '-b1' : ''}'
var blobContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var blobOwner = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
var tableContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
var queueContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    isHnsEnabled: false
    accessTier: 'Hot'
  }
}
resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    isVersioningEnabled: true
    deleteRetentionPolicy: { enabled: true, days: 7 }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
  }
}
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'proveedores-documentos'
  properties: { publicAccess: 'None' }
}
resource tables 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = { parent: storage, name: 'default' }
resource documents 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = { parent: tables, name: 'DocumentosProveedores' }
resource audit 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = { parent: tables, name: 'EventosDocumentos' }

// La cuenta del host está separada: no necesita versionar los recibos internos de Functions.
resource hostStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: hostAccountName
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: { minimumTlsVersion: 'TLS1_2', supportsHttpsTrafficOnly: true, allowBlobPublicAccess: false }
}
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${prefix}-api-plan'
  location: location
  kind: 'linux'
  sku: { name: webSku, tier: webSku == 'F1' ? 'Free' : 'Basic' }
  properties: { reserved: true }
}
resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: webName
  location: location
  kind: 'app,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'npm start'
      alwaysOn: webSku == 'B1'
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'NODE_ENV', value: 'production' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storage.name }
        { name: 'AUTH_USERS_JSON', value: usersJson }
        { name: 'AUTH_JWT_SECRET', value: jwtSecret }
        { name: 'ALLOWED_ORIGINS', value: '${frontendOrigin},http://localhost:4173' }
        { name: 'MAX_FILE_MB', value: '10' }
        { name: 'SAS_SECONDS', value: '60' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }
      ]
    }
  }
}
resource webLogs 'Microsoft.Web/sites/config@2023-12-01' = {
  parent: web
  name: 'logs'
  properties: {
    applicationLogs: { fileSystem: { level: 'Information' } }
    httpLogs: { fileSystem: { enabled: true, retentionInDays: 7, retentionInMb: 35 } }
    detailedErrorMessages: { enabled: false }
    failedRequestsTracing: { enabled: false }
  }
}
resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = if (!sharedBasicPlan) {
  name: '${prefix}-functions-plan'
  location: location
  kind: 'functionapp'
  sku: { name: 'Y1', tier: 'Dynamic' }
  properties: { reserved: false }
}
resource functions 'Microsoft.Web/sites@2023-12-01' = {
  name: functionName
  location: location
  kind: sharedBasicPlan ? 'functionapp,linux' : 'functionapp'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: sharedBasicPlan ? plan.id : functionPlan!.id
    reserved: sharedBasicPlan
    httpsOnly: true
    siteConfig: {
      ...(sharedBasicPlan ? { linuxFxVersion: 'node|22', alwaysOn: true } : {})
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${hostStorage.name};AccountKey=${hostStorage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}' }
        { name: 'DocumentStorage__blobServiceUri', value: storage.properties.primaryEndpoints.blob }
        { name: 'DocumentStorage__queueServiceUri', value: storage.properties.primaryEndpoints.queue }
        { name: 'DocumentStorage__credential', value: 'managedidentity' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storage.name }
        { name: 'MAX_FILE_MB', value: '10' }
        { name: 'AzureFunctionsJobHost__logging__logLevel__Default', value: 'Information' }
      ]
    }
  }
}
resource webBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id,web.id,blobContributor)
  scope: storage
  properties: { principalId: web.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: blobContributor }
}
resource webTableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id,web.id,tableContributor)
  scope: storage
  properties: { principalId: web.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: tableContributor }
}
resource functionBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id,functions.id,blobOwner)
  scope: storage
  properties: { principalId: functions.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: blobOwner }
}
resource functionTableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id,functions.id,tableContributor)
  scope: storage
  properties: { principalId: functions.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: tableContributor }
}
resource functionQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id,functions.id,queueContributor)
  scope: storage
  properties: { principalId: functions.identity.principalId, principalType: 'ServicePrincipal', roleDefinitionId: queueContributor }
}
// GitHub usa identidad federada OIDC: no se crea una contraseña de Azure para el pipeline.
resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = { name: '${prefix}-github', location: location }
resource federation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: deployIdentity
  name: 'github-main'
  properties: { issuer: 'https://token.actions.githubusercontent.com', subject: 'repo:${repository}:ref:refs/heads/main', audiences: ['api://AzureADTokenExchange'] }
}
resource deployRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id,deployIdentity.id,'contributor')
  properties: { principalId: deployIdentity.properties.principalId, principalType: 'ServicePrincipal', roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions','b24988ac-6180-42a0-ab88-20f7382dd24c') }
}

output apiUrl string = 'https://${web.properties.defaultHostName}'
output webAppName string = web.name
output functionAppName string = functions.name
output storageAccountName string = storage.name
output githubClientId string = deployIdentity.properties.clientId
output tenantId string = tenant().tenantId
output subscriptionId string = subscription().subscriptionId
output sharedBasicPlanEnabled bool = sharedBasicPlan
output appServicePlanName string = plan.name
