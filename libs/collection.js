// 对要发送的数据进行最终处理。使其变成标准的自动化测试 JSON 格式
const _ = require('lodash'),
  uuid = require('uuid'),
  Collection = function ApipostCollection(definition, option = { iterationCount: 1, sleep: 0 }) {
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
            target_id: ['request', 'api', 'sample'].indexOf(item.type) > -1 ? item.data.target_id : '',
            condition: ['request', 'api', 'sample'].indexOf(item.type) > -1 ? {} : item.data,
            request: ['request', 'api', 'sample'].indexOf(item.type) > -1 ? item.data : {},
            info: ['request', 'api', 'sample'].indexOf(item.type) > -1 ? {
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


module.exports = Collection;
