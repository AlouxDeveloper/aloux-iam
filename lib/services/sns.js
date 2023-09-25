const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns")
const self = module.exports

/**
 * phoneNumber: Destination email
 * message: Mail body
 */
self.sendMessagePhone = async (phoneNumber, message) => {
    try {
        const client = new SNSClient({ region: process.env.AWS_REGION })
        const params = {
            PhoneNumber: phoneNumber,
            Message: message
        }

        const command = new PublishCommand(params)
        await client.send(command)
        return true
    } catch (error) {
        throw {
            code: 400,
            title: 'Error en los parametros',
            detail: new Error(error),
            suggestion: 'Contacta con el administrador'
        }
    }
}