// 定义一些脚本逻辑处理需要的一些函数
const _ = require('lodash'),
  { isCliMode } = require('../utils');

// 定义发送断言结果函数
const emitAssertResult = function (RUNNER_RESULT_LOG, RUNNER_ERROR_COUNT, status, expect, result, scope, cliConsole) {
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

      if (status === 'success') {
        if (item.assertErrorStatus < 0) {
          item.assertErrorStatus = 0; //标记为有断言，断言成功,只要断言失败过，就不再标记为成功
        }
        if (isCliMode()) {
          cliConsole(`${'\t✓'.green} ${expect} 匹配`);
        }
      } else {
        if (item.assertErrorStatus < 1) {
          item.assertErrorStatus = 1; //标记为有断言，断言失败，失败过后不再重复标记
        }
        RUNNER_ERROR_COUNT++;

        if (isCliMode()) {
          cliConsole(`\t${RUNNER_ERROR_COUNT}. ${expect} ${result}`);
        }
      }
    }
  }
};

// 定义脚本错误处理函数
const emitTargetPara = function (RUNNER_RESULT_LOG, data, scope) {
  if (typeof scope !== 'undefined' && _.isObject(scope)) {
    // 更新日志
    if (_.isObject(RUNNER_RESULT_LOG)) {
      const item = RUNNER_RESULT_LOG[scope.iteration_id];

      if (item) {
        switch (data.action) {
          case 'SCRIPT_ERROR':
            if (item.type == 'api' || item.type == 'sample') {
              _.set(item, `script_error.${data.eventName}`, data.data);
            }
            break;
        }
      }
    }
  }
};

// 定义发送可视化结果函数
const emitVisualizerHtml = function (RUNNER_RESULT_LOG, status, html, scope) {
  if (typeof scope !== 'undefined' && _.isObject(scope)) {
    if (_.isObject(RUNNER_RESULT_LOG)) {
      const item = RUNNER_RESULT_LOG[scope.iteration_id];

      if (item) {
        item.visualizer_html = { status, html };
      }
    }
  }
};
module.exports = {
  emitAssertResult,
  emitTargetPara,
  emitVisualizerHtml,
};
