// 实现 pm.request.body
const _ = require('lodash');

const pmRequestBody = function (scope, pm) {
    let _body = {};

    switch (scope.script_request?.mode) {
        case 'none':
            _body = {};
            break;
        case 'urlencoded':
            let _urlencoded = [];
            _.forEach(scope.script_request?.request_bodys, function (value, key) {
                _urlencoded.push({
                    key: key,
                    value: value,
                    type: "text"
                })
            });

            _body = {
                mode: 'urlencoded',
                urlencoded: _urlencoded
            };
            break;
        case 'form-data':
            let _formdata = [];
            _.forEach(scope.script_request?.request_bodys, function (value, key) {
                _formdata.push({
                    key: key,
                    value: value,
                    type: "text"
                })
            });

            _body = {
                mode: 'formdata',
                formdata: _formdata
            };
            break;
        default:
            _body = {
                mode: 'raw',
                raw: scope.script_request?.request_bodys
            };
            break;
    }

    return _body;
};

module.exports = pmRequestBody;
