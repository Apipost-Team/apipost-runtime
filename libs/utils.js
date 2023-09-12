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

// 计算runtime 报告结果
const calculateRuntimeReport = function (log, initDefinitions = [], report_id = '', option = {}) {
    log = Object.values(log);

    // 说明： 本api统计数字均已去重
    // 接口去重后的api集合
    const _uniqLog = _.uniqWith(log, (source, dist) => _.isEqual(source.target_id, dist.target_id));

    // 接口未去重后的忽略集合
    const _ignoreLog = _.filter(log, item => item.http_error == -2);

    // 接口去重后的忽略集合
    const _uniqIgnoreLog = _.uniqWith(_ignoreLog, (source, dist) => _.isEqual(source.target_id, dist.target_id));

    // 接口未去重后的http失败集合
    const _httpErrorLog = _.filter(log, item => item.http_error == 1);

    // 接口去重后的http失败集合
    const _uniqHttpErrorLog = _.uniqWith(_httpErrorLog, (source, dist) => _.isEqual(source.target_id, dist.target_id));

    // 接口未去重后的assert失败集合
    const _assertErrorLog = _.filter(log, item => _.find(item.assert, _.matchesProperty('status', 'error')));

    // 接口去重后的assert失败集合
    const _uniqAssertErrorLog = _.uniqWith(_assertErrorLog, (source, dist) => _.isEqual(source.target_id, dist.target_id));

    // 接口未去重后的assert成功集合
    const _assertPassedLog = _.filter(log, item => _.size(item.assert) > 0 && !_.find(item.assert, _.matchesProperty('status', 'error')));

    // 接口去重后的assert成功集合
    const _uniqAssertPassedLog = _.uniqWith(_assertPassedLog, (source, dist) => _.isEqual(source.target_id, dist.target_id));

    // 接口未去重后的http成功集合
    const _httpPassedLog = _.filter(log, item => item.http_error == -1 && !_.find(_uniqHttpErrorLog, _.matchesProperty('target_id', item.target_id)));

    // 接口去重后的http成功集合
    const _uniqHttpPassedLog = _.uniqWith(_httpPassedLog, (source, dist) => _.isEqual(source.target_id, dist.target_id));
    // console.log(_uniqHttpPassedLog);
    // 计算 总api数
    const totalCount = _.size(_uniqLog);

    // 计算 未忽略的总api数
    const totalEffectiveCount = _.subtract(totalCount, _.size(_uniqIgnoreLog));

    // 计算 http 错误个数
    const httpErrorCount = _.size(_uniqHttpErrorLog);

    // 计算 http 成功个数
    const httpPassedCount = _.size(_uniqHttpPassedLog);

    // 计算 assert 错误个数
    const assertErrorCount = _.size(_uniqAssertErrorLog);

    // 计算 assert 错误个数
    const assertPassedCount = _.size(_uniqAssertPassedLog);

    // 计算 忽略接口 个数
    const ignoreCount = _.size(_uniqIgnoreLog);

    // 获取 event 事件状态
    const eventResultStatus = {};

    Object.values(log).forEach((item) => {
        // 计算各个event的状态 [ignore, failure, passed]
        if (_.isArray(initDefinitions)) {
            const parent_ids = getInitDefinitionsParentIDs(item.event_id, initDefinitions);

            if (_.find(item.assert, _.matchesProperty('status', 'error'))) {
                item.assert_error = 1;
            } else {
                item.assert_error = -1;
            }

            if (item.http_error == 1 || _.find(item.assert, _.matchesProperty('status', 'error'))) { // failure
                eventResultStatus[item.event_id] = 'failure';
                parent_ids.forEach((parent_id) => {
                    if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                        eventResultStatus[parent_id] = 'failure';
                    }
                });
            } else if (item.http_error == -2) {
                eventResultStatus[item.event_id] = 'ignore';
                parent_ids.forEach((parent_id) => {
                    if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                        eventResultStatus[parent_id] = 'ignore';
                    }
                });
            } else if (item.http_error == -1) {
                eventResultStatus[item.event_id] = 'passed';
                parent_ids.forEach((parent_id) => {
                    if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                        eventResultStatus[parent_id] = 'passed';
                    }
                });
            }
        }
    });

    const definitionList = [];

    (function convertInitDefinitions(initDefinitions) {
        initDefinitions.forEach((item) => {
            if (_.isString(item.test_id)) {
                definitionList.push({
                    event_id: item.event_id,
                    parent_event_id: item.parent_id,
                    data: (item.type == 'api' || item.type == 'sample') ? item.request : item.condition,
                    enabled: item.enabled,
                    project_id: item.project_id,
                    sort: item.sort,
                    test_id: item.test_id,
                    type: item.type,
                    report_id,
                    runtime: item.runtime,
                    runtime_status: eventResultStatus[item.event_id],
                });
            }

            if (_.isArray(item.children)) {
                convertInitDefinitions(item.children);
            }
        });
    }(initDefinitions));

    // 计算 received_data， total_response_time
    let _total_received_data = 0,
        _total_response_time = 0,
        _total_response_count = 0;

    _.forEach(log, (item) => {
        if (_.has(item, 'response.data.response.responseSize')) {
            _total_response_count++;
            _total_received_data = _.add(_total_received_data, Number(item.response.data.response.responseSize));
            _total_response_time = _.add(_total_response_time, Number(item.response.data.response.responseTime));
        }
    });

    if (typeof option.env === 'undefined') {
        option.env = {
            env_id: option.env_id ? option.env_id : -1,
            env_name: option.env_name,
            env_pre_url: option.env_pre_url,
            env_pre_urls: option?.env_pre_urls,
        };
    } else {
        option.env_id = option.env.env_id;
        option.env_name = option.env.env_name;
        option.env_pre_url = option.env.env_pre_url;
        option.env_pre_urls = option.env?.env_pre_urls;
    }

    const report = {
        combined_id: option.combined_id,
        report_id,
        report_name: option.default_report_name,
        env_id: option.env.env_id,
        env_name: option.env.env_name,
        env_pre_url: option.env.env_pre_url,
        env_pre_urls: option.env?.env_pre_urls,
        user: option.user,
        total_count: totalCount,
        total_effective_count: totalEffectiveCount,
        ignore_count: ignoreCount,
        total_received_data: _.floor(_total_received_data, 2),
        total_response_time: _.floor(_total_response_time, 2),
        average_response_time: _.floor(_.divide(_total_response_time, _total_response_count), 2),
        http_errors: _httpErrorLog,
        assert_errors: _assertErrorLog,
        ignore_errors: _ignoreLog,
        http: {
            passed: httpPassedCount,
            passed_per: _.floor(_.divide(httpPassedCount, totalCount), 2),
            failure: httpErrorCount,
            failure_per: _.floor(_.divide(httpErrorCount, totalCount), 2),
        },
        assert: {
            passed: assertPassedCount,
            passed_per: _.floor(_.divide(assertPassedCount, totalCount), 2),
            failure: assertErrorCount,
            failure_per: _.floor(_.divide(assertErrorCount, totalCount), 2),
        },
        start_time: startTime,
        end_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        long_time: `${_.floor(_.divide(Date.now() - startTimeStamp, 1000), 2)} 秒`,
        children: [],
    };

    if (!_.has(report, 'user.nick_name')) {
        _.set(report, 'user.nick_name', '匿名');
    }

    if (uuid.validate(option.combined_id) && _.isArray(option.test_events)) { // 测试套件
        _.assign(report, {
            type: 'combined',
            test_id: _.isArray(option.test_events) ? (_.map(option.test_events, o => o.test_id)) : [option.test_events.test_id],
        });

        option.test_events.forEach((test_event) => {
            report.children.push(calculateRuntimeReport(_.filter(log, o => o.test_id == test_event.test_id), initDefinitions, report_id, _.assign(option, {
                combined_id: 0,
                test_events: test_event,
                default_report_name: test_event.name,
            })));
        });
    } else { // 单测试用例
        const _test_id = _.isArray(option.test_events) ? option.test_events[0].test_id : option.test_events.test_id;
        _.assign(report, {
            type: 'single',
            test_id: _test_id,
            event_status: eventResultStatus,
            test_events: _.filter(definitionList, o => o.test_id == _test_id),
        });
    }
    log = null;
    return report;
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
    sleepDelay,
    returnBoolean,
    getParentTargetIDs,
    getInitDefinitionsParentIDs,
    getItemFromCollection,
    calculateRuntimeReport,
    arrayPrototypeExtend
}