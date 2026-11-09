targetScope = 'resourceGroup'

@description('App Service F1 creado previamente en este grupo. Se configura sin crear ni cambiar su plan.')
param apiAppName string
@description('Región disponible para Storage y Functions Flex Consumption.')
param location string
param repository string = 'Diego-Zelada/nexo-proveedores'
param frontendOrigin string = 'https://kind-mud-024de6410.6.azurestaticapps.net'
@secure()
param usersJson string
@secure()
param jwtSecret string

var suffix = uniqueString(subscription().subscriptionId, resourceGroup().id, apiAppName)
var blobContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var blobOwner = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
var tableContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
var queueContributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')

resource web 'Microsoft.Web/sites@2024-04-01' existing = { name: apiAppName }
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'nexodoc${suffix}'
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
resource container 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = { parent: blobs, name: 'proveedores-documentos', properties: { publicAccess: 'None' } }
resource tables 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = { parent: storage, name: 'default' }
resource documents 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = { parent: tables, name: 'DocumentosProveedores' }
resource audit 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = { parent: tables, name: 'EventosDocumentos' }

resource hostStorage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'nexoh${suffix}'
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: { minimumTlsVersion: 'TLS1_2', supportsHttpsTrafficOnly: true, allowBlobPublicAccess: false }
}
resource hostBlobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = { parent: hostStorage, name: 'default' }
resource packages 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = { parent: hostBlobs, name: 'function-packages', properties: { publicAccess: 'None' } }
resource flexPlan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: 'nexo-flex-${suffix}'
  location: location
  kind: 'functionapp'
  sku: { name: 'FC1', tier: 'FlexConsumption' }
  properties: { reserved: true }
}
resource functions 'Microsoft.Web/sites@2024-04-01' = {
  name: 'nexo-func-${suffix}'
  location: location
  kind: 'functionapp,linux'
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: flexPlan.id
    reserved: true
    httpsOnly: true
    functionAppConfig: {
      runtime: { name: 'node', version: '22' }
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${hostStorage.properties.primaryEndpoints.blob}${packages.name}'
          authentication: { type: 'StorageAccountConnectionString', storageAccountConnectionStringName: 'AzureWebJobsStorage' }
        }
      }
      scaleAndConcurrency: { maximumInstanceCount: 40, instanceMemoryMB: 512, alwaysReady: [] }
    }
    siteConfig: {
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'AzureWebJobsStorage', value: 'DefaultEndpointsProtocol=https;AccountName=${hostStorage.name};AccountKey=${hostStorage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}' }
        { name: 'DocumentStorage__blobServiceUri', value: storage.properties.primaryEndpoints.blob }
        { name: 'DocumentStorage__queueServiceUri', value: storage.properties.primaryEndpoints.queue }
        { name: 'DocumentStorage__credential', value: 'managedidentity' }
        { name: 'AZURE_STORAGE_ACCOUNT_NAME', value: storage.name }
        { name: 'BLOB_TRIGGER_SOURCE', value: 'EventGrid' }
        { name: 'MAX_FILE_MB', value: '10' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'AzureFunctionsJobHost__logging__logLevel__Default', value: 'Information' }
      ]
    }
  }
}
resource webSettings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: web
  name: 'appsettings'
  properties: {
    NODE_ENV: 'production'
    AZURE_STORAGE_ACCOUNT_NAME: storage.name
    AUTH_USERS_JSON: usersJson
    AUTH_JWT_SECRET: jwtSecret
    ALLOWED_ORIGINS: '${frontendOrigin},http://localhost:4173'
    MAX_FILE_MB: '10'
    SAS_SECONDS: '60'
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  }
}
resource webConfig 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: web
  name: 'web'
  properties: { linuxFxVersion: 'NODE|22-lts', appCommandLine: 'npm start', alwaysOn: false, ftpsState: 'Disabled', minTlsVersion: '1.2' }
}
resource webLogs 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: web
  name: 'logs'
  properties: {
    applicationLogs: { fileSystem: { level: 'Information' } }
    httpLogs: { fileSystem: { enabled: true, retentionInDays: 7, retentionInMb: 35 } }
    detailedErrorMessages: { enabled: false }
    failedRequestsTracing: { enabled: false }
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
resource deployIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = { name: 'nexo-github', location: location }
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
output functionAppResourceId string = functions.id
output functionAppHostName string = functions.properties.defaultHostName
output storageAccountName string = storage.name
output storageAccountResourceId string = storage.id
output resourceGroupName string = resourceGroup().name
output githubClientId string = deployIdentity.properties.clientId
output tenantId string = tenant().tenantId
output subscriptionId string = subscription().subscriptionId
output eventGridRequired bool = true
output hostingMode string = 'FlexConsumption'
