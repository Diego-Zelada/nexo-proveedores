targetScope = 'resourceGroup'
param storageAccountName string
@secure()
param blobEndpoint string
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = { name: storageAccountName }
resource subscription 'Microsoft.EventGrid/eventSubscriptions@2022-06-15' = {
  name: 'nexo-documentos'
  scope: storage
  properties: {
    destination: { endpointType: 'WebHook', properties: { endpointUrl: blobEndpoint, maxEventsPerBatch: 1 } }
    eventDeliverySchema: 'EventGridSchema'
    filter: {
      includedEventTypes: [ 'Microsoft.Storage.BlobCreated' ]
      subjectBeginsWith: '/blobServices/default/containers/proveedores-documentos/blobs/'
      subjectEndsWith: '/archivo'
      isSubjectCaseSensitive: true
    }
    retryPolicy: { maxDeliveryAttempts: 30, eventTimeToLiveInMinutes: 1440 }
  }
}
