const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ObjectId = mongoose.Schema.Types.ObjectId;

const adminSchema = mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lastName: { type: String, required: false, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
  },
  pwd: { type: String, trim: true, minLength: 8 },
  phone: { type: String, trim: true, maxLength: 13 },
  phoneObj: {
    e164: { type: String, trim: true, maxLength: 13 },
    input: { type: String, trim: true, maxLength: 12 },
    international: { type: String, trim: true, maxLength: 20 },
    national: { type: String, trim: true, maxLength: 13 },
    rfc3966: { type: String, trim: true, maxLength: 30 },
    significant: { type: String, trim: true, maxLength: 10 },
    country: { type: String, trim: true, maxLength: 10 },
    dialCode: { type: String, trim: true, maxLength: 10 },
    icon: { type: String, trim: true, maxLength: 10 },
    regionCode: { type: String, trim: true, maxLength: 10 },
  },
  urlImg: { type: String },
  data: {
    type: Object,
    default: { changePwd: false },
  },
  validateKey: {
    failedAttempts: { type: Number, default: 0 },
    limitCodeTime: { type: Number },
    resetPassword: {
      resetCode: { type: Number },
      validCode: { type: Boolean, default: false },
    },
    validateEmail: {
      emailVerified: { type: Boolean, default: false },
      verifyMailToken: { type: String },
    },
    validatePhone: {
      codeVerifyPhone: { type: Number },
      validCodePhone: { type: Boolean, default: false },
    },
  },
  _functions: [
    {
      type: ObjectId,
      required: true,
      ref: "Functions",
    },
  ],
  _business: [
    {
      type: ObjectId,
      ref: "Business",
    },
  ],
  _company: [
    {
      type: ObjectId,
      ref: "Company",
    },
  ],
  _client: [
    {
      type: ObjectId,
      ref: "Client",
    },
  ],
  tokens: [
    {
      token: { type: String, required: true },
      date: { type: Number },
      dateEnd: { type: Number },
    },
  ],

  status: {
    type: String,
    required: true,
    enum: ["Activo", "Inactivo", "Bloqueado"],
    default: "Activo",
  },
  createdAt: { type: Number },
  lastUpdate: { type: Number },
});

adminSchema.pre("save", async function (next) {
  const user = this;

  if (user.isModified("pwd")) {
    user.pwd = await bcrypt.hash(user.pwd, 8);
  }

  next();
});

adminSchema.methods.generateAuthToken = async function () {
  const user = this;

  const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET);
  const currentDate = new Date().getTime();
  const dateEnd = currentDate + process.env.SESSION_TIME * 60 * 1000;
  user.tokens = user.tokens.concat({ token, date: currentDate, dateEnd });

  await user.save();

  return token;
};

adminSchema.statics.findByCredentials = async (email, pwd) => {
  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      throw new Error({ error: "Invalid login credentials" });
    }

    const isPasswordMatch = await bcrypt.compare(pwd, user.pwd);

    if (!isPasswordMatch) {
      throw new Error({ error: "Invalid login credentials" });
    }

    return user;
  } catch (error) {}
};

const User = mongoose.model("User", adminSchema);
module.exports = User;
