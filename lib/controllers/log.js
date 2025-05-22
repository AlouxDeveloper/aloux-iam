const Log = require("../models/Log");
const Label = require("../models/Label");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const log = new Log(req.body);
    log.createdAt = new Date().getTime();
    log._user = req.user._id;
    const label = await Label.findOne(
      { label: req.body.label },
      { _id: 1 }
    ).lean();
    if (label) {
      log._label = label._id;
      await log.save();
    }

    res.status(201).send(log);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.update = async (req, resp) => {
  try {
    await new Log(req.body).validate();
    const _id = req.params.LOG_ID;
    const count = await Log.findOne({ _id }).countDocuments();
    if (!count) throw new Error("Upss! No se encontró el registro");
    req.body.lastUpdate = new Date().getTime();
    const result = await Log.updateOne({ _id }, req.body);
    resp.status(200).send(req.body);
  } catch (error) {
    resp.status(400).send({ error: error.message });
  }
};
self.status = async (req, resp) => {
  try {
    const _id = req.params.LOG_ID;
    const user = await Log.findOne({ _id });
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
    let query = {};

    if (req.body.users.length) {
      query = {
        _user: { $in: req.body.users },
      };
    }

    const consulta = await Log.find(query)
      .populate([
        { path: "_label" },
        { path: "_user", select: { name: 1, lastName: 1 } },
      ])
      .sort({ createdAt: 1 })
      .lean();

    const response = {
      dataset0: { field: "Total de operaciones", count: consulta.length },
      dataset1: processDataset1(consulta),
      dataset2: processDataset2(consulta),
      dataset3: processDataset3(consulta),
      dataset4: processDataset4(consulta),
      dataset5: processDataset5(consulta),
      dataset6: processDataset6(consulta),
      dataset7: processDataset7(consulta),
    };

    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
  }
};

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
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
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}
function processDataset1(consulta) {
  return consulta.map((item) => {
    return {
      _id: item._id,
      labelDescription: item._label.description,
      userName: item._user.name + " " + item._user.lastName,
      createdAt: item.createdAt,
    };
  });
}

function processDataset2(consulta) {
  const labelCounts = consulta.reduce((acc, item) => {
    const label = item._label.label;
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
    const label = item._label.label;
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
    const date = formatDate(new Date(item.createdAt));
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
    const date = formatDate(new Date(item.createdAt));
    const label = item._label.label;
    categories.add(date);

    if (!labelCountsByDate[date]) {
      labelCountsByDate[date] = {};
    }
    labelCountsByDate[date][label] = (labelCountsByDate[date][label] || 0) + 1;
  });

  const uniqueLabels = new Set(
    Object.values(labelCountsByDate).flatMap(Object.keys)
  );
  const series = Array.from(uniqueLabels).map((label) => ({
    name: label,
    data: Array.from(categories).map(
      (date) => labelCountsByDate[date]?.[label] || 0
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

  // Count activity per user. Assuming data contains _user with name and lastName
  data.forEach((item) => {
    const fullName = `${item._user.name} ${item._user.lastName}`;
    userActivity[fullName] = (userActivity[fullName] || 0) + 1;
  });

  // Sort users by activity count in descending order
  const sortedUsers = Object.entries(userActivity).sort(
    ([, countA], [, countB]) => countB - countA
  );

  // Extract top 10 users
  const topUsers = sortedUsers.slice(0, 10);

  // Build the result object
  const result = {
    counts: topUsers.map(([, count]) => count),
    actionsName: topUsers.map(([fullName]) => fullName.split(" ")),
    field: "Usuarios con mas actividad en la plataforma",
  };

  return result;
}

function processDataset7(data) {
  const userActivity = {};

  // Count activity per user. Assuming data contains _user with name and lastName
  data.forEach((item) => {
    const fullName = `${item._user.name} ${item._user.lastName}`;
    userActivity[fullName] = (userActivity[fullName] || 0) + 1;
  });

  // Sort users by activity count in ascending order
  const sortedUsers = Object.entries(userActivity).sort(
    ([, countA], [, countB]) => countA - countB
  );

  // Extract top 10 least active users
  const leastActiveUsers = sortedUsers.slice(0, 10);

  // Build the result object
  const result = {
    counts: leastActiveUsers.map(([, count]) => count),
    actionsName: leastActiveUsers.map(([fullName]) => fullName.split(" ")),
    field: "Usuarios con menos actividad en la plataforma",
  };

  return result;
}

self.get = async (req, res) => {
  try {
    const _id = req.params.LOG_ID;
    const log = await Log.findOne({ _id });
    if (!log) res.status(404).send();
    res.status(200).send(log);
  } catch (error) {
    res.status(400).send(error);
  }
};

self.delete = async (req, res) => {
  try {
    const _id = req.params.LOG_ID;
    const response = await Log.deleteOne({ _id });
    if (!response.deletedCount)
      res.status(404).send({ error: "El registro no existe" });
    else res.status(200).send({});
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};

self.count = async (req, res) => {
  try {
    let result = await Log.find({}).countDocuments();
    res.status(200).send({ count: result });
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
};
