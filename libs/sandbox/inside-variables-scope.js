// apipost 内置变量 如：{{$randomSportsImage}}等
const _ = require('lodash'),
  Mock = require('apipost-mock'),
  { dynamicGenerators } = require('../constants/faker');
// for 7.2.2
const insideVariablesScopeInit = function (insideVariablesScope) {
    /**
     *  拓展mockjs， 定义一些内置 mock
     *  fix bug for 7.0.8
     */
  const _mockjsRandomExtend = {};

    // 重写 string
  _mockjsRandomExtend.string = function (pool, start, end) {
    let charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    if (typeof pool === 'string') {
      charSet = Mock.mock(pool);
    }

    if (typeof pool === 'string') {
      pool = Mock.mock(pool);
      try {
        if (!_.isNaN(Number(start))) {
          if (_.isNaN(Number(end)) === false) {
            return _.sampleSize(pool, _.random(start, end)).join('');
          }
          return _.sampleSize(pool, start).join('');
        }
      } catch (ex) { }
      return _.sample(pool);
    }

    if (typeof pool === 'number') {
      if (typeof start === 'number') {
        return _.sampleSize(charSet, _.random(pool, start)).join('');
      }
      return _.sampleSize(charSet, pool).join('');
    }
  };

  new Array('telephone', 'phone', 'mobile').forEach((func) => {
    _mockjsRandomExtend[func] = function () {
      return this.pick(['131', '132', '137', '188']) + Mock.mock(/\d{8}/);
    };
  });
  new Array('username', 'user_name', 'nickname', 'nick_name').forEach((func) => {
    _mockjsRandomExtend[func] = function () {
      return Mock.mock('@cname');
    };
  });
  new Array('avatar', 'icon', 'img', 'photo', 'pic').forEach((func) => {
    _mockjsRandomExtend[func] = function () {
      return Mock.mock('@image(\'400x400\')');
    };
  });

  new Array('description').forEach((func) => {
    _mockjsRandomExtend[func] = function () {
      return Mock.mock('@cparagraph');
    };
  });

  new Array('id', 'userid', 'user_id', 'articleid', 'article_id').forEach((func) => {
    _mockjsRandomExtend[func] = function () {
      return Mock.mock('@integer(100, 1000)');
    };
  });

  Mock.Random.extend(_mockjsRandomExtend);

    // 拓展兼容 Postman 的内置变量 for 7.2.0
  _.forEach(dynamicGenerators, (item, key) => {
    if (typeof item.generator === 'function') {
      insideVariablesScope.list[key] = (function () {
        try {
          return item.generator();
        } catch (e) {
          return '';
        }
      }());
    }
  });

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
};

module.exports = insideVariablesScopeInit;
