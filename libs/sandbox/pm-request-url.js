// 实现 pm.request.url
const _ = require('lodash'),
    urlNode = require('url');

const pmRequestUrl = function (scope, pm) {
    let _urls = {};

    try {
        let _urlParse = urlNode.parse(_.cloneDeep(scope.script_request?.url));

        if (_.isObject(_urlParse)) {
            _.forEach({ hostname: 'getHost', host: 'getRemote', path: 'getPath', query: 'getQueryString' }, function (method, path) {
                Object.defineProperty(_urls, method, {
                    configurable: true,
                    value() {
                        return _.get(_urlParse, path)
                    },
                });
            });

            Object.defineProperty(_urls, 'addQueryParams', { // 兼容两种写法
                configurable: true,
                value(item) {
                    if (_.isObject(item) && _.isString(item.key)) {
                        return pm.setRequestQuery(item.key, item.value)
                    } else if (_.isString(item)) {
                        let itemArr = _.split(item, '=');
                        return pm.setRequestQuery(itemArr[0], itemArr[1])
                    }
                },
            });

            Object.defineProperty(_urls, 'removeQueryParams', {
                configurable: true,
                value(keys) {
                    if (_.isArray(keys)) {
                        _.forEach(keys, (key) => {
                            return pm.removeRequestQuery(key)
                        })
                    } else if (_.isString(keys)) {
                        return pm.removeRequestQuery(keys)
                    }
                },
            });

            Object.defineProperty(_urls, 'update', {
                configurable: true,
                value(uri) {
                    scope.script_request.updateurl = uri;
                },
            });

            _.forEach(_urlParse, (value, key) => {
                if (key == 'host') {
                    let _host = _.split(_urlParse?.hostname, '.');

                    Object.defineProperty(_urls, key, {
                        configurable: true,
                        enumerable: true,
                        value: _host,
                    });
                } else if (key == 'path') {
                    let _paths = _.split(_.trim(value, '/'), '/');

                    Object.defineProperty(_urls, key, {
                        configurable: true,
                        enumerable: true,
                        value: _paths,
                    });
                } else if (key == 'query') {
                    let _querys = [];
                    _.forEach(scope.script_request?.request_querys, (value, key) => {
                        _querys.push({
                            key: key,
                            value: value
                        });
                    })

                    Object.defineProperty(_urls, key, {
                        configurable: true,
                        enumerable: true,
                        value: _querys,
                    });
                } else {
                    if (_.isString(key)) {
                        Object.defineProperty(_urls, key, {
                            configurable: true,
                            enumerable: true,
                            value: value,
                        });
                    }
                }
            })
        }
    } catch (e) { }

    Object.defineProperty(_urls, 'toString', {
        configurable: true,
        value() {
            return scope.script_request?.url
        },
    });

    Object.defineProperty(_urls, 'toJSON', {
        configurable: true,
        value() {
            return {
                path: _urls.path,
                host: _urls.host,
                query: _urls.query,
                variable: []
            }
        },
    });

    return _urls;
};

module.exports = pmRequestUrl;
