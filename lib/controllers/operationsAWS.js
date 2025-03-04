const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const path = require("path");
const self = module.exports;

/**
 * pathFile = folder/file_name-file_id
 * file     = req.files.property
 */
self.upload = async (pathFile, file) => {
  try {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    const extension = path.extname(file.name);
    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: pathFile + extension,
      ContentType: "application/" + path.extname(file.name).replace(".", ""),
      ContentDisposition: "inline",
      Body: file.data,
      ACL: "public-read",
    };
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    const evidence =
      "https://" +
      process.env.AWS_BUCKET +
      ".s3.amazonaws.com/" +
      pathFile +
      extension;

    return evidence;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};

// files = [{key: 'folder/file1'},{key: 'folder/file1'}]
self.deleteMany = async (files) => {
  try {
    let evidence;
    const s3Client = new S3Client({ region: process.env.AWS_REGION });
    if (files.length > 0) {
      const params = {
        Bucket: process.env.AWS_BUCKET,
        Delete: {
          Objects: files,
          Quiet: true,
        },
      };
      const command = new DeleteObjectsCommand(params);
      evidence = await s3Client.send(command);
    }

    return evidence;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};

// file = folder/file_name
self.delete = async (file) => {
  try {
    const s3Client = new S3Client({ region: process.env.AWS_REGION });

    const params = {
      Bucket: process.env.AWS_BUCKET,
      Key: file,
    };

    const command = new DeleteObjectCommand(params);
    const evidence = await s3Client.send(command);

    return evidence;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};

/**
 * email: Destination email
 * message: Link to login
 * subject: Mail subject
 */
self.send = async (email, message, subject) => {
  try {
    const client = new SESClient({ region: process.env.AWS_REGION });
    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data:
              `<html>
                        <body style="font-family: Verdana, Geneva, sans-serif;">
                            <table align='center' width='100%' cellpadding='0' cellspacing='0'
                                style='max-width: 640px; padding: 20px 40px; background-color: #fff; box-shadow: 0 5px 15px 0 rgba(0, 0, 0, 0.1), 0 15px 35px 0 rgba(0, 0, 0, 0.05);'>
                                <tbody>
                                    <tr>
                                        <td style='font-size: 14px; text-align: justify; line-height: 1.75;'>
                                            <p>A continuación, inicie sesión para establecer la contraseña de su usuario en la plataforma</p>
                                            <div style="width: 100%!important; text-align:center; margin-bottom: 1.5rem;">
                                                <a style="width: 100%!important; text-decoration:none;">
                                                    <div
                                                        style="background:#000000; color:#ffffff; font-size: 18px; text-decoration:none; padding:1rem 2.5rem; border-radius: 8px;">
                                                        <a style="color:#ffffff; font-size: 20px;  text-decoration:none; padding:0;"
                                                            href="` +
              message +
              `">Acceder
                                                        </a>
                                                    </div>
                                                </a>
                                            </div>
                                            <hr style="width:100%; background:#000000; padding:4px 0;">
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </body>
                        </html>`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
      Source: process.env.AWS_EMAIL_SENDER, //verified mail
    };
    const command = new SendEmailCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};

/**
 * email: Destination email
 * message: Mail body
 * subject: Mail subject
 */
self.sendCustom = async (email, message, subject) => {
  try {
    const client = new SESClient({ region: process.env.AWS_REGION });
    const params = {
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: message,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: subject,
        },
      },
      Source: process.env.AWS_EMAIL_SENDER, //verified mail
    };
    const command = new SendEmailCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};

/**
 * phoneNumber: Destination email
 * message: Mail body
 */
self.sendMessagePhone = async (phoneNumber, message) => {
  try {
    const client = new SNSClient({ region: process.env.AWS_REGION });
    const params = {
      PhoneNumber: phoneNumber,
      Message: message,
    };

    const command = new PublishCommand(params);
    await client.send(command);
    return true;
  } catch (error) {
    throw {
      code: 400,
      title: "Error en los parametros",
      detail: new Error(error),
      suggestion: "Contacta con el administrador",
    };
  }
};
