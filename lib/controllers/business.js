const Business = require("../models/Business");
const { AlouxAWS } = require("aloux-iam");
const errorController = require("../config/utils");

const self = module.exports;

self.create = async (req, res) => {
  try {
    req.body.createdAt = new Date().getTime();
    req.body.lastUpdate = req.body.createdAt;
    req.body.status = "status";

    if (req.body.environment && req.body.environment.length > 1) {
      for (let i in req.body.environment) {
        const business = new Business(req.body);
        business.environment = req.body.environment[i];
        await business.save();
      }
    } else {
      const business = new Business(req.body);
      await business.save();
    }
    await res.status(201).send({});
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const retrieve = await Business.find({}, { gkey: 0 }).lean();
    res.status(200).send(retrieve);
  } catch (error) {
    await errorController.responseError(res, error);
  }
};

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
    const update = await Business.updateOne(
      { _id: req.params.BUSINESS_ID },
      { $set: req.body, lastUpdate: new Date().getTime() }
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

    const imgUrl = await AlouxAWS.upload(
      "business/" + "picture" + "-" + req.params.BUSINESS_ID,
      req.files.picture
    );

    business.imgUrl = imgUrl;
    const updateBusiness = await business.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.favicon = async (req, res) => {
  try {
    let business = await Business.findOne({ _id: req.params.BUSINESS_ID });

    const faviconUrl = await AlouxAWS.upload(
      "business/" + "favicon" + "-" + req.params.BUSINESS_ID,
      req.files.favicon
    );

    business.faviconUrl = faviconUrl;
    const updateBusiness = await business.save();

    res.status(202).send(updateBusiness);
  } catch (error) {
    res.status(400).send({ error: error.message });
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
