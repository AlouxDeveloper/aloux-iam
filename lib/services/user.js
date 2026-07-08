const jwt = require("jsonwebtoken")
const User = require('../models/User')
const { hashToken, pickFromSchema } = require('../config/utils')
const self = module.exports

self.create = async (body) => {
  let user

  const nullableUnique = ['username', 'phone', 'email']
  nullableUnique.forEach(field => {
    if (!body[field]) delete body[field]
  })

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
  user.data = {
    ...(body.data || {}),
    changePwd: body.data?.changePwd ?? false
  }

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

self.createServiceAccount = async (body) => {
  const nullableUnique = ['username', 'phone', 'email']
  nullableUnique.forEach(field => {
    if (!body[field]) delete body[field]
  })

  const BLOCKED_FIELDS = ['tokens', 'pwd', 'validateKey', 'createdAt', '_id']
  const safeBody = Object.fromEntries(
    Object.entries(body).filter(([key]) => !BLOCKED_FIELDS.includes(key))
  )

  const user = new User(safeBody)
  user.createdAt = new Date().getTime()
  user.status = body?.status ?? 'Activo'
  user.data = { changePwd: false, isServiceAccount: true }
  user.validateKey = { validateEmail: { emailVerified: true } }

  const rawToken = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET)
  const ttlDays = parseFloat(process.env.SERVICE_ACCOUNT_TTL_DAYS)
  const dateEnd = ttlDays > 0
    ? Date.now() + ttlDays * 24 * 60 * 60 * 1000
    : Number.MAX_SAFE_INTEGER
  user.tokens = [{
    token: hashToken(rawToken),
    displayToken: rawToken,
    date: new Date().getTime(),
    dateEnd,
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
        suggestion: 'El username o correo ya se encuentra registrado',
        error
      }
    }
    throw error
  }

  return { user, token: rawToken }
}

self.update = async (USER_ID, body) => {
  const _id = USER_ID
  const exists = await User.exists({ _id })

  if (!exists) {
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

  const safeBody = pickFromSchema(User, body);
  safeBody.lastUpdate = new Date().getTime();
  const result = await User.updateOne({ _id }, { $set: safeBody })

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