const Company = require("../models/Company");
const providers = require("../providers");
const errorController = require("../config/utils");
const utils = require("../config/utils");
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
    const { page, itemsPerPage, search, status } = req.query;
    const paginate = page != null && itemsPerPage != null;
    let query = {};

    if (search) {
      const s = utils.escapeRegex(String(search));
      query.$or = [{ name: { $regex: s, $options: "i" } }];
    }

    if (status) {
      query.status = status;
    }

    if (paginate) {
      const perPage = Math.min(Number(itemsPerPage), 100);
      const count = await Company.countDocuments(query);
      const items = await Company.find(query, { gkey: 0 })
        .skip(perPage * (Number(page) - 1))
        .limit(perPage)
        .sort({ createdAt: -1 })
        .lean();
      const response = await utils.generatePaginationResponse(count, Number(page), perPage, items);
      const active = await Company.countDocuments({ status: "Activo" });
      const inactive = await Company.countDocuments({ status: "Inactivo" });
      response.summary = { active, inactive, total: active + inactive };
      return res.status(200).send(response);
    }

    const retrieve = await Company.find(query, { gkey: 0 }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieveMy = async (req, res) => {
  try {
    let query = { _id: { $in: req.user._company } };
    const retrieve = await Company.find(query, { name: 1, id: 1, imgUrl: 1, faviconUrl: 1 }).lean();
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
    const payload = errorController.pickFromSchema(Company, req.body);
    payload.lastUpdate = new Date().getTime();
    const update = await Company.updateOne(
      { _id: req.params.COMPANY_ID },
      { $set: payload }
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

    const imgUrl = await providers.storage()?.upload(
      "company/picture-" + req.params.COMPANY_ID,
      req.files.picture
    );

    company.imgUrl = imgUrl;
    const updateCompany = await company.save();

    res.status(202).send(updateCompany);
  } catch (error) {
    console.error(error);
    errorController.responseError(res, error);
  }
};

self.favicon = async (req, res) => {
  try {
    let company = await Company.findOne({ _id: req.params.COMPANY_ID });

    const faviconUrl = await providers.storage()?.upload(
      "company/favicon-" + req.params.COMPANY_ID,
      req.files.favicon
    );

    company.faviconUrl = faviconUrl;
    const updateCompany = await company.save();

    res.status(202).send(updateCompany);
  } catch (error) {
    errorController.responseError(res, error);
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

self.updateGkey = async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.COMPANY_ID });
    if (!company) throw { code: 404, title: "No encontrado", detail: "No existe la organización" };

    company.data = { ...(company.data || {}), gkey: req.body.gkey };
    company.lastUpdate = new Date().getTime();
    company.markModified("data");
    await company.save();

    res.status(202).send({ ok: true });
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.deleteGkey = async (req, res) => {
  try {
    const company = await Company.findOne({ _id: req.params.COMPANY_ID });
    if (!company) throw { code: 404, title: "No encontrado", detail: "No existe la organización" };

    const newData = { ...(company.data || {}) };
    delete newData.gkey;

    company.data = newData;
    company.lastUpdate = new Date().getTime();
    company.markModified("data");
    await company.save();

    res.status(200).send({ ok: true });
  } catch (error) {
    await errorController.responseError(res, error);
  }
};