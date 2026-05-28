const _p = {};

module.exports.set = (providers) => Object.assign(_p, providers);
module.exports.email = () => _p.email || null;
module.exports.sms = () => _p.sms || null;
module.exports.storage = () => _p.storage || null;
module.exports.analytics = () => _p.analytics || null;
