const jwt = require("jsonwebtoken")
const User = require('../models/User')
const self = module.exports

self.create = async (body) => {
  let user
  const isServiceAccount = !body.email && !body.pwd

  const nullableUnique = ['username', 'phone', 'email']
  nullableUnique.forEach(field => {
    if (!body[field]) delete body[field]
  })

  if (isServiceAccount) {
    user = new User(body)
    user.createdAt = new Date().getTime()
    user.status = body?.status ?? 'Activo'
    user.data = { changePwd: false }

    const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET)
    user.tokens = [{
      token,
      date: new Date().getTime(),
      dateEnd: Number.MAX_SAFE_INTEGER,
      type: 'api'
    }]

    try {
      await user.save()
    } catch (error) {
      if (error.code === 11000) {
        throw {
          code: 409,
          title: 'Upss!',
          detail: 'Clave duplicada',
          suggestion: 'El username ya se encuentra registrado',
          error
        }
      }
      throw error
    }

    return user
  }

  // Flujo normal
  if (body.email) {
    const exists = await User.findOne({ email: body.email }).lean()
    if (exists) {
      throw {
        code: 409,
        title: 'Upss!',
        detail: '',
        suggestion: 'El correo ya se encuentra registrado',
        error: new Error()
      }
    }
  }

  user = new User(body)
  user.createdAt = new Date().getTime()
  user.status = body?.status ?? 'Activo'
  user.data = { changePwd: false }

  try {
    await user.save()
  } catch (error) {
    if (error.code === 11000) {
      throw {
        code: 409,
        title: 'Upss!',
        detail: 'Clave duplicada',
        suggestion: 'El correo o username ya se encuentra registrado',
        error
      }
    }
    throw error
  }

  return user
}

self.update = async (USER_ID, body) => {
  const _id = USER_ID
  const user = await User.findOne({ _id }).countDocuments().lean()

  if (!user) {
    throw {
      code: 404,
      title: 'Upss!',
      detail: 'No se encontró el elemento',
      suggestion: 'Verifica que el usuario aun este activo en la plataforma',
      error: new Error()
    }
  }

  if (body.phone) {
    await User.updateOne({ _id }, { 'validateKey.validatePhone.validCodePhone': false })
  }

  body.lastUpdate = new Date().getTime()
  const result = await User.updateOne({ _id }, { $set: body })

  return result
}

self.status = async (USER_ID, body) => {
  const _id = USER_ID
  const user = await User.findOne({ _id })

  if (!user) {
    throw {
      code: 404,
      title: 'Upss!',
      detail: 'No se encontró el elemento',
      suggestion: 'Verifica que el usuario aun este activo en la plataforma',
      error: new Error()
    }
  }

  user.status = body.status
  user.lastUpdate = new Date().getTime()

  return await user.save()
}

self.updatepassword = async (body, USER_ID) => {
  const _id = USER_ID
  const user = await User.findOne({ _id })

  if (!user) {
    throw {
      code: 404,
      title: 'Upss!',
      detail: 'No se encontró el elemento',
      suggestion: 'Verifica que el usuario aun este activo en la plataforma',
      error: new Error()
    }
  }

  user.pwd = body.pwd
  user.lastUpdate = new Date().getTime()

  return await user.save()
}

self.checkUsername = async (name) => {
  if (!name) {
    throw {
      code: 400,
      title: 'El nombre es requerido',
      detail: '',
      suggestion: 'Envía un nombre para generar el username',
      error: new Error()
    }
  }
  const username = await generateUniqueUsername(name)
  return { username }
}