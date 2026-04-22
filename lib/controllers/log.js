const Log = require("../models/Log");
const Label = require("../models/Label");
const mongoose = require("mongoose");
const self = module.exports;

self.create = async (req, res) => {
  try {
    const companyId =
      req.header("Company") !== "undefined" ? req.header("Company") : null;

    const log = new Log(req.body);
    log.createdAt = new Date().getTime();
    log._user = req.user._id;
    log._company = companyId;

    log.label = req.body.label;
    await log.save();
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
    const companyId =
      req.header("Company") !== "undefined" ? req.header("Company") : null;

    const matchStage = { _company: companyId };

    if (req.body.users?.length) {
      matchStage._user = {
        $in: req.body.users.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (req.body.dateStart || req.body.dateEnd) {
      matchStage.createdAt = {};
      if (req.body.dateStart)
        matchStage.createdAt.$gte = Number(req.body.dateStart);
      if (req.body.dateEnd)
        matchStage.createdAt.$lte = Number(req.body.dateEnd);
    }

    const [totalCount, byLabel, byDate, byUser] = await Promise.all([
      Log.countDocuments(matchStage),

      Log.aggregate([
        { $match: matchStage },
        { $group: { _id: "$label", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Log.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $toDate: "$createdAt" },
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Log.aggregate([
        { $match: matchStage },
        { $group: { _id: "$_user", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            name: { $concat: ["$user.name", " ", "$user.lastName"] },
            count: 1,
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const topUsers = byUser.slice(0, 10);
    const leastUsers = [...byUser]
      .sort((a, b) => a.count - b.count)
      .slice(0, 10);

    // for (let i in consulta) {
    //   consulta[i].label = consulta[i]._label.label;
    //   await consulta[i].save();
    // }

    const response = {
      dataset0: { field: "Visualizaciones totales", count: totalCount },
      dataset1: [],
      dataset2: {
        field: "Distribución de acciones",
        counts: byLabel.map((i) => i.count),
        operations: byLabel.map((i) => i._id),
      },
      dataset3: {
        field: "Distribución de acciones",
        items: byLabel.map((i) => ({
          addGroup: i._id,
          totalResponse: i.count,
        })),
      },
      dataset4: {
        field: "Actividad en la plataforma",
        counts: byDate.map((i) => i.count),
        actionsName: byDate.map((i) => formatDate(i._id)),
      },
      dataset5: [],
      dataset6: {
        field: "Usuarios con mas actividad en la plataforma",
        counts: topUsers.map((i) => i.count),
        actionsName: topUsers.map((i) => i.name.split(" ")),
      },
      dataset7: {
        field: "Usuarios con menos actividad en la plataforma",
        counts: leastUsers.map((i) => i.count),
        actionsName: leastUsers.map((i) => i.name.split(" ")),
      },
    };

    res.status(200).send(response);
  } catch (error) {
    console.error(error);
    res.status(400).send(error);
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
  return consulta.map((item) => {
    return {
      _id: item._id,
      labelDescription: item.label,
      userName: item._user.name + " " + item._user.lastName,
      createdAt: item.createdAt,
    };
  });
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
    const label = item.label;
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