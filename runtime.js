const apipostRequest = require('apipost-send'),
    sm2 = require('sm-crypto').sm2, // add module for 7.0.8
    sm3 = require('sm-crypto').sm3, // add module for 7.0.8
    sm4 = require('sm-crypto').sm4, // add module for 7.0.8
    urljoins = require("urljoins").urljoins,// add module for 7.0.8 https://www.npmjs.com/package/urljoins
    asyncModule = require('async'), // add module 0920
    FormData = require('form-data'), // add module 0914
    Table = require('cli-table3'),
    Cookie = require('cookie'),
    zlib = require('zlib'),
    Buffer = require('buffer/').Buffer,
    _ = require('lodash'),
    chai = require('chai'),
    JSON5 = require('json5'),
    uuid = require('uuid'),
    Mock = require('apipost-mock'),
    CryptoJS = require('crypto-js'),
    jsonpath = require('jsonpath'),
    x2js = require('x2js'),
    $ = require('jquery'),
    nodeAjax = require('ajax-for-node'), // new module on 0829
    JSEncryptNode = require('jsencrypt-node'), // fix bug
    moment = require('moment'),
    dayjs = require('dayjs'),
    vm2 = require('vm2'),
    ASideTools = require('apipost-inside-tools'),
    stripJsonComments = require('strip-json-comments'),
    JSONbig = require('json-bigint'),
    aTools = require('apipost-tools'),
    validCookie = require('check-valid-cookie'),
    urlJoin = require('url-join'), // + new add 必须 4.0.1版本
    fs = require('fs'),// for 7.0.13
    path = require('path'),// for 7.0.13
    mysql = require('mysql2'), // for 7.0.13
    mssql = require('mssql'), // for 7.0.13
    json2csv = require('json-2-csv'),// for 7.0.13
    csv2json = require('testdata-to-apipost-json'),// for 7.0.13
    { ClickHouse } = require('clickhouse'), // for 7.0.13
    { pgClient } = require('pg'), // for 7.0.13
    child_process = require('child_process'),// for 7.0.13
    atomicSleep = require('atomic-sleep'), // ++ new add on for // fix 自动化测试有等待时的卡顿问题 for 7.0.13
    artTemplate = require('art-template');

// cli console
const cliConsole = function (args) {
    if (typeof window === 'undefined') {
        console.log(args);
    }
};

const Collection = function ApipostCollection(definition, option = { iterationCount: 1, sleep: 0 }) {
    const { iterationCount, sleep } = option;

    const definitionTlp = {
        parent_id: '-1', // 单任务的父ID
        event_id: '0', // 单任务的ID
        iteration: 0, // 当前执行第几轮循环（iteration）
        iterationCount: 0, // 本次执行需要循环的总轮数
        iterationData: {}, // excel导入的测试数据变量
        target_id: '',  // 接口ID ，仅适用于 api或者request
        request: {}, // 请求参数 ，仅适用于 api或者request
        response: {}, // 响应参数 ，仅适用于 api或者request
        cookie: [], // 响应cookie ，仅适用于 api或者request
        assert: [],
    };

    (function createRuntimeList(r, parent_id = '0') {
        if (r instanceof Array && r.length > 0) {
            r.forEach((item) => {
                _.assign(item, definitionTlp, {
                    enabled: typeof item.enabled === 'undefined' ? 1 : item.enabled,
                    sort: typeof item.sort === 'undefined' ? 1 : item.sort,
                    parent_id,
                    event_id: item.event_id ? item.event_id : uuid.v4(),
                    test_id: item.test_id ? item.test_id : uuid.v4(),
                    type: item.type,
                    temp_env: _.isObject(item.temp_env) ? item.temp_env : {}, // for 多环境
                    target_id: ['request', 'api'].indexOf(item.type) > -1 ? item.data.target_id : '',
                    condition: ['request', 'api'].indexOf(item.type) > -1 ? {} : item.data,
                    request: ['request', 'api'].indexOf(item.type) > -1 ? item.data : {},
                    info: ['request', 'api'].indexOf(item.type) > -1 ? {
                        // requestUrl: item.data.url ? item.data.url : item.data.request.url,
                        // requestName: item.data.name ? item.data.name : (item.data.url ? item.data.url : item.data.request.url),
                        requestId: item.data.target_id,
                    } : {},
                });

                if ((_.isArray(item.children) && item.children.length > 0)) {
                    createRuntimeList(item.children, item.event_id);
                }
            });
        }
    }(definition));

    // 构造一个执行对象
    Object.defineProperty(this, 'definition', {
        configurable: true,
        writable: true,
        value: [_.assign(_.cloneDeep(definitionTlp), {
            type: 'for',
            condition: {
                limit: iterationCount > 0 ? iterationCount : 1,
                sleep: sleep > 0 ? sleep : 0,
            },
            enabled: 1,
            RUNNER_TOTAL_COUNT: _.size(_.filter(definition, _.matchesProperty('enabled', 1))) * (iterationCount > 0 ? iterationCount : 1),
            children: _.cloneDeep(definition),
        })],
    });
};

/*
@emitRuntimeEvent:请求脚本参数
@enableUnSafeShell:是否允许执行不安全脚本
*/
const Runtime = function ApipostRuntime(emitRuntimeEvent, enableUnSafeShell = true) {
    // 当前流程总错误计数器
    let RUNNER_TOTAL_COUNT = 0, // 需要跑的总event分母
        RUNNER_ERROR_COUNT = 0,
        RUNNER_PROGRESS = 0,
        RUNNER_RESULT_LOG = {},
        RUNNER_STOP = {};

    if (typeof emitRuntimeEvent !== 'function') {
        emitRuntimeEvent = function () { };
    }

    // Apipost 沙盒
    const Sandbox = function ApipostSandbox() {
        // 内置变量
        const insideVariablesScope = {
            list: {}, // 常量
        };

        /**
         *  拓展mockjs， 定义一些内置 mock
         *  fix bug for 7.0.8
         */
        const _mockjsRandomExtend = {};

        // 重写 string
        _mockjsRandomExtend['string'] = function (pool, start, end) {
            let charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

            if (typeof pool == 'string') {
                charSet = Mock.mock(pool);
            }

            if (typeof pool == 'string') {
                pool = Mock.mock(pool);

                if (typeof start == 'number') {
                    if (typeof end == 'number') {
                        return _.sampleSize(pool, _.random(start, end)).join('');
                    }

                    return _.sampleSize(pool, start).join('');
                }
                return _.sample(pool);
            }

            if (typeof pool == 'number') {

                if (typeof start == 'number') {
                    return _.sampleSize(charSet, _.random(pool, start)).join('');
                }
                return _.sampleSize(charSet, pool).join('')
            }
        }

        new Array('telephone', 'phone', 'mobile').forEach(func => {
            _mockjsRandomExtend[func] = function () {
                return this.pick(['131', '132', '137', '188']) + Mock.mock(/\d{8}/)
            };
        })
        new Array('username', 'user_name', 'nickname', 'nick_name').forEach(func => {
            _mockjsRandomExtend[func] = function () {
                return Mock.mock(`@cname`)
            };
        })
        new Array('avatar', 'icon', 'img', 'photo', 'pic').forEach(func => {
            _mockjsRandomExtend[func] = function () {
                return Mock.mock(`@image('400x400')`)
            };
        })

        new Array('description').forEach(func => {
            _mockjsRandomExtend[func] = function () {
                return Mock.mock(`@cparagraph`)
            };
        })

        new Array('id', 'userid', 'user_id', 'articleid', 'article_id').forEach(func => {
            _mockjsRandomExtend[func] = function () {
                return Mock.mock(`@integer(100, 1000)`)
            };
        })

        Mock.Random.extend(_mockjsRandomExtend);

        new Array('natural', 'integer', 'float', 'character', 'range', 'date', 'time', 'datetime', 'now', 'guid', 'integeincrementr', 'url', 'protocol', 'domain', 'tld', 'email', 'ip', 'region', 'province', 'city', 'county', 'county', 'zip', 'first', 'last', 'name', 'cfirst', 'clast', 'cname', 'color', 'rgb', 'rgba', 'hsl', 'paragraph', 'cparagraph', 'sentence', 'csentence', 'word', 'cword', 'title', 'ctitle', 'username', 'user_name', 'nickname', 'nick_name', 'avatar', 'icon', 'img', 'photo', 'pic', 'description', 'id', 'userid', 'user_id', 'articleid', 'article_id').forEach((func) => {
            insideVariablesScope.list[`$${func}`] = Mock.mock(`@${func}`);
        });

        new Array('phone', 'mobile', 'telephone').forEach((func) => {
            insideVariablesScope.list[`$${func}`] = ['131', '132', '137', '188'][_.random(0, 3)] + Mock.mock(/\d{8}/);
        });

        // 兼容 v3
        insideVariablesScope.list.$timestamp = (function () {
            return Date.parse(new Date()) / 1000;
        }());

        insideVariablesScope.list.$microTimestamp = (function () {
            return (new Date()).getTime();
        }());

        insideVariablesScope.list.$randomInt = (function () {
            return Math.floor(Math.random() * 1000);
        }());

        insideVariablesScope.list.$randomFloat = (function () {
            return Math.random() * 1000;
        }());

        // 动态变量
        const variablesScope = {
            globals: {}, // 公共变量
            environment: {}, // 环境变量
            collectionVariables: {}, // 目录变量 当前版本不支持，目前为兼容postman
            variables: {}, // 临时变量，无需存库
            iterationData: {}, // 流程测试时的数据变量，临时变量，无需存库
        };

        // 获取所有动态变量
        function getAllDynamicVariables(type) {
            if (typeof aptScripts === 'object') {
                Object.keys(variablesScope).forEach((key) => {
                    if (_.isObject(aptScripts[key]) && _.isFunction(aptScripts[key].toObject) && ['iterationData', 'variables'].indexOf(key) > -1) {
                        _.assign(variablesScope[key], aptScripts[key].toObject());
                    }
                });
            }

            if (variablesScope.hasOwnProperty(type)) {
                return _.isObject(variablesScope[type]) ? variablesScope[type] : {};
            }
            const allVariables = {};
            Object.keys(variablesScope).forEach((type) => {
                _.assign(allVariables, variablesScope[type]);
            });

            return allVariables;
        }

        // 设置动态变量
        const dynamicVariables = {};

        // 变量相关
        // ['variables'] 临时变量
        Object.defineProperty(dynamicVariables, 'variables', {
            configurable: true,
            value: {
                set(key, value) {
                    if (_.isObject(value)) {
                        try {
                            value = JSON.stringify(value);
                        } catch (e) {
                            value = String(value);
                        }
                    }
                    variablesScope.variables[key] = value;
                },
                get(key) {
                    const allVariables = getAllDynamicVariables();
                    return allVariables[key];
                },
                has(key) {
                    return getAllDynamicVariables().hasOwnProperty(key);
                },
                delete(key) {
                    delete variablesScope.variables[key];
                },
                unset(key) {
                    delete variablesScope.variables[key];
                },
                clear() {
                    if (_.isObject(variablesScope.variables)) {
                        _.forEach(variablesScope.variables, (value, key) => {
                            delete variablesScope.variables[key];
                        });
                    }
                    variablesScope.variables = {};
                },
                replaceIn(variablesStr) {
                    return replaceIn(variablesStr);
                },
                toObject() {
                    return getAllDynamicVariables();
                },
            },
        });

        // ['iterationData'] 临时变量
        Object.defineProperty(dynamicVariables, 'iterationData', {
            configurable: true,
            value: {
                set(key, value) {
                    variablesScope.iterationData[key] = value;
                },
                get(key) {
                    return variablesScope.iterationData[key];
                },
                has(key) {
                    return variablesScope.iterationData.hasOwnProperty(key);
                },
                replaceIn(variablesStr) {
                    return replaceIn(variablesStr, 'iterationData');
                },
                toObject() {
                    return variablesScope.iterationData;
                },
                clear() {
                    if (_.isObject(variablesScope.iterationData)) {
                        _.forEach(variablesScope.iterationData, (value, key) => {
                            delete variablesScope.iterationData[key];
                        });
                    }
                    variablesScope.iterationData = {};
                },
            },
        });

        // ['globals', 'environment', 'collectionVariables']
        Object.keys(variablesScope).forEach((type) => {
            if (['iterationData', 'variables'].indexOf(type) === -1) {
                Object.defineProperty(dynamicVariables, type, {
                    configurable: true,
                    value: {
                        set(key, value, emitdb = true) {
                            if (_.isObject(value)) {
                                try {
                                    value = JSON.stringify(value);
                                } catch (e) {
                                    value = String(value);
                                }
                            }

                            variablesScope[type][key] = value;

                            if (emitdb) {
                                typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].set) && aptScripts[type].set(key, value);
                            }
                        },
                        get(key) {
                            return variablesScope[type][key];
                        },
                        has(key) {
                            return variablesScope[type].hasOwnProperty(key);
                        },
                        delete(key) {
                            delete variablesScope[type][key];
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].delete) && aptScripts[type].delete(key);
                        },
                        unset(key) {
                            delete variablesScope[type][key];
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].delete) && aptScripts[type].delete(key);
                        },
                        clear() {
                            if (_.isObject(variablesScope[type])) { // fix bug
                                _.forEach(variablesScope[type], (value, key) => {
                                    delete variablesScope[type][key];
                                });
                            }
                            variablesScope[type] = {};
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].clear) && aptScripts[type].clear();
                        },
                        replaceIn(variablesStr) {
                            return replaceIn(variablesStr, type);
                        },
                        toObject() {
                            return variablesScope[type];
                        },
                    },
                });
            }
        });

        // 获取所有内置变量
        function getAllInsideVariables() {
            return _.cloneDeep(insideVariablesScope.list);
        }

        // 变量替换
        function replaceIn(variablesStr, type, withMock = false) {
            if (!_.isString(variablesStr)) { // fix bug
                return variablesStr;
            }

            let allVariables = getAllInsideVariables(); // fix bug
            // console.log(getAllDynamicVariables(type));
            // let allVariables = {};
            _.assign(allVariables, getAllDynamicVariables(type));

            if (withMock) {
                try {
                    // console.log(variablesStr, typeof variablesStr, Mock.mock(`${variablesStr}`))
                    variablesStr = Mock.mock(variablesStr);
                } catch (e) { console.log(e) }
            }

            // 替换自定义变量
            const _regExp = new RegExp(Object.keys(allVariables).map((item) => {
                if (_.startsWith(item, '$')) {
                    item = `\\${item}`;
                }
                return `\\{\\{${item}\\}\\}`; // fix bug
            }).join('|'), 'gi');

            variablesStr = _.replace(variablesStr, _regExp, (key) => {
                const reStr = allVariables[String(_.replace(key, /[{}]/gi, ''))];
                // console.log(String(_.replace(key, /[{}]/gi, '')), reStr, _regExp);
                if (typeof reStr !== 'undefined') {
                    return reStr;
                }
                return key;
            });
            // console.log('allVariables', variablesStr, _regExp);
            allVariables = null;
            return variablesStr;
        }

        // console
        const consoleFn = {};
        new Array('log', 'warn', 'info', 'error').forEach((method) => {
            Object.defineProperty(consoleFn, method, {
                configurable: true,
                value() {
                    emitRuntimeEvent({
                        action: 'console',
                        method,
                        message: {
                            type: 'log',
                            data: Array.from(arguments),
                        },
                        timestamp: Date.now(),
                        datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    });
                },
            });
        });

        // 发送断言结果
        function emitAssertResult(status, expect, result, scope) {
            if (typeof scope !== 'undefined' && _.isObject(scope) && _.isArray(scope.assert)) {
                // 更新日志
                const item = _.isObject(RUNNER_RESULT_LOG) ? RUNNER_RESULT_LOG[scope.iteration_id] : {};

                if (item) {
                    if (!_.isArray(item.assert)) {
                        item.assert = [];
                    }

                    item.assert.push({
                        status,
                        expect,
                        result,
                    });
                    // console.log(item, item.assert)
                    if (status === 'success') {
                        cliConsole('\t✓'.green + ` ${expect} 匹配`.grey);
                    } else {
                        RUNNER_ERROR_COUNT++;
                        cliConsole(`\t${RUNNER_ERROR_COUNT}. ${expect} ${result}`.bold.red);
                    }
                }
            }
        }

        // 设置响应和请求参数
        function emitTargetPara(data, scope) {
            if (typeof scope !== 'undefined' && _.isObject(scope)) {
                // 更新日志

                if (_.isObject(RUNNER_RESULT_LOG)) {
                    const item = RUNNER_RESULT_LOG[scope.iteration_id];

                    if (item) {
                        switch (data.action) {
                            case 'SCRIPT_ERROR':
                                if (item.type == 'api') {
                                    _.set(item, `script_error.${data.eventName}`, data.data);
                                }
                                break;
                        }
                    }
                }
            }
        }

        // 发送可视化结果
        function emitVisualizerHtml(status, html, scope) {
            if (typeof scope !== 'undefined' && _.isObject(scope)) {
                if (_.isObject(RUNNER_RESULT_LOG)) {
                    const item = RUNNER_RESULT_LOG[scope.iteration_id];

                    if (item) {
                        item.visualizer_html = { status, html };
                    }
                }
            }
        }

        // 断言自定义拓展规则（100% 兼容postman）
        chai.use(() => {
            require('chai-apipost')(chai);
        });

        // 执行脚本
        /**
             * code js 代码（当前仅支持 js 代码，后续支持多种语言，如 python 等）
             * scope 当前变量环境对象，里面包含
             * {
            //  *      variables   临时变量 此数据为临时数据，无需存库
             *      globals     公共变量
             *      environment     环境变量
             *      collectionVariables     目录变量
            //  *      iterationData   流程测试时的数据变量 此数据为临时数据，无需存库
             *      request     请求参数
             *      response    响应参数
             *      cookie      cookie
             *      info        请求运行相关信息
             * }
             *
             * callback 回调
         * */
        async function execute(code, scope, eventName, callback) {
            scope = _.isPlainObject(scope) ? _.cloneDeep(scope) : {};

            // 初始化数据库中的当前变量值 init
            if (typeof aptScripts === 'object') {
                Object.keys(variablesScope).forEach((key) => {
                    if (_.isObject(aptScripts[key]) && _.isFunction(aptScripts[key].toObject) && ['iterationData', 'variables'].indexOf(key) > -1) {
                        _.assign(variablesScope[key], aptScripts[key].toObject());
                    }
                });
            }

            // pm 对象
            const pm = {};

            // info, 请求、响应、cookie, iterationData
            new Array('info', 'request', 'response', 'cookie', 'iterationData').forEach((key) => {
                if (_.indexOf(['request', 'response'], key) > -1) {
                    switch (key) {
                        case 'request':
                            // console.log(scope.script_request);
                            if (_.has(scope, 'script_request') && _.isObject(scope.script_request)) {
                                Object.defineProperty(scope.script_request, 'to', {
                                    get() {
                                        return chai.expect(this).to;
                                    },
                                });

                                Object.defineProperty(pm, key, {
                                    configurable: true,
                                    value: scope.script_request,
                                });
                            }
                            break;
                        case 'response':
                            if (_.has(scope, `response.data.${key}`) && _.isObject(scope.response.data[key])) {
                                if (scope.response.data[key].hasOwnProperty('rawBody')) {
                                    let json = {};

                                    try {
                                        json = JSON5.parse(scope.response.data[key].rawBody);
                                    } catch (e) { }

                                    Object.defineProperty(scope.response.data[key], 'json', {
                                        configurable: true,
                                        value() {
                                            return _.cloneDeep(json);
                                        },
                                    });

                                    Object.defineProperty(scope.response.data[key], 'text', {
                                        configurable: true,
                                        value() {
                                            return scope.response.data[key].rawBody;
                                        },
                                    });
                                }

                                Object.defineProperty(scope.response.data[key], 'to', {
                                    get() {
                                        return chai.expect(this).to;
                                    },
                                });

                                Object.defineProperty(pm, key, {
                                    configurable: true,
                                    value: scope.response.data[key],
                                });
                            }
                            break;
                    }
                } else if (_.isObject(scope[key])) {
                    switch (key) {
                        case 'iterationData':
                            _.assign(variablesScope.iterationData, scope[key]);
                            break;
                        case 'info':
                            _.assign(scope[key], {
                                iteration: scope.iteration,
                                iterationCount: scope.iterationCount,
                                eventName,
                            });
                            break;
                    }

                    Object.defineProperty(pm, key, {
                        configurable: true,
                        value: scope[key],
                    });
                }
            });

            // 变量相关
            Object.keys(variablesScope).forEach((type) => {
                Object.defineProperty(pm, type, {
                    configurable: true,
                    value: dynamicVariables[type],
                });
            });

            if (_.isObject(pm.variables)) {
                Object.defineProperty(pm.variables, 'getName', {
                    configurable: true,
                    value() {
                        return scope.env_name;
                    },
                });

                Object.defineProperty(pm.variables, 'getPreUrl', {
                    configurable: true,
                    value() {
                        return scope.env_pre_url;
                    },
                });

                Object.defineProperty(pm.variables, 'getCollection', {
                    configurable: true,
                    value() {
                        return scope.environment;
                    },
                });

                Object.defineProperty(pm.environment, 'getName', {
                    configurable: true,
                    value() {
                        return scope.env_name;
                    },
                });

                Object.defineProperty(pm.environment, 'getPreUrl', {
                    configurable: true,
                    value() {
                        return scope.env_pre_url;
                    },
                });

                Object.defineProperty(pm.environment, 'getCollection', {
                    configurable: true,
                    value() {
                        return scope.environment;
                    },
                });
            }

            // 请求参数相关
            if (typeof scope !== 'undefined' && _.isObject(scope) && _.has(scope, 'request.request')) {
                // 更新日志

                if (_.isObject(RUNNER_RESULT_LOG)) {
                    const item = RUNNER_RESULT_LOG[scope.iteration_id];

                    if (item) {
                        Object.defineProperty(pm, 'setRequestQuery', {
                            configurable: true,
                            value(key, value) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.query')) {
                                        _.set(item, 'beforeRequest.query', []);
                                    }

                                    item.beforeRequest.query.push({
                                        action: 'set',
                                        key,
                                        value,
                                    });
                                }
                            },
                        });

                        Object.defineProperty(pm, 'removeRequestQuery', {
                            configurable: true,
                            value(key) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.query')) {
                                        _.set(item, 'beforeRequest.query', []);
                                    }

                                    item.beforeRequest.query.push({
                                        action: 'remove',
                                        key,
                                    });
                                }
                            },
                        });

                        Object.defineProperty(pm, 'setRequestHeader', {
                            configurable: true,
                            value(key, value) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.header')) {
                                        _.set(item, 'beforeRequest.header', []);
                                    }

                                    item.beforeRequest.header.push({ // fix bug for 7.0.8
                                        action: 'set',
                                        key: String(key),
                                        value: String(value),
                                    });
                                }
                            },
                        });

                        Object.defineProperty(pm, 'removeRequestHeader', {
                            configurable: true,
                            value(key) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.header')) {
                                        _.set(item, 'beforeRequest.header', []);
                                    }

                                    item.beforeRequest.header.push({
                                        action: 'remove',
                                        key,
                                    });
                                }
                            },
                        });

                        Object.defineProperty(pm, 'setRequestBody', {
                            configurable: true,
                            value(key, value) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.body')) {
                                        _.set(item, 'beforeRequest.body', []);
                                    }

                                    item.beforeRequest.body.push({
                                        action: 'set',
                                        key,
                                        value,
                                    });
                                }
                            },
                        });

                        Object.defineProperty(pm, 'removeRequestBody', {
                            configurable: true,
                            value(key) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, 'beforeRequest.body')) {
                                        _.set(item, 'beforeRequest.body', []);
                                    }

                                    item.beforeRequest.body.push({
                                        action: 'remove',
                                        key,
                                    });
                                }
                            },
                        });
                    }
                }
            }

            // expert
            Object.defineProperty(pm, 'expect', {
                configurable: true,
                value: chai.expect,
            });

            // test
            Object.defineProperty(pm, 'test', {
                configurable: true,
                value(desc, callback) {
                    try {
                        callback();
                        emitAssertResult('success', desc, '成功', scope);
                    } catch (e) {
                        emitAssertResult('error', desc, e.toString().replace('AssertionError', '断言校验失败'), scope);
                    }
                },
            });

            // assert
            Object.defineProperty(pm, 'assert', {
                configurable: true,
                value(assert) {
                    try {
                        const _response = _.cloneDeep(pm.response);

                        if (_.isFunction(_response.json)) {
                            _response.json = _response.json();
                        }

                        chai.assert.isTrue(new Function('response', 'request', 'window', `return ${String(assert)}`)(_response, _.cloneDeep(pm.request)));
                        emitAssertResult('success', String(assert), '成功', scope);
                        return true; // fixed bug
                    } catch (e) {
                        emitAssertResult('error', String(assert), e.toString().replace('AssertionError', '断言校验失败').replace('expected false to be true', '表达式不成立'), scope);
                        return false; // fixed bug
                    }
                },
            });

            // 发送方法
            Object.defineProperty(pm, 'sendRequest', {
                configurable: true,
                value: nodeAjax, // fix bug
            });

            // 可视化
            Object.defineProperty(pm, 'visualizer', {
                configurable: true,
                value: {
                    set: (template, data) => {
                        try {
                            const html = artTemplate.render(template, data);
                            emitVisualizerHtml('success', `<link rel="stylesheet" href="https://img.cdn.apipost.cn/docs/css7/content-v7.css?20220909" type="text/css" media="screen"> ${html}`, scope);
                        } catch (e) {
                            emitVisualizerHtml('error', e.toString(), scope);
                        }
                    },
                },
            });

            // 执行外部程序
            enableUnSafeShell && Object.defineProperty(pm, 'execute', {
                configurable: true,
                value: function (file, args) {
                    if (_.isString(file)) {
                        try {
                            let command = ``;
                            switch (_.toLower(file.substr(file.lastIndexOf(".")))) {
                                case '.go':
                                    command = `go run `;
                                    break;
                                case '.php':
                                    command = `php -f `;
                                    break;
                                case '.py':
                                    command = `python `
                                    break;
                                case '.js':
                                    command = `node `
                                    break;
                                case '.jar':
                                    command = `java -jar `
                                    break;
                                case '.sh':
                                    command = `bash `
                                    break;
                                case '.ruby':
                                    command = `ruby `
                                    break;
                                case '.lua':
                                    command = `lua `
                                    break;
                                case '.bsh':
                                    command = `bsh `
                            }

                            if (command != '') {
                                return String(child_process.execSync(`${command} ${file} ${_.join(args, ' ')}`))
                            }
                        }
                        catch (e) { }
                    }
                },
            });

            Object.defineProperty(pm, 'Visualizing', {
                configurable: true,
                value: (template, data) => {
                    try {
                        const html = artTemplate.render(template, data);
                        // console.log(html, template);
                        emitVisualizerHtml('success', `<link rel="stylesheet" href="https://img.cdn.apipost.cn/docs/css7/content-v7.css?20220909" type="text/css" media="screen"> ${html}`, scope);
                    } catch (e) {
                        // console.log(e);
                        emitVisualizerHtml('error', e.toString(), scope);
                    }
                },
            });

            Object.defineProperty(pm, 'getData', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
                configurable: true,
                value(callback) {
                    // @todo
                },
            });

            // 跳过下面的流程直接到执行指定接口
            Object.defineProperty(pm, 'setNextRequest', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
                configurable: true,
                value(target_id) {
                    // @todo
                },
            });

            // 执行
            try {
                // const $ = {};

                $.md5 = function (str) { // 兼容旧版
                    return CryptoJS.MD5(str).toString();
                };

                $.ajax = await nodeAjax;

                // fix bug
                code = `(async function () {
          ${code}
        })()`;

                await (new vm2.VM({
                    timeout: 5000,
                    sandbox: _.assign({
                        ...{ nodeAjax },
                        ...{ pm },
                        ...{ chai },
                        ...{ emitAssertResult },
                        ...{ JSON5 },
                        ...{ _ },
                        ...{ Mock },
                        ...{ uuid },
                        ...{ jsonpath },
                        ...{ CryptoJS },
                        // ...{ $ },
                        ...{ x2js },
                        JSEncrypt: JSEncryptNode,
                        ...{ moment },
                        ...{ dayjs },
                        JSON, // 增加 JSON 方法 // fixed JSON5 bug
                        console: consoleFn,
                        print: consoleFn.log,
                        async: asyncModule,
                        FormData,
                        sm2, // fix bug for 7.0.8
                        sm3, // fix bug for 7.0.8
                        sm4, // fix bug for 7.0.8
                        csv2array: csv2json,
                        mysql, mssql, ClickHouse, pgClient,
                        fs: enableUnSafeShell ? fs : {},
                        path, json2csv, // for 7.0.13
                        xml2json(xml) {
                            return (new x2js()).xml2js(xml);
                        },
                        uuidv4() {
                            return uuid.v4();
                        },
                        ...{ uuid },
                        ...{ aTools },
                        ...{ validCookie },
                        ...{ urlJoin },
                        urljoins, // fix bug for 7.0.8
                        apt: pm,
                        $,
                        // Promise,
                        request: pm.request ? _.cloneDeep(pm.request) : {},
                        response: pm.response ? _.assign(pm.response, { json: _.isFunction(pm.response.json) ? pm.response.json() : pm.response.json }) : {},
                        expect: chai.expect,
                        sleep: atomicSleep,
                        // child_process
                        // sleep(ms) {
                        //   const end = Date.now() + parseInt(ms);
                        //   while (true) {
                        //     if (Date.now() > end) {
                        //       return;
                        //     }
                        //   }
                        // },
                    }, variablesScope),
                })).run(new vm2.VMScript(code));
                typeof callback === 'function' && callback(null, pm.response);
            } catch (err) {
                emitTargetPara({
                    action: 'SCRIPT_ERROR',
                    eventName,
                    data: `${eventName == 'pre_script' ? '预执行' : '后执行'}脚本语法错误: ${err.toString()}`,
                }, scope);
                typeof callback === 'function' && callback(err.toString());
            }
        }

        _.assign(this, {
            ...{ execute },
            ...{ getAllInsideVariables },
            ...{ getAllDynamicVariables },
            ...{ dynamicVariables },
            ...{ variablesScope },
            ...{ replaceIn },
        });
    };

    const mySandbox = new Sandbox();

    // sleep 延迟方法
    function sleepDelay(ms) {
        atomicSleep(ms)
    }

    // 根据测试条件返回布尔值
    function returnBoolean(exp, compare, value) {
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
    function getParentTargetIDs(collection, target_id, parent_ids = []) {
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
    function getInitDefinitionsParentIDs(event_id, initDefinitions = []) {
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
                if (item.event_id == event_id) {
                    // if (uuid.validate(item.parent_id)) {
                    if (item.parent_id != '0') {
                        parentArr.push(item.parent_id);
                        getParentArr(item.parent_id);
                    }
                }
            });
        }(event_id));

        return parentArr;
    }

    // 获取某接口的详细信息
    function getItemFromCollection(collection, target_id) {
        return _.find(collection, _.matchesProperty('target_id', target_id));
    }

    // 计算runtime 结果
    function calculateRuntimeReport(log, initDefinitions = [], report_id = '', option = {}) {
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
                        data: item.type == 'api' ? item.request : item.condition,
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
            };
        } else {
            option.env_id = option.env.env_id;
            option.env_name = option.env.env_name;
            option.env_pre_url = option.env.env_pre_url;
        }

        const report = {
            combined_id: option.combined_id,
            report_id,
            report_name: option.default_report_name,
            env_id: option.env.env_id,
            env_name: option.env.env_name,
            env_pre_url: option.env.env_pre_url,
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


    // 参数初始化
    function runInit() {
        RUNNER_ERROR_COUNT = 0;
        // RUNNER_TOTAL_COUNT = 0
        startTime = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 开始时间
        startTimeStamp = Date.now(); // 开始时间戳
        RUNNER_RESULT_LOG = {};
    }

    // 停止 run
    function stop(report_id, message) {
        RUNNER_STOP[report_id] = 1;

        emitRuntimeEvent({
            action: 'stop',
            report_id,
            message,
        });
    }

    let startTime = dayjs().format('YYYY-MM-DD HH:mm:ss'), // 开始时间
        startTimeStamp = Date.now(), // 开始时间戳
        initDefinitions = [], // 原始colletion
        RUNNER_RUNTIME_POINTER = 0;

    // start run
    const PREV_REQUEST = {
        request: {},
        response: {},
        iterationData: {},
        iterationCount: 0
    }

    async function run(definitions, option = {}, initFlag = 0, loopCount = 0) {
        option = _.assign({
            project: {},
            collection: [], // 当前项目的所有接口列表
            environment: {}, // 当前环境变量
            globals: {}, // 当前公共变量
            iterationData: [], // 当前迭代的excel导入数据
            iterationCount: loopCount || 1, // 当前迭代次数
            ignoreError: 1, // 遇到错误忽略
            sleep: 0, // 每个任务的间隔时间
            requester: {}, // 发送模块的 options
        }, option);

        let { RUNNER_REPORT_ID, scene, project, cookies, collection, iterationData, combined_id, test_events, default_report_name, user, env, env_name, env_pre_url, environment, globals, iterationCount, ignoreError, ignore_error, enable_sandbox, sleep, requester } = option;

        if (typeof ignoreError === 'undefined') {
            ignoreError = ignore_error ? !!ignore_error : 0;
        } else {
            ignoreError = !!ignoreError;
        }
        ignore_error = ignoreError ? 1 : 0;
        enable_sandbox = typeof enable_sandbox === 'undefined' ? -1 : enable_sandbox; // fix bug

        if (typeof env === 'undefined') {
            env = {
                env_name,
                env_pre_url,
            };
        } else {
            env_name = env.env_name;
            env_pre_url = env.env_pre_url;
        }

        if (initFlag == 0) { // 初始化参数
            if (_.size(RUNNER_RESULT_LOG) > 0) { // 当前有任务时，拒绝新任务
                return;
            }

            // 设置sandbox的 environment变量 和 globals 变量
            // fix bug for 7.0.8
            new Array('environment', 'globals').forEach((func) => {
                if (_.isObject(option[func]) && _.isObject(mySandbox.dynamicVariables[func]) && _.isFunction(mySandbox.dynamicVariables[func].set)) {
                    for (const [key, value] of Object.entries(option[func])) {
                        mySandbox.dynamicVariables[func].set(key, value, false);
                    }
                }
            });

            runInit();
            RUNNER_STOP[RUNNER_REPORT_ID] = 0;
            RUNNER_TOTAL_COUNT = typeof definitions[0] === 'object' ? definitions[0].RUNNER_TOTAL_COUNT : 0;
            RUNNER_RUNTIME_POINTER = 0;
            initDefinitions = definitions;

            if (RUNNER_TOTAL_COUNT <= 0) {
                return;
            }
        } else if (RUNNER_STOP[RUNNER_REPORT_ID] > 0) {
            RUNNER_RESULT_LOG = definitions = option = collection = initDefinitions = null;
            return;
        }

        // 使用场景 auto_test/request
        if (_.isUndefined(scene)) {
            scene = 'auto_test';
        }

        // 兼容 单接口请求 和 自动化测试
        if (!uuid.validate(combined_id)) {
            combined_id = '0';
        }

        if (!_.isObject(test_events)) {
            test_events = {
                test_id: uuid.v4(),
                name: '未命名',
            };
        }

        if (!_.isString(default_report_name)) {
            default_report_name = '默认自动化测试报告';
        }

        if (!_.isObject(user)) {
            user = {
                uuid: '-1',
                nick_name: '匿名',
            };
        }

        if (!_.isArray(iterationData)) {  // fixed iterationData 兼容
            if (_.isObject(iterationData)) {
                const _interData = _.values(iterationData);
                if (_.isArray(_interData) && _.isArray(_interData[0])) {
                    iterationData = _interData[0];
                } else {
                    iterationData = [];
                }
            } else {
                iterationData = [];
            }
        }

        if (typeof iterationCount === 'undefined') {
            iterationCount = loopCount || 1;
        }

        // 自动替换 Mock
        const AUTO_CONVERT_FIELD_2_MOCK = typeof requester === 'object' && requester.AUTO_CONVERT_FIELD_2_MOCK > 0;


        // // 设置sandbox的 environment变量 和 globals 变量
        // new Array('environment', 'globals').forEach((func) => {
        //   console.log(option[func])
        //   if (_.isObject(option[func]) && _.isObject(mySandbox.dynamicVariables[func]) && _.isFunction(mySandbox.dynamicVariables[func].set)) {
        //     for (const [key, value] of Object.entries(option[func])) {
        //       mySandbox.dynamicVariables[func].set(key, value, false);
        //     }
        //   }
        // });

        // 发送对象
        const request = new apipostRequest(_.isObject(requester) ? requester : {});

        // fix bug for 7.0.8
        if (option.sleep > 0) {
            sleepDelay(option.sleep);
        }

        // 全局断言
        const _global_asserts = _.find(definitions, _.matchesProperty('type', 'assert'));
        let _global_asserts_script = '';

        if (_global_asserts && _.has(_global_asserts, 'data.content')) {
            _global_asserts_script = _global_asserts.data.content;
        }

        if (_.isArray(definitions) && definitions.length > 0) {
            for (let i = 0; i < definitions.length; i++) {
                const definition = definitions[i];
                // RUNNER_RUNTIME_POINTER

                _.assign(definition, {
                    iteration_id: uuid.v4(),  // 每次执行单任务的ID
                    iteration: loopCount,
                    iterationData: iterationData[loopCount] ? iterationData[loopCount] : iterationData[0],
                    ...{ iterationCount },
                    ...{ env_name },
                    ...{ env_pre_url },
                    ...{ environment },
                    ...{ globals },
                });

                _.set(PREV_REQUEST, 'iterationCount', loopCount);

                if (_.isObject(definition.iterationData)) {
                    _.set(PREV_REQUEST, 'iterationData', definition.iterationData);
                    for (const [key, value] of Object.entries(definition.iterationData)) {
                        mySandbox.dynamicVariables.iterationData.set(key, value, false);
                    }
                } else {
                    mySandbox.dynamicVariables.iterationData.clear();
                }

                if (definition.enabled > 0) {
                    // 设置沙盒的迭代变量
                    switch (definition.type) {
                        case 'wait':
                            if (definition.condition.sleep > 0) {
                                sleepDelay(parseInt(definition.condition.sleep));
                            }
                            break;
                        case 'script':
                            // case 'assert':
                            if (_.has(definition, 'data.content') && _.isString(definition.data.content)) {
                                await mySandbox.execute(definition.data.content, definition, 'test', (err, res) => {
                                    if (err && ignoreError < 1) {
                                        stop(RUNNER_REPORT_ID, String(err));
                                    }
                                });
                            }
                            break;
                        case 'if':
                            _.set(definition, 'runtime.condition', `${mySandbox.replaceIn(definition.condition.var)} ${definition.condition.compare} ${mySandbox.replaceIn(definition.condition.value)}`);

                            if (returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value))) {
                                await run(definition.children, option, initFlag + 1, loopCount);
                            }
                            break;
                        case 'request':
                        case 'api':
                            if (_.has(definition, 'request') && _.isObject(definition.request)) {
                                // 多环境
                                let temp_env = _.isObject(definition.temp_env) ? definition.temp_env : {};
                                if (_.has(temp_env, 'pre_url') && _.isString(temp_env.pre_url) && temp_env.pre_url != '') {
                                    env_pre_url = temp_env.pre_url;
                                }

                                let res = {};
                                // 拼接全局参数、目录参数、以及脚本
                                let _requestPara = {};
                                let _parent_ids = _.reverse(getParentTargetIDs(collection, definition.request.target_id));
                                let _requestBody = getItemFromCollection(collection, definition.request.target_id);

                                if (_requestBody && _.isObject(_requestBody)) {
                                    _.assign(definition.request, {
                                        url: definition.request.url ? definition.request.url : _requestBody.request.url,
                                        request: _.cloneDeep(_requestBody.request), // fix bug
                                    });

                                    _requestBody = null;
                                }

                                new Array('header', 'body', 'query', 'auth', 'pre_script', 'test', 'resful').forEach((_type) => {
                                    // 参数
                                    if (_.indexOf(['header', 'body', 'query', 'resful'], _type) > -1) {
                                        if (typeof _requestPara[_type] === 'undefined') {
                                            _requestPara[_type] = _type == 'header' ? {} : [];
                                        }

                                        // 全局参数
                                        if (typeof project.request === 'object' && _.isArray(project.request[_type])) {
                                            project.request[_type].forEach((item) => {
                                                if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                    if (_type == 'header') {
                                                        _requestPara[_type][_.trim(item.key)] = item;
                                                    } else {
                                                        _requestPara[_type].push(item);
                                                    }
                                                }
                                            });
                                        }

                                        // 目录参数
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach((parent_id) => {
                                                const _folder = getItemFromCollection(collection, parent_id);

                                                if (_.has(_folder, 'request') && _.isArray(_folder.request[_type])) {
                                                    _folder.request[_type].forEach((item) => {
                                                        if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                            if (_type == 'header') {
                                                                _requestPara[_type][_.trim(item.key)] = item;
                                                            } else {
                                                                _requestPara[_type].push(item);
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }

                                        // 接口参数
                                        if (_.has(definition, `request.request.${_type}.parameter`) && _.isArray(definition.request.request[_type].parameter)) {
                                            definition.request.request[_type].parameter.forEach((item) => {
                                                if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                    if (_type == 'header') {
                                                        _requestPara[_type][_.trim(item.key)] = item;
                                                    } else {
                                                        _requestPara[_type].push(item);
                                                    }
                                                }
                                            });
                                        }
                                    }

                                    // 认证
                                    if (_.indexOf(['auth'], _type) > -1) {
                                        if (typeof _requestPara[_type] === 'undefined') {
                                            _requestPara[_type] = {};
                                        }

                                        // 全局认证
                                        if (_.has(project, `request.['${_type}']`) && _.isObject(project.request[_type]) && project.request[_type].type != 'noauth') {
                                            _.assign(_requestPara[_type], project.request[_type]);
                                        }

                                        // 目录认证
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach((parent_id) => {
                                                const _folder = getItemFromCollection(collection, parent_id);
                                                // console.log(_folder);
                                                if (_.has(_folder, `request.['${_type}']`) && _.isObject(_folder.request[_type]) && _folder.request[_type].type != 'noauth') {
                                                    // console.log(_folder.request[_type]);
                                                    _.assign(_requestPara[_type], _folder.request[_type]);
                                                }
                                            });
                                        }

                                        // 接口认证
                                        if (_.has(definition, `request.request.${_type}`) && _.isObject(definition.request.request[_type]) && definition.request.request[_type].type != 'noauth') {
                                            _.assign(_requestPara[_type], definition.request.request[_type]);
                                        }
                                    }
                                    // console.log(_requestPara);
                                    // mySandbox.replaceIn(item.key, null, AUTO_CONVERT_FIELD_2_MOCK)

                                    // 脚本
                                    if (_.indexOf(['pre_script', 'test'], _type) > -1) {
                                        if (typeof _requestPara[_type] === 'undefined') {
                                            _requestPara[_type] = '';
                                        }

                                        // 全局脚本， 已兼容旧版本
                                        if (_.has(project, `script.['${_type}']`) && _.isString(project.script[_type]) && project.script[`${_type}_switch`] > 0) {
                                            _requestPara[_type] = `${_requestPara[_type]}\r\n${project.script[_type]}`;
                                        } else if (_.has(project, `request.script.['${_type}']`) && _.isString(project.request.script[_type]) && project.request.script[`${_type}_switch`] > 0) {
                                            _requestPara[_type] = `${_requestPara[_type]}\r\n${project.request.script[_type]}`;
                                        }

                                        // 目录脚本
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach((parent_id) => {
                                                const _folder = getItemFromCollection(collection, parent_id);

                                                if (_.has(_folder, `script.['${_type}']`) && _.isString(_folder.script[_type]) && _folder.script[`${_type}_switch`] > 0) {
                                                    _requestPara[_type] = `${_requestPara[_type]}\r\n${_folder.script[_type]}`;
                                                }
                                            });
                                        }

                                        // 接口脚本
                                        if (_.has(definition, `request.request.event.${_type}`) && _.isString(definition.request.request.event[_type])) {
                                            _requestPara[_type] = `${_requestPara[_type]}\r\n${definition.request.request.event[_type]}`;
                                        }
                                    }
                                });

                                let _timeout = 0;
                                if (_.has(option, 'requester.timeout') && _.isNumber(option.requester.timeout) && option.requester.timeout >= 0) {
                                    _timeout = option.requester.timeout;
                                }

                                // script_mode
                                let _script_mode = 'none';

                                if (_.has(definition, 'request.request.body.mode')) {
                                    _script_mode = definition.request.request.body.mode;
                                }

                                // script_header
                                const _script_headers = [];
                                _.forEach(_requestPara.header, (item) => {
                                    _script_headers.push(item);
                                });

                                // fix bug for 7.0.8
                                const _script_request_headers_raw = request.formatRequestHeaders(_script_headers, _script_mode);
                                const _script_request_headers = {};

                                if (_.isPlainObject(_script_request_headers_raw)) {
                                    _.forEach(_script_request_headers_raw, function (value, key) {
                                        _script_request_headers[mySandbox.replaceIn(key, null, AUTO_CONVERT_FIELD_2_MOCK)] = mySandbox.replaceIn(value, null, AUTO_CONVERT_FIELD_2_MOCK);
                                    });
                                }

                                const _script_header_map = {
                                    urlencoded: 'application/x-www-form-urlencoded',
                                    none: '',
                                    'form-data': 'multipart/form-data',
                                };

                                // script_query
                                const _script_querys = {};
                                if (_.has(_requestPara, 'query')) {
                                    _.forEach(request.formatQueries(_requestPara.query), (value, key) => {
                                        // _script_querys[key] = value; // fix bug for 7.0.8
                                        _script_querys[mySandbox.replaceIn(key, null, AUTO_CONVERT_FIELD_2_MOCK)] = mySandbox.replaceIn(value, null, AUTO_CONVERT_FIELD_2_MOCK);
                                    });
                                }

                                // script_body
                                let _script_bodys = {};

                                switch (_script_mode) {
                                    case 'none':
                                        _script_bodys = '';
                                        break;
                                    case 'form-data':
                                    case 'urlencoded':
                                        if (_.has(_requestPara, 'body') && _.isArray(_requestPara.body)) {
                                            _requestPara.body.forEach((item) => {
                                                if (parseInt(item.is_checked) > 0) {
                                                    _script_bodys[mySandbox.replaceIn(item.key, null, AUTO_CONVERT_FIELD_2_MOCK)] = mySandbox.replaceIn(item.value, null, AUTO_CONVERT_FIELD_2_MOCK);  // fix bug
                                                }
                                            });
                                        }
                                        break;
                                    case 'json': // fix bug for 7.0.13
                                        if (_.has(definition, 'request.request.body.raw')) {
                                            _script_bodys = mySandbox.replaceIn(request.formatRawJsonBodys(definition.request.request.body.raw), null, AUTO_CONVERT_FIELD_2_MOCK);
                                        } else {
                                            _script_bodys = '';
                                        }
                                        break;
                                    default: // fix bug for 7.0.13
                                        if (_.has(definition, 'request.request.body.raw')) {
                                            _script_bodys = mySandbox.replaceIn(definition.request.request.body.raw, null, AUTO_CONVERT_FIELD_2_MOCK);
                                        } else {
                                            _script_bodys = '';
                                        }
                                        break;
                                }

                                // script_request_para
                                // 环境前缀 fix bug
                                // for 多环境
                                // if(_.isString(_.get(temp_env,definition.temp_env)))
                                let _script_pre_url = mySandbox.replaceIn(env_pre_url, null, AUTO_CONVERT_FIELD_2_MOCK);
                                let _script_url = mySandbox.replaceIn(definition.request.url, null, AUTO_CONVERT_FIELD_2_MOCK);

                                // 拼接环境前置URl
                                if (_.isString(_script_pre_url) && _script_pre_url.length > 0) {
                                    if (!_.startsWith(_.toLower(_script_pre_url), 'https://') && !_.startsWith(_.toLower(_script_pre_url), 'http://')) {
                                        _script_pre_url = `http://${_script_pre_url}`;
                                    }

                                    // _script_url = urlJoin(_script_pre_url, _script_url);
                                    _script_url = urljoins(_script_pre_url, _script_url);// fix bug for 7.0.8

                                    if (_.endsWith(_script_pre_url, '/')) { // fix bug
                                        _script_url = _.replace(_script_url, `${_script_pre_url}:`, `${_script_pre_url.substr(0, _script_pre_url.length - 1)}:`);
                                    } else {
                                        _script_url = _.replace(_script_url, `${_script_pre_url}/:`, `${_script_pre_url}:`);
                                    }
                                } else if (!_.startsWith(_.toLower(_script_url), 'https://') && !_.startsWith(_.toLower(_script_url), 'http://')) {
                                    _script_url = `http://${_script_url}`;
                                }

                                const _request_para = {
                                    id: (_.has(definition, 'request.target_id') ? definition.request.target_id : ''),
                                    name: (_.has(definition, 'request.name') ? definition.request.name : undefined),
                                    description: (_.has(definition, 'request.request.description') ? definition.request.request.description : undefined),
                                    url: _script_url,
                                    method: definition.request.method,
                                    timeout: _timeout,
                                    contentType: _script_request_headers['content-type'] ? _script_request_headers['content-type'] : (_script_header_map[_script_mode] ? _script_header_map[_script_mode] : ''),
                                    request_headers: _script_request_headers,
                                    request_querys: _script_querys,
                                    request_bodys: _script_bodys,
                                    data: _script_bodys,
                                    headers: _script_request_headers,
                                };

                                if (!_.isObject(RUNNER_RESULT_LOG)) {
                                    RUNNER_RESULT_LOG = {};
                                }
                                RUNNER_RESULT_LOG[definition.iteration_id] = {
                                    test_id: definition.test_id,
                                    report_id: RUNNER_REPORT_ID,
                                    parent_id: definition.parent_id,
                                    event_id: definition.event_id,
                                    iteration_id: definition.iteration_id,
                                    type: definition.type,
                                    target_id: definition.target_id,
                                    request: _request_para,
                                    response: {},
                                    http_error: -1,
                                    assert: [],
                                    datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                                };

                                // 执行预执行脚本
                                _.set(definition, 'script_request', _request_para); // fix bug

                                if (_.has(_requestPara, 'pre_script') && _.isString(_requestPara.pre_script)) {
                                    await mySandbox.execute(_requestPara.pre_script, definition, 'pre_script', (err, res) => {
                                        // console.log('pre_script', err, res);
                                        if (err && ignoreError < 1) {
                                            stop(RUNNER_REPORT_ID, String(err));
                                        }
                                    });
                                }

                                let _request = _.cloneDeep(definition.request);

                                // 替换 _requestPara 的参数变量
                                new Array('header', 'query', 'body', 'resful').forEach((type) => {
                                    _requestPara[type] = _.values(_requestPara[type]);
                                    _requestPara[type].map((item) => {
                                        if (item.type == 'File') {
                                            _.assign(item, {
                                                key: mySandbox.replaceIn(item.key, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                value: item.value,
                                            });
                                        } else {
                                            _.assign(item, {
                                                key: mySandbox.replaceIn(item.key, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                value: mySandbox.replaceIn(item.value, null, AUTO_CONVERT_FIELD_2_MOCK),
                                            });
                                        }
                                    });

                                    if (type == 'body' && _.has(_request, 'request.body.raw')) {
                                        _request.request.body.raw = mySandbox.replaceIn(_request.request.body.raw, null, AUTO_CONVERT_FIELD_2_MOCK);
                                    }

                                    _.set(_request, `request.${type}.parameter`, _requestPara[type]);
                                });

                                // 认证 fixed bug
                                if (_.isObject(_requestPara.auth) && _.isString(_requestPara.auth.type) && _.isObject(_requestPara.auth[_requestPara.auth.type])) {
                                    Object.keys(_requestPara.auth[_requestPara.auth.type]).forEach((key) => {
                                        _requestPara.auth[_requestPara.auth.type][key] = mySandbox.replaceIn(_requestPara.auth[_requestPara.auth.type][key], null, AUTO_CONVERT_FIELD_2_MOCK);
                                    });
                                }

                                // 重新渲染请求参数
                                let _target = _.isObject(RUNNER_RESULT_LOG) ? RUNNER_RESULT_LOG[definition.iteration_id] : {};

                                if (typeof _target === 'object' && _.isObject(_target.beforeRequest)) {
                                    new Array('query', 'header', 'body').forEach((type) => {
                                        if (_.has(_request, `request.${type}.parameter`) && _.isArray(_target.beforeRequest[type])) {
                                            _target.beforeRequest[type].forEach((_item) => {
                                                if (_item.action == 'set') {
                                                    if (_.isObject(_item.key) || _.isUndefined(_item.value)) { // 允许直接修改请求体 new features
                                                        if (_.isArray(_request.request[type].parameter)) {
                                                            _request.request[type].parameter = [];
                                                            if (_.isObject(_item.key)) {
                                                                _.forEach(_item.key, (_set_value, _set_key) => {
                                                                    _set_key = _.trim(_set_key);
                                                                    if (_set_key != '') {
                                                                        _request.request[type].parameter.push({
                                                                            description: '',
                                                                            field_type: 'Text',
                                                                            is_checked: '1',
                                                                            key: mySandbox.replaceIn(_set_key, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                                            not_null: '1',
                                                                            type: 'Text',
                                                                            value: mySandbox.replaceIn(_set_value, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                                        });
                                                                    }
                                                                });
                                                            }
                                                        }
                                                    } else if (_.isString(_item.key)) {
                                                        const _itemPara = _.find(_request.request[type].parameter, _.matchesProperty('key', mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK)));

                                                        if (_itemPara) {
                                                            _itemPara.value = mySandbox.replaceIn(_item.value, null, AUTO_CONVERT_FIELD_2_MOCK);
                                                        } else {
                                                            _request.request[type].parameter.push({
                                                                description: '',
                                                                field_type: 'Text',
                                                                is_checked: '1',
                                                                key: mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                                not_null: '1',
                                                                type: 'Text',
                                                                value: mySandbox.replaceIn(_item.value, null, AUTO_CONVERT_FIELD_2_MOCK),
                                                            });
                                                        }
                                                    }
                                                } else if (_item.action == 'remove') {
                                                    _.remove(_request.request[type].parameter, _.matchesProperty('key', mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK)));
                                                }
                                            });
                                        }
                                        // fix bug body 参数为空时，预执行脚本设置body无效的bug for 7.0.13
                                        if (type == 'body' && _.has(_request, 'request.body.raw') && _.isArray(_target.beforeRequest.body) && _target.beforeRequest.body.length > 0) {
                                            let _rawParse = null;

                                            _target.beforeRequest[type].forEach((_item) => {
                                                if (_item.action == 'set') {
                                                    if (_.isObject(_item.key) || _.isUndefined(_item.value)) { // 允许直接修改请求体 new features
                                                        if (_.isObject(_item.key)) {
                                                            _request.request.body.raw = mySandbox.replaceIn(JSONbig.stringify(_item.key), null, AUTO_CONVERT_FIELD_2_MOCK);
                                                        } else if (_.isString(_item.key)) {
                                                            _request.request.body.raw = mySandbox.replaceIn(String(_item.key), null, AUTO_CONVERT_FIELD_2_MOCK); // fix bug
                                                        } else if (_.isNumber(_item.key)) {
                                                            _request.request.body.raw = String(_item.key);
                                                        }
                                                    } else if (_.isString(_item.key) && aTools.isJson5(_request.request.body.raw)) {
                                                        try {
                                                            _rawParse = JSONbig.parse(stripJsonComments(_request.request.body.raw));
                                                        } catch (e) {
                                                            _rawParse = JSON5.parse(_request.request.body.raw);
                                                        }
                                                        _.set(_rawParse, mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK), mySandbox.replaceIn(_item.value, null, AUTO_CONVERT_FIELD_2_MOCK));

                                                        if (_.isObject(_rawParse)) {
                                                            _request.request.body.raw = JSONbig.stringify(_rawParse);
                                                        } else {
                                                            _request.request.body.raw = _rawParse;
                                                        }
                                                    }
                                                } else if (_item.action == 'remove' && aTools.isJson5(_request.request.body.raw)) {
                                                    try {
                                                        _rawParse = JSONbig.parse(stripJsonComments(_request.request.body.raw));
                                                    } catch (e) {
                                                        _rawParse = JSON5.parse(_request.request.body.raw);
                                                    }
                                                    _.unset(_rawParse, mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK));

                                                    if (_.isObject(_rawParse)) {
                                                        _request.request.body.raw = JSONbig.stringify(_rawParse);
                                                    } else {
                                                        _request.request.body.raw = _rawParse;
                                                    }
                                                }
                                            });
                                        }
                                    });
                                }

                                if (_.isObject(_requestPara.auth[_requestPara.auth.type])) {
                                    _requestPara.auth[_requestPara.auth.type] = _.mapValues(_requestPara.auth[_requestPara.auth.type], val => mySandbox.replaceIn(val, null, AUTO_CONVERT_FIELD_2_MOCK));
                                    // console.log(_request, _requestPara);
                                    _.set(_request, 'request.auth.type', _requestPara.auth.type); // fix bug
                                    _.set(_request, `request.auth.${_requestPara.auth.type}`, _requestPara.auth[_requestPara.auth.type]);
                                }

                                // url 兼容
                                let _url = _request.request.url ? _request.request.url : _request.url;
                                _url = mySandbox.replaceIn(_url, null, AUTO_CONVERT_FIELD_2_MOCK);

                                // fixed bug add 替换路径变量
                                if (_.isArray(_requestPara.resful) && _requestPara.resful.length > 0) {
                                    _requestPara.resful.forEach((_resful) => {
                                        _resful.key = _.trim(_resful.key);

                                        if (_resful.is_checked > 0 && _resful.key !== '') {
                                            _url = _.replace(_url, `:${_resful.key}`, _resful.value);
                                        }
                                    });
                                }

                                // 环境前缀 fix bug
                                let _pre_url = mySandbox.replaceIn(env_pre_url, null, AUTO_CONVERT_FIELD_2_MOCK);

                                // 拼接环境前置URl
                                if (_.isString(_pre_url) && _pre_url.length > 0) {
                                    if (!_.startsWith(_.toLower(_pre_url), 'https://') && !_.startsWith(_.toLower(_pre_url), 'http://')) {
                                        _pre_url = `http://${_pre_url}`;
                                    }

                                    // _url = urlJoin(_pre_url, _url);
                                    _url = urljoins(_pre_url, _url); // fix bug for 7.0.8

                                    if (_.endsWith(_pre_url, '/')) { // fix bug
                                        _url = _.replace(_url, `${_pre_url}:`, `${_pre_url.substr(0, _pre_url.length - 1)}:`);
                                    } else {
                                        _url = _.replace(_url, `${_pre_url}/:`, `${_pre_url}:`);
                                    }
                                } else if (!_.startsWith(_.toLower(_url), 'https://') && !_.startsWith(_.toLower(_url), 'http://')) {
                                    _url = `http://${_url}`;
                                }
                                // _url=encodeURI(_url);
                                _.set(_request, 'url', _url);
                                _.set(_request, 'request.url', _url);

                                let _isHttpError = -1;

                                // cookie
                                // 已修复 cookie 无法使用的问题
                                if (typeof cookies === 'object' && _.has(cookies, 'switch') && _.has(cookies, 'data')) {
                                    if (cookies.switch > 0 && _.isArray(cookies.data)) {
                                        const _cookieArr = [];
                                        cookies.data.forEach((_cookie) => {
                                            if (typeof _cookie.name === 'undefined' && typeof _cookie.key === 'string') {
                                                _cookie.name = _cookie.key;
                                            }
                                            const cookieStr = validCookie.isvalid(_url, _cookie);

                                            if (cookieStr) {
                                                _cookieArr.push(cookieStr.cookie);
                                            }
                                        });

                                        if (_cookieArr.length > 0) {
                                            if (_.has(_request, 'request.header.parameter')) {
                                                const _targetHeaderCookie = _.find(_request.request.header.parameter, o => _.trim(_.toLower(o.key)) == 'cookie');

                                                if (_targetHeaderCookie && _targetHeaderCookie.is_checked > 0) {
                                                    _targetHeaderCookie.value = `${_cookieArr.join(';')};${_targetHeaderCookie.value}`; // fix bug for 7.0.8
                                                } else {
                                                    _request.request.header.parameter.push({
                                                        key: 'cookie',
                                                        value: _cookieArr.join(';'), // fix cookie bug
                                                        description: '',
                                                        not_null: 1,
                                                        field_type: 'String',
                                                        type: 'Text',
                                                        is_checked: 1,
                                                    });
                                                }
                                            } else {
                                                _.set(_request, 'request.header.parameter', [{
                                                    key: 'cookie',
                                                    value: _cookieArr.join(';'), // fix cookie bug
                                                    description: '',
                                                    not_null: 1,
                                                    field_type: 'String',
                                                    type: 'Text',
                                                    is_checked: 1,
                                                }]);
                                            }
                                        }
                                    }
                                }

                                //如果是mock环境，则携带apipost_id
                                if (`${option.env_id}` === '-2') {
                                    //判断query数组内是否包含apipost_id
                                    const requestApipostId = _request?.request?.query?.parameter.find(item => item.key === 'apipost_id');
                                    if (_.isUndefined(requestApipostId)) {
                                        _request.request.query.parameter.push({
                                            key: 'apipost_id',
                                            value: _request.target_id.substr(0, 6),
                                            description: '',
                                            not_null: 1,
                                            field_type: 'String',
                                            type: 'Text',
                                            is_checked: 1,
                                        });
                                    }
                                }


                                try {
                                    // console.log(_request)
                                    // 合并请求参数
                                    res = await request.request(_request);
                                } catch (e) {
                                    res = e;
                                }

                                if (res.status === 'error') {
                                    _isHttpError = 1;
                                    RUNNER_ERROR_COUNT++;

                                    if (scene == 'auto_test') {
                                        cliConsole(`\n${_request.method} ${_request.url}`.grey);
                                        cliConsole(`\t${RUNNER_ERROR_COUNT}. HTTP 请求失败`.bold.red); // underline.
                                    }
                                } else {
                                    _isHttpError = -1;
                                    if (scene == 'auto_test') {
                                        cliConsole(`\n${_request.method} ${_request.url} [${res.data.response.code} ${res.data.response.status}, ${res.data.response.responseSize}KB, ${res.data.response.responseTime}ms]`.grey);
                                        cliConsole('\t✓'.green + ' HTTP 请求成功'.grey);
                                    }
                                }

                                // 优化返回体结构
                                let _response = _.cloneDeep(res);

                                if (_response.status == 'success' && _.isObject(_response.data.response)) {
                                    _.unset(_response, 'data.response.base64Body');
                                    _.unset(_response, 'data.response.header');
                                    _.unset(_response, 'data.response.resHeaders');
                                    _.unset(_response, 'data.response.json');
                                    _.unset(_response, 'data.response.raw');
                                    _.unset(_response, 'data.response.rawBody');
                                    _.unset(_response, 'data.response.rawCookies');
                                    _.unset(_response, 'data.response.cookies');
                                }

                                try {
                                    _.set(_response, 'data.response.stream.data', Array.from(zlib.deflateSync(Buffer.from(_response.data.response.stream.data))));
                                } catch (err) { } // 此错误无需中止运行

                                _.assign(_target, {
                                    request: _request,
                                    response: _response,
                                    http_error: _isHttpError,
                                });

                                // 发送console

                                if (scene != 'auto_test') { // / done
                                    if (res.status === 'error') {
                                        let _formPara = {};

                                        if (_.indexOf(['form-data', 'urlencoded'], _request.request.body.mode)) {
                                            if (_.has(_request, 'request.body.parameter')) {
                                                _request.request.body.parameter.forEach((_para) => {
                                                    if (_para.is_checked > 0) {
                                                        if (!_formPara[_para.key]) {
                                                            _formPara[_para.key] = [];
                                                        }
                                                        _formPara[_para.key].push(_para.value);
                                                    }
                                                });
                                            }
                                        } else {
                                            _formPara = _request.request.body.raw;
                                        }

                                        // 请求控制台信息
                                        emitRuntimeEvent({
                                            action: 'console',
                                            method: 'request',
                                            message: {
                                                data: {
                                                    request: {
                                                        id: (_.has(definition, 'request.target_id') ? definition.request.target_id : ''),
                                                        name: (_.has(definition, 'request.name') ? definition.request.name : undefined),
                                                        description: (_.has(definition, 'request.request.description') ? definition.request.request.description : undefined),
                                                        method: _request.method,
                                                        url: request.setQueryString(_request.request.url, request.formatQueries(_request.request.query.parameter)).uri,
                                                        request_bodys: _.indexOf(['form-data', 'urlencoded'], _request.request.body.mode) ? _.mapValues(_formPara, o => _.size(o) > 1 ? o : o[0]) : _formPara,
                                                        request_headers: {
                                                            ...request.formatRequestHeaders(_request.request.header.parameter),
                                                            ...request.createAuthHeaders(_request),
                                                        },
                                                        data: _.indexOf(['form-data', 'urlencoded'], _request.request.body.mode) ? _.mapValues(_formPara, o => _.size(o) > 1 ? o : o[0]) : _formPara,
                                                        headers: {
                                                            ...request.formatRequestHeaders(_request.request.header.parameter),
                                                            ...request.createAuthHeaders(_request),
                                                        },
                                                    },
                                                    response: {},
                                                    message: _response.message,
                                                    status: 'error',
                                                },
                                            },
                                            timestamp: Date.now(),
                                            datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                                        });
                                    } else {
                                        emitRuntimeEvent({
                                            action: 'console',
                                            method: 'request',
                                            message: _response,
                                            timestamp: Date.now(),
                                            datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                                        });
                                    }
                                }

                                // 执行后执行脚本
                                if (_.has(_requestPara, 'test') && _.isString(_requestPara.test)) {
                                    if (_.isString(_global_asserts_script) && _.trim(_global_asserts_script) != '') {
                                        _requestPara.test = `${_requestPara.test}\r\n${_global_asserts_script}`;
                                    }

                                    await mySandbox.execute(_requestPara.test, _.assign(definition, { response: res }), 'test', (err, exec_res) => {
                                        if (err && ignoreError < 1) {
                                            stop(RUNNER_REPORT_ID, String(err));
                                        } else if (_.has(exec_res, 'raw.responseText') && _.has(res, 'data.response.raw.responseText') && exec_res.raw.responseText != res.data.response.raw.responseText) {
                                            _.set(_response, 'data.response.changeBody', exec_res.raw.responseText);
                                        }
                                    });
                                }

                                // fit support response && request
                                if (_.isObject(_request_para)) {
                                    _.set(PREV_REQUEST, 'request', _request_para)
                                }

                                if (_.has(res, 'data.response')) {
                                    _.set(PREV_REQUEST, 'response', res.data.response)
                                }
                                // fix bug
                                if (definition.event_id != '0' && scene == 'auto_test') {
                                    if (_.find(_target.assert, _.matchesProperty('status', 'error'))) {
                                        _target.assert_error = 1;
                                    } else {
                                        _target.assert_error = -1;
                                    }

                                    emitRuntimeEvent({
                                        action: 'current_event_id',
                                        combined_id,
                                        test_id: definition.test_id,
                                        current_event_id: definition.event_id,
                                        test_log: _target,
                                    });
                                }

                                _requestPara = _request = _response = res = _parent_ids = _target = null;
                            }
                            break;
                        case 'for':
                            if (_.isArray(definition.children) && definition.children.length > 0) {
                                let _for_option = _.cloneDeep(option);

                                if (_.get(definition, 'condition.enable_data') > 0 && _.isArray(_.get(definition, 'condition.iterationData'))) {
                                    _for_option.iterationData = definition.condition.iterationData
                                }

                                for (let i = 0; i < mySandbox.replaceIn(definition.condition.limit); i++) {
                                    await run(definition.children, _.assign(_for_option, { sleep: parseInt(definition.condition.sleep) }), initFlag + 1, i);
                                }
                            }
                            break;
                        case 'while':
                            if (_.isArray(definition.children) && definition.children.length > 0) {
                                let _while_option = _.cloneDeep(option);

                                if (_.get(definition, 'condition.enable_data') > 0 && _.isArray(_.get(definition, 'condition.iterationData'))) {
                                    _while_option.iterationData = definition.condition.iterationData
                                }

                                const end = Date.now() + parseInt(definition.condition.timeout);
                                _.set(definition, 'runtime.condition', `${mySandbox.replaceIn(definition.condition.var)} ${definition.condition.compare} ${mySandbox.replaceIn(definition.condition.value)}`);

                                let _i = 0;
                                while ((returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value)))) {
                                    if (Date.now() > end) {
                                        break;
                                    }

                                    await run(definition.children, _.assign(_while_option, { sleep: parseInt(definition.condition.sleep) }), initFlag + 1, _i);
                                    _i++;
                                }
                            }
                            break;
                        case 'begin':
                            let _begin_option = _.cloneDeep(option);

                            if (_.get(definition, 'condition.enable_data') > 0 && _.isArray(_.get(definition, 'condition.iterationData'))) {
                                _begin_option.iterationData = definition.condition.iterationData
                            }
                            await run(definition.children, _begin_option, initFlag + 1, loopCount);
                            break;
                        default:
                            break;
                    }

                    if (definition.type != 'api' && definition.event_id != '0' && scene == 'auto_test') {
                        emitRuntimeEvent({
                            action: 'current_event_id',
                            combined_id,
                            test_id: definition.test_id,
                            current_event_id: definition.event_id,
                            test_log: null, // 非 api 不传 test_log
                        });
                    }

                    if (initFlag <= 1) {
                        RUNNER_RUNTIME_POINTER++;
                    }

                    // 进度条
                    if (RUNNER_TOTAL_COUNT >= RUNNER_RUNTIME_POINTER && scene == 'auto_test') {
                        RUNNER_PROGRESS = _.floor(_.divide(RUNNER_RUNTIME_POINTER, RUNNER_TOTAL_COUNT), 2);

                        emitRuntimeEvent({
                            action: 'progress',
                            progress: RUNNER_PROGRESS,
                            combined_id,
                            test_id: definition.test_id,
                            current_event_id: definition.event_id,
                        });
                    }

                    // 完成
                    if (RUNNER_TOTAL_COUNT == RUNNER_RUNTIME_POINTER) {
                        if (scene == 'auto_test') { // 自动化测试
                            // 获取未跑的 event
                            let ignoreEvents = [];
                            (function getIgnoreAllApis(initDefinitions) {
                                if (!_.isArray(initDefinitions)) {
                                    // console.log(initDefinitions);
                                }
                                // fix bug for 7.0.8
                                if (_.isArray(initDefinitions)) {
                                    initDefinitions.forEach((item) => {
                                        if (item.type == 'api' && !_.find(RUNNER_RESULT_LOG, _.matchesProperty('event_id', item.event_id))) {
                                            const _iteration_id = uuid.v4();

                                            if (_.isObject(RUNNER_RESULT_LOG)) {
                                                RUNNER_RESULT_LOG[_iteration_id] = {
                                                    test_id: item.test_id,
                                                    report_id: RUNNER_REPORT_ID,
                                                    parent_id: item.parent_id,
                                                    event_id: item.event_id,
                                                    iteration_id: _iteration_id,
                                                    type: item.type,
                                                    target_id: item.target_id,
                                                    request: item.request,
                                                    response: {},
                                                    http_error: -2,
                                                    assert: [],
                                                    datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                                                };

                                                ignoreEvents.push(RUNNER_RESULT_LOG[_iteration_id]);
                                            }
                                        }

                                        if (_.isArray(item.children)) {
                                            getIgnoreAllApis(item.children);
                                        }
                                    });
                                }
                            }(initDefinitions));

                            const _runReport = calculateRuntimeReport(RUNNER_RESULT_LOG, initDefinitions, RUNNER_REPORT_ID, { combined_id, test_events, default_report_name, user, env_name, env });

                            emitRuntimeEvent({
                                action: 'complate',
                                combined_id,
                                ignore_error,
                                enable_sandbox,
                                envs: {
                                    globals: mySandbox.variablesScope.globals,
                                    environment: _.assign(mySandbox.variablesScope.environment, mySandbox.variablesScope.variables), // fix variables bug
                                },
                                ignore_events: ignoreEvents,
                                test_report: _runReport,
                            });

                            // 打印报告
                            const reportTable = new Table({
                                style: { padding: 5, head: [], border: [] },
                            });

                            reportTable.push(
                                [{ content: 'The result of API test'.bold.gray, colSpan: 4, hAlign: 'center' }],
                                ['', { content: 'passed', hAlign: 'center' }, { content: 'failed', hAlign: 'center' }, { content: 'ignore', hAlign: 'center' }],
                                [{ content: 'request', hAlign: 'left' }, { content: `${_runReport.http.passed}`.green, hAlign: 'center' }, { content: `${_runReport.http.failure}`.underline?.red, hAlign: 'center' }, { content: `${_runReport.ignore_count}`, rowSpan: 2, hAlign: 'center', vAlign: 'center' }],
                                [{ content: 'assertion', hAlign: 'left' }, { content: `${_runReport.assert.passed}`.green, hAlign: 'center' }, { content: `${_runReport.assert.failure}`.underline?.red, hAlign: 'center' }],
                                [{ content: `total number of api: ${_runReport.total_count}, ignore: ${_runReport.ignore_count}`, colSpan: 4, hAlign: 'left' }],
                                [{ content: `total data received: ${_runReport.total_received_data} KB (approx)`, colSpan: 4, hAlign: 'left' }],
                                [{ content: `total response time: ${_runReport.total_response_time} 毫秒, average response time: ${_runReport.average_response_time} 毫秒`, colSpan: 4, hAlign: 'left' }],
                                [{ content: `total run duration: ${_runReport.long_time}`, colSpan: 4, hAlign: 'left' }],
                                [{ content: 'Generated by apipost-cli ( https://github.com/Apipost-Team/apipost-cli )'.gray, colSpan: 4, hAlign: 'center' }],
                            );

                            cliConsole(reportTable.toString());

                            if (_.size(_runReport.assert_errors) > 0) {
                                let cliCounter = 0;
                                const failedTable = new Table({
                                    chars: {
                                        top: '',
                                        'top-mid': '',
                                        'top-left': '',
                                        'top-right': '',
                                        bottom: '',
                                        'bottom-mid': '',
                                        'bottom-left': '',
                                        'bottom-right': '',
                                        left: '',
                                        'left-mid': '',
                                        mid: '',
                                        'mid-mid': '',
                                        right: '',
                                        'right-mid': '',
                                        middle: ' ',
                                    },
                                    style: { padding: 5, head: [], border: [] },
                                });

                                failedTable.push(
                                    [{ content: '', colSpan: 2 }],
                                    [{ content: '#'.underline?.red, hAlign: 'center' }, { content: 'failure'.underline?.red, hAlign: 'left' }, { content: 'detail'.underline?.red, hAlign: 'left' }],
                                ); // fix bug for 7.0.8 bug

                                _.forEach(_runReport.assert_errors, (item) => {
                                    _.forEach(item.assert, (assert) => {
                                        cliCounter++;
                                        failedTable.push(
                                            [{ content: '', colSpan: 2 }],
                                            [{ content: `${cliCounter}.`, hAlign: 'center' }, { content: '断言错误', hAlign: 'left' }, { content: `${`${assert.expect}` + '\n'}${`${assert.result}`.gray}`, hAlign: 'left' }],
                                        );
                                    });
                                });

                                cliConsole(failedTable.toString());
                            }

                            ignoreEvents = null;
                        } else { // 接口请求
                            const _http = _.isObject(RUNNER_RESULT_LOG) ? RUNNER_RESULT_LOG[definition.iteration_id] : {};

                            emitRuntimeEvent({
                                action: 'http_complate',
                                envs: {
                                    globals: mySandbox.variablesScope.globals,
                                    environment: _.assign(mySandbox.variablesScope.environment, mySandbox.variablesScope.variables), // fix variables bug
                                },
                                data: {
                                    script_error: _http.script_error, // fixed script error bug
                                    visualizer_html: _http.visualizer_html, // fixed 可视化 bug
                                    assert: _http.assert,
                                    target_id: _http.target_id,
                                    response: _http.response,
                                },
                                timestamp: Date.now(),
                                datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                            });
                        }

                        runInit();
                        RUNNER_RESULT_LOG = initDefinitions = null;

                        if (RUNNER_STOP[RUNNER_REPORT_ID]) {
                            delete RUNNER_STOP[RUNNER_REPORT_ID];
                        }
                    }
                }
            }
        }
    }

    // 构造一个执行对象
    Object.defineProperty(this, 'run', {
        value: run,
    });

    Object.defineProperty(this, 'stop', {
        value: stop,
    });
};

module.exports.Runtime = Runtime;
module.exports.Collection = Collection;
