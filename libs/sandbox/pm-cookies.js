// 实现 pm.cookies
const _ = require('lodash');

const pmCookies = function (scope, pm) {
    let _cookies = _.map(scope?.response?.data?.response?.rawCookies, obj => {
        return {
            ...obj,
            key: obj.name
        };
    });
    // arrayPrototypeExtend(_cookies);

    _.assign(_cookies, {
        jar: function () {
            return {
                set: function (url, name, value, callback) {
                    if (typeof callback != 'function') {
                        callback = function () { };
                    }

                    try {
                        if (_.isArray(scope?.jar?.data)) {
                            let _replace = 0;
                            let _cookie = {};
                            _.forEach(scope?.jar?.data, function (item, key) {
                                if (item.domain == url && item.name == name) {
                                    _replace = 1;
                                    _.set(scope, `jar.data[${key}].value`, value);
                                    _cookie = _.get(scope, `jar.data[${key}].value`);
                                }
                            });

                            if (!_replace) {
                                _cookie = {
                                    "name": name,
                                    "value": value,
                                    "expires": new Date((new Date()).getTime() + 24 * 60 * 60 * 1000),
                                    "path": "/",
                                    "httpOnly": false,
                                    "secure": false,
                                    // "hostOnly": true,
                                    "cookie_id": uuid.v4(),
                                    "domain": url,
                                    "key": name,
                                    "project_id": _.get(scope, 'data.project_id')
                                }

                                scope?.jar?.data.push(_cookie);
                            }
                            callback(null, _cookie);
                        }
                    } catch (e) {
                        callback(String(e))
                    }
                },
                get: function (url, name, callback) {
                    if (typeof callback != 'function') {
                        callback = function () { };
                    }

                    try {
                        if (_.isArray(scope?.jar?.data)) {
                            let _cookie = _.find(scope?.jar?.data, function (item) {
                                return item.domain == url && item.name == name
                            });
                            callback(null, _cookie?.value);
                        }
                    } catch (e) {
                        callback(String(e))
                    }
                },
                getAll: function (url, callback) {
                    if (typeof callback != 'function') {
                        callback = function () { };
                    }

                    try {
                        if (_.isArray(scope?.jar?.data)) {
                            let _cookies = _.filter(scope?.jar?.data, function (item) {
                                return item.domain == url;
                            });
                            callback(null, _cookies);
                        }
                    } catch (e) {
                        callback(String(e))
                    }
                },
                unset: function (url, name, callback) {
                    if (typeof callback != 'function') {
                        callback = function () { };
                    }

                    try {
                        if (_.isArray(scope?.jar?.data)) {
                            _.remove(scope?.jar?.data, function (item) {
                                return item.domain == url && item.name == name;
                            });
                            callback(null);
                        }
                    } catch (e) {
                        callback(String(e))
                    }
                },
                clear: function (url, callback) {
                    if (typeof callback != 'function') {
                        callback = function () { };
                    }

                    try {
                        if (_.isArray(scope?.jar?.data)) {
                            _.remove(scope?.jar?.data, function (item) {
                                return item.domain == url;
                            });
                            callback(null);
                        }
                    } catch (e) {
                        callback(String(e))
                    }
                }
            }
        }
    })

    return _cookies;
};

module.exports = pmCookies;
