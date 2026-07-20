const Label = require("../models/Label");
const utils = require("../config/utils");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const label = new Label(req.body);
    label.createdAt = new Date().getTime();
    label.status = "Activo";
    await label.save();
    res.status(201).send(label);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.update = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const exists = await Label.exists({ _id });
    if (!exists) throw new Error("Upss! No se encontró el registro");
    const payload = utils.pickFromSchema(Label, req.body);
    payload.lastUpdate = new Date().getTime();
    await Label.updateOne({ _id }, payload);
    res.status(200).send(payload);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.status = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const label = await Label.findOne({ _id });
    if (!label) throw new Error("Upss! No se encontró el Elemento");
    label.status = req.body.status;
    label.lastUpdate = new Date().getTime();
    const result = await label.save();
    res.status(200).send(result);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const { page, itemsPerPage, search, status } = req.query;
    const paginate = page != null && itemsPerPage != null;
    let query = {};

    if (search) {
      const s = utils.escapeRegex(String(search));
      query.$or = [
        { label: { $regex: s, $options: "i" } },
        { description: { $regex: s, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paginate) {
      const perPage = Math.min(Number(itemsPerPage), 100);
      const count = await Label.countDocuments(query);
      const items = await Label.find(query)
        .skip(perPage * (Number(page) - 1))
        .limit(perPage)
        .sort({ index: 1 })
        .lean();
      const response = await utils.generatePaginationResponse(count, Number(page), perPage, items);
      const active = await Label.countDocuments({ status: "Activo" });
      const inactive = await Label.countDocuments({ status: "Inactivo" });
      response.summary = { active, inactive, total: active + inactive };
      return res.status(200).send(response);
    }

    const consulta = await Label.find(query).sort({ index: 1 }).lean();
    res.status(200).send(consulta);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.get = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const label = await Label.findOne({ _id });
    if (!label) return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "Verifica el ID de la etiqueta" });
    res.status(200).send(label);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.LABEL_ID;
    const response = await Label.deleteOne({ _id });
    if (!response.deletedCount)
      return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" });
    res.status(200).send({});
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.count = async (req, res) => {
  try {
    const result = await Label.countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    utils.responseError(res, error);
  }
};
