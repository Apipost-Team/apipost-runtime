const { Collection, Runtime } = require("../runtime.js"); //数据发送到apipost

let test_events = [
  {
    type: "api",
    data: {
      target_id: "9e35ca65-a0b1-41a4-9054-f9f4b0ba2056",
      parent_id: "0",
      project_id: "2626cf41-5fa4-4780-87ab-4b1c2cecd0ba",
      auto_import_id: "-1",
      mark: "complated",
      target_type: "api",
      example_type: "0",
      name: "自增",
      method: "POST",
      url: "",
      sort: 5,
      type_sort: 1,
      update_day: 1707148800,
      update_dtime: 1707201654,
      status: 1,
      bak_id: 0,
      version: 4,
      is_publish: 0,
      publisher: 0,
      publish_dtime: 0,
      hash: null,
      is_changed: -1,
      create_dtime: 1707191403,
      is_doc: 0,
      sample_group_id: "-1",
      modifier_id: "UL4XWF681351",
      created_uuid: "UL4XWF681351",
      is_example: 0,
      tags: [],
      request: {
        url: "http://cc.apipost.cc:6002/inc",
        description: "",
        auth: {
          type: "noauth",
          kv: {
            key: "",
            value: "",
          },
          bearer: {
            key: "",
          },
          basic: {
            username: "",
            password: "",
          },
          digest: {
            username: "",
            password: "",
            realm: "",
            nonce: "",
            algorithm: "",
            qop: "",
            nc: "",
            cnonce: "",
            opaque: "",
          },
          hawk: {
            authId: "",
            authKey: "",
            algorithm: "",
            user: "",
            nonce: "",
            extraData: "",
            app: "",
            delegation: "",
            timestamp: "",
            includePayloadHash: -1,
          },
          awsv4: {
            accessKey: "",
            secretKey: "",
            region: "",
            service: "",
            sessionToken: "",
            addAuthDataToQuery: -1,
          },
          ntlm: {
            username: "",
            password: "",
            domain: "",
            workstation: "",
            disableRetryRequest: 1,
          },
          edgegrid: {
            accessToken: "",
            clientToken: "",
            clientSecret: "",
            nonce: "",
            timestamp: "",
            baseURi: "",
            headersToSign: "",
          },
          oauth1: {
            consumerKey: "",
            consumerSecret: "",
            signatureMethod: "",
            addEmptyParamsToSign: -1,
            includeBodyHash: -1,
            addParamsToHeader: -1,
            realm: "",
            version: "1.0",
            nonce: "",
            timestamp: "",
            verifier: "",
            callback: "",
            tokenSecret: "",
            token: "",
          },
        },
        body: {
          mode: "none",
          parameter: [],
          raw: "",
          raw_para: [],
          raw_schema: {
            type: "object",
          },
        },
        event: {
          pre_script: "",
          test: "",
        },
        header: {
          parameter: [
            {
              key: "Accept",
              value: "*/*",
              is_checked: 1,
            },
            {
              key: "Accept-Encoding",
              value: "gzip, deflate, br",
              is_checked: 1,
            },
            {
              key: "User-Agent",
              value: "PostmanRuntime-ApipostRuntime/1.1.0",
              is_checked: 1,
            },
            {
              key: "Connection",
              value: "keep-alive",
              is_checked: 1,
            },
          ],
        },
        query: {
          parameter: [],
        },
        cookie: {
          parameter: [],
        },
        resful: {
          parameter: [],
        },
        pre_tasks: [
          {
            type: "database",
            enabled: 1,
            data: {
              connectionId: "93e93a27-eba7-4469-b370-75e75ec65546",
              query: 'select cnt from t_inc where code="test"',
              isConsoleOutput: 1,
              variables: [
                {
                  name: "cnt0",
                  type: "environment",
                  pattern: "$[0].cnt",
                },
              ],
            },
            id: "0d1271f7-d3c3-40ba-bca3-5f6c1ccbe6fb",
          },
        ],
        post_tasks: [
          {
            type: "customScript",
            enabled: 1,
            data: "console.log(response.raw.responseText);",
            id: "0c4330cb-b2db-4acb-9b49-ef694a9a9477",
          },
          {
            type: "database",
            enabled: 1,
            data: {
              connectionId: "93e93a27-eba7-4469-b370-75e75ec65546",
              query: "select * from t_inc where code='test'",
              isConsoleOutput: 1,
              variables: [
                {
                  name: "cnt1",
                  type: "environment",
                  pattern: "$[0].cnt",
                },
              ],
            },
            id: "f8ab805e-2357-43e8-8865-7ae7f5c23c36",
          },
        ],
      },
      ai_expect: {
        list: [],
        none_math_expect_id: "error",
      },
      enable_ai_expect: -1,
      mock_url: "/inc",
      is_first_mock_path: 1,
      enable_server_mock: -1,
      is_locked: -1,
      attribute_info: [],
      server_id: "",
      is_first_match: 1,
    },
  },
];

let option = {
  env: {
    env_id: "225e305cd401000",
    env_name: "新建环境",
    env_pre_url: "",
    env_pre_urls: {
      default: "",
      "225e2fc2a801000": {
        server_id: "225e2fc2a801000",
        server_type: -1,
        name: "1111",
        uri: "http://.www.baidu.com",
      },
      "2268da9bd801000": {
        server_id: "2268da9bd801000",
        server_type: -1,
        name: "2222",
        uri: "http://.www.apipost.cn",
      },
    },
    environment: {
      envAge: "222",
      envName: "111",
    },
  },
  globals: {
    111: '{"value":"22","current_value":"33","description":""}',
  },
  project: {
    request: {
      header: {
        parameter: [
          {
            description: "",
            field_type: "String",
            is_checked: 1,
            key: "",
            value: "",
            not_null: 1,
            sort: 0,
          },
        ],
      },
      query: {
        parameter: null,
      },
      body: {
        parameter: null,
      },
      cookie: {
        parameter: null,
      },
      auth: {
        type: "noauth",
        kv: {
          key: "",
          value: "",
        },
        bearer: {
          key: "",
        },
        basic: {
          username: "",
          password: "",
        },
        digest: {
          username: "",
          password: "",
          realm: "",
          nonce: "",
          algorithm: "",
          qop: "",
          nc: "",
          cnonce: "",
          opaque: "",
        },
        hawk: {
          authId: "",
          authKey: "",
          algorithm: "",
          user: "",
          nonce: "",
          extraData: "",
          app: "",
          delegation: "",
          timestamp: "",
          includePayloadHash: 0,
        },
        awsv4: {
          accessKey: "",
          secretKey: "",
          region: "",
          service: "",
          sessionToken: "",
          addAuthDataToQuery: 0,
        },
        ntlm: {
          username: "",
          password: "",
          domain: "",
          workstation: "",
          disableRetryRequest: 0,
        },
        edgegrid: {
          accessToken: "",
          clientToken: "",
          clientSecret: "",
          nonce: "",
          timestamp: "",
          baseURi: "",
          headersToSign: "",
        },
        oauth1: {
          consumerKey: "",
          consumerSecret: "",
          signatureMethod: "",
          addEmptyParamsToSign: 0,
          includeBodyHash: 0,
          addParamsToHeader: 0,
          realm: "",
          version: "",
          nonce: "",
          timestamp: "",
          verifier: "",
          callback: "",
          tokenSecret: "",
          token: "",
        },
      },
      pre_tasks: [
        {
          id: "26efb4657b9003",
          type: "customScript",
          enabled: 1,
          data: "",
        },
      ],
      post_tasks: [
        {
          id: "26efb4657b9003",
          type: "customScript",
          enabled: 1,
          data: "",
        },
      ],
    },
  },
  cookies: {
    switch: -1,
    data: [],
  },
  collection: [
    {
      target_id: "26d65292bb9000",
      target_type: "api",
      parent_id: "0",
      name: "新建接口",
      version: 143,
      method: "GET",
      url: "www.baidu.com",
      mark_id: "1",
      sort: 58222,
      is_exampled: -1,
      project_id: "1fdaa9bef001000",
      protocol: "http/1.1",
      description: "",
      request: {
        auth: {
          type: "noauth",
          kv: {
            key: "",
            value: "",
          },
          bearer: {
            key: "",
          },
          basic: {
            username: "",
            password: "",
          },
          digest: {
            username: "",
            password: "",
            realm: "",
            nonce: "",
            algorithm: "",
            qop: "",
            nc: "",
            cnonce: "",
            opaque: "",
          },
          hawk: {
            authId: "",
            authKey: "",
            algorithm: "",
            user: "",
            nonce: "",
            extraData: "",
            app: "",
            delegation: "",
            timestamp: "",
            includePayloadHash: 0,
          },
          awsv4: {
            accessKey: "",
            secretKey: "",
            region: "",
            service: "",
            sessionToken: "",
            addAuthDataToQuery: 0,
          },
          ntlm: {
            username: "",
            password: "",
            domain: "",
            workstation: "",
            disableRetryRequest: 0,
          },
          edgegrid: {
            accessToken: "",
            clientToken: "",
            clientSecret: "",
            nonce: "",
            timestamp: "",
            baseURi: "",
            headersToSign: "",
          },
          oauth1: {
            consumerKey: "",
            consumerSecret: "",
            signatureMethod: "",
            addEmptyParamsToSign: 0,
            includeBodyHash: 0,
            addParamsToHeader: 0,
            realm: "",
            version: "",
            nonce: "",
            timestamp: "",
            verifier: "",
            callback: "",
            tokenSecret: "",
            token: "",
          },
        },
        body: {
          mode: "none",
          parameter: [],
          raw: "",
          raw_parameter: [],
          raw_schema: {
            type: "object",
          },
          binary: null,
        },
        pre_tasks: [],
        post_tasks: [],
        header: {
          parameter: [
            {
              param_id: "26d652e5bb9001",
              description: "",
              field_type: "String",
              is_checked: 1,
              key: "",
              not_null: 1,
              value: "",
            },
            {
              description: "",
              field_type: "String",
              is_checked: 1,
              key: "",
              value: "",
              not_null: 1,
              type: "Text",
              static: true,
              param_id: "27de3ac67b9000",
            },
          ],
        },
        query: {
          parameter: [],
        },
        cookie: {
          parameter: [],
        },
        resful: {
          parameter: [],
        },
      },
      response: {
        example: [
          {
            example_id: "1",
            raw: "",
            raw_parameter: [],
            expect: {
              name: "成功",
              isDefault: 1,
              code: "200",
              contentType: "json",
              verifyType: "schema",
              mock: "",
              schema: {},
            },
          },
          {
            example_id: "2",
            raw: "",
            raw_parameter: [],
            expect: {
              name: "失败",
              isDefault: -1,
              code: "404",
              contentType: "json",
              verifyType: "schema",
              mock: "",
              schema: {},
            },
          },
        ],
        is_check_result: 1,
      },
      ai_expect_enable: -1,
      ai_expect: {
        list: [],
        none_math_expect_id: "error",
      },
      mock_server_enable: -1,
      mock_url: "",
      attribute_info: {},
      tags: [],
      created_at: "2024-02-21T16:15:48+08:00",
      created_user: {
        uid: "1fdaa9bed001000",
        nick_name: "Lemon",
        portrait:
          "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-6.png",
      },
      updated_at: "2024-02-21T16:15:48+08:00",
      updated_user: {
        uid: "1fdaa9bed001000",
        nick_name: "Lemon",
        portrait:
          "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-6.png",
      },
      status: 1,
      is_locked: -1,
    },
  ],
  system_configs: {
    send_timeout: 10000,
    auto_redirect: -1,
    max_redirect_time: 5,
    auto_gen_mock_url: 1,
    request_param_auto_json: -1,
    proxy: {
      type: 2,
      envfirst: -1,
      bypass: [],
      protocols: ["http"],
      auth: {
        authenticate: -1,
        host: "",
        username: "",
        password: "",
      },
    },
    ca_cert: {
      open: -1,
      path: "",
      base64: "",
    },
    client_cert: {},
  },
  database_configs: {
    "93e93a27-eba7-4469-b370-75e75ec65546": {
      type: "mysql",
      dbconfig: {
        host: "10.10.10.17",
        port: 3306,
        user: "root",
        password: "123456",
        database: "test",
      },
      ssh: { enable: 0, host: "", port: 3306, username: "" },
    },
  },
  scene: "http_request",
};

test("http test", async () => {
  let last_msg = {};
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
  let msg = await myRuntime.run(myCollection.definition, option); //通过callback返回
  expect(msg).toBe("");
  expect(last_msg.action).toBe("http_complete");
});
