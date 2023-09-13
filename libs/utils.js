// 一些公共方法
const { isUndefined, isString, isArray } = require('lodash'),
    atomicSleep = require('atomic-sleep'),
    _ = require('lodash');
const getCollectionServerId = (collection_id, collection_list) => {

    // step1:建立索引
    const parents_data = {}

    if (isArray(collection_list)) {
        collection_list.forEach(data => {
            parents_data[data?.target_id] = data;
        })
    }

    //递归查找
    const digFind = (target_id) => {
        const result = 'default'; // 默认使用default
        const targetInfo = parents_data?.[target_id];
        if (isUndefined(targetInfo)) {
            return result;
        }
        if (isString(targetInfo?.server_id) && targetInfo.server_id?.length > 0) {
            return targetInfo.server_id;
        }
        return digFind(targetInfo.parent_id);
    }
    return digFind(collection_id);
};

const cliConsole = function (args) {
    if (isCliMode() && typeof args == 'string') {
        console.log(args);
    }
};

// is apipost-cli mode
const isCliMode = function (iscli) {
    if (typeof iscli === 'boolean') {
        return iscli
    } else {
        try {
            if (process.stdin.isTTY) {
                const commandName = process.argv[2];
                if (commandName == 'run') {
                    return true;
                }
            }

            return false;
        } catch (e) { return false; }
    }
}

// sleep 延迟方法
const sleepDelay = function (ms) {
    atomicSleep(ms)
};

// 根据测试条件返回布尔值
const returnBoolean = function (exp, compare, value, PREV_REQUEST) {
    let bool = false;
    if (exp === '') { // fix bug
        return compare == 'null';
    }

    // get request
    if (typeof exp == 'string' && _.has(PREV_REQUEST, 'request') && _.startsWith(exp, `{{request\.`) && _.endsWith(exp, '}}')) {
        let _path = String(_.trimEnd(_.trimStart(exp, `{{request`), '}}'));

        if (_path.substr(0, 1) == '.') {
            _path = _path.substr(1)
        }

        exp = _.get(PREV_REQUEST.request, _path);
    }

    if (typeof value == 'string' && _.has(PREV_REQUEST, 'request') && _.startsWith(value, `{{request\.`) && _.endsWith(value, '}}')) {
        let _path = String(_.trimEnd(_.trimStart(value, `{{request`), '}}'));

        if (_path.substr(0, 1) == '.') {
            _path = _path.substr(1)
        }

        value = _.get(PREV_REQUEST.request, _path);
    }

    // get response
    if (typeof exp == 'string' && _.has(PREV_REQUEST, 'response') && _.startsWith(exp, `{{response\.`) && _.endsWith(exp, '}}')) {
        let _path = String(_.trimEnd(_.trimStart(exp, `{{response`), '}}'));

        if (_path.substr(0, 1) == '.') {
            _path = _path.substr(1)
        }

        exp = _.get(PREV_REQUEST.response, _path);
    }

    if (typeof value == 'string' && _.has(PREV_REQUEST, 'response') && _.startsWith(value, `{{response\.`) && _.endsWith(value, '}}')) {
        let _path = String(_.trimEnd(_.trimStart(value, `{{response`), '}}'));

        if (_path.substr(0, 1) == '.') {
            _path = _path.substr(1)
        }

        value = _.get(PREV_REQUEST.response, _path);
    }

    switch (compare) {
        case 'eq':
            bool = exp == value;
            break;
        case 'uneq':
            bool = exp != value;
            break;
        case 'gt':
            bool = _.gt(Number(exp), Number(value));
            break;
        case 'gte':
            bool = _.gte(Number(exp), Number(value));
            break;
        case 'lt':
            bool = _.lt(Number(exp), Number(value));
            break;
        case 'lte':
            bool = _.lte(Number(exp), Number(value));
            break;
        case 'includes':
            bool = _.includes(exp, value) || _.includes(exp, Number(value)); // fix bug
            break;
        case 'unincludes':
            bool = !_.includes(exp, value) && !_.includes(exp, Number(value)); // fix bug
            break;
        case 'null':
            bool = _.isNull(exp, value);
            break;
        case 'notnull':
            bool = !_.isNull(exp, value);
            break;
    }

    return bool;
}

// 获取某接口的 所有父target
const getParentTargetIDs = function (collection, target_id, parent_ids = []) {
    if (_.isArray(collection)) {
        const item = _.find(collection, _.matchesProperty('target_id', target_id));

        if (item) {
            parent_ids.push(item.parent_id);
            getParentTargetIDs(collection, item.parent_id, parent_ids);
        }
    }

    return parent_ids;
}

// 获取 指定 event_id 的 initDefinitions 的所有父亲ID
const getInitDefinitionsParentIDs = function (event_id, initDefinitions = []) {
    const definitionArr = [];

    (function convertArray(initDefinitions) {
        if (_.isArray(initDefinitions)) {
            initDefinitions.forEach((item) => {
                definitionArr.push({
                    event_id: item.event_id,
                    parent_id: item.parent_id,
                });

                if (_.isArray(item.children)) {
                    convertArray(item.children);
                }
            });
        }
    }(initDefinitions));

    const parentArr = [];

    (function getParentArr(event_id) {
        definitionArr.forEach((item) => {
            if (item.event_id == event_id && item.parent_id != '0') {
                parentArr.push(item.parent_id);
                getParentArr(item.parent_id);
            }
        });
    }(event_id));

    return parentArr;
}

// 获取某接口的详细信息
const getItemFromCollection = function (collection, target_id) {
    return _.find(collection, _.matchesProperty('target_id', target_id));
}

// 拓展操作method
const arrayPrototypeExtend = function (obj) {
    if (_.isArray(obj)) {
        Object.defineProperty(obj, 'all', { // 1
            configurable: true,
            value() {
                return obj;
            },
        });

        Object.defineProperty(obj, 'count', { // 2
            configurable: true,
            value() {
                return _.size(obj);
            },
        });

        Object.defineProperty(obj, 'each', { // 3
            configurable: true,
            value(callback) {
                if (_.isFunction(callback)) {
                    _.forEach(obj, function (item) {
                        callback(item)
                    });
                }
            },
        });

        Object.defineProperty(obj, 'has', { // 4
            configurable: true,
            value(key) {
                return _.keys(_.fromPairs(obj.map((item) => {
                    if (_.isObject(item)) {
                        return [item.key, item.value];
                    } else {
                        return [item]
                    }
                }))).indexOf(key) > -1
            },
        });

        Object.defineProperty(obj, 'get', { // 5
            configurable: true,
            value(key) {
                return _.get(_.fromPairs(obj.map(item => [item.key, item.value])), key);
            },
        });

        Object.defineProperty(obj, 'idx', { // 6
            configurable: true,
            value(key) {
                return _.get(obj, Number(key));
            },
        });

        Object.defineProperty(obj, 'one', { // 7
            configurable: true,
            value(key) {
                return _.find(obj, { key: key });
            },
        });

        Object.defineProperty(obj, 'toObject', { // 8
            configurable: true,
            value() {
                return _.fromPairs(obj.map(item => [item.key, item.value]));
            },
        });

        Object.defineProperty(obj, 'toString', { // 9
            configurable: true,
            value() {
                return _.join(_.map(obj, item => `${item.key}:${item.value}`), '\n')
            },
        });

        Object.defineProperty(obj, 'members', { // 10
            configurable: true,
            value: obj
        });
    } else if (_.isObject(obj) && !_.isFunction(obj)) {
        Object.defineProperty(obj, 'toJSON', { // 1
            configurable: true,
            value() {
                if (_.isObject(obj)) {
                    return obj;
                } else {
                    try {
                        return JSON.parse(obj);
                    } catch (e) {
                        return obj
                    }
                }
            },
        });
    }

    if (_.isObject(obj) && !_.isFunction(obj)) {
        // 递归处理
        _.forEach(obj, (items) => {
            arrayPrototypeExtend(items);
        });
    }
}

module.exports = {
    getCollectionServerId,
    cliConsole,
    isCliMode,
    sleepDelay,
    returnBoolean,
    getParentTargetIDs,
    getInitDefinitionsParentIDs,
    getItemFromCollection,
    arrayPrototypeExtend
}