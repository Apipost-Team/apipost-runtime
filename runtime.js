const apipostRequest = require('apipost-send'),
  urljoins = require("urljoins").urljoins, // https://www.npmjs.com/package/urljoins
  Table = require('cli-table3'),
  zlib = require('zlib'),
  Buffer = require('buffer/').Buffer,
  urlNode = require('url'),
  _ = require('lodash'),
  JSON5 = require('json5'),
  uuid = require('uuid'),
  jsonpath = require('jsonpath'),
  dayjs = require('dayjs'),
  stripJsonComments = require('strip-json-comments'),
  JSONbig = require('json-bigint'),
  aTools = require('apipost-tools'),
  validCookie = require('check-valid-cookie'),
  { DatabaseQuery } = require('database-query'), // add for 7.2.2
  { getCollectionServerId,
    cliConsole,
    isCliMode,
    sleepDelay,
    returnBoolean,
    getParentTargetIDs,
    getItemFromCollection,
    calculateRuntimeReport } = require('./libs/utils'),// for 7.2.2
  Sandbox = require('./libs/sandbox'),
  Collection = require('./libs/collection');// for 7.2.2

/*
@emitRuntimeEvent:请求脚本参数
@enableUnSafeShell:是否允许执行不安全脚本
*/
const Runtime = function ApipostRuntime(emitRuntimeEvent, enableUnSafeShell = true) {
  if (typeof emitRuntimeEvent !== 'function') {
    emitRuntimeEvent = function () { };
  }

  // 变量替换、脚本执行处理沙盒
  const mySandbox = new Sandbox(emitRuntimeEvent, enableUnSafeShell);

  // 当前流程总错误计数器
  let RUNNER_TOTAL_COUNT = 0, // 需要跑的总event分母
    RUNNER_ERROR_COUNT = 0,
    RUNNER_PROGRESS = 0,
    RUNNER_RESULT_LOG = {},
    RUNNER_STOP = {};


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

    let { RUNNER_REPORT_ID, scene, project, cookies, collection, iterationData, combined_id, test_events, default_report_name, user, env, env_name, env_pre_url, env_pre_urls, environment, globals, iterationCount, ignoreError, ignore_error, enable_sandbox, sleep, requester, connectionConfigs } = option;

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
        env_pre_urls
      };
    } else {
      env_name = env.env_name;
      env_pre_url = env.env_pre_url;
      env_pre_urls = env.env_pre_urls;
    }

    if (initFlag == 0) { // 初始化参数
      if (_.size(RUNNER_RESULT_LOG) > 0) { // 当前有任务时，拒绝新任务
        return;
      }

      // 设置sandbox的 environment变量 和 globals 变量
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

    // 发送对象
    const request = new apipostRequest(_.isObject(requester) ? requester : {});

    // fix bug for 7.0.8
    if (option.sleep > 0) {
      sleepDelay(option.sleep);
    }

    // 全局断言
    const _global_asserts = _.find(definitions, _.matchesProperty('type', 'assert'));
    let _global_asserts_script = '';

    if (_global_asserts && _.has(_global_asserts, 'data.content') && _global_asserts?.enabled > 0) {
      _global_asserts_script = _global_asserts.data.content;
    }


    if (_.isArray(definitions) && definitions.length > 0) {
      for (let i = 0; i < definitions.length; i++) {
        const definition = definitions[i];

        _.assign(definition, {
          iteration_id: uuid.v4(),  // 每次执行单任务的ID
          iteration: loopCount,
          iterationData: iterationData[loopCount] ? iterationData[loopCount] : iterationData[0],
          ...{ iterationCount },
          ...{ env_name },
          ...{ env_pre_url },
          ...{ env_pre_urls },
          ...{ collection },
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
                await mySandbox.execute(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, option, definition.data.content, _.assign(definition, { jar: cookies }), 'test', (err, res, jar, scope) => {
                  cookies = jar;

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
            case 'sample':
            case 'api':
              if (_.has(definition, 'request') && _.isObject(definition.request)) {
                // 多环境
                const api_server_id = getCollectionServerId(definition.request.target_id, collection);

                let temp_env = definition?.temp_env || {};
                if (_.isObject(definition.temp_env) && _.isString(temp_env?.pre_url)) {

                  env_pre_url = _.trim(temp_env.pre_url);
                } else {
                  // 还原前置url 优先从env_pre_urls中取，取不到则从原env_pre_url中取
                  env_pre_url = env?.env_pre_urls?.[api_server_id];

                  if (_.isUndefined(env_pre_url)) {
                    env_pre_url = env.env_pre_url;
                  }
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

                // for 7.2.2
                let para_arrays = ['header', 'body', 'query', 'auth', 'pre_script', 'pre_tasks', 'post_tasks', 'test', 'resful'];

                for (let _j = 0; _j < para_arrays.length; _j++) {
                  let _type = para_arrays[_j];

                  // 参数 7.2.2 add  'pre_tasks', 'post_tasks'
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
                            if (_.isUndefined(_requestPara[_type][_.trim(item.key)])) {
                              _requestPara[_type][_.trim(item.key)] = item;
                            } else {
                              if (!_.isUndefined(item.field_type)) {
                                _requestPara[_type][_.trim(item.key)] = item;
                              }
                            }
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

                  // 公共/目录脚本 for 7.2.2
                  if (_.indexOf(['pre_script', 'test', 'pre_tasks', 'post_tasks'], _type) > -1) {
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
                  }

                  // 脚本 for 7.2.2
                  if (_.indexOf(['pre_script', 'test'], _type) > -1) {
                    // 接口脚本
                    if (_.has(definition, `request.request.event.${_type}`) && _.isString(definition.request.request.event[_type])) {
                      _requestPara[_type] = `${_requestPara[_type]}\r\n${definition.request.request.event[_type]}`;
                    }
                  }

                  // 前后置 for 7.2.2
                  if (_.indexOf(['pre_tasks', 'post_tasks'], _type) > -1) {
                    if (!_.isObject(connectionConfigs)) {
                      connectionConfigs = {};
                    }

                    if (_.has(definition, `request.request.${_type}`) && _.isArray(definition?.request?.request[_type])) {
                      for (let _i = 0; _i < definition?.request?.request[_type].length; _i++) {
                        let item = definition?.request?.request[_type][_i];

                        if (_.isObject(item)) {
                          switch (_.toLower(item.type)) {
                            case 'database': // database 最终也是要转化成脚本
                              if (Number(item.enabled) > 0 && _.isObject(connectionConfigs[item.data?.connectionId])) {
                                try {
                                  let _db_res = await DatabaseQuery(connectionConfigs[item.data?.connectionId], item.data?.query);

                                  if (Number(item.data?.isConsoleOutput) > 0) {
                                    _requestPara[_type] = `${_requestPara[_type]}\r\nconsole.log(${JSON.stringify(_db_res?.result)});`
                                  }

                                  if (_.isArray(item.data?.variables)) {
                                    _.forEach(item.data?.variables, function (vars) {

                                      let _var_val = '';

                                      if (_.isObject(_db_res?.result)) {
                                        _var_val = jsonpath.value(_db_res?.result, vars.pattern ? vars.pattern : '$');
                                      } else {
                                        _var_val = _db_res?.result;
                                      }

                                      _requestPara[_type] = `${_requestPara[_type]}\r\npm.${vars.type}.set("${vars.name}",${JSON.stringify(_var_val)});`
                                    });
                                  }
                                } catch (e) {
                                  _requestPara[_type] = `${_requestPara[_type]}\r\nconsole.log("${e?.result}");`
                                }
                              }
                              break;
                            case 'customscript': // 拼写自定义脚本
                              if (Number(item.enabled) > 0 && _.isString(item.data) && !_.isEmpty(_.trim(item.data))) {
                                _requestPara[_type] = `${_requestPara[_type]}\r\n${item.data}`
                              }
                              break;
                          }
                        }
                      }
                    }
                  }
                }

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
                let _script_pre_url = mySandbox.replaceIn(env_pre_url, null, AUTO_CONVERT_FIELD_2_MOCK);
                let _script_url = mySandbox.replaceIn(definition.request.url, null, AUTO_CONVERT_FIELD_2_MOCK);

                // 拼接环境前置URl
                if (_.isString(_script_pre_url) && _script_pre_url.length > 0) {
                  if (!_.startsWith(_.toLower(_script_pre_url), 'https://') && !_.startsWith(_.toLower(_script_pre_url), 'http://')) {
                    _script_pre_url = `http://${_script_pre_url}`;
                  }

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
                  mode: _script_mode, // for 7.2.0
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

                // for 7.2.2
                let _pre_script = '';

                if (_.has(_requestPara, 'pre_tasks') && _.isString(_requestPara.pre_tasks) && !_.isEmpty(_requestPara.pre_tasks)) {
                  _pre_script = _requestPara.pre_tasks;
                } else if (_.has(_requestPara, 'pre_script') && _.isString(_requestPara.pre_script)) {
                  _pre_script = _requestPara.pre_script;
                }

                await mySandbox.execute(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, option, _pre_script, _.assign(definition, { jar: cookies }), 'pre_script', (err, res, jar, scope) => { // for 7.2.2
                  cookies = jar;// for 7.2.0
                  if (err && ignoreError < 1) {
                    stop(RUNNER_REPORT_ID, String(err));
                  }

                  if (_.isString(scope?.script_request?.updateurl)) {
                    _.set(definition.request, 'updateurl', scope?.script_request?.updateurl) // for 7.2.2
                  }
                });

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

                // 脚本重置了请求参数
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

                    if (type == 'header') {
                      // 重置请求头的 content-type
                      let _contentType = '';
                      if (_.isArray(_target?.beforeRequest?.header)) {
                        let _t = _.findLast(_target?.beforeRequest?.header, function (item) {
                          return _.toLower(item.key) == 'content-type' && item.action == 'set'
                        });
                        _contentType = _.isObject(_t) ? _.toLower(_t.value) : '';
                      }

                      let _mode = _.get(_request, 'request.body.mode');
                      switch (_contentType) {
                        case 'application/x-www-form-urlencoded':
                          _mode = 'urlencoded';
                          break;
                        case 'application/json':
                          _mode = 'json';
                          break;
                        case 'application/javascript':
                          _mode = 'javascript';
                          break;
                        case 'application/xml':
                          _mode = 'xml';
                          break;
                        case 'application/plain':
                        case 'text/plain':
                          _mode = 'plain';
                          break;
                        case 'text/html':
                          _mode = 'html';
                          break;
                      }

                      if (['urlencoded', 'json', 'javascript', 'xml', 'plain', 'html'].indexOf(_mode) > -1) {
                        _.set(_request, 'request.body.mode', _mode)
                      }
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
                      _url = _.replace(_url, `{${_resful.key}}`, _resful.value)
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
                if (typeof cookies === 'object' && _.has(cookies, 'switch') && _.has(cookies, 'data')) {
                  if (cookies.switch > 0 && _.isArray(cookies.data)) {
                    const _cookieArr = [];
                    cookies.data.forEach((_cookie) => {
                      if (typeof _cookie.name === 'undefined' && typeof _cookie.key === 'string') {
                        _cookie.name = _cookie.key;
                      }

                      if (_.isString(_cookie.name) && _cookie.name != '') {
                        try {
                          const cookieStr = validCookie.isvalid(_url, _cookie);

                          if (cookieStr) {
                            _cookieArr.push(cookieStr.cookie);
                          }
                        } catch (e) { }
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
                if (`${option.env_id}` == '-2') {
                  //判断query数组内是否包含apipost_id
                  const requestApipostId = _request?.request?.query?.parameter.find(item => item.key === 'apipost_id');
                  if (_.isUndefined(requestApipostId)) {
                    _request.request.query.parameter.push({
                      key: 'apipost_id',
                      value: _.take(_request?.target_id, 6).join(''),
                      description: '',
                      not_null: 1,
                      field_type: 'String',
                      type: 'Text',
                      is_checked: 1,
                    });
                  }

                  try {
                    let _urlParse = urlNode.parse(_pre_url);
                    let _mock_url = _.trim(_request?.mock_url);

                    if (_.isEmpty(_mock_url) || _mock_url == '/') {
                      let _urlParse = urlNode.parse(_request?.url);
                      _mock_url = _urlParse?.pathname;
                    }

                    _.set(_request, 'updateurl', urljoins(_pre_url, _.trimStart(_request?.mock_url, _urlParse?.path), `?apipost_id=${_.take(_request?.target_id, 6).join('')}`));
                  } catch (e) { }
                }

                // for 7.2.2
                if (_.isString(_request?.updateurl)) {
                  _.set(_request, 'url', _request?.updateurl);
                  _.set(_request, 'request.url', _request?.updateurl);
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

                  if (scene == 'auto_test' && isCliMode()) {
                    cliConsole(`\n${_request.method} ${_request.url}`.grey);
                    cliConsole(`\t${RUNNER_ERROR_COUNT}. HTTP 请求失败`.bold.red); // underline.
                  }
                } else {
                  _isHttpError = -1;
                  if (scene == 'auto_test' && isCliMode()) {
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

                // fix bug for 7.1.16
                if (_.isArray(_response?.data?.response?.resCookies)) {
                  _.forEach(_response?.data?.response?.resCookies, function (item) {
                    if (_.isArray(cookies?.data)) {
                      let _cookieItemArray = _.remove(cookies?.data, function (c) {
                        return c.name == item.name && c.domain == item.domain && c.path == item.path;
                      });

                      if (_cookieItemArray.length == 0) {
                        item.cookie_id = uuid.v4();
                        item.project_id = _request.project_id;
                        cookies.data.push(item)
                      } else {
                        _.forEach(_cookieItemArray, function (_cookieItem) {
                          item.cookie_id = _cookieItem.cookie_id;
                          item.project_id = _cookieItem.project_id;
                          cookies.data.push(item)
                        })
                      }
                    }
                  });
                }

                // 发送console
                // 修改请求url
                const requestUrl = request.setQueryString(_request.request.url, request.formatQueries(_request.request.query.parameter)).uri

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
                            url: requestUrl,
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
                          status: 'error'
                        },
                      },
                      timestamp: Date.now(),
                      datetime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                    });
                  } else {

                    _.set(_response, 'data.request.url', requestUrl);
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
                // for 7.2.2
                let _test_script = '';

                if (_.has(_requestPara, 'post_tasks') && _.isString(_requestPara.post_tasks) && !_.isEmpty(_requestPara.post_tasks)) {
                  _test_script = _requestPara.post_tasks;
                } else if (_.has(_requestPara, 'test') && _.isString(_requestPara.test)) {
                  _test_script = _requestPara.test;
                }

                if (_.isString(_global_asserts_script) && _.trim(_global_asserts_script) != '') {
                  _test_script = `${_test_script}\r\n${_global_asserts_script}`;
                }

                await mySandbox.execute(RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, option, _test_script, _.assign(definition, { response: res, jar: cookies }), 'test', (err, exec_res, jar) => {
                  cookies = jar; // 7.2.0
                  if (err && ignoreError < 1) {
                    stop(RUNNER_REPORT_ID, String(err));
                  } else if (_.has(exec_res, 'raw.responseText') && _.has(res, 'data.response.raw.responseText') && exec_res.raw.responseText != res.data.response.raw.responseText) {
                    _.set(_response, 'data.response.changeBody', exec_res.raw.responseText);
                  }
                });

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
            case 'foreach': // for 7.2.0
            case 'forEach':
              if (_.isArray(definition.children) && definition.children.length > 0) {
                let _foreach_option = _.cloneDeep(option);

                if (_.get(definition, 'condition.enable_data') > 0 && _.isArray(_.get(definition, 'condition.iterationData'))) {
                  _foreach_option.iterationData = definition.condition.iterationData
                }
                let items = {};

                if (_.trim(_.toLower(definition?.condition?.name)) == '{{$iterationdata}}' && _.isArray(_foreach_option.iterationData)) {
                  items = _.cloneDeep(_foreach_option.iterationData);
                } else {
                  let items = mySandbox.replaceIn(definition?.condition?.name);

                  try {
                    items = JSON5.parse(items);
                  } catch (e) { }
                }

                if (!_.isArray(_foreach_option.iterationData)) {
                  _foreach_option.iterationData = [];
                }

                let _keys = _.keys(items);
                for (let i = 0; i < _.size(_keys); i++) {
                  if (!_.isObject(_foreach_option.iterationData[i])) {
                    _foreach_option.iterationData[i] = {};
                  }

                  let _item = _.get(items, _.isArray(items) ? i : _keys[i]);
                  _.assign(_foreach_option.iterationData[i], {
                    '$key': _keys[i],
                    '$item': _.isString(_item) ? _item : JSON.stringify(_item)
                  })

                  await run(definition.children, _.assign(_foreach_option, { sleep: parseInt(definition.condition.sleep) }), initFlag + 1, i);
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
                while (returnBoolean(mySandbox.replaceIn(definition.condition.var), definition.condition.compare, mySandbox.replaceIn(definition.condition.value), PREV_REQUEST)) {
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

          if (definition.type != 'api' && definition.type != 'sample' && definition.event_id != '0' && scene == 'auto_test') {
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
                    if ((item.type == 'api' || item.type == 'sample') && !_.find(RUNNER_RESULT_LOG, _.matchesProperty('event_id', item.event_id))) {
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

              if (isCliMode()) {
                _.set(_runReport, 'logList', _.values(RUNNER_RESULT_LOG))
              }

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
              if (isCliMode()) {
                const reportTable = new Table({
                  style: { padding: 5, head: [], border: [] },
                });

                // fix bug for 7.1.16
                reportTable.push(
                  [{ content: 'The result of API test', colSpan: 4, hAlign: 'center' }],
                  ['', { content: 'passed', hAlign: 'center' }, { content: 'failed', hAlign: 'center' }, { content: 'ignore', hAlign: 'center' }],
                  [{ content: 'request', hAlign: 'left' }, { content: `${_runReport.http.passed}`, hAlign: 'center' }, { content: `${_runReport.http.failure}`, hAlign: 'center' }, { content: `${_runReport.ignore_count}`, rowSpan: 2, hAlign: 'center', vAlign: 'center' }],
                  [{ content: 'assertion', hAlign: 'left' }, { content: `${_runReport.assert.passed}`, hAlign: 'center' }, { content: `${_runReport.assert.failure}`, hAlign: 'center' }],
                  [{ content: `total number of api: ${_runReport.total_count}, ignore: ${_runReport.ignore_count}`, colSpan: 4, hAlign: 'left' }],
                  [{ content: `total data received: ${_runReport.total_received_data} KB (approx)`, colSpan: 4, hAlign: 'left' }],
                  [{ content: `total response time: ${_runReport.total_response_time} 毫秒, average response time: ${_runReport.average_response_time} 毫秒`, colSpan: 4, hAlign: 'left' }],
                  [{ content: `total run duration: ${_runReport.long_time}`, colSpan: 4, hAlign: 'left' }],
                  [{ content: 'Generated by apipost-cli ( https://github.com/Apipost-Team/apipost-cli )', colSpan: 4, hAlign: 'center' }],
                );

                cliConsole(reportTable.toString());

                let cliCounter = 0;

                if (_.size(_runReport.http_errors) > 0) {
                  const httpFailedTable = new Table({
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

                  // fix bug for 7.1.16
                  httpFailedTable.push(
                    [{ content: '', colSpan: 2 }],
                    [{ content: '#', hAlign: 'center' }, { content: 'failure', hAlign: 'left' }, { content: 'detail', hAlign: 'left' }],
                  ); // fix bug for 7.0.8 bug

                  _.forEach(_runReport.http_errors, (item) => {
                    cliCounter++;
                    httpFailedTable.push(
                      [{ content: '', colSpan: 2 }],
                      [{ content: `${cliCounter}.`, hAlign: 'center' }, { content: '请求错误', hAlign: 'left' }, { content: `${`${_.get(item, 'response.status')}` + '\t' + `${_.get(item, 'request.url')}` + '\n'}${`${_.get(item, 'response.message')}`}`, hAlign: 'left' }],
                    );
                  });

                  cliConsole(httpFailedTable.toString());
                }

                if (_.size(_runReport.assert_errors) > 0) {
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

                  // fix bug for 7.1.16
                  failedTable.push(
                    [{ content: '', colSpan: 2 }],
                    [{ content: '#', hAlign: 'center' }, { content: 'failure', hAlign: 'left' }, { content: 'detail', hAlign: 'left' }],
                  ); // fix bug for 7.0.8 bug

                  _.forEach(_runReport.assert_errors, (item) => {
                    _.forEach(item.assert, (assert) => {
                      cliCounter++;
                      failedTable.push(
                        [{ content: '', colSpan: 2 }],
                        [{ content: `${cliCounter}.`, hAlign: 'center' }, { content: '断言错误', hAlign: 'left' }, { content: `${`${assert.expect}` + '\n'}${`${assert.result}`}`, hAlign: 'left' }],
                      );
                    });
                  });

                  cliConsole(failedTable.toString());
                }
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