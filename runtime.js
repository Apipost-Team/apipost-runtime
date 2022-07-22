const apipostRequest = require('apipost-send'),
    zlib = require('zlib'),
    Buffer = require('buffer/').Buffer,
    _ = require('lodash'),
    chai = require('chai'),
    JSON5 = require('json5'),
    uuid = require('uuid'),
    Mock = require('mockjs'),
    CryptoJS = require("crypto-js"),
    jsonpath = require('jsonpath'),
    x2js = require('x2js'),
    $ = require("jquery"),
    // JSEncrypt = require("jsencrypt"),
    moment = require('moment'),
    dayjs = require('dayjs'),
    vm2 = require('vm2'),
    colors = require('colors'),
    ASideTools = require('apipost-inside-tools'),
    stripJsonComments = require("strip-json-comments"),
    JSONbig = require('json-bigint'),
    aTools = require('apipost-tools'),
    artTemplate = require('art-template');

// cli console
const cliConsole = function () {
    if (typeof window == 'undefined') {
        console.log(_.join(arguments, ' '))
    }
}

const Collection = function ApipostCollection(definition, option = { iterationCount: 1, sleep: 0 }) {
    const { iterationCount, sleep } = option;

    let definitionTlp = {
        parent_id: "-1", // 单任务的父ID
        event_id: "0", // 单任务的ID
        iteration: 0, // 当前执行第几轮循环（iteration）
        iterationCount: 0, // 本次执行需要循环的总轮数
        iterationData: {}, // excel导入的测试数据变量
        target_id: "",  // 接口ID ，仅适用于 api或者request
        request: {}, // 请求参数 ，仅适用于 api或者request
        response: {}, // 响应参数 ，仅适用于 api或者request
        cookie: [], // 响应cookie ，仅适用于 api或者request
        assert: []
    };

    (function createRuntimeList(r, parent_id = '0') {
        if (r instanceof Array && r.length > 0) {
            r.forEach(item => {
                _.assign(item, definitionTlp, {
                    enabled: typeof item.enabled == 'undefined' ? 1 : item.enabled,
                    sort: typeof item.sort == 'undefined' ? 1 : item.sort,
                    parent_id: parent_id,
                    event_id: item.event_id ? item.event_id : uuid.v4(),
                    test_id: item.test_id ? item.test_id : uuid.v4(),
                    type: item.type,
                    target_id: ['request', 'api'].indexOf(item.type) > -1 ? item.data.target_id : '',
                    condition: ['request', 'api'].indexOf(item.type) > -1 ? {} : item.data,
                    request: ['request', 'api'].indexOf(item.type) > -1 ? item.data : {},
                    info: ['request', 'api'].indexOf(item.type) > -1 ? {
                        // requestUrl: item.data.url ? item.data.url : item.data.request.url,
                        // requestName: item.data.name ? item.data.name : (item.data.url ? item.data.url : item.data.request.url),
                        requestId: item.data.target_id,
                    } : {},
                })

                if ((_.isArray(item.children) && item.children.length > 0)) {
                    createRuntimeList(item.children, item.event_id)
                }
            })
        }
    })(definition)

    // 构造一个执行对象
    Object.defineProperty(this, 'definition', {
        configurable: true,
        writable: true,
        value: [_.assign(_.cloneDeep(definitionTlp), {
            type: "for",
            condition: {
                limit: iterationCount > 0 ? iterationCount : 1,
                sleep: sleep > 0 ? sleep : 0
            },
            enabled: 1,
            children: _.cloneDeep(definition)
        })]
    })
}

const Runtime = function ApipostRuntime(emitRuntimeEvent) {
    // 当前流程总错误计数器
    let RUNNER_TOTAL_COUNT = 0; // 需要跑的总event分母
    let RUNNER_RUNTIME_POINTER = 0; // 需要跑的总event分子
    let RUNNER_REPORT_ID = '';
    let RUNNER_ERROR_COUNT = 0;
    let RUNNER_PROGRESS = 0;
    let RUNNER_RESULT_LOG = {};
    let RUNNER_STOP = 0;

    if (typeof emitRuntimeEvent != 'function') {
        emitRuntimeEvent = function () { }
    }

    // Apipost 沙盒
    const Sandbox = function ApipostSandbox() {
        // 内置变量
        const insideVariablesScope = {
            list: {} // 常量
        }

        new Array('natural', 'integer', 'float', 'character', 'range', 'date', 'time', 'datetime', 'now', 'guid', 'integeincrementr', 'url', 'protocol', 'domain', 'tld', 'email', 'ip', 'region', 'province', 'city', 'county', 'county', 'zip', 'first', 'last', 'name', 'cfirst', 'clast', 'cname', 'color', 'rgb', 'rgba', 'hsl', 'paragraph', 'cparagraph', 'sentence', 'csentence', 'word', 'cword', 'title', 'ctitle').forEach(func => {
            insideVariablesScope.list[`$${func}`] = Mock.mock(`@${func}`);
        })

        new Array('phone', 'mobile', 'telephone').forEach(func => {
            insideVariablesScope.list[`$${func}`] = ['131', '132', '137', '188'][_.random(0, 3)] + Mock.mock(/\d{8}/)
        })

        // 动态变量
        const variablesScope = {
            "globals": {}, // 公共变量
            "environment": {}, // 环境变量
            "collectionVariables": {}, // 目录变量 当前版本不支持，目前为兼容postman
            "variables": {}, // 临时变量，无需存库
            "iterationData": {}, // 流程测试时的数据变量，临时变量，无需存库
        }

        // 获取所有动态变量
        function getAllDynamicVariables(type) {
            if (typeof aptScripts === 'object') {
                Object.keys(variablesScope).forEach(key => {
                    if (_.isObject(aptScripts[key]) && _.isFunction(aptScripts[key].toObject) && ['iterationData', 'variables'].indexOf(key) > -1) {
                        _.assign(variablesScope[key], aptScripts[key].toObject())
                    }
                })
            }

            if (variablesScope.hasOwnProperty(type)) {
                return _.isPlainObject(variablesScope[type]) ? variablesScope[type] : {};
            } else {
                let allVariables = {};
                Object.keys(variablesScope).forEach(type => {
                    _.assign(allVariables, variablesScope[type])
                })
                return allVariables;
            }
        }

        // 设置动态变量
        const dynamicVariables = {};

        // 变量相关
        // ['variables'] 临时变量
        Object.defineProperty(dynamicVariables, 'variables', {
            configurable: true,
            value: {
                set(key, value) {
                    variablesScope['variables'][key] = value;
                },
                get(key) {
                    let allVariables = getAllDynamicVariables();
                    return allVariables[key];
                },
                has(key) {
                    return getAllDynamicVariables().hasOwnProperty(key);
                },
                delete(key) {
                    delete variablesScope['variables'][key];
                },
                unset(key) {
                    delete variablesScope['variables'][key];
                },
                clear() {
                    variablesScope['variables'] = {};
                },
                replaceIn(variablesStr) {
                    return replaceIn(variablesStr);
                },
                toObject() {
                    return getAllDynamicVariables()
                }
            }
        })

        // ['iterationData'] 临时变量
        Object.defineProperty(dynamicVariables, 'iterationData', {
            configurable: true,
            value: {
                set(key, value) {
                    variablesScope['iterationData'][key] = value;
                },
                get(key) {
                    return variablesScope['iterationData'][key];
                },
                has(key) {
                    return variablesScope['iterationData'].hasOwnProperty(key);
                },
                replaceIn(variablesStr) {
                    return replaceIn(variablesStr, 'iterationData');
                },
                toObject() {
                    return variablesScope['iterationData']
                }
            }
        })

        // ['globals', 'environment', 'collectionVariables']
        Object.keys(variablesScope).forEach(type => {
            if (['iterationData', 'variables'].indexOf(type) === -1) {
                Object.defineProperty(dynamicVariables, type, {
                    configurable: true,
                    value: {
                        set(key, value, emitdb = true) {
                            variablesScope[type][key] = value;

                            if (emitdb) {
                                typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].set) && aptScripts[type].set(key, value)
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
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].delete) && aptScripts[type].delete(key)
                        },
                        unset(key) {
                            delete variablesScope[type][key];
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].delete) && aptScripts[type].delete(key)
                        },
                        clear() {
                            variablesScope[type] = {};
                            typeof aptScripts === 'object' && _.isObject(aptScripts[type]) && _.isFunction(aptScripts[type].clear) && aptScripts[type].clear()
                        },
                        replaceIn(variablesStr) {
                            return replaceIn(variablesStr, type);
                        },
                        toObject() {
                            return variablesScope[type]
                        }
                    }
                });
            }
        })

        // 获取所有内置变量
        function getAllInsideVariables() {
            return _.cloneDeep(insideVariablesScope.list);
        }

        // 变量替换
        function replaceIn(variablesStr, type, withMock = false) {
            let allVariables = getAllInsideVariables();
            _.assign(allVariables, getAllDynamicVariables(type))

            if (withMock) {
                variablesStr = Mock.mock(variablesStr);
            }

            // 替换自定义变量
            let _regExp = new RegExp(Object.keys(allVariables).map(function (item) {
                if (_.startsWith(item, '$')) {
                    item = `\\${item}`
                }
                return '{{' + item + '}}'
            }).join("|"), "gi");

            variablesStr = _.replace(variablesStr, _regExp, function (key) {
                let reStr = allVariables[_.replace(key, /[{}]/gi, '')];
                return reStr ? reStr : key;
            });

            allVariables = null;
            return variablesStr;
        }

        // 发送断言结果
        function emitAssertResult(status, expect, result, scope) {
            if (typeof scope != 'undefined' && _.isObject(scope) && _.isArray(scope.assert)) {
                // 更新日志
                let item = RUNNER_RESULT_LOG[scope.iteration_id];

                if (item) {
                    if (!_.isArray(item.assert)) {
                        item.assert = [];
                    }

                    item.assert.push({
                        status: status,
                        expect: expect,
                        result: result
                    });

                    if (status === 'success') {
                        cliConsole(`\t✓`.green, ` ${expect} 匹配`.grey)
                    } else {
                        RUNNER_ERROR_COUNT++;
                        cliConsole(`\t${RUNNER_ERROR_COUNT}. ${expect} ${result}`.bold.red);
                    }
                }
            }
        }

        // 设置响应和请求参数
        function emitTargetPara(data, scope) {
            if (typeof scope != 'undefined' && _.isObject(scope)) {
                // 更新日志
                let item = RUNNER_RESULT_LOG[scope.iteration_id];

                if (item) {
                    switch (data.action) {
                        case 'SCRIPT_ERROR':
                            if (item.type == 'api') {
                                _.set(item, `script_error.${data.eventName}`, data.data)
                            }
                            break;
                    }
                }
            }
        }

        // 发送可视化结果
        function emitVisualizerHtml(status, html, scope) {
            if (typeof scope != 'undefined' && _.isObject(scope)) {
                let item = RUNNER_RESULT_LOG[scope.iteration_id];

                if (item) {
                    item.visualizer_html = { status, html }
                }
            }
        }

        // console
        const consoleFn = {};
        new Array("log", "warn", "info", "error").forEach(method => {
            Object.defineProperty(consoleFn, method, {
                configurable: true,
                value: function () {
                    emitRuntimeEvent({
                        action: 'console',
                        method: method,
                        message: {
                            type: 'log',
                            data: Array.from(arguments)
                        },
                        timestamp: Date.now(),
                        datetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
                    })
                }
            });
        })

        // 断言自定义拓展规则（100% 兼容postman）
        chai.use(function () {
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
        function execute(code, scope, eventName, callback) {
            scope = _.isPlainObject(scope) ? _.cloneDeep(scope) : {};

            // 初始化数据库中的当前变量值 init
            if (typeof aptScripts === 'object') {
                Object.keys(variablesScope).forEach(key => {
                    if (_.isObject(aptScripts[key]) && _.isFunction(aptScripts[key].toObject) && ['iterationData', 'variables'].indexOf(key) > -1) {
                        _.assign(variablesScope[key], aptScripts[key].toObject())
                    }
                })
            }

            // pm 对象
            const pm = {};

            // info, 请求、响应、cookie, iterationData
            new Array('info', 'request', 'response', 'cookie', 'iterationData').forEach(key => {
                if (_.indexOf(['request', 'response'], key) > -1) {
                    switch (key) {
                        case 'request':
                            if (_.has(scope, `response.data.${key}`) && _.isObject(scope.response.data[key])) {
                                Object.defineProperty(scope.response.data[key], 'to', {
                                    get() {
                                        return chai.expect(this).to;
                                    }
                                });

                                Object.defineProperty(pm, key, {
                                    configurable: true,
                                    value: scope.response.data[key]
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
                                        value: function () {
                                            return _.cloneDeep(json);
                                        }
                                    });

                                    Object.defineProperty(scope.response.data[key], 'text', {
                                        configurable: true,
                                        value: function () {
                                            return scope.response.data[key].rawBody;
                                        }
                                    });
                                }

                                Object.defineProperty(scope.response.data[key], 'to', {
                                    get() {
                                        return chai.expect(this).to;
                                    }
                                });

                                Object.defineProperty(pm, key, {
                                    configurable: true,
                                    value: scope.response.data[key]
                                });
                            }
                            break;
                    }
                } else {
                    if (_.isObject(scope[key])) {
                        switch (key) {
                            case 'iterationData':
                                _.assign(variablesScope['iterationData'], scope[key]);
                                break;
                            case 'info':
                                _.assign(scope[key], {
                                    iteration: scope.iteration,
                                    iterationCount: scope.iterationCount,
                                    eventName: eventName,
                                })
                                break;
                        }

                        Object.defineProperty(pm, key, {
                            configurable: true,
                            value: scope[key]
                        });
                    }
                }
            })

            // 变量相关
            Object.keys(variablesScope).forEach(type => {
                Object.defineProperty(pm, type, {
                    configurable: true,
                    value: dynamicVariables[type]
                });
            })

            if (_.isObject(pm.variables)) {
                Object.defineProperty(pm.variables, 'getName', {
                    configurable: true,
                    value: function () {
                        return scope.env_name
                    }
                });

                Object.defineProperty(pm.variables, 'getPreUrl', {
                    configurable: true,
                    value: function () {
                        return scope.env_pre_url
                    }
                });

                Object.defineProperty(pm.variables, 'getCollection', {
                    configurable: true,
                    value: function () {
                        return scope.environment
                    }
                });
            }

            // 请求参数相关
            if (typeof scope != 'undefined' && _.isObject(scope) && _.has(scope, 'request.request')) {
                // 更新日志
                let item = RUNNER_RESULT_LOG[scope.iteration_id];

                if (item) {
                    Object.defineProperty(pm, 'setRequestQuery', {
                        configurable: true,
                        value: function (key, value) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.query')) {
                                    _.set(item, `beforeRequest.query`, []);

                                }

                                item.beforeRequest.query.push({
                                    action: 'set',
                                    key: key,
                                    value: value
                                });
                            }
                        }
                    });

                    Object.defineProperty(pm, 'removeRequestQuery', {
                        configurable: true,
                        value: function (key) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.query')) {
                                    _.set(item, `beforeRequest.query`, []);

                                }

                                item.beforeRequest.query.push({
                                    action: 'remove',
                                    key: key
                                });
                            }
                        }
                    });

                    Object.defineProperty(pm, 'setRequestHeader', {
                        configurable: true,
                        value: function (key, value) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.header')) {
                                    _.set(item, `beforeRequest.header`, []);

                                }

                                item.beforeRequest.header.push({
                                    action: 'set',
                                    key: key,
                                    value: value
                                });
                            }
                        }
                    });

                    Object.defineProperty(pm, 'removeRequestHeader', {
                        configurable: true,
                        value: function (key) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.header')) {
                                    _.set(item, `beforeRequest.header`, []);

                                }

                                item.beforeRequest.header.push({
                                    action: 'remove',
                                    key: key
                                });
                            }
                        }
                    });

                    Object.defineProperty(pm, 'setRequestBody', {
                        configurable: true,
                        value: function (key, value) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.body')) {
                                    _.set(item, `beforeRequest.body`, []);

                                }

                                item.beforeRequest.body.push({
                                    action: 'set',
                                    key: key,
                                    value: value
                                });
                            }
                        }
                    });

                    Object.defineProperty(pm, 'removeRequestBody', {
                        configurable: true,
                        value: function (key) {
                            if (_.trim(key) != '') {
                                if (!_.has(item, 'beforeRequest.body')) {
                                    _.set(item, `beforeRequest.body`, []);

                                }

                                item.beforeRequest.body.push({
                                    action: 'remove',
                                    key: key
                                });
                            }
                        }
                    });
                }
            }

            // expert
            Object.defineProperty(pm, 'expect', {
                configurable: true,
                value: chai.expect
            })

            // test
            Object.defineProperty(pm, 'test', {
                configurable: true,
                value: function (desc, callback) {
                    try {
                        callback();
                        emitAssertResult('success', desc, '成功', scope);
                    } catch (e) {
                        emitAssertResult('error', desc, e.toString().replace("AssertionError", "断言校验失败"), scope);
                    }
                }
            })

            // assert
            Object.defineProperty(pm, 'assert', {
                configurable: true,
                value: function (assert) {
                    try {
                        let _response = _.cloneDeep(pm.response);

                        if (_.isFunction(_response.json)) {
                            _response.json = _response.json();
                        }
                        chai.assert.isTrue(new Function("response", "request", `return ${String(assert)}`)(_response, _.cloneDeep(pm.request)))
                        emitAssertResult('success', String(assert), '成功', scope);
                    } catch (e) {
                        emitAssertResult('error', String(assert), e.toString().replace("AssertionError", "断言校验失败").replace('expected false to be true', '表达式不成立'), scope);
                    }
                }
            })

            // 发送方法
            Object.defineProperty(pm, 'sendRequest', {
                configurable: true,
                value: new apipostRequest()
            })

            // 可视化
            Object.defineProperty(pm, 'visualizer', {
                configurable: true,
                value: {
                    set: (template, data) => {
                        try {
                            let html = artTemplate.render(template, data);
                            emitVisualizerHtml('success', html, scope);
                        } catch (e) {
                            emitVisualizerHtml('error', e.toString(), scope);
                        }
                    }
                }
            });

            Object.defineProperty(pm, 'Visualizing', {
                configurable: true,
                value: (template, data) => {
                    try {
                        let html = artTemplate.render(template, data);
                        emitVisualizerHtml('success', html, scope);
                    } catch (e) {
                        emitVisualizerHtml('error', e.toString(), scope);
                    }
                }
            });

            Object.defineProperty(pm, 'getData', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
                configurable: true,
                value: function (callback) {
                    // @todo
                }
            });

            // 跳过下面的流程直接到执行指定接口
            Object.defineProperty(pm, 'setNextRequest', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
                configurable: true,
                value: function (target_id) {
                    // @todo
                }
            });

            // 执行
            try {
                $.md5 = function (str) { // 兼容旧版
                    return CryptoJS.MD5(str).toString()
                };

                (new vm2.VM({
                    timeout: 1000,
                    mySandbox: {
                        ...{ pm },
                        ...{ chai },
                        ...{ emitAssertResult },
                        // ...{ atob },
                        // ...{ btoa },
                        ...{ JSON5 },
                        ...{ _ },
                        ...{ Mock },
                        ...{ uuid },
                        ...{ jsonpath },
                        ...{ CryptoJS },
                        // ...{ navigator?navigator:{} },
                        ...{ $ },
                        ...{ x2js },
                        // ...{ JSEncrypt?JSEncrypt:{} },
                        ...{ moment },
                        ...{ dayjs },
                        console: consoleFn,
                        xml2json: function (xml) {
                            return (new x2js()).xml2js(xml)
                        },
                        uuidv4: function () {
                            return uuid.v4()
                        },
                        apt: pm,
                        request: pm.request ? _.cloneDeep(pm.request) : {},
                        response: pm.response ? _.assign(_.cloneDeep(pm.response), { json: _.isFunction(pm.response.json) ? pm.response.json() : pm.response.json }) : {},
                        expect: chai.expect,
                        sleep: function (ms) {
                            let end = Date.now() + parseInt(ms)
                            while (true) {
                                if (Date.now() > end) {
                                    return;
                                }
                            }
                        }
                    }
                })).run(new vm2.VMScript(code));
                typeof callback === 'function' && callback();
            } catch (err) {
                emitTargetPara({
                    action: "SCRIPT_ERROR",
                    eventName: eventName,
                    data: `${eventName == 'pre_script' ? '预执行' : '后执行'}脚本语法错误: ${err.toString()}`
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
            ...{ replaceIn }
        })
    }

    const mySandbox = new Sandbox();

    // sleep 延迟方法
    function sleepDelay(ms) {
        let end = Date.now() + ms
        while (true) {
            if (Date.now() > end) {
                return;
            }
        }
    }

    // 根据测试条件返回布尔值
    function returnBoolean(exp, compare, value) {
        let bool = false;
        switch (compare) {
            case 'eq':
                bool = exp == value;
                break;
            case 'uneq':
                bool = exp != value;
                break;
            case 'gt':
                bool = _.gt(exp, value)
                break;
            case 'gte':
                bool = _.gte(exp, value)
                break;
            case 'lt':
                bool = _.lt(exp, value)
                break;
            case 'lte':
                bool = _.lte(exp, value)
                break;
            case 'includes':
                bool = _.includes(exp, value)
                break;
            case 'unincludes':
                bool = !_.includes(exp, value)
                break;
            case 'null':
                bool = _.isNull(exp, value)
                break;
            case 'notnull':
                bool = !_.isNull(exp, value)
                break;
        }

        return bool;
    }

    // 获取某接口的 所有父target
    function getParentTargetIDs(collection, target_id, parent_ids = []) {
        if (_.isArray(collection)) {
            let item = _.find(collection, _.matchesProperty('target_id', target_id));

            if (item) {
                parent_ids.push(item.parent_id)
                getParentTargetIDs(collection, item.parent_id, parent_ids);
            }
        }

        return parent_ids;
    }

    // 获取 指定 event_id 的 initDefinitions 的所有父亲ID
    function getInitDefinitionsParentIDs(event_id, initDefinitions = []) {
        let definitionArr = [];

        (function convertArray(initDefinitions) {
            if (_.isArray(initDefinitions)) {
                initDefinitions.forEach(item => {
                    definitionArr.push({
                        event_id: item.event_id,
                        parent_id: item.parent_id
                    })

                    if (_.isArray(item.children)) {
                        convertArray(item.children)
                    }
                })
            }
        })(initDefinitions);

        let parentArr = [];

        (function getParentArr(event_id) {
            definitionArr.forEach(item => {
                if (item.event_id == event_id) {
                    // if (uuid.validate(item.parent_id)) {
                    if (item.parent_id != '0') {
                        parentArr.push(item.parent_id)
                        getParentArr(item.parent_id)
                    }
                }
            })
        })(event_id)

        return parentArr;
    }

    // 获取某接口的详细信息
    function getItemFromCollection(collection, target_id) {
        return _.find(collection, _.matchesProperty('target_id', target_id));
    }

    // 计算runtime 结果
    function calculateRuntimeReport(log, initDefinitions = [], report_id = '', option = {}) {
        // 计算 总api数
        let totalCount = _.size(log);

        // 计算 未忽略的总api数
        let totalEffectiveCount = _.countBy(log, function (item) {
            return item.http_error != -2
        })[true];

        // 计算 http 错误个数
        let httpErrorCount = Number(_.countBy(log, function (item) {
            return item.http_error > 0
        })[true])

        httpErrorCount = httpErrorCount > 0 ? httpErrorCount : 0;

        // 计算 忽略接口 个数
        let ignoreCount = Number(_.countBy(log, function (item) {
            return item.http_error == -2
        })[true])

        ignoreCount = ignoreCount > 0 ? ignoreCount : 0;

        // 计算 assert 错误个数
        let assertErrorCount = 0;
        let eventResultStatus = {};

        Object.values(log).forEach(item => {
            if (item.http_error == -1 && _.find(item.assert, _.matchesProperty('status', "error"))) {
                assertErrorCount++;
            }

            // 计算各个event的状态 [ignore, failure, passed]
            if (_.isArray(initDefinitions)) {
                let parent_ids = getInitDefinitionsParentIDs(item.event_id, initDefinitions);

                if (item.http_error == 1 || _.find(item.assert, _.matchesProperty('status', "error"))) { // failure
                    eventResultStatus[item.event_id] = 'failure';
                    parent_ids.forEach(parent_id => {
                        if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                            eventResultStatus[parent_id] = 'failure'
                        }
                    })
                } else if (item.http_error == -2) {
                    eventResultStatus[item.event_id] = 'ignore';
                    parent_ids.forEach(parent_id => {
                        if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                            eventResultStatus[parent_id] = 'ignore'
                        }
                    })
                } else if (item.http_error == -1) {
                    eventResultStatus[item.event_id] = 'passed';
                    parent_ids.forEach(parent_id => {
                        if (_.indexOf(Object.keys(eventResultStatus), parent_id) == -1) {
                            eventResultStatus[parent_id] = 'passed'
                        }
                    })
                }
            }
        })

        let definitionList = [];

        (function convertInitDefinitions(initDefinitions) {
            initDefinitions.forEach(item => {
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
                        report_id: report_id,
                        runtime_status: eventResultStatus[item.event_id],
                    })
                }

                if (_.isArray(item.children)) {
                    convertInitDefinitions(item.children)
                }
            })
        })(initDefinitions)

        const report = {
            combined_id: option.combined_id,
            test_id: _.isArray(option.test_events) ? option.test_events[0].test_id : option.test_events.test_id,
            report_id: report_id,
            report_name: option.default_report_name,
            env_name: option.env_name,
            user: option.user,
            total_count: totalCount,
            total_effective_count: totalEffectiveCount,
            ignore_count: ignoreCount,
            http: {
                passed: _.subtract(totalEffectiveCount, httpErrorCount),
                passed_per: _.floor(_.divide(_.subtract(totalEffectiveCount, httpErrorCount), totalEffectiveCount), 2),
                failure: httpErrorCount,
                failure_per: _.floor(_.divide(httpErrorCount, totalEffectiveCount), 2)
            },
            assert: {
                passed: _.subtract(totalEffectiveCount, assertErrorCount),
                passed_per: _.floor(_.divide(_.subtract(totalEffectiveCount, assertErrorCount), totalEffectiveCount), 2),
                failure: assertErrorCount,
                failure_per: _.floor(_.divide(assertErrorCount, totalEffectiveCount), 2)
            },
            start_time: startTime,
            end_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            long_time: `${_.floor(_.divide(Date.now() - startTimeStamp, 1000), 2)} 秒`,
            children: []
        };

        if (uuid.validate(option.combined_id) && _.isArray(option.test_events)) { // 测试套件
            _.assign(report, {
                type: 'combined',
            });

            option.test_events.forEach(test_event => {
                report.children.push(calculateRuntimeReport(log, initDefinitions, report_id, _.assign(option, {
                    combined_id: 0,
                    test_events: test_event,
                    default_report_name: test_event.name
                })))
            })
        } else { // 单测试用例
            _.assign(report, {
                type: 'single',
                event_status: eventResultStatus,
                test_events: definitionList
            })
        }

        return report;
    }

    // 参数初始化
    function runInit() {
        RUNNER_REPORT_ID = uuid.v4(); // 测试事件的ID
        RUNNER_ERROR_COUNT = 0;
        // RUNNER_TOTAL_COUNT = 0
        RUNNER_RUNTIME_POINTER = 0; // 需要跑的总event分子
        startTime = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 开始时间
        startTimeStamp = Date.now(); // 开始时间戳
        RUNNER_RESULT_LOG = {};
    }

    // 停止 run
    function stop() {
        RUNNER_STOP = 1;
    }

    let startTime = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 开始时间
    let startTimeStamp = Date.now(); // 开始时间戳
    let initDefinitions = []; // 原始colletion

    // start run
    async function run(definitions, option = {}, initFlag = 0) {
        if (initFlag == 0) { // 初始化参数
            if (_.size(RUNNER_RESULT_LOG) > 0) { // 当前有任务时，拒绝新任务
                return;
            }

            runInit();
            RUNNER_STOP = 0;
            RUNNER_TOTAL_COUNT = definitions[0].condition.limit * definitions[0].children.length;
            initDefinitions = definitions;
        } else {
            if (RUNNER_STOP > 0) {
                return;
            }
        }

        option = _.assign({
            project: {},
            collection: [], // 当前项目的所有接口列表
            environment: {}, // 当前环境变量
            globals: {}, // 当前公共变量
            iterationData: [], // 当前迭代的excel导入数据
            iterationCount: 1, // 当前迭代次数
            ignoreError: 1, // 遇到错误忽略
            sleep: 0, // 每个任务的间隔时间
            requester: {} // 发送模块的 options
        }, option);

        var { scene, project, collection, iterationData, combined_id, test_events, default_report_name, user, env_name, env_pre_url, environment, globals, iterationCount, ignoreError, sleep, requester } = option;

        // 使用场景 auto_test/request
        if (_.isUndefined(scene)) {
            scene = 'auto_test';
        }

        // 兼容 单接口请求 和 自动化测试
        if (!uuid.validate(combined_id)) {
            combined_id = "0";
        }

        if (!_.isObject(test_events)) {
            test_events = {
                "test_id": uuid.v4(),
                "name": "未命名"
            }
        }

        if (!_.isString(default_report_name)) {
            default_report_name = '默认自动化测试报告';
        }

        if (!_.isObject(user)) {
            user = {
                "uuid": "-1",
                "nick_name": "匿名"
            }
        }

        if (!_.isArray(iterationData)) {
            iterationData = [];
        }

        if (typeof iterationCount == 'undefined') {
            iterationCount = 1
        }

        // 设置sandbox的 environment变量 和 globals 变量
        new Array('environment', 'globals').forEach(func => {
            if (_.isObject(option[func]) && _.isObject(mySandbox.dynamicVariables[func]) && _.isFunction(mySandbox.dynamicVariables[func].set)) {
                for (const [key, value] of Object.entries(option[func])) {
                    mySandbox.dynamicVariables[func].set(key, value, false)
                }
            }
        })

        // 发送对象
        const request = new apipostRequest(_.isObject(requester) ? requester : {});

        if (sleep > 0) {
            sleepDelay(sleep);
        }

        if (_.isArray(definitions) && definitions.length > 0) {
            for (let i = 0; i < definitions.length; i++) {
                let definition = definitions[i];
                _.assign(definition, {
                    iteration_id: uuid.v4(),  // 每次执行单任务的ID
                    iteration: i,
                    iterationData: iterationData[i] ? iterationData[i] : iterationData[0],
                    ...{ iterationCount },
                    ...{ env_name },
                    ...{ env_pre_url },
                    ...{ environment },
                    ...{ globals }
                })

                if (_.isObject(definition.iterationData)) {
                    for (const [key, value] of Object.entries(definition.iterationData)) {
                        mySandbox.dynamicVariables['iterationData'].set(key, value, false)
                    }
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
                        case 'assert':
                            if (_.has(definition, 'data.content') && _.isString(definition.data.content)) {
                                mySandbox.execute(definition.data.content, definition, 'test', function (err, res) { })
                            }
                            break;
                        case 'if':
                            if (returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value))) {
                                await run(definition.children, option, 1);
                            }
                            break;
                        case 'request':
                        case 'api':
                            if (_.has(definition, 'request') && _.isObject(definition.request)) {
                                let res = {};
                                // 拼接全局参数、目录参数、以及脚本
                                let _requestPara = {};
                                let _parent_ids = _.reverse(getParentTargetIDs(collection, definition.request.target_id));
                                let _requestBody = getItemFromCollection(collection, definition.request.target_id);

                                if (_requestBody && _.isObject(_requestBody)) {
                                    _.assign(definition.request, {
                                        url: definition.request.url ? definition.request.url : _requestBody.request.url,
                                        request: _requestBody.request
                                    })

                                    _requestBody = null;
                                }

                                new Array('header', 'body', 'query', 'auth', 'pre_script', 'test').forEach(_type => {
                                    // 参数
                                    if (_.indexOf(['header', 'body', 'query'], _type) > -1) {
                                        if (typeof _requestPara[_type] == 'undefined') {
                                            _requestPara[_type] = _type == 'header' ? {} : [];
                                        }

                                        // 全局参数
                                        if (_.isArray(project.request[_type])) {
                                            project.request[_type].forEach(item => {
                                                if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                    if (_type == 'header') {
                                                        _requestPara[_type][_.trim(item.key)] = item;
                                                    } else {
                                                        _requestPara[_type].push(item);
                                                    }
                                                }
                                            })
                                        }

                                        // 目录参数
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach(parent_id => {
                                                let _folder = getItemFromCollection(collection, parent_id);

                                                if (_.has(_folder, 'request') && _.isArray(_folder.request[_type])) {
                                                    _folder.request[_type].forEach(item => {
                                                        if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                            if (_type == 'header') {
                                                                _requestPara[_type][_.trim(item.key)] = item;
                                                            } else {
                                                                _requestPara[_type].push(item);
                                                            }
                                                        }
                                                    })
                                                }
                                            })
                                        }

                                        // 接口参数
                                        if (_.has(definition, `request.request.${_type}.parameter`) && _.isArray(definition.request.request[_type].parameter)) {
                                            definition.request.request[_type].parameter.forEach(item => {
                                                if (item.is_checked > 0 && _.trim(item.key) != '') {
                                                    if (_type == 'header') {
                                                        _requestPara[_type][_.trim(item.key)] = item;
                                                    } else {
                                                        _requestPara[_type].push(item);
                                                    }
                                                }
                                            })
                                        }
                                    }

                                    // 认证
                                    if (_.indexOf(['auth'], _type) > -1) {
                                        if (typeof _requestPara[_type] == 'undefined') {
                                            _requestPara[_type] = {};
                                        }

                                        // 全局认证
                                        if (_.has(project, `request.['${_type}']`) && _.isObject(project.request[_type]) && project.request[_type].type != 'noauth') {
                                            _.assign(_requestPara[_type], project.request[_type]);
                                        }

                                        // 目录认证
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach(parent_id => {
                                                let _folder = getItemFromCollection(collection, parent_id);

                                                if (_.has(_folder, `request.['${_type}']`) && _.isObject(_folder.request[_type]) && _folder.request[_type].type != 'noauth') {
                                                    _.assign(_requestPara[_type], _folder.request[_type]);
                                                }
                                            })
                                        }

                                        // 接口认证
                                        if (_.has(definition, `request.request.${_type}`) && _.isObject(definition.request.request[_type]) && definition.request.request[_type].type != 'noauth') {
                                            _.assign(_requestPara[_type], definition.request.request[_type]);
                                        }
                                    }

                                    // 脚本
                                    if (_.indexOf(['pre_script', 'test'], _type) > -1) {
                                        if (typeof _requestPara[_type] == 'undefined') {
                                            _requestPara[_type] = ``;
                                        }

                                        // 全局脚本， 已兼容旧版本
                                        if (_.has(project, `script.['${_type}']`) && _.isString(project.script[_type]) && project.script[`${_type}_switch`] > 0) {
                                            _requestPara[_type] = _requestPara[_type] + "\r\n" + project.script[_type];
                                        } else if (_.has(project, `request.script.['${_type}']`) && _.isString(project.request.script[_type]) && project.request.script[`${_type}_switch`] > 0) {
                                            _requestPara[_type] = _requestPara[_type] + "\r\n" + project.request.script[_type];
                                        }

                                        // 目录脚本
                                        if (_.isArray(_parent_ids) && _parent_ids.length > 0) {
                                            _parent_ids.forEach(parent_id => {
                                                let _folder = getItemFromCollection(collection, parent_id);

                                                if (_.has(_folder, `script.['${_type}']`) && _.isString(_folder.script[_type]) && _folder.script[`${_type}_switch`] > 0) {
                                                    _requestPara[_type] = _requestPara[_type] + "\r\n" + _folder.script[_type];
                                                }
                                            })
                                        }

                                        // 接口脚本
                                        if (_.has(definition, `request.request.event.${_type}`) && _.isString(definition.request.request.event[_type])) {
                                            _requestPara[_type] = _requestPara[_type] + "\r\n" + definition.request.request.event[_type];
                                        }
                                    }
                                })

                                RUNNER_RESULT_LOG[definition.iteration_id] = {
                                    test_id: definition.test_id,
                                    report_id: RUNNER_REPORT_ID,
                                    parent_id: definition.parent_id,
                                    event_id: definition.event_id,
                                    iteration_id: definition.iteration_id,
                                    type: definition.type,
                                    target_id: definition.target_id,
                                    request: {},
                                    response: {},
                                    http_error: -1,
                                    assert: [],
                                    datetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
                                }

                                // 执行预执行脚本
                                if (_.has(_requestPara, 'pre_script') && _.isString(_requestPara.pre_script)) {
                                    mySandbox.execute(_requestPara.pre_script, definition, 'pre_script', function (err, res) { })
                                }

                                let _request = _.cloneDeep(definition.request);

                                // 替换 _requestPara 的参数变量
                                new Array('header', 'query', 'body').forEach(type => {
                                    _requestPara[type] = _.values(_requestPara[type])
                                    _requestPara[type].map(item => {
                                        _.assign(item, {
                                            key: mySandbox.replaceIn(item.key),
                                            value: mySandbox.replaceIn(item.value),
                                        })
                                    })

                                    _.set(_request, `request.${type}.parameter`, _requestPara[type]);
                                })

                                // 重新渲染请求参数
                                let _target = RUNNER_RESULT_LOG[definition.iteration_id];

                                if (typeof _target == 'object' && _.isObject(_target.beforeRequest)) {
                                    new Array("query", "header", "body").forEach(type => {
                                        if (_.has(_request, `request.${type}.parameter`) && _.isArray(_target.beforeRequest[type])) {
                                            _target.beforeRequest[type].forEach(_item => {
                                                if (_item.action == "set") {
                                                    let _itemPara = _.find(_request.request[type].parameter, _.matchesProperty('key', mySandbox.replaceIn(_item.key)))

                                                    if (_itemPara) {
                                                        _itemPara.value = mySandbox.replaceIn(_item.value);
                                                    } else {
                                                        _request.request[type].parameter.push({
                                                            description: "",
                                                            field_type: "Text",
                                                            is_checked: "1",
                                                            key: mySandbox.replaceIn(_item.key),
                                                            not_null: "1",
                                                            type: "Text",
                                                            value: mySandbox.replaceIn(_item.value)
                                                        });
                                                    }
                                                } else if (_item.action == "remove") {
                                                    _.remove(_request.request[type].parameter, _.matchesProperty('key', mySandbox.replaceIn(_item.key)));
                                                }
                                            })
                                        }

                                        if (type == 'body' && _.has(_request, `request.body.raw`) && aTools.isJson5(_request.request.body.raw) && _.isArray(_target.beforeRequest.body) && _target.beforeRequest.body.length > 0) {
                                            let _rawParse = null;

                                            try {
                                                _rawParse = JSONbig.parse(stripJsonComments(_request.request.body.raw));
                                            } catch (e) {
                                                _rawParse = JSON5.parse(_request.request.body.raw);
                                            }

                                            if (_rawParse) {
                                                _target.beforeRequest[type].forEach(_item => {
                                                    if (_item.action == "set") {
                                                        _.set(_rawParse, mySandbox.replaceIn(_item.key), mySandbox.replaceIn(_item.value));
                                                    } else if (_item.action == "remove") {
                                                        _.unset(_rawParse, mySandbox.replaceIn(_item.key));
                                                    }
                                                })

                                                _request.request.body.raw = JSONbig.stringify(_rawParse)
                                            }
                                        }
                                    })
                                }

                                if (_.isObject(_requestPara['auth'][_requestPara['auth'].type])) {
                                    _requestPara['auth'][_requestPara['auth'].type] = _.mapValues(_requestPara['auth'][_requestPara['auth'].type], function (val) {
                                        return mySandbox.replaceIn(val);
                                    })

                                    _.set(_request, `request.auth.${_requestPara['auth'].type}`, _requestPara['auth'][_requestPara['auth'].type]);
                                }

                                // url 兼容
                                let _url = _request.url ? _request.url : _request.request.url;
                                _url = mySandbox.replaceIn(_url);

                                if (!_.startsWith(_.toLower(_url), 'https://') && !_.startsWith(_.toLower(_url), 'http://')) {
                                    _url = `http://${_url}`;
                                }

                                _.set(_request, 'url', _url);
                                _.set(_request, 'request.url', _url)

                                let _isHttpError = -1;

                                try {
                                    // 合并请求参数
                                    res = await request.request(_request);
                                } catch (e) {
                                    res = e;
                                }

                                // 发送console
                                if (scene != 'auto_test') {
                                    emitRuntimeEvent({
                                        action: 'console',
                                        method: res.status === 'error' ? 'error' : 'log',
                                        message: {
                                            type: 'request',
                                            data: res
                                        },
                                        timestamp: Date.now(),
                                        datetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
                                    })
                                }

                                if (res.status === 'error') {
                                    _isHttpError = 1;
                                    RUNNER_ERROR_COUNT++;

                                    if (scene == 'auto_test') {
                                        cliConsole(`\n${_request.method} ${_request.url}`.grey);
                                        cliConsole(`\t${RUNNER_ERROR_COUNT}. HTTP 请求失败`.bold.red); //underline. 
                                    }
                                } else {
                                    _isHttpError = -1;
                                    if (scene == 'auto_test') {
                                        cliConsole(`\n${_request.method} ${_request.url} [${res.data.response.code} ${res.data.response.status}, ${res.data.response.responseSize}B, ${res.data.response.responseTime}ms]`.grey);
                                        cliConsole(`\t✓`.green, ` HTTP 请求成功`.grey);
                                    }
                                }

                                // 优化返回体结构
                                let _response = _.cloneDeep(res);

                                if (_response.status == "success" && _.isObject(_response.data.response)) {
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
                                } catch (err) { }

                                _.assign(_target, {
                                    request: _request,
                                    response: _response,
                                    http_error: _isHttpError
                                })

                                if (definition.event_id != '0' && scene == 'auto_test') {
                                    emitRuntimeEvent({
                                        action: 'current_event_id',
                                        combined_id: combined_id,
                                        test_id: definition.test_id,
                                        current_event_id: definition.event_id,
                                        test_log: _target
                                    })
                                }

                                // 执行后执行脚本
                                if (_.has(_requestPara, 'test') && _.isString(_requestPara.test)) {
                                    mySandbox.execute(_requestPara.test, _.assign(definition, { response: res }), 'test', function (err, res) { })
                                }

                                _requestPara = _request = _response = res = _parent_ids = _target = null;
                            }
                            break;
                        case 'for':
                            if (_.isArray(definition.children) && definition.children.length > 0) {
                                for (let i = 0; i < mySandbox.replaceIn(definition.condition.limit); i++) {
                                    await run(definition.children, _.assign(option, { sleep: parseInt(definition.condition.sleep) }), 1)
                                }
                            }
                            break;
                        case 'while':
                            if (_.isArray(definition.children) && definition.children.length > 0) {
                                let end = Date.now() + parseInt(definition.condition.timeout);

                                while ((returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value)))) {
                                    if (Date.now() > end) {
                                        break;
                                    }

                                    await run(definition.children, _.assign(option, { sleep: parseInt(definition.condition.sleep) }), 1)
                                }
                            }
                            break;
                        case 'begin':
                            await run(definition.children, option, 1)
                            break;
                        default:
                            break;
                    }

                    if (definition.type != 'api' && definition.event_id != '0' && scene == 'auto_test') {
                        emitRuntimeEvent({
                            action: 'current_event_id',
                            combined_id: combined_id,
                            test_id: definition.test_id,
                            current_event_id: definition.event_id,
                            test_log: null // 非 api 不传 test_log
                        })
                    }

                    // 进度条
                    if (initFlag == 1) {
                        RUNNER_RUNTIME_POINTER++;
                        RUNNER_PROGRESS = _.floor(_.divide(RUNNER_RUNTIME_POINTER, RUNNER_TOTAL_COUNT), 2);

                        if (scene == 'auto_test') {
                            emitRuntimeEvent({
                                action: 'progress',
                                progress: RUNNER_PROGRESS,
                                combined_id: combined_id,
                                test_id: definition.test_id,
                                current_event_id: definition.event_id
                            })
                        }

                        if (RUNNER_PROGRESS == 1) { // 完成
                            if (scene == 'auto_test') {
                                // 获取未跑的 event 
                                (function getIgnoreAllApis(initDefinitions) {
                                    initDefinitions.forEach(item => {
                                        if (item.type == 'api' && !_.find(RUNNER_RESULT_LOG, _.matchesProperty('event_id', item.event_id))) {
                                            let _iteration_id = uuid.v4();

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
                                                datetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
                                            }
                                        }

                                        if (_.isArray(item.children)) {
                                            getIgnoreAllApis(item.children)
                                        }
                                    })
                                })(initDefinitions);

                                emitRuntimeEvent({
                                    action: "complate",
                                    combined_id: combined_id,
                                    envs: {
                                        globals: mySandbox.variablesScope.globals,
                                        environment: mySandbox.variablesScope.environment
                                    },
                                    test_report: calculateRuntimeReport(RUNNER_RESULT_LOG, initDefinitions, RUNNER_REPORT_ID, { combined_id, test_events, default_report_name, user, env_name })
                                })
                            } else {
                                let _http = RUNNER_RESULT_LOG[definition.iteration_id];

                                emitRuntimeEvent({
                                    action: 'http_complate',
                                    envs: {
                                        globals: mySandbox.variablesScope.globals,
                                        environment: mySandbox.variablesScope.environment
                                    },
                                    data: {
                                        assert: _http.assert,
                                        target_id: _http.target_id,
                                        response: _http.response,
                                    },
                                    timestamp: Date.now(),
                                    datetime: dayjs().format('YYYY-MM-DD HH:mm:ss')
                                })
                            }

                            runInit();
                            RUNNER_RESULT_LOG = initDefinitions = null;
                        }
                    }
                }
            }
        }
    }

    // 构造一个执行对象
    Object.defineProperty(this, 'run', {
        value: run
    })

    Object.defineProperty(this, 'stop', {
        value: stop
    })

    return;
}


module.exports.Runtime = Runtime;
module.exports.Collection = Collection;
