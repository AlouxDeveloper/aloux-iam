const Label = require("../models/Label");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const label = new Label(req.body);
    label.createdAt = new Date().getTime();
    label.status = "Activo";
    await label.save();
    res.status(201).send(label);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.update = async (req, resp) => {
  try {
    await new Label(req.body).validate();
    const _id = req.params.LABEL_ID;
    const count = await Label.findOne({ _id }).countDocuments();
    if (!count) throw new Error("Upss! No se encontró el registro");
    req.body.lastUpdate = new Date().getTime();
    const result = await Label.updateOne({ _id }, req.body);
    resp.status(200).send(req.body);
  } catch (error) {
    resp.status(400).send({ error: error.message });
  }
};
self.status = async (req, resp) => {
  try {
    const _id = req.params.LABEL_ID;
    const user = await Label.findOne({ _id });
    if (!user) throw new Error("Upss! No se encontró el Elemento");
    user.status = req.body.status;
    user.lastUpdate = new Date().getTime();
    const result = await user.save();
    resp.status(200).send(result);
  } catch (error) {
    resp.status(400).send({ error: error.message });
  }
};
self.retrieve = async (req, res) => {
  try {
    const consulta = await Label.find({}).sort({ index: 1 });
    if (!consulta) res.status(404).send();
    res.status(200).send(consulta);
  } catch (error) {
    res.status(400).send(error);
  }
};

self.get = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const label = await Label.findOne({ _id });
    if (!label) res.status(404).send();
    res.status(200).send(label);
  } catch (error) {
    res.status(400).send(error);
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const response = await Label.deleteOne({ _id });
    if (!response.deletedCount)
      res.status(404).send({ error: "El registro no existe" });
    else res.status(200).send({});
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.count = async (req, res) => {
  try {
    let result = await Label.find({}).countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
