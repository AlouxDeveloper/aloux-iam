const Admin = require('../models/Admin')
const Functions = require('../models/Functions')
const bcrypt = require('bcryptjs')
const { ObjectId } = require('mongodb');
const axios = require('axios');
const aws = require('aws-sdk');

const self = module.exports;

aws.config.update({
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    region: process.env.AWS_REGION
});

self.create = async (req, res) => {
    // Create a new admin
    try {
        let admin = new Admin(req.body)
        admin.date = (new Date()).getTime()
        admin.lastUpdate = (new Date()).getTime()

        delete admin.pwd
        
        await admin.save()
        res.status(201).send(admin)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.update = async (req, resp) => {
    try {
        const { id } = req.params
        const admin = await Admin.findOne({_id:id}).countDocuments()
        
        if(!admin)
            throw new Error('Upss! No se encontró el Elemento')
        
        req.body.lastUpdate = (new Date()).getTime()
        const result = await Admin.updateOne({ _id: id },{ $set: req.body })
        
        resp.status(200).send(result)
    } catch (error) {
        console.log(error)
        resp.status(400).send({error:error.message})
    }
}

self.isActive = async (req, resp) => {
    try {
        const { id } = req.params
        const admin = await Admin.findOne({_id:id})
        
        if(!admin)
            throw new Error('Upss! No se encontró el Elemento')
        
        admin.isActive = req.body.isActive;
        admin.lastUpdate = (new Date()).getTime()
        
        const result = await admin.save();
        
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}

self.updatepassword = async (req, resp) => {
    try {
        const bodyReq = Admin(req.body)
        const { id } =  req.params

        const admin = await Admin.findOne({_id:id})
        
        if(!admin)
            throw new Error('Upss! No se encontró el Elemento')
        
        admin.pwd = bodyReq.pwd;
        admin.lastUpdate = (new Date()).getTime()
        
        const result = await admin.save();
        
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}

self.get  =  async(req, res) => {    
    try {
        const admin = await Admin.findOne({_id:req.params.id}, {pwd:0}).populate({ path: "_functions"}).select("-pwd -tokens")
        
        if(!admin)
            res.status(404).send()
        
        res.status(200).send(admin)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.retrieve = async(req, res) => {    
    try {
        let consulta = []
        if((await self.getMe(req, res)).permission['iam.permission.propietario'])
            consulta = await Admin.find({}).select("-pwd -tokens").populate("_functions").sort({date:-1})
        else{
            const propietario = await Functions.findOne({name: 'Propietario'})
            consulta = await Admin.find({'_functions':{$ne:propietario._id}}).select("-pwd -tokens").sort({date:-1})
        }
        res.status(200).send(consulta)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.delete  =  async(req, res) => {    
    try {
        const response = await Admin.deleteOne({_id:req.params.id})
        response.deletedCount ? res.status(200).send({}) : res.status(404).send({ error : "El registro no existe"})
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}
self.login  =  async(req, res) => {
    try {
        const { email, pwd } = req.body
        const userLogin = await Admin.findOne({email:req.body.email})

        if(!userLogin){
            return res.status(401).send({
                error: 'Credenciales incorrectas',
                suggestion: 'Verifica que el Usuario y Contraseña sean correctos'
            })
        }

        const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd)

        if (!isPasswordMatch) {
            return res.status(401).send({
                error: 'Credenciales incorrectas',
                suggestion: 'Verifica que el Usuario y Contraseña sean correctas'
            })
        }
        if(!userLogin.isActive){
            return res.status(401).send({
                error: 'Usuario inactivo',
                suggestion: 'Pongase en contacto con el área de administración.'
            })
        }
        else{
            const token = await userLogin.generateAuthToken()
            res.status(200).send({token})
        }
    

    } catch (error) {
        res.status(500).send({error:error.message})
    }
}
self.logout = async (req, res) => {
    try {
        const admin = await Admin.findOne({_id:req.admin._id})
        admin.tokens = admin.tokens.filter((token) => {
            return token.token != req.token
        })
        
        await admin.save()
        
        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

self.logoutAll = async (req, res) => {
    try {
        req.admin.tokens = []
        
        await req.admin.save()
        
        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

self.getMenu = (admin) => {
    let result = []
    // Recorre funciones de un admin
    for(let i in admin._functions){
        if(admin._functions[i].isActive){

            // Recorre permisos de una función
            for(let j in admin._functions[i]._permission){
                if(admin._functions[i]._permission[j].isActive){
                    
                    // Valida si el menú esta activo
                    if(admin._functions[i]._permission[j]._menu.isActive){
                        result.push(admin._functions[i]._permission[j]._menu)
                    }

                }
            }
        }
    }

    let result2 = result.filter((item,index)=>{
        return result.indexOf(item) === index;
      })

    // Ordena elementos de menú
    result2.sort(function (a, b) {
        if (a.index > b.index) {
            return 1;
          }
          if (a.index < b.index) {
            return -1;
          }
          return 0;
    })
    return result2
}

self.getPermission = (admin) => {
    let result = {}
    for(let i in admin._functions){
        for(let j in admin._functions[i]._permission){
            if(admin._functions[i]._permission[j].isActive)
            result[admin._functions[i]._permission[j].front] = true
        }
    }
    return result
}

self.getMe  =  async(req, res) => {
    let admin = await Admin.findOne({ _id: req.admin._id }, { "tokens":0,pwd:0 } ).populate({ path: "_functions", populate: [{ path: "_permission", populate: [{ path: "_menu", } ] } ] }).lean()
    
    // Obtener menús y funciones sin repertir y activas
    admin.menu = self.getMenu(admin)
    admin.permission = self.getPermission(admin)
    delete admin._functions
    
    return admin
}

self.me  =  async(req, res) => {
    res.status(200).send(await self.getMe(req, res))
}

self.resetPass  =  async(req, res) => {    
    try {       

        let _id = req.admin._id
        
        const usuario = await Admin.findOne({_id} )
        
        if (usuario) {
           
            usuario.pwd = req.body.pwd            
            usuario.lastUpdate = new Date().getTime();                        
            await usuario.save()
            
            res.status(200).send("password updated successfully");  
        } else return res.status(409).send({error: 'Admin no encontrado.'})     
     
    } catch (error) {
        res.status(400).send(error)
    }
}

self.recoverpassword = async (req, res) => {
    try {
        const correo = req.body.email

        const admin = await Admin.findOne({email: correo});
        if (!admin) {
            return res.status(409).send({error: 'Admin no encontrado.'});
        }

        const code = await self.generatecode();
        
        await self.sendcodemail(correo, code);
        
        admin.resetCode = code;

        await admin.save();

        res.status(200).send();
    } catch (error) {
        res.status(500).send('Error al envíar el correo electronico')
        console.log(error)
    }
}

self.generatecode = async () => {
    let code = "";
    let random = [];

    function getRandomArbitrary(min, max) {
        return Math.floor(Math.random() * (max - min) + min)
    }
    function isReapeat(arr, value) {
        for(let i in arr){
            if(arr[i].nivel === value){
                return true
            }
        }
        return false
    }

    function getRandom(){
        const nivel = getRandomArbitrary(0,10);
        if(!isReapeat(random, nivel)){
            random.push({ nivel : nivel });
        }
        if(random.length < 4){
            getRandom()
        }
    }

    getRandom()

    for(let i in random){
        code += random[i].nivel;
    }

    return code;
}

self.sendcodemail = async( correo, code) =>{
    try {
        consulta = await Admin.findOne({email: correo},{name:1 , email:1})

        let params = {
            Destination: { /* required */
              ToAddresses: [
                consulta.email,
                /* more To email addresses */
              ]
            },
            Source: process.env.AWS_EMAIL_SENDER, /* required */
            Template: 'TemplateRecoverPassInem', /* required */
            TemplateData: '{ \"Username\":\"'+consulta.name+'\",\"Codigo\":\"'+code+'\" }', /* required */        
          };
          
          // Create the promise and SES service object
          await new aws.SES({apiVersion: '2010-12-01'}).sendTemplatedEmail(params).promise();
 
    } catch (error) {
        throw new Error('Ocurrio un error al envìar el correo electronico');
    }
}

self.verifyCode = async (req, res) => {
    try {
        const correo = req.body.email
        var body = JSON.parse(JSON.stringify(req.body));

        const admin = await Admin.findOne({ email: correo } );

        if (!admin) {
            return res.status(409).send({error: 'No se pudo validar la información.'});
        }

        if(admin.resetCode == null)
            return res.status(409).send({error: 'El código ha caducado.'});

        if(admin.resetCode == body.resetCode)
        {
            admin.resetCode = null;
            admin.validCode = true;

            await admin.save();
        }
        else 
            return res.status(409).send('Código incorrecto.');


        res.status(200).send();
    } catch (error) {
        res.status(400).send(error)
    }
}

self.resetPassword  =  async(req, res) => {    
    try {
        let correo = req.body.email;
        var body = JSON.parse(JSON.stringify(req.body));

        const usuario = await Admin.findOne({ email: correo } )

        if (!usuario) {
            return res.status(409).send({error: 'Admin no encontrado.'})
        }

        if(usuario.validCode)
        {
            usuario.pwd = body.pwd;
            usuario.validCode = false;
            usuario.lastUpdate = new Date().getTime();
            usuario.tokens = []

            await usuario.save()

            const token = await usuario.generateAuthToken()
            res.status(200).send({token})
        }
        else{
            return res.status(401).send("El código no ha sido verificado");
        }

    } catch (error) {
        res.status(400).send(error)
    }
}

self.updateAny = async( req, res) =>{
    try {
        
        const _id = req.admin._id
        const update = await Admin.updateOne( { _id },{ $set:req.body, lastUpdate: (new Date()).getTime() })
        
        res.status(202).send(update)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.updatePicture = async( req, res) =>{
    try {
        const s3  = new aws.S3();
        const _id = req.admin._id

            let admin = await Admin.findOne({_id})

            if(!admin)
             throw new Error('Upss! No se encontró el Elemento')

            const extencionIO = req.files.urlImg.name.split(".");
            const params = {
                Bucket: process.env.AWS_BUCKET,
                Key: 'admin' + admin._id +'.' + extencionIO[extencionIO.length-1],
                Body: req.files.urlImg.data,
                ContentType: 'application/' + extencionIO[extencionIO.length-1],
                ContentEncoding: 'base64',
                ACL: 'public-read'
            };
        
            // Uploading files to the bucket
            let putObjectPromise = await s3.upload(params).promise();

            admin.urlImg = putObjectPromise.Location
            admin.lastUpdate = (new Date()).getTime()
            
            const result = await admin.save()
        
        
        res.status(202).send(result)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}