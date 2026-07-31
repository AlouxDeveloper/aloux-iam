const Log = require("../models/Log");
const Label = require("../models/Label");
const Functions = require("../models/Functions");
const mongoose = require("mongoose");
const utils = require("../config/utils");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const companyId =
      req.header("Company") !== "undefined" ? req.header("Company") : null;

    const log = new Log(req.body);
    const businessId =
      req.header("business") !== "undefined" ? req.header("business") : null;
    log.createdAt = new Date().getTime();
    log._user = req.user._id;
    log._company = companyId;
    log._business = businessId;

    log.label = req.body.label;
    await log.save();
    res.status(201).send(log);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.update = async (req, res) => {
  try {
    await new Log(req.body).validate();
    const _id = req.params.LOG_ID;
    const exists = await Log.exists({ _id });
    if (!exists) throw new Error("Upss! No se encontró el registro");
    req.body.lastUpdate = new Date().getTime();
    await Log.updateOne({ _id }, req.body);
    res.status(200).send(req.body);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.status = async (req, res) => {
  try {
    const _id = req.params.LOG_ID;
    const log = await Log.findOne({ _id });
    if (!log) throw new Error("Upss! No se encontró el Elemento");
    log.status = req.body.status;
    log.lastUpdate = new Date().getTime();
    const result = await log.save();
    res.status(200).send(result);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.retrieve = async (req, res) => {
  try {
    const companyId =
      req.header("Company") !== "undefined" ? req.header("Company") : null;

    const excludeFunctions = req.body.excludeFunctions || [];

    const excludeFuncs = await Functions.find({
      name: { $in: excludeFunctions },
    }).lean();

    const excludeIds = excludeFuncs.map((f) => f._id);

    const query = { _company: companyId };

    if (Array.isArray(req.body.users)) {
      query._user = {
        $in: req.body.users.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (req.body.dateStart || req.body.dateEnd) {
      query.createdAt = {};
      if (req.body.dateStart) query.createdAt.$gte = Number(req.body.dateStart);
      if (req.body.dateEnd) query.createdAt.$lte = Number(req.body.dateEnd);
    }

    if (Array.isArray(req.body.business)) {
      query._business = { $in: req.body.business };
    }

    const consulta = await Log.find(query)
      .sort({ createdAt: 1 })
      .populate({
        path: "_user",
        select: "name lastName email _functions",
        match: excludeIds.length ? { _functions: { $nin: excludeIds } } : {},
      });

    const filtrados = consulta.filter((log) => log._user !== null);

    const response = {
      dataset0: { field: "Visualizaciones totales", count: filtrados.length },
      dataset1: processDataset1(filtrados),
      dataset2: processDataset2(filtrados),
      dataset3: processDataset3(filtrados),
      dataset4: processDataset4(filtrados),
      dataset5: processDataset5(filtrados),
      dataset6: processDataset6(filtrados),
      dataset7: processDataset7(filtrados),
      dataset8: processDataset8(
        filtrados,
        req.body.search,
        req.body.page,
        req.body.limit,
      ),
    };

    res.status(200).send(response);
  } catch (error) {
    utils.responseError(res, error);
  }
};

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  const monthNames = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  return `${day} ${monthNames[parseInt(month) - 1]} ${year}`;
}

function processDataset1(consulta) {
  return consulta.map((item) => ({
    _id: item._id,
    labelDescription: item.label,
    userName: item._user.name + " " + item._user.lastName,
    userEmail: item._user.email,
    createdAt: item.createdAt,
  }));
}

function processDataset2(consulta) {
  const labelCounts = consulta.reduce((acc, item) => {
    const label = item.label;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return {
    field: "Distribución de acciones",
    counts: Object.values(labelCounts),
    operations: Object.keys(labelCounts),
  };
}

function processDataset3(consulta) {
  const labelCounts = consulta.reduce((acc, item) => {
    const label = item.label;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return {
    field: "Distribución de acciones",
    items: Object.keys(labelCounts).map((label) => ({
      addGroup: label,
      totalResponse: labelCounts[label],
    })),
  };
}

function processDataset4(consulta) {
  const dateCounts = consulta.reduce((acc, item) => {
    const isoDate = new Date(item.createdAt).toISOString().split("T")[0];
    const date = formatDate(isoDate);
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {});

  return {
    field: "Actividad en la plataforma",
    counts: Object.values(dateCounts),
    actionsName: Object.keys(dateCounts),
  };
}

function processDataset5(consulta) {
  const labelCountsByDate = {};
  const categories = new Set();

  consulta.forEach((item) => {
    const isoDate = new Date(item.createdAt).toISOString().split("T")[0];
    const date = formatDate(isoDate);
    const label = item.label;
    categories.add(date);

    if (!labelCountsByDate[date]) {
      labelCountsByDate[date] = {};
    }
    labelCountsByDate[date][label] = (labelCountsByDate[date][label] || 0) + 1;
  });

  const uniqueLabels = new Set(
    Object.values(labelCountsByDate).flatMap(Object.keys),
  );
  const series = Array.from(uniqueLabels).map((label) => ({
    name: label,
    data: Array.from(categories).map(
      (date) => labelCountsByDate[date]?.[label] || 0,
    ),
  }));

  return {
    field: "Actividad en la plataforma por operación",
    categories: Array.from(categories),
    series: series,
  };
}

function processDataset6(data) {
  const userActivity = {};

  data.forEach((item) => {
    const fullName = `${item._user.name} ${item._user.lastName}`;
    userActivity[fullName] = (userActivity[fullName] || 0) + 1;
  });

  const topUsers = Object.entries(userActivity)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  return {
    field: "Usuarios con mas actividad en la plataforma",
    counts: topUsers.map(([, count]) => count),
    actionsName: topUsers.map(([fullName]) => fullName.split(" ")),
  };
}

function processDataset7(data) {
  const userActivity = {};

  data.forEach((item) => {
    const fullName = `${item._user.name} ${item._user.lastName}`;
    userActivity[fullName] = (userActivity[fullName] || 0) + 1;
  });

  const leastUsers = Object.entries(userActivity)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 10);

  return {
    field: "Usuarios con menos actividad en la plataforma",
    counts: leastUsers.map(([, count]) => count),
    actionsName: leastUsers.map(([fullName]) => fullName.split(" ")),
  };
}

function processDataset8(data, search = "", page = 1, limit = null) {
  const userActivity = {};

  data.forEach((item) => {
    const fullName = `${item._user.name} ${item._user.lastName}`;
    if (!userActivity[fullName]) {
      userActivity[fullName] = {
        name: item._user.name,
        lastName: item._user.lastName,
        email: item._user.email,
        count: 0,
      };
    }
    userActivity[fullName].count++;
  });

  let users = Object.values(userActivity).sort((a, b) => b.count - a.count);

  if (search) {
    const s = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    users = users.filter((u) => {
      const full = `${u.name} ${u.lastName} ${u.email}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return full.includes(s);
    });
  }

  const total = users.length;
  const paginate = limit !== null && limit !== undefined;
  const parsedLimit = paginate ? parseInt(limit) : total;
  const parsedPage = parseInt(page);
  const start = (parsedPage - 1) * parsedLimit;
  const items = paginate ? users.slice(start, start + parsedLimit) : users;

  return {
    field: "Actividad de usuarios",
    total,
    page: parsedPage,
    limit: parsedLimit,
    totalPages: paginate ? Math.ceil(total / parsedLimit) : 1,
    items,
  };
}

self.get = async (req, res) => {
  try {
    const _id = req.params.LOG_ID;
    const log = await Log.findOne({ _id });
    if (!log) return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "Verifica el ID del log" });
    res.status(200).send(log);
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.LOG_ID;
    const response = await Log.deleteOne({ _id });
    if (!response.deletedCount)
      return res.status(404).send({ code: 404, title: "No encontrado", detail: "", suggestion: "El registro no existe" });
    res.status(200).send({});
  } catch (error) {
    utils.responseError(res, error);
  }
};

self.count = async (req, res) => {
  try {
    const result = await Log.countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    utils.responseError(res, error);
  }
};
