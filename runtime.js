const apipostRequest = require('apipost-send'),
  Table = require('cli-table3'),
  Cookie = require('cookie'),
  zlib = require('zlib'),
  Buffer = require('buffer/').Buffer,
  _ = require('lodash'),
  chai = require('chai'),
  JSON5 = require('json5'),
  uuid = require('uuid'),
  Mock = require('mockjs'),
  CryptoJS = require('crypto-js'),
  jsonpath = require('jsonpath'),
  x2js = require('x2js'),
  { JSDOM } = require('jsdom'),
  { window } = new JSDOM(''),
  $ = require('jquery')(window),
  // JSEncrypt = require("jsencrypt"),
  moment = require('moment'),
  dayjs = require('dayjs'),
  vm2 = require('vm2'),
  colors = require('colors'),
  ASideTools = require('apipost-inside-tools'),
  stripJsonComments = require('strip-json-comments'),
  JSONbig = require('json-bigint'),
  aTools = require('apipost-tools'),
  validCookie = require('is-valid-cookie'),
  artTemplate = require('art-template');

// cli console
const cliConsole = function (args) {
  if (typeof window === 'undefined') {
    console.log(args);
  }
};
// console.log('ajax', jQuery.ajax);
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
      RUNNER_TOTAL_COUNT: definition.length * (iterationCount > 0 ? iterationCount : 1),
      children: _.cloneDeep(definition),
    })],
  });
};

const Runtime = function ApipostRuntime(emitRuntimeEvent) {
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

    new Array('natural', 'integer', 'float', 'character', 'range', 'date', 'time', 'datetime', 'now', 'guid', 'integeincrementr', 'url', 'protocol', 'domain', 'tld', 'email', 'ip', 'region', 'province', 'city', 'county', 'county', 'zip', 'first', 'last', 'name', 'cfirst', 'clast', 'cname', 'color', 'rgb', 'rgba', 'hsl', 'paragraph', 'cparagraph', 'sentence', 'csentence', 'word', 'cword', 'title', 'ctitle').forEach((func) => {
      insideVariablesScope.list[`$${func}`] = Mock.mock(`@${func}`);
    });

    new Array('phone', 'mobile', 'telephone').forEach((func) => {
      insideVariablesScope.list[`$${func}`] = ['131', '132', '137', '188'][_.random(0, 3)] + Mock.mock(/\d{8}/);
    });

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
        return _.isPlainObject(variablesScope[type]) ? variablesScope[type] : {};
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
      },
    });

    // ['globals', 'environment', 'collectionVariables']
    Object.keys(variablesScope).forEach((type) => {
      if (['iterationData', 'variables'].indexOf(type) === -1) {
        Object.defineProperty(dynamicVariables, type, {
          configurable: true,
          value: {
            set(key, value, emitdb = true) {
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
      let allVariables = getAllInsideVariables();
      _.assign(allVariables, getAllDynamicVariables(type));

      if (withMock) {
        variablesStr = Mock.mock(variablesStr);
      }

      // 替换自定义变量
      const _regExp = new RegExp(Object.keys(allVariables).map((item) => {
        if (_.startsWith(item, '$')) {
          item = `\\${item}`;
        }
        return `{{${item}}}`;
      }).join('|'), 'gi');

      variablesStr = _.replace(variablesStr, _regExp, (key) => {
        const reStr = allVariables[_.replace(key, /[{}]/gi, '')];
        return reStr || key;
      });

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
        const item = RUNNER_RESULT_LOG[scope.iteration_id];

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

    // 发送可视化结果
    function emitVisualizerHtml(status, html, scope) {
      if (typeof scope !== 'undefined' && _.isObject(scope)) {
        const item = RUNNER_RESULT_LOG[scope.iteration_id];

        if (item) {
          item.visualizer_html = { status, html };
          console.log(item.visualizer_html);
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
    function execute(code, scope, eventName, callback) {
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
              if (_.has(scope, `response.data.${key}`) && _.isObject(scope.response.data[key])) {
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
      }

      // 请求参数相关
      if (typeof scope !== 'undefined' && _.isObject(scope) && _.has(scope, 'request.request')) {
        // 更新日志
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

                item.beforeRequest.header.push({
                  action: 'set',
                  key,
                  value,
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
            chai.assert.isTrue(new Function('response', 'request', `return ${String(assert)}`)(_response, _.cloneDeep(pm.request)));
            emitAssertResult('success', String(assert), '成功', scope);
          } catch (e) {
            emitAssertResult('error', String(assert), e.toString().replace('AssertionError', '断言校验失败').replace('expected false to be true', '表达式不成立'), scope);
          }
        },
      });

      // 发送方法
      Object.defineProperty(pm, 'sendRequest', {
        configurable: true,
        value: new apipostRequest(),
      });

      // 可视化
      Object.defineProperty(pm, 'visualizer', {
        configurable: true,
        value: {
          set: (template, data) => {
            try {
              const html = artTemplate.render(template, data);
              emitVisualizerHtml('success', html, scope);
            } catch (e) {
              emitVisualizerHtml('error', e.toString(), scope);
            }
          },
        },
      });

      Object.defineProperty(pm, 'Visualizing', {
        configurable: true,
        value: (template, data) => {
          try {
            const html = artTemplate.render(template, data);
            // console.log(html);
            emitVisualizerHtml('success', html, scope);
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
        $.md5 = function (str) { // 兼容旧版
          return CryptoJS.MD5(str).toString();
        };

        (new vm2.VM({
          timeout: 5000,
          sandbox: {
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
            // ...{ $ },
            ...{ x2js },
            // ...{ JSEncrypt?JSEncrypt:{} },
            ...{ moment },
            ...{ dayjs },
            console: consoleFn,
            xml2json(xml) {
              return (new x2js()).xml2js(xml);
            },
            uuidv4() {
              return uuid.v4();
            },
            $,
            apt: pm,
            request: pm.request ? _.cloneDeep(pm.request) : {},
            response: pm.response ? _.assign(_.cloneDeep(pm.response), { json: _.isFunction(pm.response.json) ? pm.response.json() : pm.response.json }) : {},
            expect: chai.expect,
            sleep(ms) {
              const end = Date.now() + parseInt(ms);
              while (true) {
                if (Date.now() > end) {
                  return;
                }
              }
            },
          },
        })).run(new vm2.VMScript(code));

        typeof callback === 'function' && callback();
      } catch (err) {
        console.log(err);
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
    const end = Date.now() + ms;
    while (true) {
      if (Date.now() > end) {
        return;
      }
    }
  }

  // 根据测试条件返回布尔值
  function returnBoolean(exp, compare, value) {
    let bool = false;

    if (exp == '') {
      return compare == 'null';
    }

    switch (compare) {
      case 'eq':
        bool = exp == value;
        break;
      case 'uneq':
        bool = exp != value;
        break;
      case 'gt':
        bool = _.gt(exp, value);
        break;
      case 'gte':
        bool = _.gte(exp, value);
        break;
      case 'lt':
        bool = _.lt(exp, value);
        break;
      case 'lte':
        bool = _.lte(exp, value);
        break;
      case 'includes':
        bool = _.includes(exp, value);
        break;
      case 'unincludes':
        bool = !_.includes(exp, value);
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
      console.log(item.assert);
      // 计算各个event的状态 [ignore, failure, passed]
      if (_.isArray(initDefinitions)) {
        const parent_ids = getInitDefinitionsParentIDs(item.event_id, initDefinitions);

        if (_.find(item.assert, _.matchesProperty('status', 'error'))) {
          item.assert_error == 1;
        } else {
          item.assert_error == -1;
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
  async function run(definitions, option = {}, initFlag = 0) {
    option = _.assign({
      project: {},
      collection: [], // 当前项目的所有接口列表
      environment: {}, // 当前环境变量
      globals: {}, // 当前公共变量
      iterationData: [], // 当前迭代的excel导入数据
      iterationCount: 1, // 当前迭代次数
      ignoreError: 1, // 遇到错误忽略
      sleep: 0, // 每个任务的间隔时间
      requester: {}, // 发送模块的 options
    }, option);

    let { RUNNER_REPORT_ID, scene, project, cookies, collection, iterationData, combined_id, test_events, default_report_name, user, env, env_name, env_pre_url, environment, globals, iterationCount, ignoreError, sleep, requester } = option;

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
        iterationData = _.isArray(_interData) ? _interData : [];
      } else {
        iterationData = [];
      }
    }

    if (typeof iterationCount === 'undefined') {
      iterationCount = 1;
    }

    // 自动替换 Mock
    const AUTO_CONVERT_FIELD_2_MOCK = typeof requester === 'object' && requester.AUTO_CONVERT_FIELD_2_MOCK > 0;


    // 设置sandbox的 environment变量 和 globals 变量
    new Array('environment', 'globals').forEach((func) => {
      if (_.isObject(option[func]) && _.isObject(mySandbox.dynamicVariables[func]) && _.isFunction(mySandbox.dynamicVariables[func].set)) {
        for (const [key, value] of Object.entries(option[func])) {
          mySandbox.dynamicVariables[func].set(key, value, false);
        }
      }
    });

    // 发送对象
    const request = new apipostRequest(_.isObject(requester) ? requester : {});

    if (sleep > 0) {
      sleepDelay(sleep);
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
        _.assign(definition, {
          iteration_id: uuid.v4(),  // 每次执行单任务的ID
          iteration: i,
          iterationData: iterationData[i] ? iterationData[i] : iterationData[0],
          ...{ iterationCount },
          ...{ env_name },
          ...{ env_pre_url },
          ...{ environment },
          ...{ globals },
        });

        if (_.isObject(definition.iterationData)) {
          for (const [key, value] of Object.entries(definition.iterationData)) {
            mySandbox.dynamicVariables.iterationData.set(key, value, false);
          }
        }

        // console.log(definition.event_id, definition.type)
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
                mySandbox.execute(definition.data.content, definition, 'test', (err, res) => {
                  if (err && ignoreError < 1) {
                    stop(RUNNER_REPORT_ID, String(err));
                  }
                });
              }
              break;
            case 'if':
              if (returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value))) {
                await run(definition.children, option, initFlag + 1);
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
                    request: _requestBody.request,
                  });

                  _requestBody = null;
                }

                new Array('header', 'body', 'query', 'auth', 'pre_script', 'test').forEach((_type) => {
                  // 参数
                  if (_.indexOf(['header', 'body', 'query'], _type) > -1) {
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

                        if (_.has(_folder, `request.['${_type}']`) && _.isObject(_folder.request[_type]) && _folder.request[_type].type != 'noauth') {
                          _.assign(_requestPara[_type], _folder.request[_type]);
                        }
                      });
                    }

                    // 接口认证
                    if (_.has(definition, `request.request.${_type}`) && _.isObject(definition.request.request[_type]) && definition.request.request[_type].type != 'noauth') {
                      _.assign(_requestPara[_type], definition.request.request[_type]);
                    }
                  }

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
                  datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                };

                // 执行预执行脚本
                if (_.has(_requestPara, 'pre_script') && _.isString(_requestPara.pre_script)) {
                  mySandbox.execute(_requestPara.pre_script, definition, 'pre_script', (err, res) => {
                    if (err && ignoreError < 1) {
                      stop(RUNNER_REPORT_ID, String(err));
                    }
                  });
                }

                let _request = _.cloneDeep(definition.request);

                // 替换 _requestPara 的参数变量
                new Array('header', 'query', 'body').forEach((type) => {
                  _requestPara[type] = _.values(_requestPara[type]);
                  _requestPara[type].map((item) => {
                    _.assign(item, {
                      key: mySandbox.replaceIn(item.key, null, AUTO_CONVERT_FIELD_2_MOCK),
                      value: mySandbox.replaceIn(item.value, null, AUTO_CONVERT_FIELD_2_MOCK),
                    });
                  });

                  _.set(_request, `request.${type}.parameter`, _requestPara[type]);
                });

                // 重新渲染请求参数
                let _target = RUNNER_RESULT_LOG[definition.iteration_id];

                if (typeof _target === 'object' && _.isObject(_target.beforeRequest)) {
                  new Array('query', 'header', 'body').forEach((type) => {
                    if (_.has(_request, `request.${type}.parameter`) && _.isArray(_target.beforeRequest[type])) {
                      _target.beforeRequest[type].forEach((_item) => {
                        if (_item.action == 'set') {
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
                        } else if (_item.action == 'remove') {
                          _.remove(_request.request[type].parameter, _.matchesProperty('key', mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK)));
                        }
                      });
                    }

                    if (type == 'body' && _.has(_request, 'request.body.raw') && aTools.isJson5(_request.request.body.raw) && _.isArray(_target.beforeRequest.body) && _target.beforeRequest.body.length > 0) {
                      let _rawParse = null;

                      try {
                        _rawParse = JSONbig.parse(stripJsonComments(_request.request.body.raw));
                      } catch (e) {
                        _rawParse = JSON5.parse(_request.request.body.raw);
                      }

                      if (_rawParse) {
                        _target.beforeRequest[type].forEach((_item) => {
                          if (_item.action == 'set') {
                            _.set(_rawParse, mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK), mySandbox.replaceIn(_item.value, null, AUTO_CONVERT_FIELD_2_MOCK));
                          } else if (_item.action == 'remove') {
                            _.unset(_rawParse, mySandbox.replaceIn(_item.key, null, AUTO_CONVERT_FIELD_2_MOCK));
                          }
                        });

                        _request.request.body.raw = JSONbig.stringify(_rawParse);
                      }
                    }
                  });
                }

                if (_.isObject(_requestPara.auth[_requestPara.auth.type])) {
                  _requestPara.auth[_requestPara.auth.type] = _.mapValues(_requestPara.auth[_requestPara.auth.type], val => mySandbox.replaceIn(val, null, AUTO_CONVERT_FIELD_2_MOCK));

                  _.set(_request, `request.auth.${_requestPara.auth.type}`, _requestPara.auth[_requestPara.auth.type]);
                }

                // url 兼容
                let _url = _request.request.url ? _request.request.url : _request.url;

                // 拼接环境前置URl
                if (_.isString(env_pre_url) && env_pre_url.length > 0) _url = env_pre_url + _url;

                _url = mySandbox.replaceIn(_url, null, AUTO_CONVERT_FIELD_2_MOCK);

                if (!_.startsWith(_.toLower(_url), 'https://') && !_.startsWith(_.toLower(_url), 'http://')) {
                  _url = `http://${_url}`;
                }

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
                          _targetHeaderCookie.value = `${_cookieArr.join('&')}&${_targetHeaderCookie.value}`;
                        } else {
                          _request.request.header.parameter.push({
                            key: 'cookie',
                            value: _cookieArr.join('&'),
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
                          value: _cookieArr.join('&'),
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

                try {
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
                            method: _request.method,
                            url: request.setQueryString(_request.request.url, request.formatQueries(_request.request.query.parameter)).uri,
                            request_bodys: _.indexOf(['form-data', 'urlencoded'], _request.request.body.mode) ? _.mapValues(_formPara, o => _.size(o) > 1 ? o : o[0]) : _formPara,
                            request_headers: {
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

                  mySandbox.execute(_requestPara.test, _.assign(definition, { response: res }), 'test', (err, res) => {
                    if (err && ignoreError < 1) {
                      stop(RUNNER_REPORT_ID, String(err));
                    }
                  });
                }

                if (definition.event_id != '0' && scene == 'auto_test') {
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
                for (let i = 0; i < mySandbox.replaceIn(definition.condition.limit); i++) {
                  await run(definition.children, _.assign(option, { sleep: parseInt(definition.condition.sleep) }), initFlag + 1);
                }
              }
              break;
            case 'while':
              if (_.isArray(definition.children) && definition.children.length > 0) {
                const end = Date.now() + parseInt(definition.condition.timeout);
                console.log(11111, definition.condition, (returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value))));
                while ((returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value)))) {
                  if (Date.now() > end) {
                    break;
                  }

                  await run(definition.children, _.assign(option, { sleep: parseInt(definition.condition.sleep) }), initFlag + 1);
                }
              }
              break;
            case 'begin':
              await run(definition.children, option, initFlag + 1);
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
                  console.log(initDefinitions);
                }

                initDefinitions.forEach((item) => {
                  if (item.type == 'api' && !_.find(RUNNER_RESULT_LOG, _.matchesProperty('event_id', item.event_id))) {
                    const _iteration_id = uuid.v4();

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

                  if (_.isArray(item.children)) {
                    getIgnoreAllApis(item.children);
                  }
                });
              }(initDefinitions));

              const _runReport = calculateRuntimeReport(RUNNER_RESULT_LOG, initDefinitions, RUNNER_REPORT_ID, { combined_id, test_events, default_report_name, user, env_name });

              emitRuntimeEvent({
                action: 'complate',
                combined_id,
                envs: {
                  globals: mySandbox.variablesScope.globals,
                  environment: _.assign(mySandbox.variablesScope.environment, mySandbox.variablesScope.variables), // fix variables bug
                },
                ignore_events: ignoreEvents,
                test_report: _runReport,
              });

              // console.log(_runReport)
              // 打印报告
              const reportTable = new Table({
                style: { padding: 5, head: [], border: [] },
              });

              reportTable.push(
                [{ content: 'The result of API test'.bold.gray, colSpan: 4, hAlign: 'center' }],
                ['', { content: 'passed', hAlign: 'center' }, { content: 'failed', hAlign: 'center' }, { content: 'ignore', hAlign: 'center' }],
                [{ content: 'request', hAlign: 'left' }, { content: `${_runReport.http.passed}`.green, hAlign: 'center' }, { content: `${_runReport.http.failure}`.underline.red, hAlign: 'center' }, { content: `${_runReport.ignore_count}`, rowSpan: 2, hAlign: 'center', vAlign: 'center' }],
                [{ content: 'assertion', hAlign: 'left' }, { content: `${_runReport.assert.passed}`.green, hAlign: 'center' }, { content: `${_runReport.assert.failure}`.underline.red, hAlign: 'center' }],
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
                  [{ content: '#'.underline.red, hAlign: 'center' }, { content: 'failure'.underline.red, hAlign: 'left' }, { content: 'detail'.underline.red, hAlign: 'left' }],
                );

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
              const _http = RUNNER_RESULT_LOG[definition.iteration_id];

              emitRuntimeEvent({
                action: 'http_complate',
                envs: {
                  globals: mySandbox.variablesScope.globals,
                  environment: _.assign(mySandbox.variablesScope.environment, mySandbox.variablesScope.variables), // fix variables bug
                },
                data: {
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
