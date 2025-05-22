const Company = require("../models/Company");
const { AlouxAWS } = require("aloux-iam");
const errorController = require("../config/utils");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const company = new Company(req.body);
    company.createdAt = new Date().getTime();
    company.lastUpdate = company.createdAt;
    company.status = company.status || "Activo";
    const create = await company.save();
    await res.status(201).send(create);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const retrieve = await Company.find({}, { gkey: 0 }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieveMy = async (req, res) => {
  try {
    let query = { _id: { $in: req.user._company } };
    const retrieve = await Company.find(query, { name: 1, id: 1 }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.detail = async (req, res) => {
  try {
    const detail = await Company.findOne(
      {
        _id: req.params.COMPANY_ID,
      },
      { "gkey.key": 0 }
    ).lean();
    if (!detail) {
      throw {
        code: 404,
        title: "No se encontro el elemento",
        detail: "No existe el negocio seleccionado",
        suggestion: "Revisa que el negocio exista",
      };
    }
    res.status(200).send(detail);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.update = async (req, res) => {
  try {
    const update = await Company.updateOne(
      { _id: req.params.COMPANY_ID },
      { $set: req.body, lastUpdate: new Date().getTime() }
    );
    res.status(202).send(update);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.delete = async (req, res) => {
  try {
    let company = await Company.findOne({
      _id: req.params.COMPANY_ID,
    }).lean();

    if (!company) {
      throw {
        code: 404,
        title: "No se encontro el elemento",
        detail: "No se encontro el negocio",
        suggestion: "Verifica su existencia",
      };
    }

    await Company.deleteOne({
      _id: req.params.COMPANY_ID,
    });

    res.status(200).send("Success");
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.picture = async (req, res) => {
  try {
    let company = await Company.findOne({ _id: req.params.COMPANY_ID });

    const imgUrl = await AlouxAWS.upload(
      "company/" + "picture" + "-" + req.params.COMPANY_ID,
      req.files.picture
    );

    company.imgUrl = imgUrl;
    const updateBusiness = await company.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.favicon = async (req, res) => {
  try {
    let company = await Company.findOne({ _id: req.params.COMPANY_ID });

    const faviconUrl = await AlouxAWS.upload(
      "company/" + "favicon" + "-" + req.params.COMPANY_ID,
      req.files.favicon
    );

    company.faviconUrl = faviconUrl;
    const updateBusiness = await company.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.identity = async (req, res) => {
  try {
    const detail = await Company.findOne(
      {
        id: req.params.ID,
      },
      { name: 1, imgUrl: 1, faviconUrl: 1 }
    ).lean();
    if (!detail) {
      throw {
        code: 404,
        title: "No se encontro el elemento",
        detail: "No existe el negocio seleccionado",
        suggestion: "Revisa que el negocio exista",
      };
    }
    delete detail._id;
    res.status(200).send(detail);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};
