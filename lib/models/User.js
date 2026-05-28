const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { hashToken } = require("../config/utils");
const ObjectId = mongoose.Schema.Types.ObjectId;

const adminSchema = mongoose.Schema({
  name: { type: String, required: true, trim: true },
  lastName: { type: String, required: false, trim: true },
  email: {
    type: String,
    required: false,
    trim: true,
    unique: true,
    sparse: true,
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
      resetCode: { type: String },
      validCode: { type: Boolean, default: false },
    },
    validateEmail: {
      emailVerified: { type: Boolean, default: false },
      verifyMailToken: { type: String },
    },
    validatePhone: {
      codeVerifyPhone: { type: String },
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
      type: { type: String, enum: ["session", "api"], default: "session" },
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

adminSchema.pre("save", async function () {
  const user = this;

  if (user.isModified("pwd")) {
    user.pwd = await bcrypt.hash(user.pwd, 12);
  }
});

adminSchema.methods.generateAuthToken = async function () {
  const user = this;

  const token = jwt.sign({ _id: user._id }, process.env.AUTH_SECRET);
  const currentDate = new Date().getTime();
  const dateEnd = currentDate + parseInt(process.env.SESSION_TIME, 10) * 60 * 1000;

  // Prune expired session tokens before adding a new one
  user.tokens = user.tokens.filter(t => t.type === 'api' || t.dateEnd > currentDate);
  // Store only the SHA-256 hash — the raw token is returned to the client but never persisted
  user.tokens = user.tokens.concat({ token: hashToken(token), date: currentDate, dateEnd });

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
