const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const businessSchema = mongoose.Schema({
  name: { type: String, required: true, trim: true, maxLength: 200 },
  id: { type: String, required: false },
  imgUrl: { type: String, required: false, trim: true, maxLength: 500 },
  data: { type: Object, required: false },
  imgUrl: { type: String, required: false },
  faviconUrl: { type: String, required: false },

  gkey: {
    bigQueryTest: {
      status: { type: Boolean, required: false },
      date: { type: Number, required: false },
      error: { type: String, required: false },
    },
    storageTest: {
      status: { type: Boolean, required: false },
      date: { type: Number, required: false },
      error: { type: String, required: false },
    },
    status: { type: Boolean, required: false },
    date: { type: Number, required: false },
    projectId: { type: String, required: false },
    key: {
      type: { type: String, required: false },
      project_id: { type: String, required: false },
      private_key_id: { type: String, required: false },
      private_key: { type: String, required: false },
      client_email: { type: String, required: false },
      client_id: { type: String, required: false },
      auth_uri: { type: String, required: false },
      token_uri: { type: String, required: false },
      auth_provider_x509_cert_url: { type: String, required: false },
      client_x509_cert_url: { type: String, required: false },
      universe_domain: { type: String, required: false },
    },
  },
  _company: { type: ObjectId, ref: "Company" },
  status: { type: String, required: true, enum: ["Activo", "Inactivo"] },
  createdAt: { type: Number },
  lastUpdate: { type: Number },
  environment: { type: String, enum: ["dev", "qa", "prod"] },
});

const Business = mongoose.model("Business", businessSchema);
module.exports = Business;
