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
