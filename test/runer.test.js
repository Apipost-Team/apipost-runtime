const { Collection, Runtime } = require("../runtime.js"); //数据发送到apipost

let test_events =   [
  {
    "data": {
      "url": "https://www.jd.com",
      "name": "新建接口-0",
      "method": "POST",
      "parent_id": "0",
      "target_id": "a99a948bd8004"
    },
    "sort": 1,
    "type": "api",
    "autoSync": false,
    "apiData": {
      "created_at": "2024-03-20T10:54:47+08:00",
      "project_id": "22abea409c01000",
      "url": "https://www.jd.com",
      "parent_id": "0",
      "protocol": "http/1.1",
      "response": {
        "example": [
          {
            "expect": {
              "is_default": 1,
              "verify_type": "schema",
              "content_type": "json",
              "code": "200",
              "mock": "",
              "name": "成功",
              "schema": {
                "type": "object",
                "properties": {}
              }
            },
            "example_id": "1",
            "raw_parameter": [],
            "raw": ""
          },
          {
            "raw_parameter": [],
            "raw": "",
            "expect": {
              "code": "404",
              "mock": "",
              "name": "失败",
              "schema": {
                "type": "object",
                "properties": {}
              },
              "is_default": -1,
              "verify_type": "schema",
              "content_type": "json"
            },
            "example_id": "2"
          }
        ],
        "is_check_result": 1
      },
      "target_id": "a99a948bd8004",
      "updated_at": "2024-03-26T13:52:00+08:00",
      "description": "",
      "target_type": "api",
      "sort": 15500,
      "status": 1,
      "version": 148,
      "is_locked": -1,
      "created_user": {
        "uid": "22abea408001000",
        "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-7.png",
        "nick_name": "富国"
      },
      "updated_user": {
        "uid": "22abea408001000",
        "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-7.png",
        "nick_name": "富国"
      },
      "attribute_info": {},
      "name": "新建接口-0",
      "mark_id": "1",
      "request": {
        "pre_tasks": [],
        "post_tasks": [
          {
            "type": "customScript",
            "enabled": 1,
            "id": "df1c551bd8002",
            "data": "apt.test(\"Status code is 200\", () => {\n    apt.expect(apt.response.code).to.eql(200);\n});",
            "name": "自定义脚本"
          }
        ],
        "auth": {
          "kv": {
            "key": "",
            "value": ""
          },
          "hawk": {
            "authKey": "",
            "timestamp": "",
            "delegation": "",
            "includePayloadHash": 0,
            "app": "",
            "user": "",
            "authId": "",
            "nonce": "",
            "algorithm": "",
            "extraData": ""
          },
          "bearer": {
            "key": ""
          },
          "digest": {
            "opaque": "",
            "password": "",
            "username": "",
            "algorithm": "",
            "nc": "",
            "qop": "",
            "nonce": "",
            "cnonce": "",
            "realm": ""
          },
          "edgegrid": {
            "headersToSign": "",
            "nonce": "",
            "baseURi": "",
            "timestamp": "",
            "accessToken": "",
            "clientToken": "",
            "clientSecret": ""
          },
          "ntlm": {
            "domain": "",
            "password": "",
            "username": "",
            "workstation": "",
            "disableRetryRequest": 0
          },
          "type": "noauth",
          "awsv4": {
            "region": "",
            "service": "",
            "accessKey": "",
            "secretKey": "",
            "sessionToken": "",
            "addAuthDataToQuery": 0
          },
          "basic": {
            "password": "",
            "username": ""
          },
          "oauth1": {
            "includeBodyHash": 0,
            "addParamsToHeader": 0,
            "version": "",
            "callback": "",
            "verifier": "",
            "addEmptyParamsToSign": 0,
            "nonce": "",
            "realm": "",
            "consumerSecret": "",
            "token": "",
            "timestamp": "",
            "consumerKey": "",
            "tokenSecret": "",
            "signatureMethod": ""
          }
        },
        "body": {
          "raw": "",
          "mode": "none",
          "parameter": [],
          "raw_schema": {
            "type": "object",
            "properties": null
          },
          "raw_parameter": []
        },
        "query": {
          "parameter": []
        },
        "cookie": {
          "parameter": []
        },
        "header": {
          "parameter": [
            {
              "param_id": "a99a9663d8005",
              "field_type": "String",
              "is_checked": 1,
              "description": "",
              "key": "",
              "value": "",
              "not_null": 1
            }
          ]
        },
        "restful": {
          "parameter": []
        }
      },
      "tags": [],
      "method": "POST"
    },
    "enabled": 1,
    "test_id": "12a0b455f82000",
    "event_id": "12a0bf24382001",
    "project_id": "22abea409c01000",
    "parent_event_id": "0"
  },
  {
    "project_id": "22abea409c01000",
    "parent_event_id": "0",
    "data": {
      "var": "{{zhaofuguo}}",
      "value": "1233",
      "compare": "eq"
    },
    "sort": 2,
    "type": "if",
    "enabled": 1,
    "test_id": "12a0b455f82000",
    "event_id": "12a0c3eeb82002",
    "children": [
      {
        "sort": 3,
        "type": "wait",
        "enabled": 1,
        "test_id": "12a0b455f82000",
        "event_id": "12a0d23bb82003",
        "project_id": "22abea409c01000",
        "parent_event_id": "12a0c3eeb82002",
        "data": {
          "sleep": "2000"
        }
      }
    ]
  },
  {
    "type": "loop",
    "enabled": 1,
    "test_id": "12a0b455f82000",
    "event_id": "12a11ee5b82010",
    "project_id": "22abea409c01000",
    "parent_event_id": "0",
    "data": {
      "loop_data_type": 1,
      "loop_traverse_data": {
        "name": "",
        "type": 1,
        "content_list": [
          {
            "value": "type",
            "name": "name1"
          },
          {
            "name": "name2",
            "value": "phone"
          },
          {
            "name": "name3",
            "value": "password"
          }
        ]
      },
      "loop_iteration_data": "12a0fac3f82007",
      "name": "Foreach循环",
      "loop_type": 1,
      "loop_sleep": 1000
    },
    "sort": 4
  },
  {
    "sort": 5,
    "type": "loop",
    "enabled": 1,
    "test_id": "12a0b455f82000",
    "event_id": "12a18541b82000",
    "project_id": "22abea409c01000",
    "parent_event_id": "0",
    "data": {
      "loop_sleep": 1000,
      "loop_extract": {
        "var": 5
      },
      "loop_data_type": 2,
      "loop_traverse_data": {
        "name": "",
        "type": 1,
        "content_list": [
          {
            "value": "",
            "name": ""
          }
        ]
      },
      "loop_iteration_data": "https://www.jd.com",
      "name": "For循环",
      "loop_type": 2,
      "loop_count": 1
    }
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "loop",
    "data": {
      "loop_type": 3,
      "loop_sleep": 1000,
      "loop_data_type": 3,
      "loop_condition": {
        "var": "{{zhaofuguo}}",
        "compare": "eq",
        "value": "1233"
      },
      "loop_timeout": 1000,
      "loop_variable": "{{$telephone}}",
      "loop_traverse_data": {
        "type": 1,
        "content_list": [
          {
            "name": "",
            "value": "",
            "static": true
          }
        ],
        "name": ""
      },
      "name": "while循环"
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1bc07782000",
    "sort": 6
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "wait",
    "data": {
      "sleep": "1000"
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1cba2782001",
    "sort": 7
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "script",
    "data": {
      "name": "脚本",
      "content": "apt.environment.set(\"key\", \"value\");"
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1d23c382002",
    "sort": 8
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "assert",
    "data": {
      "name": "全局断言",
      "content": "apt.test(\"Status code is 200\", () => {\n      apt.expect(apt.response.code).to.eql(200);\n    });"
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1d5dab82003",
    "sort": 9
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "begin",
    "data": {
      "name": "",
      "generate": -1,
      "includeTime": -1,
      "enable_data": -1,
      "iterationData": []
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1d97f382004",
    "sort": 10
  },
  {
    "parent_event_id": "0",
    "enabled": 1,
    "type": "case",
    "data": {
      "testing_id": "127fc7af782001"
    },
    "project_id": "22abea409c01000",
    "test_id": "12a0b455f82000",
    "event_id": "12a1f0fd382005",
    "sort": 11
  }
];



let option = {
  "ignore_error": -1,
  "enable_sandbox": -1,
  "project": {
    "request": {
      "auth": {
        "type": "noauth",
        "kv": {
          "key": "",
          "value": ""
        },
        "bearer": {
          "key": ""
        },
        "basic": {
          "username": "",
          "password": ""
        },
        "digest": {
          "username": "",
          "password": "",
          "realm": "",
          "nonce": "",
          "algorithm": "",
          "qop": "",
          "nc": "",
          "cnonce": "",
          "opaque": ""
        },
        "hawk": {
          "authId": "",
          "authKey": "",
          "algorithm": "",
          "user": "",
          "nonce": "",
          "extraData": "",
          "app": "",
          "delegation": "",
          "timestamp": "",
          "includePayloadHash": 0
        },
        "awsv4": {
          "accessKey": "",
          "secretKey": "",
          "region": "",
          "service": "",
          "sessionToken": "",
          "addAuthDataToQuery": 0
        },
        "ntlm": {
          "username": "",
          "password": "",
          "domain": "",
          "workstation": "",
          "disableRetryRequest": 0
        },
        "edgegrid": {
          "accessToken": "",
          "clientToken": "",
          "clientSecret": "",
          "nonce": "",
          "timestamp": "",
          "baseURi": "",
          "headersToSign": ""
        },
        "oauth1": {
          "consumerKey": "",
          "consumerSecret": "",
          "signatureMethod": "",
          "addEmptyParamsToSign": 0,
          "includeBodyHash": 0,
          "addParamsToHeader": 0,
          "realm": "",
          "version": "",
          "nonce": "",
          "timestamp": "",
          "verifier": "",
          "callback": "",
          "tokenSecret": "",
          "token": ""
        }
      },
      "header": [
        {
          "param_id": "241e223f8401000",
          "description": "认证令牌",
          "field_type": "String",
          "is_checked": 1,
          "key": "token",
          "value": "111",
          "not_null": 1,
          "sort": 0
        },
        {
          "param_id": "241e223f8401001",
          "description": "",
          "field_type": "String",
          "is_checked": 1,
          "key": "",
          "value": "",
          "not_null": 1,
          "sort": 0
        },
        {
          "param_id": "241e26fa8801000",
          "description": "认证令牌",
          "field_type": "String",
          "is_checked": 1,
          "key": "token",
          "value": "111",
          "not_null": 1,
          "sort": 0
        },
        {
          "param_id": "241e26fa8801001",
          "description": "",
          "field_type": "String",
          "is_checked": 1,
          "key": "aaa",
          "value": "222",
          "not_null": 1,
          "sort": 0
        },
        {
          "param_id": "241e26fa8801002",
          "description": "",
          "field_type": "String",
          "is_checked": 1,
          "key": "",
          "value": "",
          "not_null": 1,
          "sort": 0
        },
        {
          "param_id": "244787d7b801000",
          "description": "",
          "field_type": "String",
          "is_checked": 1,
          "key": "",
          "value": "",
          "not_null": 1,
          "sort": 0
        }
      ],
      "body": [],
      "query": []
    },
    "script": {
      "pre_script_switch": true,
      "test_switch": true,
      "pre_script": "",
      "test": ""
    }
  },
  "cookies": {
    "data": [],
    "switch": 1
  },
  "combined_id": "0",
  "user": {
    "uid": "22abea408001000",
    "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-7.png",
    "nick_name": "富国",
    "email": "fuguo@apipost.cn",
    "email_verify": -1,
    "mobile": "",
    "had_password": 1,
    "had_openid": 1,
    "created_at": "2024-02-24T17:04:33+08:00",
    "ch_email_count": 2,
    "identity": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjp7InVzZXJfaWQiOjE1NjE0Njc0ODgxNTgzOTIzMiwidGltZSI6MTcxMTQ0MjIxMH19.mVHp9njimgYXrs0nqe-RFKllKKS1L3vyOdfXzdYs46U"
  },
  "scene": "auto_test",
  "env_id": "22d7d3667401000",
  "default_report_name": "新建用例测试报告",
  "env": {
    "env_id": "22d7d3667401000",
    "env_name": "FG-测试环境",
    "env_pre_url": "",
    "env_pre_urls": {}
  },
  "environment": {
    "zhaofuguo": "1233"
  },
  "iterates_data_id": "0",
  "iterationData": [],
  "iterationCount": 1,
  "sleep": 0,
  "requester": {
    "timeout": 10000,
    "followRedirect": -1,
    "maxrequstloop": 5,
    "AUTO_CONVERT_FIELD_2_MOCK": 1,
    "REQUEST_PARAM_AUTO_JSON": -1
  },
  "connectionConfigs": {},
  "collection": [
    {
      "target_id": "a99a948bd8004",
      "project_id": "22abea409c01000",
      "parent_id": "0",
      "target_type": "api",
      "name": "新建接口-0",
      "version": 148,
      "sort": 15500,
      "method": "POST",
      "url": "https://www.jd.com",
      "protocol": "http/1.1",
      "mark_id": "1",
      "description": "",
      "request": {
        "auth": {
          "type": "noauth",
          "kv": {
            "key": "",
            "value": ""
          },
          "bearer": {
            "key": ""
          },
          "basic": {
            "username": "",
            "password": ""
          },
          "digest": {
            "username": "",
            "password": "",
            "realm": "",
            "nonce": "",
            "algorithm": "",
            "qop": "",
            "nc": "",
            "cnonce": "",
            "opaque": ""
          },
          "hawk": {
            "authId": "",
            "authKey": "",
            "algorithm": "",
            "user": "",
            "nonce": "",
            "extraData": "",
            "app": "",
            "delegation": "",
            "timestamp": "",
            "includePayloadHash": 0
          },
          "awsv4": {
            "accessKey": "",
            "secretKey": "",
            "region": "",
            "service": "",
            "sessionToken": "",
            "addAuthDataToQuery": 0
          },
          "ntlm": {
            "username": "",
            "password": "",
            "domain": "",
            "workstation": "",
            "disableRetryRequest": 0
          },
          "edgegrid": {
            "accessToken": "",
            "clientToken": "",
            "clientSecret": "",
            "nonce": "",
            "timestamp": "",
            "baseURi": "",
            "headersToSign": ""
          },
          "oauth1": {
            "consumerKey": "",
            "consumerSecret": "",
            "signatureMethod": "",
            "addEmptyParamsToSign": 0,
            "includeBodyHash": 0,
            "addParamsToHeader": 0,
            "realm": "",
            "version": "",
            "nonce": "",
            "timestamp": "",
            "verifier": "",
            "callback": "",
            "tokenSecret": "",
            "token": ""
          }
        },
        "body": {
          "mode": "none",
          "parameter": [],
          "raw": "",
          "raw_parameter": [],
          "raw_schema": {
            "type": "object",
            "properties": null
          }
        },
        "pre_tasks": [],
        "post_tasks": [
          {
            "type": "customScript",
            "enabled": 1,
            "data": "apt.test(\"Status code is 200\", () => {\n    apt.expect(apt.response.code).to.eql(200);\n});",
            "name": "自定义脚本",
            "id": "df1c551bd8002"
          }
        ],
        "header": {
          "parameter": [
            {
              "param_id": "a99a9663d8005",
              "description": "",
              "field_type": "String",
              "is_checked": 1,
              "key": "",
              "not_null": 1,
              "value": ""
            }
          ]
        },
        "query": {
          "parameter": []
        },
        "cookie": {
          "parameter": []
        },
        "restful": {
          "parameter": []
        }
      },
      "response": {
        "example": [
          {
            "example_id": "1",
            "raw": "",
            "raw_parameter": [],
            "expect": {
              "name": "成功",
              "is_default": 1,
              "code": "200",
              "content_type": "json",
              "verify_type": "schema",
              "mock": "",
              "schema": {
                "type": "object",
                "properties": {}
              }
            }
          },
          {
            "example_id": "2",
            "raw": "",
            "raw_parameter": [],
            "expect": {
              "name": "失败",
              "is_default": -1,
              "code": "404",
              "content_type": "json",
              "verify_type": "schema",
              "mock": "",
              "schema": {
                "type": "object",
                "properties": {}
              }
            }
          }
        ],
        "is_check_result": 1
      },
      "attribute_info": {},
      "tags": [],
      "created_at": "2024-03-20T10:54:47+08:00",
      "created_user": {
        "uid": "22abea408001000",
        "nick_name": "富国",
        "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-7.png"
      },
      "updated_at": "2024-03-26T13:52:00+08:00",
      "updated_user": {
        "uid": "22abea408001000",
        "nick_name": "富国",
        "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-7.png"
      },
      "status": 1,
      "is_locked": -1
    }
  ],
  "globals": {},
  "test_events": {
    "test_id": "12a0b455f82000",
    "name": "新建用例"
  },
  "proxy": {
    "type": 2,
    "envfirst": 1,
    "auth": {
      "authenticate": true,
      "host": "80",
      "username": "",
      "password": ""
    }
  },
  "ca_cert": {
    "open": -1,
    "path": ""
  },
  "client_cert": {}
};


test('runner test', async() => {

    let last_msg = {}
    const emitRuntimeEvent = async function (msg) {
      console.log(msg);
      last_msg = msg;
    };

    //单任务
    const myCollection = new Collection(test_events, {
      iterationCount: option.iterationCount,
      sleep: option.sleep,
    });

    const myRuntime = new Runtime(emitRuntimeEvent, false);
    await myRuntime.run(myCollection.definition, option); //通过callback返回
    expect(last_msg.action).toBe("complete");
 })