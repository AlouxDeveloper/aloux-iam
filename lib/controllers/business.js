const Business = require("../models/Business");
const Company = require("../models/Company");
const utils = require("../config/utils");
const providers = require("../providers");
const errorController = require("../config/utils");
const { resolveGkey } = require("../config/utils");

const self = module.exports;

self.create = async (req, res) => {
  try {
    req.body.createdAt = new Date().getTime();
    req.body.lastUpdate = req.body.createdAt;
    req.body.status = "Activo";

    let inheritedGkey = null;
    if (req.body.data?.useCompanyKey && req.body._company) {
      const company = await Company.findOne({ _id: req.body._company }).lean();
      const companyGkey = company?.data?.gkey;
      if (companyGkey?.status) inheritedGkey = companyGkey;
    }

    if (req.body.environment && req.body.environment.length > 1) {
      for (let i in req.body.environment) {
        const business = new Business(req.body);
        business.environment = req.body.environment[i];
        if (inheritedGkey) business.gkey = inheritedGkey;
        await business.save();
      }
    } else {
      const business = new Business(req.body);
      if (inheritedGkey) business.gkey = inheritedGkey;
      await business.save();
    }

    await res.status(201).send({});
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const { page, itemsPerPage, search, status, _company, environment } = req.query
    const paginate = page != null && itemsPerPage != null
    let query = {}

    if (search) {
      const s = utils.escapeRegex(String(search))
      query.$or = [{ name: { $regex: s, $options: 'i' } }]
    }

    if (status) {
      query.status = status
    }

    if (_company) {
      query._company = _company
    }

    if (environment) {
      query.environment = environment
    }

    if (paginate) {
      const perPage = Math.min(Number(itemsPerPage), 100)
      const count = await Business.countDocuments(query)
      const items = await Business.find(query, { gkey: 0 }).populate('_company').skip(perPage * (Number(page) - 1)).limit(perPage).sort({ createdAt: -1 }).lean()
      const response = await utils.generatePaginationResponse(count, Number(page), perPage, items)
      const active = await Business.countDocuments({ status: 'Activo' })
      const inactive = await Business.countDocuments({ status: 'Inactivo' })
      response.summary = { active, inactive, total: active + inactive }
      return res.status(200).send(response)
    }

    const retrieve = await Business.find(query, { gkey: 0 }).populate('_company').lean()
    res.status(200).send(retrieve)
  } catch (error) {
    await errorController.responseError(res, error)
  }
}

self.retrieveByCompany = async (req, res) => {
  try {
    const retrieve = await Business.find(
      { _company: { $in: req.body.companies } },
      { name: 1, _company: 1, environment: 1 }
    )
      .populate("_company")
      .lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieveMy = async (req, res) => {
  try {
    let query = {};
    if (req.user._functions[0].name !== "Propietario") {
      query = { _id: req.user._business };
    }
    const retrieve = await Business.find(query, {
      name: 1,
      id: 1,
      environment: 1,
    }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieveMyCompany = async (req, res) => {
  try {
    let query = {
      _id: req.user._business,
      _company: req.params.COMPANY_ID,
    };
    const retrieve = await Business.find(query, {
      name: 1,
      imgUrl: 1,
      faviconUrl: 1,
      id: 1,
      environment: 1,
    }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.detail = async (req, res) => {
  try {
    const detail = await Business.findOne(
      {
        _id: req.params.BUSINESS_ID,
      },
      { "gkey.key": 0 }
    )
      .populate("_company")
      .lean();
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
    const payload = errorController.pickFromSchema(Business, req.body);
    payload.lastUpdate = new Date().getTime();
    const update = await Business.updateOne(
      { _id: req.params.BUSINESS_ID },
      { $set: payload }
    );
    res.status(202).send(update);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.delete = async (req, res) => {
  try {
    let business = await Business.findOne({
      _id: req.params.BUSINESS_ID,
    }).lean();

    if (!business) {
      throw {
        code: 404,
        title: "No se encontro el elemento",
        detail: "No se encontro el negocio",
        suggestion: "Verifica su existencia",
      };
    }

    await Business.deleteOne({
      _id: req.params.BUSINESS_ID,
    });

    res.status(200).send("Success");
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.picture = async (req, res) => {
  try {
    let business = await Business.findOne({ _id: req.params.BUSINESS_ID });

    const imgUrl = await providers.storage()?.upload(
      "business/picture-" + req.params.BUSINESS_ID,
      req.files.picture
    );

    business.imgUrl = imgUrl;
    const updateBusiness = await business.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    errorController.responseError(res, error);
  }
};

self.favicon = async (req, res) => {
  try {
    let business = await Business.findOne({ _id: req.params.BUSINESS_ID });

    const faviconUrl = await providers.storage()?.upload(
      "business/favicon-" + req.params.BUSINESS_ID,
      req.files.favicon
    );

    business.faviconUrl = faviconUrl;
    const updateBusiness = await business.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    errorController.responseError(res, error);
  }
};

self.identity = async (req, res) => {
  try {
    const detail = await Business.findOne(
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

self.setUseCompanyKey = async (req, res) => {
  try {
    const business = await Business.findOne({ _id: req.params.BUSINESS_ID }).lean();
    if (!business) throw { code: 404, title: "No encontrado", detail: "No existe el negocio" };

    await Business.updateOne(
      { _id: req.params.BUSINESS_ID },
      {
        $unset: { gkey: "" },
        $set: {
          "data.useCompanyKey": false,
          lastUpdate: new Date().getTime(),
        },
      }
    );

    res.status(202).send({ ok: true });
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.inheritKey = async (req, res) => {
  try {
    const business = await Business.findOne({ _id: req.params.BUSINESS_ID })
      .populate("_company")
      .lean();
    if (!business) throw { code: 404, title: "No encontrado", detail: "No existe el negocio" };

    const companyGkey = business._company?.data?.gkey;
    if (!companyGkey?.status) throw {
      code: 400,
      title: "Sin llave",
      detail: "La organización no tiene una llave de Google Cloud configurada",
    };

    await Business.updateOne(
      { _id: req.params.BUSINESS_ID },
      {
        $set: {
          gkey: companyGkey,
          "data.useCompanyKey": true,
          lastUpdate: new Date().getTime(),
        },
      }
    );

    res.status(202).send({ ok: true });
  } catch (error) {
    await errorController.responseError(res, error);
  }
};