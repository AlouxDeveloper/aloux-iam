const History = require("../models/History");
const self = module.exports;

self.create = async (data) => {
  try {
    const history = new History({
      method: data.originalMethod,
      path: data.route.path,
      payload: data.body,
      createdAt: Date.now(),
    });
    const newHistory = await history.save();
    return newHistory;
  } catch (error) {
    return error;
  }
};

self.response = async (_history, response, _createdBy) => {
  try {
    if (_createdBy) {
      await History.updateOne(
        { _id: _history },
        { response: response, _createdBy: _createdBy }
      );
    } else {
      await History.updateOne({ _id: _history }, { response: response });
    }
    return true;
  } catch (error) {
    return error;
  }
};

self.retrieve = async (req, res) => {
  try {
    let query = {};
    const response = { items: [], count: 0 };

    if (req.body?.filter?.method) {
      query = { method: req.body.filter.method };
    }

    response.count = await History.countDocuments(query);
    response.items = await History.find(query)
      .populate({ path: "_createdBy", select: { name: 1, lastName: 1 } })
      .sort({ createdAt: -1 })
      .skip((req.body.config.page - 1) * req.body.config.itemsPerPage)
      .limit(req.body.config.itemsPerPage)
      .lean();

    res.status(200).send(response);
  } catch (error) {
    res.status(400).send(error);
  }
};

self.detail = async (req, res) => {
  try {
    const history = await History.findOne({ _id: req.params.HISTORY_ID });
    if (!history) {
      return res.status(404).send({
        error: "No se encontró el elemento",
        suggestion: "Verifica que el id del registro sea correcto",
      });
    }
    res.status(200).send(history);
  } catch (error) {
    res.status(400).send(error);
  }
};
