const { Collection, Runtime } = require("../runtime.js"); //数据发送到apipost

let test_events =  [
    {
      "event_id": "f236d5de-c339-45ee-8939-0a4d26b03119",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 1,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "8e84754e-3a06-4e75-94d0-cb947d5628ed",
        "name": "登录功能",
        "method": "POST",
        "url": "https://demo-api.apipost.cn/api/demo/login"
      },
      "parent_id": "0"
    },
    {
      "event_id": "cb21909d-ca08-47dd-a1f1-91c31f1bf09e",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 1,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "8e84754e-3a06-4e75-94d0-cb947d5628ed",
        "name": "登录功能",
        "method": "POST",
        "url": "https://demo-api.apipost.cn/api/demo/login"
      },
      "parent_id": "b7173423-b3c9-4737-befe-80c59c363253"
    },
    {
      "event_id": "16254c62-096e-4ff4-a7bd-5ea78a2dae09",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 2,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "72093bb7-7639-4be4-9f56-d45eb299249c",
        "name": "新闻列表",
        "method": "GET",
        "url": "https://demo-api.apipost.cn/api/demo/news_list?mobile=18289454846&theme_news=国际新闻&page=1&pageSize=20"
      },
      "parent_id": "0"
    },
    {
      "event_id": "6995d1f2-de49-4f1c-a220-2c5aa9ee34b0",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 2,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "72093bb7-7639-4be4-9f56-d45eb299249c",
        "name": "新闻列表",
        "method": "GET",
        "url": "https://demo-api.apipost.cn/api/demo/news_list?mobile=18289454846&theme_news=国际新闻&page=1&pageSize=20"
      },
      "parent_id": "b7173423-b3c9-4737-befe-80c59c363253"
    },
    {
      "event_id": "f6d952fd-dcb5-4e0f-9a87-0571ca69fc4e",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 3,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "b4bf1584-1b33-43ce-b6b7-4e108cff8494",
        "name": "收藏新闻",
        "method": "POST",
        "url": "https://demo-api.apipost.cn/api/demo/collect_news"
      },
      "parent_id": "0"
    },
    {
      "event_id": "4393e0b0-fc34-45ce-8af0-04880aab24e1",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "api",
      "enabled": 1,
      "sort": 4,
      "data": {
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "target_id": "e6bdb890-d12e-4cfa-9e6f-a3a2868c2c9f",
        "name": "删除评论",
        "method": "DELETE",
        "url": "https://demo-api.apipost.cn/api/demo/delete_comment"
      },
      "parent_id": "0"
    },
    {
      "event_id": "8554c5b4-247f-4117-b8bc-7f89a2eefad6",
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "type": "wait",
      "enabled": 1,
      "sort": 5,
      "data": {
        "sleep": "1000"
      },
      "parent_id": "0"
    }
  ];

let option = {
    "ignore_error": -1,
    "enable_sandbox": -1,
    "project": {
      "request": {
        "header": [
          {
            "is_checked": "1",
            "type": "Text",
            "key": "",
            "value": "",
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
        "pre_script": "",
        "test": ""
      }
    },
    "cookies": {
      "data": [],
      "switch": -1
    },
    "combined_id": "0",
    "user": {
      "role": 2,
      "nick_name": "FuGuo",
      "email": "deronendless@163.com",
      "portrait": "https://img.cdn.apipost.cn/user/default_profile_photo/Vector-8.png",
      "is_manager": 1,
      "uuid": "UZ83D42D160F",
      "is_super_admin": 1,
      "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
      "id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7/UZ83D42D160F"
    },
    "env_id": "-1",
    "scene": "auto_test",
    "env": {
      "env_id": "-1",
      "env_name": "默认环境",
      "env_pre_url": "",
      "env_pre_urls": null
    },
    "environment": {},
    "iterates_data_id": null,
    "iterationData": [],
    "iterationCount": 2,
    "sleep": 0,
    "requester": {
      "timeout": 0,
      "followRedirect": 1,
      "maxrequstloop": 5,
      "AUTO_CONVERT_FIELD_2_MOCK": 1,
      "REQUEST_PARAM_AUTO_JSON": -1,
      "proxy": {
        "type": -1,
        "envfirst": -1,
        "bypass": [],
        "protocols": [
          "https"
        ],
        "auth": {
          "authenticate": -1,
          "host": "",
          "username": "",
          "password": ""
        }
      },
      "ca_cert": {
        "open": -1,
        "path": "",
        "base64": ""
      },
      "client_cert": {}
    },
    "collection": [
      {
        "target_id": "8e84754e-3a06-4e75-94d0-cb947d5628ed",
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
        "auto_import_id": "-1",
        "mark": "developing",
        "target_type": "api",
        "example_type": "0",
        "name": "登录功能",
        "method": "POST",
        "url": "",
        "sort": 0,
        "type_sort": 1,
        "update_day": 1708531200000,
        "update_dtime": 1708607676,
        "status": 1,
        "bak_id": 0,
        "version": 4,
        "is_publish": 0,
        "publisher": 0,
        "publish_dtime": 0,
        "hash": "",
        "is_changed": -1,
        "create_dtime": 1702975215,
        "is_doc": 0,
        "sample_group_id": "-1",
        "modifier_id": "UZ83D42D160F",
        "created_uuid": "UZ83D42D160F",
        "is_example": 0,
        "tags": [],
        "request": {
          "url": "https://demo-api.apipost.cn/api/demo/login",
          "description": "",
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
          },
          "body": {
            "mode": "form-data",
            "parameter": [
              {
                "description": "手机号",
                "is_checked": 1,
                "key": "mobile",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "18289454846"
              },
              {
                "description": "验证码",
                "is_checked": 1,
                "key": "ver_code",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "123456"
              }
            ],
            "raw": "",
            "raw_para": []
          },
          "event": {
            "pre_script": "",
            "test": "apt.variables.set(\"token\", response.json.data.token);"
          },
          "header": {
            "parameter": []
          },
          "query": {
            "parameter": []
          },
          "cookie": {
            "parameter": []
          },
          "resful": {
            "parameter": []
          }
        },
        "response": {
          "success": {
            "raw": "{\n\t\"code\": 10000,\n\t\"msg\": \"success\",\n\t\"data\": {\n\t\t\"token\": \"661fe75115e45a3520ec74121898e2af\"\n\t}\n}",
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "code",
                "type": "Text",
                "field_type": "Number",
                "value": "10000"
              },
              {
                "description": "返回文字描述",
                "is_checked": 1,
                "key": "msg",
                "type": "Text",
                "field_type": "String",
                "value": "success"
              },
              {
                "description": "返回数据",
                "is_checked": 1,
                "key": "data",
                "type": "Text",
                "field_type": "Object",
                "value": ""
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.token",
                "type": "Text",
                "field_type": "Number",
                "value": "661fe75115e45a3520ec74121898e2af"
              }
            ]
          },
          "error": {
            "raw": "",
            "parameter": []
          }
        },
        "ai_expect": null,
        "enable_ai_expect": -1,
        "mock_url": "/api/demo/logi",
        "is_first_mock_path": 1,
        "enable_server_mock": 1,
        "is_locked": -1,
        "attribute_info": [],
        "server_id": "",
        "is_first_match": 1,
        "mock": "{}",
        "is_saved": 1
      },
      {
        "target_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "parent_id": "0",
        "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
        "auto_import_id": "-1",
        "mark": "developing",
        "target_type": "folder",
        "example_type": "0",
        "name": "示例接口",
        "method": "POST",
        "url": "",
        "sort": 1,
        "type_sort": 1,
        "update_day": 1702915200,
        "update_dtime": 1702915200,
        "status": 1,
        "bak_id": 0,
        "version": 1,
        "is_publish": 0,
        "publisher": 0,
        "publish_dtime": 0,
        "create_dtime": 1702975215,
        "is_doc": 0,
        "sample_group_id": "-1",
        "modifier_id": "UZ83D42D160F",
        "created_uuid": "UZ83D42D160F",
        "tags": [],
        "request": {
          "description": "",
          "header": [],
          "query": [],
          "body": [],
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
          "pre_script": "",
          "test": "",
          "pre_script_switch": true,
          "test_switch": true
        },
        "server_id": ""
      },
      {
        "target_id": "72093bb7-7639-4be4-9f56-d45eb299249c",
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
        "auto_import_id": "-1",
        "mark": "developing",
        "target_type": "api",
        "example_type": "0",
        "name": "新闻列表",
        "method": "GET",
        "url": "",
        "sort": 1,
        "type_sort": 1,
        "update_day": 1706112000,
        "update_dtime": 1706191169,
        "status": 1,
        "bak_id": 0,
        "version": 3,
        "is_publish": 0,
        "publisher": 0,
        "publish_dtime": 0,
        "hash": "",
        "is_changed": -1,
        "create_dtime": 1702975215,
        "is_doc": 0,
        "sample_group_id": "-1",
        "modifier_id": "UZ83D42D160F",
        "created_uuid": "UZ83D42D160F",
        "is_example": 0,
        "tags": [],
        "request": {
          "url": "https://demo-api.apipost.cn/api/demo/news_list?mobile=18289454846&theme_news=国际新闻&page=1&pageSize=20",
          "description": "",
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
          },
          "body": {
            "mode": "json",
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "mobile",
                "type": "Text",
                "not_null": "1",
                "field_type": "String",
                "value": "15210797868\""
              }
            ],
            "raw": "",
            "raw_para": [
              {
                "description": "项目id",
                "is_checked": 1,
                "key": "project_id",
                "type": "Text",
                "not_null": "1",
                "field_type": "Number",
                "value": "2d4bd41c-56e2-44bd-92de-c3f85683cab8"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "id",
                "type": "Text",
                "not_null": "1",
                "field_type": "String",
                "value": "ed5d54bc-16b6-4888-8cb8-c8586e74777b"
              }
            ]
          },
          "event": {
            "pre_script": "",
            "test": ""
          },
          "header": {
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "token",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "{{token}}"
              }
            ]
          },
          "query": {
            "parameter": [
              {
                "description": "手机号",
                "is_checked": 1,
                "key": "mobile",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "18289454846"
              },
              {
                "description": "新闻专题",
                "is_checked": 1,
                "key": "theme_news",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "国际新闻"
              },
              {
                "description": "分页",
                "is_checked": 1,
                "key": "page",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "1"
              },
              {
                "description": "每页条数",
                "is_checked": 1,
                "key": "pageSize",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "20"
              }
            ]
          },
          "cookie": {
            "parameter": []
          },
          "resful": {
            "parameter": []
          },
          "post_tasks": [
            {
              "type": "pickVars",
              "enabled": 1,
              "data": {
                "source": "responseJson",
                "variables": [
                  {
                    "name": "cur_page",
                    "type": "globalVars",
                    "expression": "$.data.cur_page"
                  }
                ]
              },
              "id": "252dc273-97ca-4d21-b5d1-abc3bfa17c64"
            }
          ]
        },
        "response": {
          "success": {
            "raw": "{\"code\":10000,\"msg\":\"success\",\"data\":{\"cur_page\":\"1\",\"last_page\":2,\"page_size\":\"20\",\"total\":30,\"list\":[{\"id\":3,\"title\":\"前后仅用了4分钟，16枚洲际导弹应声而出，美航母也不敢轻举妄动\",\"author\":\"烽火杂志\",\"url\":\"https:\\/\\/open.apipost.cn\\/\",\"content\":\"世界上哪个国家可与美军抗衡？国际社会上关于这一问题的答案千奇百怪，但有一个国家用行动让美军闭嘴，短短4分钟连续发射16枚洲际导弹，场面十分壮观，让西方国家畏惧不已，即便是美航母也不敢轻举妄动。\"},{\"id\":4,\"title\":\"拿走金牌就翻脸？德国冬奥会6金王表达不满，称再也不会来中国\",\"author\":\"铁血观世界\",\"url\":\"https:\\/\\/module.apipost.cn\\/\",\"content\":\"北京冬奥会无疑是一次成功其令全球都难忘的冬奥会，各国运动员不仅在这里收获了热情欢迎，还彻底迷上了中国美食。而当他们要离开时，都对中国表达了不舍之情，美国运动员更是直接落泪，这一点从闭幕式也能看出，和开幕式相比，参加闭幕式的人数更多而且更加热情。每一名运动员都是发自内心地开心和激动，以至于主持人连说三次“落座”，运动员们才不舍地回到座位。\"},{\"id\":6,\"title\":\"北京一小区突然封控，家长无法外出接孩子！118名学生这样平安回家\",\"author\":\"北京日报客户端\",\"url\":\"https:\\/\\/www.ixigua.com\\/6985503676391490085?wid_try=1\",\"content\":\"小区封控后，无法外出接在中小学校就读的孩子成了家长们最揪心的问题。通运街道出动10名工作人员、3辆大巴车、6辆私家车，把118名学生们平安接回了家。\"},{\"id\":8,\"title\":\"“佳丽贷”被查，700名女性被随意“摆布”，出卖身体还债值吗？\",\"author\":\"秋月财经\",\"url\":\"https:\\/\\/mp.apipost.cn\\/nav\\/houduan\",\"content\":\"网络借贷平台兴起，使得很多人根本就无法控制自己，不停地朝着网贷伸手。等陷进去了之后，你就会发现，这是一个无底洞了！\"},{\"id\":9,\"title\":\"为什么头皮总是长“疙瘩”和“脓包”？或与4个原因有关，别忽视\",\"author\":\"邱彬医生说\",\"url\":\"https:\\/\\/qa.apipost.cn\\/\",\"content\":\"小王的母亲看到之后就特别的担心，总觉得这种情况对头发或者是头皮健康有影响，严重了，会导致一些其他的疾病，其实生活当中很多人也有这种情况，那么到底是什么原因呢？\"},{\"id\":10,\"title\":\"郭沫若用4字骂鲁迅，鲁迅加1字回怼，世人笑谈：这便是郭沫若一生\",\"author\":\"掌柜说史\",\"url\":\"https:\\/\\/www.apipost.cn\\/download.html\",\"content\":\"自古以来，文人之间因为所持观点的不同而相互的争辩也是屡见不鲜，有时也会发生一些口角，而作为以笔代戈的他们自然在“毒蛇”的功力也非比寻常。\"},{\"id\":11,\"title\":\"看完美国女兵宿舍，再看中国女兵宿舍，就知道什么叫差距了\",\"author\":\"小谈科普\",\"url\":\"https:\\/\\/www.apipost.cn\\/rules.html\",\"content\":\"美国军队中不只有男性，还有大量的女性在军队当中承担着重要的作用。美国女兵和男兵一样，他们的宿舍管理制度可谓相当轻松。首先在平常训练时，美国女兵只要简单地把被套叠好并保持床铺的整洁就可以了，然后由部队的长官来进行检查，对被套的整洁和叠放程度并没有严格的标准。\"},{\"id\":13,\"title\":\"王刚曾错砸价值“2亿”的古董，节目就此停播，后来怎么样？\",\"author\":\"南派将军\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/ceshi\",\"content\":\"相信很多人都听说过王刚砸宝这个事，这个事儿的主要意思是指有心之人想利用利益驱动作假，被揭穿以后还死不承认，同时也指社会公信力缺失。这个成语的出现，还得从一部叫做《天下收藏》的鉴宝节目说起。这场节目主持人正是我国著名的演员王刚，当时的节目有这样一个规定，如果收藏者的产品被专家鉴定为赝品，主持人王刚有权利用手中的锤子当场砸碎，并且概不负责。为了使这个规定更严谨每一位收藏者需要都向节目组为自己的产品签一份生死契约。然而，王刚怎么也想不到，他会因为手中的锤子，被收藏家告上了法庭。\"},{\"id\":15,\"title\":\"65年周总理与毛主席密谈后，六万士兵一夜消失，一小镇被地图抹除\",\"author\":\"零点史说\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/shujuku\",\"content\":\"我国以地大物博出名，不仅有神奇瑰丽的自然风光，还有数不胜数的人造景区，其中有一个就是重庆涪陵白涛镇的地下核工厂，\"},{\"id\":17,\"title\":\"非洲人想不通，为啥我们的“大金链子”这么便宜，中国人却不买？\",\"author\":\"财经课堂\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/ios\",\"content\":\"“金”在其中位居首位，其在人们心中的价值便由此可见一斑。古往今来，其作为珠宝首饰、一般等价物在坊市间流传已久。\"},{\"id\":18,\"title\":\"拒绝美俄合作，点名要买中国武器，愿意将整个领空交给我国保护\",\"author\":\"海陆空天惯性世界\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/jiekouceshi\",\"content\":\"“巴铁”一度成为一个代名词，如今，随着各国交流越来越深入，又有一个“巴铁”诞生了，该国愿意将自己的领空交给我国保护，还公开表示，与我国是兄弟。\"},{\"id\":19,\"title\":\"49年，宋庆龄受邀参加开国大典，却迟迟不动身，最终提出3个条件\",\"author\":\"文史江山\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/qianduan\",\"content\":\"“重庆违教，忽近四年。仰望之诚，与日俱积。兹者全国革命胜利在即，建设大计，亟待商筹，特派邓颖超同志趋前致候，专诚欢迎先生北上。敬希命驾莅平，以便就近请教，至祈勿却为盼！”\"},{\"id\":20,\"title\":\"上万座军事碉堡秘密运行，可存放2000枚导弹，距我国仅900公里\",\"author\":\"兵器世界\",\"url\":\"https:\\/\\/qa.apipost.cn\\/t\\/houduan\",\"content\":\"众所周知，在二战期间美国向日本投下的两颗原子弹让人们见识到了核武器的危害，同时也明白了军事实力对一个国家的重要性。许多国家也致力于发展本国的军事实力，综合实力的提升不仅可以提升自己的国防实力，也可以很好地对外形成威慑力，可以保护本国的安全，在国际地位上拥有一定的话语权。\"},{\"id\":22,\"title\":\"1958年，黑龙江一学生捡来一片古怪树叶，把玩7年后被发现是国宝\",\"author\":\"风兰文史\",\"url\":\"https:\\/\\/mp.apipost.cn\\/\",\"content\":\"在1958年的某一天，一位黑龙江的中学生在双鸭山市饶河县的小南山上发现了一片古怪的树叶。中学生之所以会被吸引过去，全然是出于孩童的好奇心。然而等他真正走进之后，仔细定睛一看，原来这不是一片树叶，而是一块石头！\"},{\"id\":23,\"title\":\"一千名百岁老人调查结果：长寿之人的共性，不是运动，而是这2点\",\"author\":\"徐妹医生\",\"url\":\"https:\\/\\/mp.apipost.cn\\/\",\"content\":\"关于影响长寿的原因，大家会觉得这是上天注定，寿命的长短其实和基因遗传有关，比如生活当中很多人喝酒、吸烟却活到了90多岁，而很多人滴酒不沾，经常锻炼，还没有抽烟喝酒的人活的时间久。\"},{\"id\":24,\"title\":\"中国两大禁区，一旦触犯就意味着战争爆发，其中一个是三峡大坝\",\"author\":\"兵器世界\",\"url\":\"https:\\/\\/mp.apipost.cn\\/\",\"content\":\"任何一个国家都有自己的“禁区”，不允许外人随便靠近，比如颇具神秘色彩的美国“51区”。51区位于美国内华达州南部林肯郡，是美国用来秘密进行新型空军飞行器开发和测试的地方。后来由于51区经常出现一些神秘异常的事件，民间就有了“51禁区”的说法。外界认为51区是“外星研究基地”，是美国军方用来研究外星人和UFO的地方。\"},{\"id\":25,\"title\":\"“白血病”专挑孩子下手？医生劝诫：这3种水果，少给孩子吃\",\"author\":\"建利医生\",\"url\":\"https:\\/\\/www.apipost.cn\\/\",\"content\":\"白血病是来源于造血系统异常增生出现的恶性肿瘤，多发于青少年。根据自然发病时间及轻重缓急，分为\"},{\"id\":26,\"title\":\"故宫的地板坏了，专家进行修复时，才发现朱棣的心到底有多狠\",\"author\":\"宥沐说史\",\"url\":\"https:\\/\\/www.apipost.cn\\/\",\"content\":\"有首太平歌词《画扇面》，其中一幅扇面的唱词，将把北京城的雄伟壮丽、气魄巍峨十分充分地描述了出来。北京城至今为止作为十朝首都，自有其独到之处，而提起北京，就不得不联想到北京城的标志性建筑——\"},{\"id\":27,\"title\":\"鬼谷子：人在倒霉前，会出现这“三大征兆”，你遇到过吗\",\"author\":\"易归民\",\"url\":\"https:\\/\\/www.apipost.cn\\/\",\"content\":\"而且有一些事情，你越是想要躲避，它越是会在不经意间找上你，就从新闻中我们就可以看到，那些明明是做了一辈子的好事的人，临了临了，却是离开的那么的突然。\"},{\"id\":29,\"title\":\"大家都被“8小时睡眠论”忽悠了？50岁后，最佳睡觉时间是多少？\",\"author\":\"建利医生\",\"url\":\"https:\\/\\/www.apipost.cn\\/\",\"content\":\"一个人的一生有1\\/3时间在睡眠中度过，睡眠每个人每天都必吃，进行睡眠过程中可以有效恢复身体，修复受损粘膜细胞，从而有益强健的体魄，工作学习更加精力充沛，面对生活更有活力。\"}]}}",
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "code",
                "type": "Text",
                "field_type": "Number",
                "value": "10000"
              },
              {
                "description": "返回文字描述",
                "is_checked": 1,
                "key": "msg",
                "type": "Text",
                "field_type": "String",
                "value": "success"
              },
              {
                "description": "返回数据",
                "is_checked": 1,
                "key": "data",
                "type": "Text",
                "field_type": "Object",
                "value": ""
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.cur_page",
                "type": "Text",
                "field_type": "Number",
                "value": "1"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.last_page",
                "type": "Text",
                "field_type": "Number",
                "value": "2"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.page_size",
                "type": "Text",
                "field_type": "Number",
                "value": "20"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.total",
                "type": "Text",
                "field_type": "Number",
                "value": "30"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list",
                "type": "Text",
                "field_type": "Object",
                "value": ""
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list.id",
                "type": "Text",
                "field_type": "Number",
                "value": "3"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list.title",
                "type": "Text",
                "field_type": "String",
                "value": "前后仅用了4分钟，16枚洲际导弹应声而出，美航母也不敢轻举妄动"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list.author",
                "type": "Text",
                "field_type": "String",
                "value": "烽火杂志"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list.url",
                "type": "Text",
                "field_type": "String",
                "value": "https://open.apipost.cn/"
              },
              {
                "description": "",
                "is_checked": 1,
                "key": "data.list.content",
                "type": "Text",
                "field_type": "String",
                "value": "世界上哪个国家可与美军抗衡？国际社会上关于这一问题的答案千奇百怪，但有一个国家用行动让美军闭嘴，短短4分钟连续发射16枚洲际导弹，场面十分壮观，让西方国家畏惧不已，即便是美航母也不敢轻举妄动。"
              }
            ]
          },
          "error": {
            "raw": "",
            "parameter": []
          }
        },
        "ai_expect": null,
        "enable_ai_expect": -1,
        "mock_url": "",
        "is_first_mock_path": 1,
        "enable_server_mock": 1,
        "is_locked": -1,
        "attribute_info": [],
        "server_id": ""
      },
      {
        "target_id": "b4bf1584-1b33-43ce-b6b7-4e108cff8494",
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
        "auto_import_id": "-1",
        "mark": "developing",
        "target_type": "api",
        "example_type": "0",
        "name": "收藏新闻",
        "method": "POST",
        "url": "",
        "sort": 3,
        "type_sort": 1,
        "update_day": 1702915200,
        "update_dtime": 1702915200,
        "status": 1,
        "bak_id": 0,
        "version": 1,
        "is_publish": 0,
        "publisher": 0,
        "publish_dtime": 0,
        "hash": "",
        "is_changed": -1,
        "create_dtime": 1702975215,
        "is_doc": 0,
        "sample_group_id": "-1",
        "modifier_id": "UZ83D42D160F",
        "created_uuid": "UZ83D42D160F",
        "is_example": 0,
        "tags": [],
        "request": {
          "url": "https://demo-api.apipost.cn/api/demo/collect_news",
          "description": "",
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
          },
          "body": {
            "mode": "form-data",
            "parameter": [
              {
                "description": "新闻ID",
                "is_checked": 1,
                "key": "id",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "20"
              }
            ],
            "raw": "",
            "raw_para": []
          },
          "event": {
            "pre_script": "",
            "test": ""
          },
          "header": {
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "token",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "{{token}}"
              }
            ]
          },
          "query": {
            "parameter": []
          },
          "cookie": {
            "parameter": []
          },
          "resful": {
            "parameter": []
          }
        },
        "response": {
          "success": {
            "raw": "{\"code\":10000,\"msg\":\"新闻收藏成功\",\"data\":{}}",
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "code",
                "type": "Text",
                "field_type": "Number",
                "value": "10000"
              },
              {
                "description": "返回文字描述",
                "is_checked": 1,
                "key": "msg",
                "type": "Text",
                "field_type": "String",
                "value": "新闻收藏成功"
              },
              {
                "description": "返回数据",
                "is_checked": 1,
                "key": "data",
                "type": "Text",
                "field_type": "Object",
                "value": "{}"
              }
            ]
          },
          "error": {
            "raw": "",
            "parameter": []
          }
        },
        "ai_expect": null,
        "enable_ai_expect": -1,
        "mock_url": "",
        "is_first_mock_path": 1,
        "enable_server_mock": 1,
        "is_locked": -1,
        "attribute_info": [],
        "server_id": ""
      },
      {
        "target_id": "e6bdb890-d12e-4cfa-9e6f-a3a2868c2c9f",
        "parent_id": "9efad92b-dc14-4751-abac-bde9672fcf78",
        "project_id": "f595bc91-7d1f-4cb6-b103-8fbab7bc15d7",
        "auto_import_id": "-1",
        "mark": "developing",
        "target_type": "api",
        "example_type": "0",
        "name": "删除评论",
        "method": "DELETE",
        "url": "",
        "sort": 5,
        "type_sort": 1,
        "update_day": 1702915200,
        "update_dtime": 1702915200,
        "status": 1,
        "bak_id": 0,
        "version": 1,
        "is_publish": 0,
        "publisher": 0,
        "publish_dtime": 0,
        "hash": "",
        "is_changed": -1,
        "create_dtime": 1702975215,
        "is_doc": 0,
        "sample_group_id": "-1",
        "modifier_id": "UZ83D42D160F",
        "created_uuid": "UZ83D42D160F",
        "is_example": 0,
        "tags": [],
        "request": {
          "url": "https://demo-api.apipost.cn/api/demo/delete_comment",
          "description": "",
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
          },
          "body": {
            "mode": "json",
            "parameter": [],
            "raw": "{\n\t\"id\": \"20\",\n\t\"comment_id\": \"98\"\n}",
            "raw_para": []
          },
          "event": {
            "pre_script": "",
            "test": ""
          },
          "header": {
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "token",
                "type": "Text",
                "not_null": "1",
                "field_type": "",
                "value": "1"
              }
            ]
          },
          "query": {
            "parameter": []
          },
          "cookie": {
            "parameter": []
          },
          "resful": {
            "parameter": []
          }
        },
        "response": {
          "success": {
            "raw": "{\"code\":10000,\"msg\":\"评论删除成功\",\"data\":{}}",
            "parameter": [
              {
                "description": "",
                "is_checked": 1,
                "key": "code",
                "type": "Text",
                "field_type": "Number",
                "value": "10000"
              },
              {
                "description": "返回文字描述",
                "is_checked": 1,
                "key": "msg",
                "type": "Text",
                "field_type": "String",
                "value": "评论删除成功"
              },
              {
                "description": "返回数据",
                "is_checked": 1,
                "key": "data",
                "type": "Text",
                "field_type": "Object",
                "value": "{}"
              }
            ]
          },
          "error": {
            "raw": "",
            "parameter": []
          }
        },
        "ai_expect": null,
        "enable_ai_expect": -1,
        "mock_url": "",
        "is_first_mock_path": 1,
        "enable_server_mock": 1,
        "is_locked": -1,
        "attribute_info": [],
        "server_id": ""
      }
    ],
    "connectionConfigs": {},
    "test_events": {
      "test_id": "585cc080-8bea-4ec6-9922-8d9a15edbfa4",
      "name": "新建测试用例"
    },
    "default_report_name": "新建测试用例测试报告",
    "globals": {}
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