// 实现 pm.request.headers
const _ = require('lodash');

const pmRequestHeaders = function (scope, pm) {
    let _headers = [];

    _.forEach(scope.script_request?.headers, function (value, key) {
        _headers.push({
            key: key,
            value: value
        })
    });

    ['add', 'upsert'].forEach((method) => {
        Object.defineProperty(_headers, method, { // for 7.2.2
            configurable: true,
            value(item) {
                if (_.isObject(item) && _.isString(item?.key)) {
                    return pm.setRequestHeader(item?.key, item?.value);
                } else if (_.isString(item)) {
                    let itemArr = _.split(item, ':');
                    return pm.setRequestHeader(itemArr[0], itemArr[1]);
                }
            },
        });
    });

    ['append', 'populate', 'repopulate', 'insert', 'insertAfter'].forEach((method) => {
        Object.defineProperty(_headers, method, { // for 7.2.2
            configurable: true,
            value(obj) {
                let item = _.toPairs(obj)
                if (_.isArray(_.get(item, 0))) {
                    return pm.setRequestHeader(item[0][0], item[0][1]);
                }
            },
        });
    });

    Object.defineProperty(_headers, 'remove', {
        configurable: true,
        value(key) {
            return pm.removeRequestQuery(key);
        },
    });

    return _headers;
};

module.exports = pmRequestHeaders;
