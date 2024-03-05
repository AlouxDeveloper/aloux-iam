const { adapt, managedwriter } = require('@google-cloud/bigquery-storage')
const { WriterClient, JSONWriter } = managedwriter
const { BigQuery } = require('@google-cloud/bigquery')
const self = module.exports

self.callAppendRows = async (row, table) => {
    const projectId = process.env.PROJECT_ID
    const datasetId = process.env.DATASET_ID
    const tableId = table

    const destinationTable = `projects/${projectId}/datasets/${datasetId}/tables/${tableId}`
    const writeClient = new WriterClient({ projectId })
    const bigquery = new BigQuery({ projectId: projectId })

    let results = {}
    try {
        const dataset = bigquery.dataset(datasetId)
        const table = await dataset.table(tableId)
        const [metadata] = await table.getMetadata()
        const { schema } = metadata
        const storageSchema =
            adapt.convertBigQuerySchemaToStorageTableSchema(schema)
        const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(
            storageSchema,
            'root'
        )

        const connection = await writeClient.createStreamConnection({
            streamId: managedwriter.DefaultStream,
            destinationTable,
        })
        const streamId = connection.getStreamId()

        const writer = new JSONWriter({
            streamId,
            connection,
            protoDescriptor,
        })

        let rows = []
        const pendingWrites = []
        rows = row

        // Send batch.
        pw = writer.appendRows(rows)
        pendingWrites.push(pw)

        results = await Promise.all(
            pendingWrites.map(pw => pw.getResult())
        )

    } catch (err) {
        throw {
            code: 400,
            title: 'Ocurrio un error',
            detail: err.toString(),
            suggestion: 'Revisa callAppendRows()'
        }
    } finally {
        writeClient.close()
    }

    return results
}