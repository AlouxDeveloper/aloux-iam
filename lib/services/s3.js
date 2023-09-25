const { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3")
const path = require('path')
const utils = require('../config/utils')
const self = module.exports

/**
 * pathFile = folder/file_name-file_id
 * file     = req.files.property
 */
self.upload = async (pathFile, file) => {
    try {

        const s3Client = new S3Client({ region: process.env.AWS_REGION })
        const extension = path.extname(file.name)
        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: pathFile + extension,
            ContentType: 'application/' + extension,
            Body: file.data,
            ACL: 'public-read'
        }
        const command = new PutObjectCommand(params)
        await s3Client.send(command)
        const evidence = 'https://' + process.env.AWS_BUCKET + '.s3.amazonaws.com/' + pathFile + extension

        return evidence
    } catch (error) {
        await utils.responseError(error)
    }
}

// files = [{key: 'folder/file1'},{key: 'folder/file1'}]
self.deleteMany = async (files) => {
    try {
        let evidence
        const s3Client = new S3Client({ region: process.env.AWS_REGION })
        if (files.length > 0) {
            const params = {
                Bucket: process.env.AWS_BUCKET,
                Delete: {
                    Objects: files,
                    Quiet: true
                },
            }
            const command = new DeleteObjectsCommand(params)
            evidence = await s3Client.send(command)
        }

        return evidence
    } catch (error) {
        await utils.responseError(error)
    }
}

// file = folder/file_name
self.delete = async (file) => {
    try {
        const s3Client = new S3Client({ region: process.env.AWS_REGION })

        const params = {
            Bucket: process.env.AWS_BUCKET,
            Key: file,
        }

        const command = new DeleteObjectCommand(params)
        const evidence = await s3Client.send(command)

        return evidence
    } catch (error) {
        await utils.responseError(error)
    }
}