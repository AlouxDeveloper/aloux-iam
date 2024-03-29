const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const ObjectId = mongoose.Schema.Types.ObjectId

const adminSchema = mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  lastName:         { type: String, required: true, trim: true },
  email:            { type: String, required: true, trim: true, unique: true, lowercase: true },
  pwd:              { type: String, required: true, trim: true, minLength: 8 },
  key:              { type: String, required: true, trim: true, maxLength: 8 },
  phone:            { type: String, trim: true, maxLength: 13 },
  urlImg:           { type: String},
  validateKey:      {
    limitCodeTime:  { type: Number },
    resetPassword:  {
                      resetCode:        { type: Number },
                      validCode:        { type: Boolean, default: false },
                    },
    validateEmail:  {
                      emailVerified:    { type: Boolean, default: false },
                      verifyMailToken:  { type: String },
                    },
    validatePhone:  {
                      codeVerifyPhone:  {type: Number},
                      validCodePhone:   {type: Boolean, default: false},
                    }
  },
  menus:            { type: Array },
  permissions:      { type: Object },
  _functions: [ 
                { 
                  type: ObjectId, required: true, ref: 'Functions' 
                }
              ],
  _client: [ 
                { 
                  type: ObjectId, required: false, ref: 'Client' 
                }
              ],
  tokens:     [ 
                { 
                  token: { type: String, required: true },
                  date: { type: Number}
                } 
              ],
              
  status:           { type: String },
  createdAt:        { type: Number },
  lastUpdate:       { type: Number }
})

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
  user.tokens = user.tokens.concat({ token });

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

const User = mongoose.model("User", adminSchema)
module.exports = User
