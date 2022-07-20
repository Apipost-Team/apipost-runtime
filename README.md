# 🚀 apipost-runtime

Apipost 运行时支持许多选项，可以针对不同的环境和用例自定义其行为。

## Install

```
$ npm install apipost-runtime
```

##  Usage

```
let iterationData = [
    {
        "email": "1234@qq.com",
        "password": "1234",
        "age": 12
    },
    {
        "email": "1234@qq.com",
        "password": "1234",
        "age": 11
    },
    {
        "email": "1234@qq.com",
        "password": "1234",
        "age": 36
    }
];

let myCollection = new Collection([
    {
        "test_id": "9a017559-967a-4235-898c-5541ffeb7659",
        "event_id": "91e55b90-b79c-43dd-aecd-7c9294cd5b37",
        "type": "api",
        "data": {
            "parent_id": "90de3444-250a-4808-a37f-6715b6add4b1",
            "target_id": "dee9ecb8-b062-4bb2-a694-5edb1c1eaaed",
            "method": "GET",
            "url": "https://2021.apis.cloud/get.php",
            "request": {
                "url": "https://postman-echo.com/get?id=1&id=2",
                "auth": {
                    "type": "oauth1",
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
                        "username": "postman",
                        "password": "password",
                        "realm": "",
                        "nonce": "",
                        "algorithm": "MD5",
                        "qop": "auth",
                        "nc": "",
                        "cnonce": "",
                        "opaque": ""
                    },
                    "hawk": {
                        "authKey": "",
                        "authId": "dh37fgj492je",
                        "algorithm": "sha256",
                        "includePayloadHash": false,
                        "timestamp": "",
                        "delegation": "",
                        "app": "",
                        "extraData": "",
                        "nonce": "os2dz0",
                        "user": ""
                    },
                    "awsv4": {
                        "accessKey": "AKIAZPK2ZPOZLIUQCV6F",
                        "secretKey": "",
                        "region": "us-east-1",
                        "addAuthDataToQuery": false,
                        "service": "iam",
                        "sessionToken": ""
                    },
                    "edgegrid": {
                        "accessToken": "akab-lkxoduyw3innhwva-tomybuxob4awownj",
                        "clientToken": "akab-pag7jtgys2mdjbk5-bdpxciquqc7iesyc",
                        "clientSecret": "",
                        "nonce": "444",
                        "timestamp": "",
                        "baseURi": "",
                        "headersToSign": ""
                    },
                    "ntlm": {
                        "disableRetryRequest": true,
                        "workstation": "",
                        "domain": "",
                        "username": "Joerg.beck@inosoft-lab.com",
                        "password": ""
                    },
                    "ntlm_close": {
                        "type2msg": ""
                    },
                    "oauth1": {
                        "consumerKey": "RKCGzna7bv9YD57c",
                        "consumerSecret": "",
                        "signatureMethod": "HMAC-SHA1",
                        "addEmptyParamsToSign": false,
                        "includeBodyHash": false,
                        "addParamsToHeader": false,
                        "realm": "",
                        "version": "1.0",
                        "nonce": "{{age}}",
                        "timestamp": "",
                        "verifier": "",
                        "callback": "",
                        "tokenSecret": "",
                        "token": ""
                    }
                },
                "body": {
                    "mode": "none",
                    "parameter": [
                        {
                            "is_checked": "1",
                            "type": "Text",
                            "key": "page[]",
                            "value": 1,
                            "not_null": "1",
                            "description": "",
                            "field_type": "Integer"
                        }
                    ],
                    "raw": "chinaman1"
                },
                "header": {
                    "parameter": [
                        {
                            "is_checked": "1",
                            "type": "Text",
                            "key": "content-type",
                            "value": "1111111",
                            "not_null": "1",
                            "description": "",
                            "field_type": "Text"
                        }
                    ]
                },
                "query": {
                    "parameter": [
                        {
                            "is_checked": "1",
                            "type": "Text",
                            "key": "utm_source",
                            "value": "",
                            "not_null": "1",
                            "description": "",
                            "field_type": "Text"
                        }
                    ]
                },
                "event": {
                    "pre_script": "",
                    "test": ""
                }
            }
        },
        "children": []
    }
], { iterationCount: 4 });
let myRuntime = new Runtime();

myRuntime.run(myCollection.definition, {
    project: {
        request: {
            "header": [
                {
                    "is_checked": "1",
                    "type": "Text",
                    "key": "global-header",
                    "value": "{{age}}",
                    "description": ""
                }
            ],
            "query": [
                {
                    "is_checked": "1",
                    "type": "Text",
                    "key": "",
                    "value": "",
                    "description": ""
                }
            ],
            "body": [
                {
                    "is_checked": "1",
                    "type": "Text",
                    "key": "",
                    "value": "",
                    "description": ""
                }
            ],
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
                }
            }
        },
        "script": {
            "pre_script_switch": true,
            "test_switch": true,
            "pre_script": `pm.globals.set("age", '12');`,
            "test": `//apt.assert('response.raw.responseText==\"test\"');`
        }
    }, // 全局参数
    collection: [target1, target2, target3], // 当前项目的所有接口列表
    combined_id: uuid.v4(), // 测试套件ID，单测试用例的话传 0
    test_events: [{
        test_id: 'aaaa-aaaa-aaaa-aaaa',
        name: '测试计划2'
    }], // 测试用例集合，如果是测试套件，此处传数组(单流可以传对象)
    default_report_name: '测试报告',
    user: { // 当前执行的用户信息
        uuid: 'xxx',
        nick_name: 'jim'
    },
    env_name: '默认环境', // 当前环境名称
    env_pre_url: 'http://echo.apipost.cn', // 当前环境URL前缀
    environment: {
        "title": "我是标题"
    }, // 当前环境变量
    globals: {
        "address": "我是地址"
    }, // 当前公共变量
    sleep: 0, // 间隔时间
    iterationData: iterationData, // 当前迭代的excel导入数据
    iterationCount: 4, // 当前迭代次数
});
```
