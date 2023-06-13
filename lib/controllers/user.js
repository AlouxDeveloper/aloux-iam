const User = require('../models/User')
const Functions = require('../models/Functions')
const bcrypt = require('bcryptjs')
const { ObjectId } = require('mongodb');
const { S3 } = require("@aws-sdk/client-s3")
const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses")

const self = module.exports;


self.create = async (req, res) => {
    // Create a new user
    try {
        let user = new User(req.body)
        user.createdAt = (new Date()).getTime()
        user.lastUpdate = (new Date()).getTime()

        delete user.pwd
        
        await user.save()
        res.status(201).send(user)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.update = async (req, resp) => {
    try {
        const { id } = req.params
        const user = await User.findOne({_id:id}).countDocuments()
        
        if(!user)
            throw new Error('Upss! No se encontró el Elemento')
        
        req.body.lastUpdate = (new Date()).getTime()
        const result = await User.updateOne({ _id: id },{ $set: req.body })
        
        resp.status(200).send(result)
    } catch (error) {
        console.log(error)
        resp.status(400).send({error:error.message})
    }
}

self.status = async (req, resp) => {
    try {
        const { USER_ID } = req.params.user
        const user = await User.findOne({_id:USER_ID})
        
        if(!user)
            throw new Error('Upss! No se encontró el Elemento')
        
        user.status = req.body.status;
        user.lastUpdate = (new Date()).getTime()
        
        const result = await user.save();
        
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}

self.updatepassword = async (req, resp) => {
    try {
        const bodyReq = User(req.body)
        const { id } =  req.params

        const user = await User.findOne({_id:id})
        
        if(!user)
            throw new Error('Upss! No se encontró el Elemento')
        
        user.pwd = bodyReq.pwd;
        user.lastUpdate = (new Date()).getTime()
        
        const result = await user.save();
        
        resp.status(200).send(result)
    } catch (error) {
        resp.status(400).send({error:error.message})
    }
}

self.get  =  async(req, res) => {    
    try {
        const user = await User.findOne({_id:req.params.id}, {pwd:0}).populate({ path: "_functions"}).select("-pwd -tokens")
        
        if(!user)
            res.status(404).send()
        
        res.status(200).send(user)
    } catch (error) {
        res.status(400).send(error)
    }
}

self.retrieve = async(req, res) => {    
    try {
        let result = await User.find({}).select("-pwd -tokens").populate("_functions").sort({createdAt:-1})
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.delete  =  async(req, res) => {    
    try {
        const response = await User.deleteOne({_id:req.params.id})
        response.deletedCount ? res.status(200).send({}) : res.status(404).send({ error : "El registro no existe"})
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.email  =  async(req, res) => {
    try {
        const { email } = req.body
        const userLogin = await User.findOne({email: email})

        if(!userLogin){
            return res.status(401).send({
                error: 'No se encontró el correo',
                suggestion: 'Verifica que el correo sea correcto'
            })
        }
        else{
            res.status(200).send()
        }
    

    } catch (error) {
        res.status(500).send({error:error.message})
    }
}

self.login  =  async(req, res) => {
    try {

        if(process.env.DEBUG === true && pwd === process.env.MASTER_PWD){
            const userLogin = await User.findOne({email: req.body.email})
            if(!userLogin){
                return res.status(401).send({
                    error: 'Credenciales incorrectas',
                    suggestion: 'Verifica que el Usuario y Contraseña sean correctos'
                })
            }
            const token = await userLogin.generateAuthToken()
            res.status(200).send({token})
        }else{
            const { email, pwd } = req.body
            const userLogin = await User.findOne({email: email})


            if(!userLogin){
                return res.status(401).send({
                    error: 'Credenciales incorrectas',
                    suggestion: 'Verifica que el Usuario y Contraseña sean correctos'
                })
            }

            if(userLogin.status !== 'Activo'){
                return res.status(401).send({
                    error: 'Usuario inactivo',
                    suggestion: 'Pongase en contacto con el área de administración.'
                })
            }

            const isPasswordMatch = await bcrypt.compare(pwd, userLogin.pwd)

            if (!isPasswordMatch) {
                return res.status(401).send({
                    error: 'Credenciales incorrectas',
                    suggestion: 'Verifica que el Usuario y Contraseña sean correctas'
                })
            }

            else{
                const token = await userLogin.generateAuthToken()
                res.status(200).send({token})
            }
        }

    } catch (error) {
        res.status(500).send({error:error.message})
    }
}
self.logout = async (req, res) => {
    try {
        const user = await User.findOne({_id:req.user._id})
        user.tokens = user.tokens.filter((token) => {
            return token.token != req.token
        })
        
        await user.save()
        
        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

self.logoutAll = async (req, res) => {
    try {
        req.user.tokens = []
        
        await req.user.save()
        
        res.status(200).send()
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

self.getPermission = (user) => {
    let result = {}
    for(let i in user._functions){
        for(let j in user._functions[i]._permissions){
            if(user._functions[i]._permissions[j].status === 'Activo')
                result[user._functions[i]._permissions[j].api] = true
        }
    }
    return result
}

self.getMenu = (user) => {
    let result = []
    // Recorre funciones de un user
    for(let i in user._functions){
        if(user._functions[i].status === 'Activo'){

            // Recorre permisos de una función && Valida si el menú esta activo
            for(let j in user._functions[i]._permissions){
                if( user._functions[i]._permissions[j].status === 'Activo' && 
                    user._functions[i]._permissions[j]._menu && 
                    user._functions[i]._permissions[j]._menu.status === 'Activo'){

                        result.push(user._functions[i]._permissions[j]._menu)
                    
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

    let menus = []
    let submenus = []
    for(let i in result2){
        if(!result2[i]._menu){
            result2[i]._menu = []
            menus.push(result2[i])
        }else{
            submenus.push(result2[i])
        }
    }

    for(let i in submenus){
        for(let j in menus){

            if(String(submenus[i]._menu._id) === String(menus[j]._id)){
                menus[j]._menu.push(submenus[i])
            }
        }
    }


    return menus
}

self.getMe  =  async(req, res) => {
    
    try {
        
        let user = await User.findOne({ _id: req.user._id }, { "tokens":0, pwd:0 } ).populate(
            { 
                path: "_functions", populate: [
                { 
                    path: "_permissions", populate: [
                        { 
                            path: "_menu", populate: [
                                { 
                                    path: "_menu" 
                                }
                            ]
                        } 
                    ] 
                } 
            ] }
        ).lean()
        
        // Obtener menús y funciones sin repertir y activas
        user.menus = self.getMenu(user)
        user.permissions = self.getPermission(user)
        delete user._functions
        
        return user

    } catch (error) {
        throw new Error(error)
    }
}

self.me  =  async(req, res) => {
    try {
        res.status(200).send(await self.getMe(req, res))
    } catch (error) {
        let obj = error
        if(!error.code){
            obj = {
                code: 401,
                title: 'Error de autenticación',
                detail: error.message,
                suggestion: 'Vuelve a iniciar sesion'
            }
        }
        res.status(obj.code).send(obj)
    }
}

self.resetPass  =  async(req, res) => {    
    try {       

        let _id = req.user._id
        
        const usuario = await User.findOne({_id} )
        
        if (usuario) {
           
            usuario.pwd = req.body.pwd            
            usuario.lastUpdate = new Date().getTime();                        
            await usuario.save()
            
            res.status(200).send("password updated successfully");  
        } else return res.status(409).send({error: 'User no encontrado.'})     
     
    } catch (error) {
        res.status(400).send(error)
    }
}

self.recoverpassword = async (req, res) => {
    try {
        const correo = req.body.email

        const user = await User.findOne({email: correo});
        if (!user) {
            return res.status(409).send({error: 'User no encontrado.'});
        }

        const code = await self.generatecode();
        
        await self.sendcodemail(correo, code);
        
        user.resetCode = code;

        await user.save();

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

self.sendcodemail = async( email, code) =>{
    try {

        const sesClient = new SESClient({ region: process.env.AWS_REGION })

        let user = await User.findOne({email: email},{name:1 , email:1})

     

          let params = {
            Destination: {
              ToAddresses: [
                email
              ]
            },
            "Message": {
                "Body": {
                  "Html": {
                    "Charset": "UTF-8",
                    "Data": "Hola "+ user.name + ", <br><br> Hemos recibido tu solicitud para recuperar tu contraseña de APPrende INE. <br><br> Tu código para cambiar tu contraseña es: <b>" + code +"<b/>"
                  }
                },
                "Subject": {
                    "Charset": "UTF-8",
                    "Data": "APPrende INE"
                  }
                },
            Source: process.env.AWS_EMAIL_SENDER   
          };

          const command = new SendEmailCommand(params);
          return await sesClient.send(command);
 
    } catch (error) {
        throw new Error('Ocurrio un error al envìar el correo electronico');
    }
}

self.verifyCode = async (req, res) => {
    try {
        const correo = req.body.email
        var body = JSON.parse(JSON.stringify(req.body));

        const user = await User.findOne({ email: correo } );

        if (!user) {
            return res.status(409).send({error: 'No se pudo validar la información.'});
        }

        if(user.resetCode == null)
            return res.status(409).send({error: 'El código ha caducado.'});

        if(user.resetCode == body.resetCode)
        {
            user.resetCode = null;
            user.validCode = true;

            await user.save();
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

        const usuario = await User.findOne({ email: correo } )

        if (!usuario) {
            return res.status(409).send({error: 'User no encontrado.'})
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
        
        const _id = req.user._id
        const update = await User.updateOne( { _id },{ $set:req.body, lastUpdate: (new Date()).getTime() })
        
        res.status(202).send(update)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}

self.updatePicture = async( req, res) =>{
    try {
        const s3Client = new S3.S3Client({ region: process.env.AWS_REGION })

        const _id = req.user._id

            let user = await User.findOne({_id})

            if(!user)
             throw new Error('Upss! No se encontró el Elemento')

            const extencionIO = req.files.urlImg.name.split(".");
            const params = {
                Bucket: process.env.AWS_BUCKET,
                Key: 'user' + user._id +'.' + extencionIO[extencionIO.length-1],
                Body: req.files.urlImg.data,
                ContentType: 'application/' + extencionIO[extencionIO.length-1],
                ContentEncoding: 'base64',
                ACL: 'public-read'
            };
        
            // Uploading files to the bucket
            let putObjectPromise = await s3Client.upload(params).promise();

            user.urlImg = putObjectPromise.Location
            user.lastUpdate = (new Date()).getTime()
            
            const result = await user.save()
        
        
        res.status(202).send(result)
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}


self.counter = async(req, res) => {    
    try {
        let result = await User.find({}).countDocuments()
        res.status(200).send({ count: result })
    } catch (error) {
        res.status(400).send({error:error.message})
    }
}