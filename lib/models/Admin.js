const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const ObjectId = mongoose.Schema.Types.ObjectId

const adminSchema = mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  lastName:   { type: String, required: true, trim: true },
  phone:      { type: String, required: true, trim: true, minLength: 10 },
  email:      { type: String, required: true,unique: true, lowercase: true },
  pwd:        { type: String, required: true,minLength: 7 },
  isActive:     { type: Boolean, default : true },
  date:       { type: Number },
  lastdate:   { type: Number },
  lastUpdate: { type: Number },
  resetCode:  { type: Number },
  validCode:  { type: Boolean, default: false },
  urlImg:     { type: String},
  menu:       { type: Array },
  permission: { type: Object },
  _functions: [ 
                { 
                  type: ObjectId, required: true, ref: 'Functions' 
                }
              ],
  tokens:     [ 
                { 
                  token: { type: String, required: true },
                  date: { type: Number}
                } 
              ]
})

adminSchema.pre("save", async function (next) {
  const admin = this;

  if (admin.isModified("pwd")) {
    admin.pwd = await bcrypt.hash(admin.pwd, 8);
  }

  next();
});

adminSchema.methods.generateAuthToken = async function () {
  const admin = this;

  const token = jwt.sign({ _id: admin._id }, process.env.AUTH_SECRET);
  admin.tokens = admin.tokens.concat({ token });

  await admin.save();

  return token;
};

adminSchema.statics.findByCredentials = async (email, pwd) => {
  try {
    const admin = await Admin.findOne({ email: email });
    
    if (!admin) {  
      throw new Error({ error: "Invalid login credentials" });
    }
    
    const isPasswordMatch = await bcrypt.compare(pwd, admin.pwd);
    
    if (!isPasswordMatch) {  
      throw new Error({ error: "Invalid login credentials" });
    }

    return admin;
  } catch (error) {}
};

const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
