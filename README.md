# 🚀 apipost-runtime

apipost-runtime 支持单接口http请求、自动化测试。其支持的选项含义可参考下方的demo注释。

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
            "url": "https://2021.apis.cloud/get.php"
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
    collection: [target1, target2, target3], // 当前流程所需的接口以及父目录集合
    combined_id: 0, // 测试套件ID，单测试用例的话传 0
    test_events: [{
        test_id: 'db5363e4-046a-4ce2-9d6f-89ef0b463026',
        name: '测试计划'
    }], // 测试用例集合，如果是测试套件，此处传数组(单流可以传对象)
    default_report_name: '测试报告',
    user: { // 当前执行的用户信息
        uuid: 'bcad1d6f-7a6c-4a60-a2fc-d59c9ad11d82',
        nick_name: 'Apipost'
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
