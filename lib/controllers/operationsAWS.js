const { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3")
const self = module.exports

// path = 'folder/file_name-file_id'
// file = req.files.property
self.upload = async (path, file, bucket, res) => {
    try {

        const s3Client = new S3Client({ region: process.env.AWS_REGION })

        const extension = path.extname(file.name)
        const params = {
            Bucket: bucket,
            Key: path + extension,
            ContentType: 'application/' + extension,
            Body: file.data,
            ACL: 'public-read'
        }
        const command = new PutObjectCommand(params)
        await s3Client.send(command)
        const evidence = 'https://' + bucket + '.s3.amazonaws.com/'+ path + extension

        res.status(201).send(evidence)    
    }catch(error) {
        res.status(400).send({error:error.message})
    }
}

//files = ['https://AWS_BUCKET.s3.amazonaws.com/file1','https://AWS_BUCKET.s3.amazonaws.com/file2']
self.deleteMany = async (files, bucket, res) => {
    try {
        const s3Client = new S3Client({ region: process.env.AWS_REGION })
        if(files.length>0){
            const params = {
                Delete: {
                    Bucket: bucket,
                    Objects: files,
                    Quiet: true
                }
            } 
            const command = new DeleteObjectsCommand(params)
            await s3Client.send(command)
        }

        res.status(200).send('success')
    }catch(error) {
        res.status(400).send({error:error.message})
    }
}

//file = https://AWS_BUCKET.s3.amazonaws.com/file
self.delete = async (file, bucket, res) => {
    try {
        const s3Client = new S3Client({ region: process.env.AWS_REGION })
        
        const params = {
            Bucket: bucket,
            Key: file,
        }
        
        const command = new DeleteObjectCommand(params)
        await s3Client.send(command)

        res.status(200).send('success')
    }catch(error) {
        res.status(400).send({error:error.message})
    }
}