// 变量替换、脚本执行处理沙盒
const sm2 = require('sm-crypto').sm2,
    sm3 = require('sm-crypto').sm3,
    sm4 = require('sm-crypto').sm4,
    urljoins = require("urljoins").urljoins, // https://www.npmjs.com/package/urljoins
    asyncModule = require('async'), // add module 0920
    FormData = require('form-data'), // add module 0914
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
    aTools = require('apipost-tools'),
    validCookie = require('check-valid-cookie'),
    urlJoin = require('url-join'), // + new add 必须 4.0.1版本
    fs = require('fs'),
    path = require('path'),
    mysql = require('mysql2'),
    mssql = require('mssql'),
    json2csv = require('json-2-csv'),
    csv2json = require('testdata-to-apipost-json'),
    { ClickHouse } = require('clickhouse'),
    { pgClient } = require('pg'),
    child_process = require('child_process'),
    atomicSleep = require('atomic-sleep'), // ++ new add on for // fix 自动化测试有等待时的卡顿问题 for 7.0.13
    artTemplate = require('art-template'),
    cheerio = require('cheerio'),
    tv4 = require('tv4'),
    Ajv = require('ajv'),
    xml2js = require('xml2js'),
    xpath = require('xpath'),
    dom = require('@xmldom/xmldom').DOMParser,
    atob = require('atob'),
    btoa = require('btoa'),
    { DatabaseQuery } = require('database-query'),
    { parse } = require('csv-parse'), 
    { faker } = require('@faker-js/faker/locale/zh_CN'), //zh_CN/en
    insideVariablesScopeInit = require('./sandbox/inside-variables-scope'),
    pmRequestHeaders = require('./sandbox/pm-request-headers'),
    pmRequestBody = require('./sandbox/pm-request-body'),
    pmRequestUrl = require('./sandbox/pm-request-url'),
    pmCookies = require('./sandbox/pm-cookies'),
    { emitAssertResult,
        emitTargetPara,
        emitVisualizerHtml } = require('./sandbox/utils'),
    {
        getCollectionServerId,
        cliConsole,
        arrayPrototypeExtend
    } = require('./utils');

const Sandbox = function (emitRuntimeEvent, enableUnSafeShell) {
    // 1.初始化变量替换所需的参数和函数
    const insideVariablesScope = { // 内置变量
        list: {}, // 常量
    },
        variablesScope = { // 自定义变量
            globals: {}, // 公共变量
            environment: {}, // 环境变量
            collectionVariables: {}, // 目录变量 当前版本不支持，目前为兼容postman
            variables: {}, // 临时变量，无需存库
            iterationData: {}, // 流程测试时的数据变量，临时变量，无需存库
        };

    insideVariablesScopeInit(insideVariablesScope); // 初始化内置变量

    // 获取所有内置变量
    function getAllInsideVariables() {
        return _.cloneDeep(insideVariablesScope.list);
    }

    // 获取所有自定义变量
    function getAllDynamicVariables(type) {
        if (variablesScope.hasOwnProperty(type)) {
            return _.isObject(variablesScope[type]) ? variablesScope[type] : {};
        }
        const allVariables = {};
        Object.keys(variablesScope).forEach((type) => {
            _.assign(allVariables, variablesScope[type]);
        });

        return allVariables;
    }

    // 变量替换 函数
    function replaceIn(variablesStr, type, withMock = false) {
        if (!_.isString(variablesStr)) { // fix bug
            return variablesStr;
        }

        let allVariables = getAllInsideVariables(); // fix bug
        _.assign(allVariables, getAllDynamicVariables(type));

        if (withMock) {
            try {
                variablesStr = Mock.mock(variablesStr);
            } catch (e) { }
        }

        // 替换自定义变量
        const _regExp = new RegExp(Object.keys(allVariables).map((item) => {
            if (_.startsWith(item, '$')) {
                item = `\\${item}`;
            }
            return `\\{\\{${item}\\}\\}`; // fix bug
        }).join('|'), 'gi');

        variablesStr = _.replace(variablesStr, _regExp, (key) => {
            let reStr = allVariables[String(_.replace(key, /[{}]/gi, ''))];
            if (_.isString(reStr)) {
                reStr = reStr.replace(/\n/g, '\\n');      //bugfix v7.1.4
            }

            if (typeof reStr !== 'undefined') {
                return reStr;
            }
            return key;
        });

        allVariables = null;
        return variablesStr;
    }

    // 2.设置自定义变量的操作脚本语法
    const dynamicVariables = {};

    // 变量相关
    // ['variables'] 临时变量
    Object.defineProperty(dynamicVariables, 'variables', {
        configurable: true,
        enumerable: true,
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
            toJSON() { 
                return getAllDynamicVariables();
            },
        },
    });

    // ['iterationData'] 临时变量
    Object.defineProperty(dynamicVariables, 'iterationData', {
        configurable: true,
        enumerable: true,
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
            toJSON() { 
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
                enumerable: true,
                value: {
                    set(key, value) {
                        if (_.isObject(value)) {
                            try {
                                value = JSON.stringify(value);
                            } catch (e) {
                                value = String(value);
                            }
                        }

                        variablesScope[type][key] = value;
                    },
                    get(key) {
                        return variablesScope[type][key];
                    },
                    has(key) {
                        return variablesScope[type].hasOwnProperty(key);
                    },
                    delete(key) {
                        delete variablesScope[type][key];
                    },
                    unset(key) {
                        delete variablesScope[type][key];
                    },
                    clear() {
                        if (_.isObject(variablesScope[type])) { // fix bug
                            _.forEach(variablesScope[type], (value, key) => {
                                delete variablesScope[type][key];
                            });
                        }
                        variablesScope[type] = {};
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

    // 3.设置console的操作脚本语法
    const consoleFn = {};
    new Array('log', 'warn', 'info', 'error').forEach((method) => {
        Object.defineProperty(consoleFn, method, {
            configurable: true,
            value() {
                emitRuntimeEvent({
                    action: 'console',
                    // method,
                    method: 'log',
                    message: {
                        type: method,
                        data: Array.from(arguments),
                    },
                    timestamp: Date.now(),
                    datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                });
            },
        });
    });

    // 断言自定义拓展规则（100% 兼容postman）
    chai.use(() => {
        require('chai-apipost')(chai);
    });

    // 执行脚本
    async function execute(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, option, code, scope, eventName, callback) {
        scope = _.isPlainObject(scope) ? _.cloneDeep(scope) : {};

        // pm 对象
        const pm = {};

        // 请求参数增删改相关
        // pm.setRequestQuery,pm.removeRequestQuery等
        if (typeof scope !== 'undefined' && _.isObject(scope) && _.has(scope, 'request.request')) {
            if (_.isObject(RUNNER_RESULT_LOG)) {
                const item = RUNNER_RESULT_LOG[scope.iteration_id];

                if (item) {
                    ['Query', 'Header', 'Body'].forEach((para) => {
                        Object.defineProperty(pm, `setRequest${para}`, {
                            configurable: true,
                            value(key, value) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, `beforeRequest.${_.toLower(para)}`)) {
                                        _.set(item, `beforeRequest.${_.toLower(para)}`, []);
                                    }

                                    if (para == 'Header') {
                                        item.beforeRequest[_.toLower(para)].push({
                                            action: 'set',
                                            key: String(key),
                                            value: String(value),
                                        });
                                    } else {
                                        item.beforeRequest[_.toLower(para)].push({
                                            action: 'set',
                                            key,
                                            value,
                                        });
                                    }
                                }
                            },
                        });

                        Object.defineProperty(pm, `removeRequest${para}`, {
                            configurable: true,
                            value(key) {
                                if (_.trim(key) != '') {
                                    if (!_.has(item, `beforeRequest.${_.toLower(para)}`)) {
                                        _.set(item, `beforeRequest.${_.toLower(para)}`, []);
                                    }

                                    item.beforeRequest[_.toLower(para)].push({
                                        action: 'remove',
                                        key,
                                    });
                                }
                            },
                        });
                    })
                }
            }
        }

        // info, 请求、响应、cookie, iterationData
        // pm.info,pm.request,pm.response.pm.cookies,pm.iterationData
        new Array('info', 'request', 'response', 'cookie', 'iterationData').forEach((key) => {
            if (_.indexOf(['request', 'response'], key) > -1) {
                switch (key) {
                    case 'request':
                        if (_.has(scope, 'script_request') && _.isObject(scope.script_request)) {
                            Object.defineProperty(scope.script_request, 'to', {
                                get() {
                                    return chai.expect(this).to;
                                },
                            });

                            let pm_request = _.assign(_.cloneDeep(scope.script_request), {
                                headers: pmRequestHeaders(scope, pm),
                                method: scope.script_request?.method,
                                url: pmRequestUrl(scope, pm),
                                body: pmRequestBody(scope, pm)
                            })

                            arrayPrototypeExtend(pm_request);

                            Object.defineProperty(pm, key, {
                                configurable: true,
                                enumerable: true,
                                value: pm_request
                            });

                            _.forEach({ 'add': 'addHeader', 'remove': "removeHeader" }, function (method, call) {
                                Object.defineProperty(pm.request, method, {
                                    configurable: true,
                                    value(item) {
                                        if (_.isFunction(pm.request.headers[call])) {
                                            return pm.request.headers[call](item);
                                        }
                                    }
                                });
                            });

                            ['addQueryParams', 'removeQueryParams'].forEach((method) => {
                                Object.defineProperty(pm.request, method, {
                                    configurable: true,
                                    value(para) {
                                        if (_.isFunction(pm.request.url[method])) {
                                            return pm.request.url[method](para);
                                        }
                                    }
                                });
                            })
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
                                    enumerable: true,
                                    value() {
                                        return _.cloneDeep(json);
                                    },
                                });

                                Object.defineProperty(scope.response.data[key], 'text', {
                                    configurable: true,
                                    enumerable: true,
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

                            let _pm_response = _.cloneDeep(scope.response.data[key]);

                            Object.defineProperty(_pm_response, 'headers', {
                                configurable: true,
                                enumerable: true,
                                value: _.cloneDeep(_pm_response?.header)
                            });

                            arrayPrototypeExtend(_pm_response);

                            Object.defineProperty(pm, key, {
                                configurable: true,
                                enumerable: true,
                                value: _pm_response,
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
                    enumerable: true,
                    value: scope[key],
                });
            }
        });

        // 变量相关
        // pm.variables,pm.environment,pm.globals
        Object.keys(variablesScope).forEach((type) => {
            Object.defineProperty(pm, type, {
                configurable: true,
                enumerable: true,
                value: dynamicVariables[type],
            });
        });

        if (_.isObject(pm.variables)) {
            // 设置一些获取环境信息的脚本语法
            ['variables', 'environment'].forEach((type) => {
                Object.defineProperty(pm[type], 'getName', {
                    configurable: true,
                    value() {
                        return scope.env_name;
                    },
                });

                Object.defineProperty(pm[type], 'name', {
                    configurable: true,
                    value: scope.env_name
                });

                Object.defineProperty(pm[type], 'getPreUrl', {
                    configurable: true,
                    value() {
                        const api_server_id = getCollectionServerId(scope?.target_id, scope?.collection);
                        const script_pre_env_url = scope?.env_pre_urls?.[api_server_id];
                        if (_.isUndefined(script_pre_env_url)) {
                            return scope.env_pre_url;
                        }
                        return script_pre_env_url

                    },
                });

                Object.defineProperty(pm[type], 'getCollection', {
                    configurable: true,
                    value() {
                        return scope.environment;
                    },
                });
            });

            // pm.environment.values, pm.globals.values
            ['environment', 'globals'].forEach((type) => {
                let _values = [];
                _.forEach(scope[type], function (value, key) {
                    _values.push({
                        key: key,
                        value: value,
                        type: "any"
                    });
                });

                Object.defineProperty(pm[type], 'values', {
                    configurable: true,
                    enumerable: true,
                    value: _values,
                });
            });
        }

        // pm.cookies
        Object.defineProperty(pm, 'cookies', {
            configurable: true,
            enumerable: true,
            value: pmCookies(scope, pm),
        });

        // pm.expert
        Object.defineProperty(pm, 'expect', {
            configurable: true,
            enumerable: true,
            value: chai.expect,
        });

        // pm.test
        Object.defineProperty(pm, 'test', {
            configurable: true,
            value(desc, callback) {
                try {
                    callback();
                    emitAssertResult(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, 'success', desc, '成功', scope, cliConsole);
                } catch (e) {
                    emitAssertResult(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, 'error', desc, e.toString().replace('AssertionError', '断言校验失败'), scope, cliConsole);
                }
            },
        });

        // pm.assert
        Object.defineProperty(pm, 'assert', {
            configurable: true,
            value(assert) {
                try {
                    const _response = _.cloneDeep(pm.response);

                    if (_.isFunction(_response.json)) {
                        _response.json = _response.json();
                    }

                    chai.assert.isTrue(new Function('response', 'request', 'window', `return ${String(assert)}`)(_response, _.cloneDeep(pm.request)));
                    emitAssertResult(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, 'success', String(assert), '成功', scope, cliConsole);
                    return true; // fixed bug
                } catch (e) {
                    emitAssertResult(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, 'error', String(assert), e.toString().replace('AssertionError', '断言校验失败').replace('expected false to be true', '表达式不成立'), scope, cliConsole);
                    return false; // fixed bug
                }
            },
        });

        // pm.sendRequest
        Object.defineProperty(pm, 'sendRequest', {
            configurable: true,
            enumerable: true,
            value: nodeAjax, // fix bug
        });

        // pm.execute
        // 执行外部程序
        enableUnSafeShell && Object.defineProperty(pm, 'execute', {
            configurable: true,
            value: function (file, args, extra) {
                if (_.isString(file)) {
                    try {
                        try {
                            fs.accessSync(file);
                        } catch (e) {
                            let externalPrograms = _.get(option, 'requester.externalPrograms');
                            if (_.isString(externalPrograms) && externalPrograms != '') {
                                try {
                                    file = path.join(path.resolve(externalPrograms), file);
                                    fs.accessSync(file);
                                } catch (e) {
                                    file = path.join(path.resolve(ASideTools.getCachePath()), `apipost`, 'ExternalPrograms', file);
                                }
                            } else {
                                file = path.join(path.resolve(ASideTools.getCachePath()), `apipost`, 'ExternalPrograms', file);
                            }
                        }

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
                                if (_.isObject(extra) && _.isObject(process) && _.isString(_.get(process, 'resourcesPath'))) {
                                    let className = _.get(extra, 'className')
                                    let method = _.get(extra, 'method')

                                    if (_.isString(className) && _.isString(method)) {
                                        let jarPath = path.join(path.resolve(process.resourcesPath), `app`, `jar-main-1.0-SNAPSHOT.jar`);
                                        let para = new Buffer(JSON.stringify({ "methodName": method, "args": args })).toString('base64');
                                        command = `java -jar ${jarPath}  ${file} ${className} '${para}'`
                                    }
                                } else {
                                    command = `java -jar `
                                }

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
                            if (_.toLower(file.substr(file.lastIndexOf("."))) == '.jar' && _.isObject(extra) && _.isObject(process) && _.isString(_.get(process, 'resourcesPath'))) {
                                return String(child_process.execSync(`${command}`))
                            } else {
                                // fix bug for 7.1.7
                                return String(child_process.execSync(`${command} ${file} ${_.join(_.map(args, JSON.stringify), ' ')}`))
                            }
                        }
                    }
                    catch (e) { return String(e.stderr) }
                }
            },
        });

        // pm.visualizer
        Object.defineProperty(pm, 'visualizer', {
            configurable: true,
            value: {
                set: (template, data) => {
                    try {
                        const html = artTemplate.render(template, data);
                        emitVisualizerHtml(RUNNER_RESULT_LOG, 'success', `<link rel="stylesheet" href="https://img.cdn.apipost.cn/docs/css7/content-v7.css?20220909" type="text/css" media="screen"> ${html}`, scope);
                    } catch (e) {
                        emitVisualizerHtml(RUNNER_RESULT_LOG, 'error', e.toString(), scope);
                    }
                },
            },
        });

        // pm.Visualizing
        Object.defineProperty(pm, 'Visualizing', {
            configurable: true,
            value: (template, data) => {
                try {
                    const html = artTemplate.render(template, data);
                    emitVisualizerHtml(RUNNER_RESULT_LOG, 'success', `<link rel="stylesheet" href="https://img.cdn.apipost.cn/docs/css7/content-v7.css?20220909" type="text/css" media="screen"> ${html}`, scope);
                } catch (e) {
                    emitVisualizerHtml(RUNNER_RESULT_LOG, 'error', e.toString(), scope);
                }
            },
        });

        // pm.getData
        Object.defineProperty(pm, 'getData', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
            configurable: true,
            value(callback) {
                // @todo
            },
        });

        // pm.setNextRequest
        Object.defineProperty(pm, 'setNextRequest', { // 此方法为兼容 postman ，由于流程差异，暂时不支持
            configurable: true,
            value(target_id) {
                // @todo
            },
        });


        // 执行
        try {
            $.md5 = function (str) { // 兼容旧版
                return CryptoJS.MD5(str).toString();
            };

            $.ajax = await nodeAjax;

            // fix bug
            code = `(async function () {
          ${code}
        })()`;

            let scriptTimeout = _.toNumber(_.get(option, 'requester.timeoutScript'));

            if (scriptTimeout <= 0) {
                scriptTimeout = 5000;
            }

            const postman = {
                setEnvironmentVariable: pm.environment.set,
                getEnvironmentVariable: pm.environment.get,
                clearEnvironmentVariable: pm.environment.delete,
                clearEnvironmentVariables: pm.environment.clear,
                setGlobalVariable: pm.globals.set,
                getGlobalVariable: pm.globals.get,
                clearGlobalVariable: pm.globals.delete,
                clearGlobalVariables: pm.globals.clear,
                setNextRequest: pm.setNextRequest,
                getResponseCookie: function (key) {
                    let cookies = scope?.response?.data?.response?.rawCookies;

                    if (_.isObject(cookies)) {
                        return _.find(cookies, function (item) { return item.name == key; });
                    } else {
                        return undefined;
                    }
                },
                getResponseHeader: function (key) {
                    let headers = scope?.response?.data?.response?.headers;

                    if (_.isObject(headers)) {
                        return headers[key]
                    } else {
                        return undefined;
                    }
                }
            };

            await (new vm2.VM({
                timeout: scriptTimeout,
                sandbox: _.assign({
                    ...{ nodeAjax },
                    ...{ pm },
                    ...{ chai },
                    ...{ JSON5 },
                    ...{ _ },
                    ...{ Mock },
                    ...{ uuid },
                    ...{ jsonpath },
                    ...{ CryptoJS },
                    ...{ x2js },
                    JSEncrypt: JSEncryptNode,
                    ...{ moment },
                    ...{ dayjs },
                    JSON, // 增加 JSON 方法 // fixed JSON5 bug
                    console: consoleFn,
                    print: consoleFn.log,
                    async: asyncModule,
                    FormData,
                    sm2,
                    sm3,
                    sm4,
                    xpath,
                    dom,
                    DatabaseQuery, 
                    csvParse: parse, 
                    csv2array: csv2json,
                    mysql,
                    mssql, ClickHouse, pgClient,
                    fs: enableUnSafeShell ? fs : {},
                    path, json2csv,
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
                    urljoins,
                    apt: pm,
                    faker,
                    postman,
                    fox: pm,
                    cheerio,
                    tv4,
                    Ajv,
                    xml2js,
                    atob,
                    btoa,
                    require: require,
                    $,
                    apipost: postman,
                    request: pm.request ? _.assign(_.cloneDeep(pm.request), { url: pm.request?.url?.toString(), headers: pm.request?.request_headers }) : {}, // 7.2.2
                    response: pm.response ? _.assign(_.cloneDeep(pm.response), { json: _.isFunction(pm.response.json) ? pm.response.json() : pm.response.json, headers: pm.response?.resHeaders }) : {},
                    expect: chai.expect,
                    sleep: atomicSleep,
                }, variablesScope),
            })).run(new vm2.VMScript(code));
            typeof callback === 'function' && callback(null, pm.response, scope?.jar, scope);  // 7.2.0
        } catch (err) {
            emitTargetPara(RUNNER_RESULT_LOG, {
                action: 'SCRIPT_ERROR',
                eventName,
                data: `${eventName == 'pre_script' ? '预执行' : '后执行'}脚本语法错误: ${err.toString()}`,
            }, scope);
            typeof callback === 'function' && callback(err.toString(), {}, scope?.jar, scope);
        }
    }

    _.assign(this, {
        ...{ execute },
        ...{ getAllInsideVariables },
        ...{ getAllDynamicVariables },
        ...{ replaceIn },
        ...{ dynamicVariables },
        ...{ variablesScope },
    });
};
module.exports = Sandbox;