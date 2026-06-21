# 导游问答系统 API 文档

# 用户接口

## **1.1用户**

### 1.用户注册 (Register)

- **接口地址**: `/api/users/register`
- **请求方式**: `POST`
- **认证要求**: 无需 Token

**请求参数 (Body - JSON)**

表格

| 参数名   | 类型   | 必填 | 说明                           |
| :------- | :----- | :--- | :----------------------------- |
| name     | string | 是   | 用户名                         |
| phone    | string | 否   | 手机号                         |
| sex      | string | 否   | 性别                           |
| idNumber | string | 否   | 身份证号                       |
| password | string | 是   | 密码 (后端会进行 MD5 加密存储) |

**响应结果 (Response)**

- 成功 (200)

  :

  json

  编辑

  ```json
  {
    "code": 200,
    "message": "注册成功",
    "data": null
  }
  ```

------

### **2. 用户登录 (Login)**

- **接口地址**: `/api/users/login`
- **请求方式**: `POST`
- **认证要求**: 无需 Token

**请求参数 (Body - JSON)**

表格

| 参数名   | 类型   | 必填 | 说明   |
| :------- | :----- | :--- | :----- |
| name     | string | 是   | 用户名 |
| password | string | 是   | 密码   |

**响应结果 (Response)**

- **成功 (200)**:

  json

  编辑

  ```json
  {
      "code": 200,
      "message": "登录成功",
      "data": {
          "token": "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3Nzc0MDE4OTYsInVzZXJJZCI6MX0.4LtJuHQdsyRZjU--CSk5ZsIbLoES2pc_eoAjCptoIBc",
          "tokenType": "Bearer",
          "expiresIn": 720000000,
          "userInfo": {
              "name": "admin",
              "password": "123456",
              "role": "admin"
          },
          "role": "admin"
      }
  }
  ```

- **失败 (500/自定义)**:

  - 用户不存在：`code: 0`, message: "账号不存在"
  - 密码错误：`code: 0`, message: "密码错误"

------

### **3. 获取用户信息 (Get Profile)**

- **接口地址**: `/api/users/profile`
- **请求方式**: `GET`
- **认证要求**: **需要 Token** (放在 Header 中)

**请求头 (Headers)**

表格

| Key           | Value |
| :------------ | :---- |
| Authorization | token |

**响应结果 (Response)**

- 成功 (200)

  :

  json

  编辑

  ```json
  {
    "code": 200,
    "message": null,
    "data": {
      "id": 1,
      "name": "zhangsan",
      "phone": "13800138000",
      "sex": "男",
      "idNumber": "110101199001011234",
      "password": "e10adc3949ba59abbe56e057f20f883e", // 数据库中的 MD5 密码
      "createTime": "2023-01-01T10:00:00",
      "updateTime": "2023-01-01T10:00:00",
      "isDeleted": 0
      // ... 其他 User 实体字段
    }
  }
  ```

------

### **4. 修改用户信息 (Update Profile)**

- **接口地址**: `/api/users/profile`
- **请求方式**: `PUT`
- **认证要求**: **需要 Token** (放在 Header 中)

**请求头 (Headers)**

表格

| Key           | Value          |
| :------------ | :------------- |
| Authorization | Bearer {token} |

**请求参数 (Body - JSON)**
*(注：根据 `UserUpdateDTO` 定义，所有字段均为非必填，传哪个就改哪个)*

表格

| 参数名   | 类型   | 必填 | 说明                      |
| :------- | :----- | :--- | :------------------------ |
| name     | string | 否   | 用户名                    |
| avatar   | string | 否   | 头像 URL                  |
| phone    | string | 否   | 手机号                    |
| sex      | string | 否   | 性别                      |
| idNumber | string | 否   | 身份证号                  |
| password | string | 否   | 密码 (明文传入，后端加密) |

**响应结果 (Response)**

- 成功 (200)

  :

  json

  编辑

  ```json
  {
    "code": 200,
    "message": "修改成功",
    "data": null
  }
  ```

### **1.2 语音问答接口 (流式版)**

**基本信息**

- **接口路径**: `POST /api/voice/ask-stream` (建议路径加上 `-stream` 以示区别)
- **请求方式**: `multipart/form-data`
- **响应类型**: `text/event-stream` (SSE)
- **功能描述**: 实时流式语音问答。服务端会分阶段推送：ASR识别结果 → AI文字回复片段 → 最终语音音频。

**请求参数**

表格

| 参数名 | 类型   | 必填 | 说明         |
| :----- | :----- | :--- | :----------- |
| audio  | File   | 是   | 音频文件     |
| chatId | String | 否   | 会话唯一标识 |

**响应结果 (流式协议)**

接口不再返回单一的 JSON 对象，而是通过 **Server-Sent Events (SSE)** 持续推送数据块。前端需要监听 `message` 事件并根据 `event` 类型处理数据。

**数据流格式定义：**

表格



| Event 名称       | 数据类型 | 说明                                        | 示例数据           |
| :--------------- | :------- | :------------------------------------------ | :----------------- |
| **asr_result**   | String   | 语音识别阶段：返回识别到的文本              | `"你好，我想问路"` |
| **answer_text**  | String   | 问答阶段：流式返回 AI 的文字片段            | `"灵山胜境"`       |
| **answer_audio** | Base64   | 语音合成阶段：返回音频的二进制片段 (Base64) | `"UEsDBBQACAg..."` |
| **error**        | String   | 异常信息                                    | `"ASR识别超时"`    |
| **[DONE]**       | -        | 连接关闭，流结束                            | -                  |

#### 



**前端使用指南 (核心变更)**

由于返回的是流，前端不能使用普通的 `axios.post`，必须使用 `EventSource` 或 `fetch` 读取流。

**代码示例 (JavaScript):**

javascript

编辑

```json
const formData = new FormData();
formData.append('audio', audioFile);

// 注意：使用 fetch 处理 SSE 流
fetch('/api/voice/ask-stream', {
    method: 'POST',
    body: formData
})
.then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    function read() {
        reader.read().then(({ done, value }) => {
            if (done) return;
            
            // 解析 SSE 数据块
            const text = decoder.decode(value);
            const lines = text.split('\n');
            
            lines.forEach(line => {
                if (line.startsWith('event:')) {
                    const eventType = line.replace('event:', '').trim();
                    // 下一行通常是 data: ...
                } else if (line.startsWith('data:')) {
                    const data = line.replace('data:', '').trim();
                    handleStreamData(eventType, data);
                }
            });
            
            read();
        });
    }
    read();
});

function handleStreamData(type, data) {
    if (type === 'asr_result') {
        console.log('识别中:', data);
    } else if (type === 'answer_text') {
        // 拼接文字
        document.getElementById('answer').innerText += data;
    } else if (type === 'answer_audio') {
        // 播放音频片段 (需要累积或立即播放)
        playAudioChunk(data);
    }
}
```

------

### **1.3 文本问答接口 (流式版)**

**基本信息**

- **接口路径**: `POST /api/qa/ask-stream`
- **请求方式**: `application/json`
- **响应类型**: `text/event-stream`
- **功能描述**: 纯文本流式问答，文字逐字输出，类似 ChatGPT 的打字机效果。

**请求参数**

表格

| 参数名   | 类型   | 必填 | 说明     |
| :------- | :----- | :--- | :------- |
| question | String | 是   | 问题文本 |
| chatId   | String | 否   | 会话ID   |

**响应结果**

表格

| Event 名称   | 数据内容 | 说明                               |
| :----------- | :------- | :--------------------------------- |
| **token**    | String   | AI 生成的每一个文字片段            |
| **complete** | JSON     | 完整回答对象（可选，流结束时发送） |

**响应示例 (Raw SSE):**

text

编辑

```
event: token
data: 灵山

event: token
data: 胜境

event: token
data: 位于...

event: done
data: {"totalTokens": 50}
```

**前端使用指南**

前端同样需要使用 `fetch` 或 `EventSource`。

**伪代码逻辑：**

javascript

编辑

```js
// 监听 'token' 事件
eventSource.onmessage = function(event) {
    // 这里的 event.data 就是增量文本
    appendToChatBox(event.data); 
};
```



## 1.4 获取当前用户的会话列表（带预览信息）

功能说明：获取当前登录用户的所有历史对话，包含会话ID、消息预览、最后更新时间等信息，用于展示对话列表

请求路径：GET

```
 /api/ai/history/sessions
```

认证要求：需要登录（JWT Token）

请求参数：无

响应字段说明：

字段名	类型	说明
chatId	String	对话会话唯一标识
preview	String	对话预览（用户的第一条消息，超过50字截断）
lastTime	String	最后更新时间（格式：yyyy-MM-dd）
响应示例：

json

```json
[
    {
        "chatId": "chatId_001",
        "preview": "你好，请问灵山胜境在哪里？",
    },
    {
        "chatId": "chatId_002",
        "preview": "介绍一下拈花湾的景点",
   
    },
    {
        "chatId": "chatId_003",
        "preview": "门票价格是多少？",

    }
]
```



## 1.5 获取具体对话内容

**功能说明**：根据 `chatId` 获取指定会话的历史聊天记录。用户只能访问属于自己的会话，无权访问其他用户的会话数据。

**请求方式**：`GET`

**请求路径**：`/api/ai/history/{chatId}`

**认证要求**：需要登录（JWT Token）

**请求参数**：

| 参数名   | 位置     | 说明                    | 示例         |
| :------- | :------- | :---------------------- | :----------- |
| `chatId` | 路径参数 | 要查询的唯一对话会话 ID | `chatId_001` |

**返回数据类型**：`List<MessageVO>` (JSON 数组)

**权限说明**：自动验证该 `chatId` 是否属于当前登录用户，如不属于则返回空数组 `[]`

**响应字段说明**：

| 字段名     | 类型   | 说明                                           |
| :--------- | :----- | :--------------------------------------------- |
| `role`     | String | 发送者角色（`user` 或 `ai`）                   |
| `content`  | String | 具体的聊天文本内容                             |
| `audioUrl` | String | 音频文件访问 URL（仅 AI 回复有此字段，可为空） |

**成功响应示例**：

json

```
[
    {
        "role": "user",
        "content": "你好，请问灵山胜境在哪里？",
        "audioUrl": null
    },
    {
        "role": "ai",
        "content": "你好！灵山胜境位于江苏省无锡市太湖国家旅游度假区...",
        "audioUrl": "http://localhost:8080/audio/chatId_001/123456789.mp3"
    },
    {
        "role": "user",
        "content": "谢谢",
        "audioUrl": null
    },
    {
        "role": "ai",
        "content": "不客气，祝您游玩愉快！",
        "audioUrl": "http://localhost:8080/audio/chatId_001/987654321.mp3"
    }
]
```



**无权限响应示例**（访问他人会话时返回空数组）：

json

```
[]
```



**前端播放音频示例**：

javascript

```
// 当消息包含 audioUrl 时，可以这样播放
if (message.audioUrl) {
    const audio = new Audio(message.audioUrl);
    audio.play();
}
```

## 1.6**游览路线模块接口文档**

------

### **1. 获取推荐路线列表**

此接口用于首页展示，让用户选择感兴趣的路线（如“历史文化游”、“亲子休闲游”）。

- **接口地址**: /api/v1/routes/list
- **请求方式**: `GET`
- **请求参数**: 无

**响应示例 (Response)**

json

编辑

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "title": "历史文化深度游",
      "audience": "历史爱好者",
      "duration": "约 4 小时",
      "summary": "探访灵山胜境千年古刹，解读佛教艺术背后的历史故事。",
      "coverImage": "https://example.com/images/route_history.jpg"
    },
    {
      "id": 2,
      "title": "亲子祈福休闲游",
      "audience": "家庭亲子",
      "duration": "约 3 小时",
      "summary": "观看九龙灌浴奇观，登云道祈福，轻松游览核心地标。",
      "coverImage": "https://example.com/images/route_family.jpg"
    }
  ]
}
```

------

### **2. 获取路线详情及景点列表**

此接口对应“推荐不同的游览路线”功能。前端点击某条路线后调用，后端会联表查询该路线包含的所有景点，并按顺序返回。

- **接口地址**: /api/v1/routes/{routeId}/spots

- **请求方式**: `GET`

- 路径参数

  :

  - `routeId` (Integer): 路线ID

**响应示例 (Response)**

json

编辑



```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "routeInfo": {
      "id": 1,
      "title": "历史文化深度游",
      "summary": "探访灵山胜境千年古刹..."
    },
    "spots": [
      {
        "id": 4,
        "name": "灵山大照壁",
        "image_url": "https://upload.wikimedia.org/.../Great_Spirit_Wall.jpg",
        "tags": "入口,文化",
        "highlight": "华夏第一壁，正面刻有“灵山胜境”四字。",
        "sortOrder": 1
      },
      {
        "id": 5,
        "name": "祥符禅寺",
        "image_url": "https://upload.wikimedia.org/.../Xiangfu_Temple.jpg",
        "tags": "古刹,历史",
        "highlight": "始建于唐代，是灵山大佛的缘起之地。",
        "sortOrder": 2
      },
      {
        "id": 1,
        "name": "灵山大佛",
        "image_url": "https://upload.wikimedia.org/.../Grand_Buddha.jpg",
        "tags": "地标,佛教",
        "highlight": "88米青铜立佛，摸摸佛手，有福气。",
        "sortOrder": 3
      }
    ]
  }
}
```

------

### **3. 获取景点详情（智能讲解数据源）**

此接口对应“智能问答与讲解”功能。当用户点击地图上的某个景点或列表项时调用，返回详细的 `story` 和 `description` 供前端展示或数字人朗读。

- **接口地址**: /api/v1/routes/spots/{spotId}

- **请求方式**: `GET`

- 路径参数

  :

  - `spotId` (Integer): 景点ID

**响应示例 (Response)**

json

编辑

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": 1,
    "name": "灵山大佛",
    "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Lingshan_Grand_Buddha.jpg/800px-Lingshan_Grand_Buddha.jpg",
    "description": "灵山大佛通高88米，是目前世界上最高的青铜立佛像之一...",
    "story": "大佛的建造源于玄奘法师曾在此驻足的传说，大佛面向太湖，寓意保佑一方水土风调雨顺...",
    "highlight": "大佛的右手结“施无畏印”，代表除去痛苦；左手结“与愿印”，代表给予快乐。",
    "tags": "地标,佛教,壮观"
  }
}
```



## 1.7打开问答界面之后弹出tips

路径：/api/qa/tips  GET

**响应参数**

响应体为统一的 `Result` 封装对象。

表格

| 参数名 | 类型    | 说明                                         |
| :----- | :------ | :------------------------------------------- |
| code   | Integer | 状态码（200 表示成功）                       |
| msg    | String  | 响应消息（通常为 "success"）                 |
| data   | String  | **核心内容**：数字人需要播报或展示的文本内容 |

**响应示例**

**场景一：管理员已配置（数据库有数据）**

假设管理员在后台配置了：“五一期间人多，请戴好口罩。”

json

编辑

```json
{
  "code": 200,
  "msg": "success",
  "data": "你好！我是小导！如果有什么关于景区的建议可以问我呀！有什么关于景区的建议可以问我呀！"
  // 注意：此处返回的是数据库中查询到的最新 config 内容
}
```

**场景二：管理员未配置（数据库为空）**

此时系统会自动返回代码中写死的默认值。

json

编辑

```json
{
  "code": 200,
  "msg": "success",
  "data": "你好！我是小导！如果有什么关于景区的建议可以问我呀！有什么关于景区的..."
  // 此处返回的是代码中 if(config == null) 里的默认字符串
}
```





## 1.8 **图片上传接口文档**

**1. 接口概览**

该接口用于将本地图片文件上传至阿里云OSS（对象存储服务），并返回存储后的URL地址。后端会对上传的文件进行格式和大小校验。

**2. 请求信息**

表格

| 属性         | 内容                                | 说明                       |
| :----------- | :---------------------------------- | :------------------------- |
| **请求路径** | `/api/upload/image`                 | 用于接收文件上传的端点     |
| **请求方式** | `POST`                              | 必须使用 POST 方法         |
| **请求头**   | `Content-Type: multipart/form-data` | 必须包含此头信息以上传文件 |
| **鉴权方式** | 无 (代码中未体现)                   | 请根据实际业务补充鉴权逻辑 |

**3. 请求参数**

该接口接收一个名为 `file` 的表单数据字段。

表格



| 参数名   | 位置        | 类型   | 必填   | 说明               |
| :------- | :---------- | :----- | :----- | :----------------- |
| **file** | `form-data` | `File` | **是** | 需要上传的图片文件 |

**4. 校验规则 (重要)**

为了保证系统安全和存储效率，服务端对上传文件有以下强制限制：

- 文件类型限制

  ：仅允许上传图片文件。

  - *校验逻辑*：文件的 `Content-Type` 必须以 `image/` 开头（例如 `image/jpeg`, `image/png`）。
  - *报错信息*：`"只能上传图片文件"`。

- 文件大小限制

  ：最大 5MB。

  - *校验逻辑*：文件大小不得超过 5 * 1024 * 1024 字节。
  - *报错信息*：`"图片大小不能超过5MB"`。

**5. 响应数据**

后端统一使用 `Result` 类进行封装，成功时返回URL，失败时返回错误信息。

**成功响应示例 (HTTP 200):**

json

编辑

```
{
  "code": 200,
  "msg": "操作成功",
  "data": "https://your-bucket.oss-cn-region.aliyuncs.com/xxx.jpg",
  "map": null
}
```

- **data**: 包含上传成功后的图片访问URL。

**失败响应示例:**

json

编辑

```
{
  "code": 500,
  "msg": "图片大小不能超过5MB",
  "data": null,
  "map": null
}
```





# 管理员接口

### **2.1 管理员登录 (Login)**

- **接口地址**: `/api/users/login`
- **请求方式**: `POST`
- **认证要求**: 无需 Token

**请求参数 (Body - JSON)**

表格

| 参数名   | 类型   | 必填 | 说明   |
| :------- | :----- | :--- | :----- |
| name     | string | 是   | 用户名 |
| password | string | 是   | 密码   |

**响应结果 (Response)**

- **成功 (200)**:

  json

  编辑

  ```json
  {
      "code": 200,
      "message": "登录成功",
      "data": {
          "token": "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3Nzc0MDE4OTYsInVzZXJJZCI6MX0.4LtJuHQdsyRZjU--CSk5ZsIbLoES2pc_eoAjCptoIBc",
          "tokenType": "Bearer",
          "expiresIn": 720000000,
          "userInfo": {
              "name": "admin",
              "password": "123456",
              "role": "admin"
          },
          "role": "admin"
      }
  }
  ```

- **失败 (500/自定义)**:

  - 用户不存在：`code: 0`, message: "账号不存在"
  - 密码错误：`code: 0`, message: "密码错误"

## 2.2修改模型外观，音色

### 1.**获取系统支持的音色列表**

***\*基本信息\****

表格

| 项目         | 内容                                                         |
| :----------- | :----------------------------------------------------------- |
| **接口名称** | 获取可用音色列表                                             |
| **请求路径** | `/api/voice/list`                                            |
| **请求方式** | `GET`                                                        |
| **接口描述** | 获取系统当前支持的所有音色配置（包含ID、名称、描述），用于前端下拉框或列表展示 |

***\*请求头 (Headers)\****

*无需特殊参数，若后端有全局鉴权则需携带通用 Token*

表格



| 参数名           | 类型   | 必填 | 说明               |
| :--------------- | :----- | :--- | :----------------- |
| **Content-Type** | string | 否   | `application/json` |

***\*请求参数 (Query)\****

*无 (该接口无需额外参数)*

***\*响应数据 (Response)\****

*状态码：200 OK*

**返回结构：**

json

编辑

```
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "voiceName": "晓晓",
      "description": "标准、清晰的通用女声"
    },
    {
      "id": 2,
      "voiceName": "云希",
      "description": "富有磁性的男声，适合解说"
    }
  ]
}
```

**字段说明：**

表格



| 字段名               | 类型   | 说明                                    |
| :------------------- | :----- | :-------------------------------------- |
| **code**             | int    | 状态码 (200 表示成功)                   |
| **message**          | string | 返回信息                                |
| **data**             | array  | 音色对象列表 (`List<VoiceVO>`)          |
| **data.id**          | int    | 音色的唯一 ID (数据库主键)              |
| **data.voiceName**   | string | 音色的名称 (对应 TTS 服务的 Voice Name) |
| **data.description** | string | 音色的描述信息                          |

### 2.**修改音色配置**

**基本信息**

表格

| 项目         | 内容                                                     |
| :----------- | :------------------------------------------------------- |
| **接口名称** | 修改音色配置                                             |
| **请求路径** | `/api/voice/update/{id}`                                 |
| **请求方式** | `PUT`                                                    |
| **接口描述** | 修改指定 ID 的音色配置信息（如名称、状态、排序、描述等） |
| **鉴权要求** | 需要管理员权限                                           |

**请求头**

表格

| 参数名            | 类型   | 必填 | 说明               |
| :---------------- | :----- | :--- | :----------------- |
| **Authorization** | string | 是   | Bearer Token       |
| **Content-Type**  | string | 是   | `application/json` |

**请求参数**

**1. 路径参数**

表格

| 参数名 | 类型 | 必填   | 说明                      |
| :----- | :--- | :----- | :------------------------ |
| **id** | int  | **是** | 要修改的音色记录的主键 ID |

**2. 请求体**

表格

| 参数名          | 类型   | 必填 | 说明                                     |
| :-------------- | :----- | :--- | :--------------------------------------- |
| **voice_code**  | string | 否   | 音色编码（如 "xiaoyun"），通常不建议修改 |
| **voice_name**  | string | 否   | 音色显示名称（如 "晓云"）                |
| **is_enabled**  | int    | 否   | 状态：1=启用，0=禁用                     |
|                 |        |      |                                          |
| **description** | string | 否   | 音色描述信息                             |

*请求示例：*

json

编辑

```
{
  "voice_name": "晓云",
  "is_enabled": 0
}
```

**响应数据**

*状态码：200 OK*

json

编辑

```json
{
  "code": 200,
  "message": "修改成功",
  "data": null
}
```

## 2.3上传，修改，删除文件

### 1.**上传文档**

**接口地址**: `/api/knowledge/upload`
**请求方式**: `POST`
**请求类型**: `multipart/form-data`

**请求参数**:

表格

| 参数名 | 类型 | 必填 | 说明         |
| :----- | :--- | :--- | :----------- |
| `file` | File | 是   | 待上传的文件 |

**响应参数**:

表格

| 字段名      | 类型    | 说明                                 |
| :---------- | :------ | :----------------------------------- |
| `success`   | Boolean | 是否成功                             |
| `docId`     | String  | 文档的唯一 ID (数据库生成)           |
| `filename`  | String  | 文件名                               |
| `chunks`    | Integer | 切分的块数量                         |
| `charCount` | Integer | 文件字符总数                         |
| `error`     | String  | 错误信息 (仅在 success=false 时出现) |

**请求示例 (cURL)**:

bash

编辑

```
curl -X POST "http://localhost:8080/api/knowledge/upload" \
  -F "file=@test.pdf"
```

**成功响应示例**:

json

编辑

```json
{
  "success": true,
  "docId": "123456789",
  "filename": "test.pdf",
  "chunks": 15,
  "charCount": 5200
}
```

------

### **2. 更新文档内容**

**接口地址**: `/api/knowledge/{docId}`
**请求方式**: `PUT`
*(注意：代码中使用了 `@RequestBody Map<String, String>`，接收的是 JSON 格式的 content)*

**路径参数 (Path Variable)**:

表格

| 参数名  | 类型   | 必填 | 说明              |
| :------ | :----- | :--- | :---------------- |
| `docId` | String | 是   | 需要更新的文档 ID |

**请求参数**:

表格

| 参数名 | 类型 | 必填 | 说明         |
| :----- | :--- | :--- | :----------- |
| `file` | File | 是   | 待上传的文件 |

**响应参数**:

表格

| 字段名    | 类型    | 说明               |
| :-------- | :------ | :----------------- |
| `success` | Boolean | 是否更新成功       |
| `chunks`  | Integer | 更新后切分的块数量 |
| `error`   | String  | 错误信息           |

**请求示例 (cURL)**:

bash

编辑

```
curl -X PUT "http://localhost:8080/api/knowledge/123456789" \
  -H "Content-Type: application/json" \
  -d '{"content": "这是新的文档内容"}'
```

**成功响应示例**:

json

编辑

```
{
  "success": true,
  "chunks": 10
}
```

------

### **3. 删除文档**

**接口地址**: `/api/knowledge/{docId}`
**请求方式**: `DELETE`

**路径参数 (Path Variable)**:

表格

| 参数名  | 类型   | 必填 | 说明              |
| :------ | :----- | :--- | :---------------- |
| `docId` | String | 是   | 需要删除的文档 ID |

**响应参数**:

表格

| 字段名    | 类型    | 说明         |
| :-------- | :------ | :----------- |
| `success` | Boolean | 是否删除成功 |

**请求示例 (cURL)**:

bash

编辑

```
curl -X DELETE "http://localhost:8080/api/knowledge/123456789"
```

**成功响应示例**:

json

编辑

```
{
  "success": true
}
```

### 4.**获取知识库文件列表**

**接口描述**

获取上传到知识库的所有文件列表，支持分页、按文件名搜索和按状态筛选。
*对应数据库表：`knowledge_document`*

**基本信息**

- **接口地址**: `/api/knowledge/documents`
- **请求方式**: `GET`

**请求参数 (Query Params)**

表格

| 参数名      | 类型    | 必填 | 说明                                                        | 示例值        |
| :---------- | :------ | :--- | :---------------------------------------------------------- | :------------ |
| `page`      | Integer | 否   | 页码，默认为 1                                              | `1`           |
| `page_size` | Integer | 否   | 每页数量，默认为 10                                         | `20`          |
| `filename`  | String  | 否   | 模糊搜索文件名                                              | `"用户手册"`  |
| `status`    | String  | 否   | 筛选状态 (如: `draft`, `processing`, `completed`, `failed`) | `"completed"` |

**响应参数 (Response)**

返回一个分页对象：

表格

| 参数名           | 类型    | 说明                           |
| :--------------- | :------ | :----------------------------- |
| `code`           | Integer | 状态码 (200 成功)              |
| `message`        | String  | 提示信息                       |
| `data.list`      | Array   | 文件对象列表                   |
| `data.total`     | Long    | 总记录数（用于前端计算总页数） |
| `data.page`      | Integer | 当前页码                       |
| `data.page_size` | Integer | 每页数量                       |

**响应示例 (JSON)**

json

编辑

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "total": 35,
    "page": 1,
    "page_size": 10,
    "list": [
      {
        "id": "doc_20260411001",
        "filename": "景区游客服务规范.pdf",
        "fileType": "pdf",
        "fileSize": 1024576,
        "chunkCount": 45,
        "status": "completed",
        "createdAt": "2026-04-11 10:00:00"
      },
      {
        "id": "doc_20260411002",
        "filename": "常见问题解答.docx",
        "fileType": "docx",
        "fileSize": 204800,
        "chunkCount": 12,
        "status": "processing",
        "createdAt": "2026-04-11 11:30:00"
      }
    ]
  }
}
```



## 2.4**获取今日游客分析报告**

### 1.**获取今日游客满意度统计**

**接口描述**

获取今日游客对话的情感分析统计数据（包含正面、负面、中立数量及满意度百分比）。
*注：数据来源于 AI 对 Redis 中今日聊天记录的分析。*

**基本信息**

- **接口地址**: `/api/date/emotion`
- **请求方式**: `GET`
- **认证方式**: Bearer Token (如适用)

**请求参数**

```json
{ "date": "2026-04-12" }
```

**响应参数**

返回 JSON 对象，包含以下字段：

表格

| 参数名                  | 类型    | 说明                 | 示例值       |
| :---------------------- | :------ | :------------------- | :----------- |
| `code`                  | Integer | 状态码，200 表示成功 | `200`        |
| `message`               | String  | 响应消息             | `"操作成功"` |
| `data`                  | Object  | 统计数据主体         | -            |
| `data.positiveCount`    | Integer | 正面情绪对话数量     | `10`         |
| `data.negativeCount`    | Integer | 负面情绪对话数量     | `2`          |
| `data.neutralCount`     | Integer | 中立情绪对话数量     | `5`          |
| `data.satisfactionRate` | String  | 满意度百分比         | `"80%"`      |
|                         |         |                      |              |

**响应示例**

成功响应：

json

编辑

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "positiveCount": 1,
    "negativeCount": 3,
    "neutralCount": 1,
    "satisfactionRate": "25%"
  }
}
```

异常响应（例如 AI 正在分析中，暂无数据）：

json

编辑

```json
{
  "code": 500,
  "message": "今日数据正在分析中，请稍后刷新",
  "data": null
}
```

### 2.获取用户反馈

**1. 接口基本信息**

表格

| 项目         | 内容                               |
| :----------- | :--------------------------------- |
| **接口名称** | 获取今日游客分析报告               |
| **请求协议** | HTTP                               |
| **请求方式** | GET                                |
| **接口路径** | `/api/ai/history/summary`          |
| **认证要求** | 无（根据当前代码，未标注权限拦截） |

**2. 请求参数**

该接口为单纯的获取请求，**无路径参数（Path Variables）或查询参数（Query Parameters）**。
直接发起 GET 请求即可。

**3. 响应结果**

响应体为直接的字符串（String），内容为 Markdown 格式的文本。

**成功响应示例：**

markdown

编辑

```json
**今日游客感受度报告（2026-04-11）**

---

### 1. 游客关注点分析  
- **人流问题**：游客对景区人流量大表示不满，有差评反馈。  
- **设施指引不清**：多次询问“厕所位置”，反映出标识不明显或指引不足的问题。

---

### 2. 情感趋势报告  
- **负面情绪**：部分游客因人多和设施不明确感到不满。  
- **积极回应**：对于观光车的建议，游客表现出一定的接受意愿。

---

### 3. 服务建议反馈  
- **优化人流管理**：可考虑分时段预约或增加导流措施。  
- **加强标识系统**：特别是厕所、休息区等关键区域，需清晰标示并定期检查。  
- **提升引导服务**：增加工作人员或志愿者，帮助游客快速找到所需设施。

---
---

{
  "positive_count": 3,
  "negative_count": 4,
  "neutral_count": 2,
  "satisfaction_rate": "50%"
}

希望这份报告能为后续服务优化提供参考！😊
```

**失败/异常响应示例：**

text

编辑

```
生成总结失败: java.lang.NullPointerException: ...
```

*(注：这是根据代码中的 `try-catch` 逻辑生成的，实际开发中建议返回 JSON 格式错误码)*



### 3.得到本周/本日的服务人次

- **请求地址**：`GET /api/date/count`
- **请求方式**：`GET`

响应参数

表格

| 参数名             | 类型    | 说明                           |
| :----------------- | :------ | :----------------------------- |
| `code`             | int     | 200 表示成功                   |
| `message`          | string  | 提示信息                       |
| `data`             | object  | 返回的具体数据                 |
| `data.weeklyCount` | Integer | **本周服务人次**（独立用户数） |
| `data.dailyCount`  | Integer | **当日服务人次**（独立用户数） |

**响应示例**

json

编辑

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "weeklyCount": 150,
    "dailyCount": 30
  }
}
```

###  **4.热门问答接口文档**

**1. 接口基本信息**

表格

| 项目         | 内容                 |
| :----------- | :------------------- |
| **接口名称** | 获取热门问答 Top N   |
| **请求协议** | HTTP GET             |
| **请求路径** | `/api/date/hotwenda` |
| **所属模块** | 大屏数据 / 统计分析  |
| **响应格式** | JSON                 |

**2. 请求说明**

- 请求方式

  ：

  ```
  GET
  ```

  - *注意：虽然代码中使用了 `@GetMapping`，这意味着它通过 URL 路径获取参数，而不是 Body。*

- 请求参数

  ：

  - 该接口在当前代码中 **无 URL 参数**，热度排名数量 `Top N` 是在后端硬编码（默认 Top 10）或通过业务逻辑决定的。

**3. 响应参数 (Response)**

响应体是一个标准的 `Result` 包装对象，数据主体（`data`）是一个字符串集合（Set）。

**响应结构示例：**

json

编辑

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    "风景很漂亮",
    "厕所找不到可以改一下",
    "怎么去市中心"
  ]
}
```

**字段详细说明：**

表格

| 字段名      | 类型    | 说明                                   |
| :---------- | :------ | :------------------------------------- |
| **code**    | Integer | 状态码。`200` 表示成功，其他表示异常。 |
| **message** | String  | 返回信息。如 "操作成功"。              |
| **data**    | Array   | **核心数据**：热门问题列表。           |
| data[n]     | String  | 具体的问题文本。                       |

**4. 数据排序逻辑**

- **排序依据**：根据问题的 **被提问次数（热度）** 进行排序。
- **统计范围**：**全平台所有用户**（不分用户 ID）。



## 2.5修改tips

```
注意：如果点击启用与禁用的键，将config传递过来
```

**1. 接口描述**

- **用途**：供管理员在 PC 端后台使用，用于修改数字人/系统的欢迎语或特定提示词。
- **逻辑说明**：接收前端传来的字符串，存入数据库（Service 层逻辑），并返回操作结果。

**2. 基本信息**

- **接口地址**：`/api/qa/tipsconfig`
- **请求方式**：`POST`
- **请求头**：`Content-Type: text/plain` (因为后端接收的是 String 而不是 JSON 对象)

**3. 请求参数**

**Body 参数（纯文本）**：

表格



| 参数位置 | 类型   | 必填 | 说明                                                         |
| :------- | :----- | :--- | :----------------------------------------------------------- |
| Body     | String | 是   | 需要设置的提示语内容。注意：这里直接传**纯文本字符串**，不要包成 JSON 对象。 |

> **⚠️ 开发注意**：
> 由于后端使用 `@RequestBody String config` 接收，前端发送数据时 **不能** 发送 `{ "config": "..." }` 这样的 JSON 格式，否则会报错。必须直接发送字符串内容。

**4. 响应参数**

表格

| 参数名 | 类型    | 说明                                 |
| :----- | :------ | :----------------------------------- |
| code   | Integer | 状态码（200 表示成功）               |
| msg    | String  | 响应消息，固定为 "操作成功"          |
| data   | String  | 返回刚才保存的字符串内容（原样返回） |

**5. 请求示例**

**HTTP 请求示例：**

http

编辑

```json
POST /tipsconfig HTTP/1.1
Content-Type: text/plain

五一期间人流量大。
```

**6. 响应示例**

**成功响应：**

json

编辑

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": "五一人太多了，不推荐去。"
}
```





## 2.6得到所有tips

路径：

- `/api/qa/tips/list`

- GET

  请求参数：无

  返回值：

  

```json

    "code": 200,
    "message": "操作成功",
    "data": [
        {
            "id": 1,
            "config": "ssss",
            "createTime": "2026-04-21T19:34:35",
            "status": 0
        },
        {
            "id": 2,
            "config": "杀杀杀",
            "createTime": "2026-04-21T20:20:07",
            "status": 0
        },
        {
            "id": 3,
            "config": "水水水水水",
            "createTime": "2026-04-21T20:20:18",
            "status": 0
        },
        {
            "id": 4,
            "config": "水水水水",
            "createTime": "2026-04-21T20:20:28",
            "status": 0
        },
        {
            "id": 5,
            "config": "123456",
            "createTime": "2026-04-21T21:18:38",
            "status": 0
        },
        {
            "id": 6,
            "config": "11111",
            "createTime": "2026-04-21T21:18:52",
            "status": 0
        },
        {
            "id": 7,
            "config": "123456",
            "createTime": "2026-04-21T21:19:57",
            "status": 1
        }
    ]
}
```





## 2.7启用tips

路径：

`/api/qa/tipuse`

PUT

请求数据：

Integer  id（tips的id）



返回参数

```json
{
  "code": 200,
  "msg": "操作成功",
  "data": null
}
```



------

## 错误码说明

| HTTP状态码 | 说明           |
| :--------- | :------------- |
| 200        | 成功           |
| 500        | 服务器内部错误 |

------

# 注意事项

1. **音频格式**: 建议使用 MP3 格式，采样率 16kHz





# 新增接口

## 一、打分接口文档

基本信息

| 项目         | 内容                           |
| :----------- | :----------------------------- |
| 接口名称     | 景点打分                       |
| 基础路径     | `/api/ratings`                 |
| 请求方式     | POST                           |
| 认证方式     | Bearer Token（用户登录后获取） |
| Content-Type | application/json               |

------

接口描述

用户对某个景点进行打分（1-5星），支持修改已打分数。每次打分后自动更新该景点的平均分和评分人数。

------

请求参数

Headers

| 参数名        | 类型   | 必填 | 说明           |
| :------------ | :----- | :--- | :------------- |
| Authorization | string | 是   | Bearer {token} |

Body

| 参数名  | 类型   | 必填 | 说明                               | 示例         |
| :------ | :----- | :--- | :--------------------------------- | :----------- |
| spot_id | string | 是   | 景点ID                             | `"spot_001"` |
| score   | float  | 是   | 评分值，范围1.0-5.0，支持0.5分间隔 | `4.5`        |

请求示例

json

```
{
    "spot_id": "spot_001",
    "score": 4.5
}
```



------

响应参数

成功响应

| 参数名            | 类型   | 说明                |
| :---------------- | :----- | :------------------ |
| code              | int    | 状态码，200表示成功 |
| message           | string | 提示信息            |
| data              | object | 返回数据            |
| data.spot_id      | string | 景点ID              |
| data.avg_score    | float  | 该景点最新平均分    |
| data.rating_count | int    | 该景点累计评分人数  |
| data.user_score   | float  | 用户当前打的分数    |

响应示例

json

```
{
    "code": 200,
    "message": "打分成功",
    "data": {
        "spot_id": "spot_001",
        "avg_score": 4.6,
        "rating_count": 238,
        "user_score": 4.5
    }
}
```



错误响应

json

```
{
    "code": 400,
    "message": "评分必须在1.0-5.0之间",
    "data": null
}
```



------

错误码说明

| code | 说明                                    |
| :--- | :-------------------------------------- |
| 200  | 成功                                    |
| 400  | 参数错误（分数超出范围、spot_id为空等） |
| 401  | 未登录或token失效                       |
| 403  | 无权限操作                              |
| 429  | 操作过于频繁（同一景点1分钟内多次打分） |
| 500  | 服务器内部错误                          |

------



------

数据库操作说明

调用此接口时，后端需执行：

sql

```
-- 1. 插入或更新用户打分
INSERT INTO user_ratings (user_id, spot_id, score, created_at, updated_at)
VALUES (?, ?, ?, NOW(), NOW())
ON DUPLICATE KEY UPDATE score = ?, updated_at = NOW();

-- 2. 更新景点平均分
UPDATE spot_rating_stats 
SET avg_score = (avg_score * rating_count - old_score + new_score) / rating_count,
    rating_count = rating_count
WHERE spot_id = ?;
```



------

## 二、评价接口文档

基本信息

| 项目         | 内容                           |
| :----------- | :----------------------------- |
| 接口名称     | 景点评价                       |
| 基础路径     | `/api/comments`                |
| 请求方式     | POST                           |
| 认证方式     | Bearer Token（用户登录后获取） |
| Content-Type | application/json               |

------

接口描述

用户对某个景点撰写文字评价和标签。评价是可选的，用户可以在打分后单独提交评价，也可以不写评价只打分。

------

请求参数

Headers

| 参数名        | 类型   | 必填 | 说明           |
| :------------ | :----- | :--- | :------------- |
| Authorization | string | 是   | Bearer {token} |

Body

| 参数名  | 类型   | 必填 | 说明                | 示例                    |
| :------ | :----- | :--- | :------------------ | :---------------------- |
| spot_id | string | 是   | 景点ID              | `"spot_001"`            |
| comment | string | 是   | 评价内容，最多500字 | `"景色很美，讲解生动"`  |
| tags    | array  | 否   | 评价标签数组        | `["景色美","讲解生动"]` |

请求示例

json

```
{
    "spot_id": "spot_001",
    "comment": "日落非常震撼，讲解很细致，就是人有点多",
    "tags": ["景色美", "讲解生动", "人多"]
}
```



------

响应参数

成功响应

| 参数名          | 类型   | 说明                                                         |
| :-------------- | :----- | :----------------------------------------------------------- |
| code            | int    | 状态码，200表示成功                                          |
| message         | string | 提示信息                                                     |
| data            | object | 返回数据                                                     |
| data.comment_id | string | 评价记录ID                                                   |
| data.status     | string | 状态：pending（审核中）、approved（已通过）、rejected（已拒绝） |

响应示例

json

```
{
    "code": 200,
    "message": "评价提交成功，审核通过后即可展示",
    "data": {
        "comment_id": "cmt_20260510_001",
        "status": "pending"
    }
}
```



错误响应

json

```
{
    "code": 400,
    "message": "评价内容不能为空",
    "data": null
}
```



json

```
{
    "code": 400,
    "message": "评价内容超过500字限制",
    "data": null
}
```



------

错误码说明

| code | 说明                                      |
| :--- | :---------------------------------------- |
| 200  | 成功                                      |
| 400  | 参数错误（评论为空、超长、spot_id为空等） |
| 401  | 未登录或token失效                         |
| 403  | 无权限操作（如被禁言用户）                |
| 429  | 提交过于频繁（1分钟内多次提交评价）       |
| 500  | 服务器内部错误                            |

## 二、获取景点评分信息

接口描述

获取某个景点的平均分、评分人数，以及当前用户的个人评分（如已打分）。

请求信息

| 项目 | 说明                          |
| :--- | :---------------------------- |
| 路径 | /api`/ratings/spot/{spot_id}` |
| 方法 | `GET`                         |

路径参数

| 参数名  | 类型   | 必填 | 说明   |
| :------ | :----- | :--- | :----- |
| spot_id | string | 是   | 景点ID |

请求参数（Query）

| 参数名  | 类型   | 必填 | 说明                           |
| :------ | :----- | :--- | :----------------------------- |
| user_id | string | 否   | 用户ID（不传则只返回公共评分） |

请求示例

text

```
GET /v1/ratings/spot/SPOT_001?user_id=USER_123
```



响应参数

| 参数名             | 类型   | 说明                             |
| :----------------- | :----- | :------------------------------- |
| spot_id            | string | 景点ID                           |
| spot_name          | string | 景点名称                         |
| avg_score          | float  | 平均分                           |
| rating_count       | int    | 评分总人数                       |
| score_distribution | object | 评分分布（各分数段人数）         |
| user_score         | float  | 当前用户的评分（null表示未评分） |
| user_comment       | string | 当前用户的评价（未评时为null）   |

响应示例

json

```
{
    "code": 200,
    "data": {
        "spot_id": "SPOT_001",
        "spot_name": "观日台",
        "avg_score": 4.6,
        "rating_count": 238,
        "score_distribution": {
            "5": 120,
            "4": 85,
            "3": 25,
            "2": 6,
            "1": 2
        },
        "user_score": 4.5,
        "user_comment": "日落非常震撼，讲解很细致"
    }
}
```



------

## 三、批量获取景点评分

接口描述

一次获取多个景点的评分信息，用于路线页列表展示。

请求信息

| 项目 | 说明                 |
| :--- | :------------------- |
| 路径 | /api`/ratings/batch` |
| 方法 | `POST`               |

请求参数

json

```
{
    "spot_ids": ["SPOT_001", "SPOT_002", "SPOT_003"],
    "user_id": "USER_123"
}
```



响应示例

json

```
{
    "code": 200,
    "data": {
        "SPOT_001": {
            "avg_score": 4.6,
            "rating_count": 238,
            "user_score": 4.5
        },
        "SPOT_002": {
            "avg_score": 4.2,
            "rating_count": 156,
            "user_score": null
        },
        "SPOT_003": {
            "avg_score": 3.8,
            "rating_count": 89,
            "user_score": 3.0
        }
    }
}
```



------

## 四、获取游客评价列表（用于向量库同步）

接口描述

获取某个景点的游客评价文本，用于同步到向量库或展示在详情页。

请求信息

| 项目 | 说明                              |
| :--- | :-------------------------------- |
| 路径 | /api`/ratings/comments/{spot_id}` |
| 方法 | `GET`                             |

请求参数（Query）

| 参数名    | 类型   | 必填 | 说明                                                         |
| :-------- | :----- | :--- | :----------------------------------------------------------- |
| page      | int    | 否   | 页码，默认1                                                  |
| page_size | int    | 否   | 每页数量，默认10，最大50                                     |
| sort      | string | 否   | 排序：`latest`（最新）、`helpful`（最有帮助）、`highest`（最高分），默认`latest` |

响应示例

json

```
{
    "code": 200,
    "data": {
        "total": 238,
        "page": 1,
        "page_size": 10,
        "comments": [
            {
                "user_id": "USER_123",
                "user_nickname": "旅行家***",
                "score": 5.0,
                "comment": "太美了！一定要来看日落",
                "tags": ["景色美", "必去"],
                "helpful_count": 45,
                "created_at": "2026-05-10T14:30:00Z"
            },
            {
                "user_id": "USER_456",
                "user_nickname": "小***",
                "score": 4.0,
                "comment": "风景不错，就是人太多",
                "tags": ["景色美", "人多"],
                "helpful_count": 12,
                "created_at": "2026-05-09T10:15:00Z"
            }
        ]
    }
}
```



------

## 五、删除/修改评分

接口描述

用户删除自己的评分，或修改评分内容。

请求信息

| 项目 | 说明                             |
| :--- | :------------------------------- |
| 路径 | /api`/ratings/{rating_id}`       |
| 方法 | `PUT`（修改） / `DELETE`（删除） |

修改请求示例

json

```
{
    "score": 5.0,
    "comment": "修改后的评价",
    "tags": ["景色美", "震撼"]
}
```



删除响应示例

json

```
{
    "code": 200,
    "message": "评分已删除",
    "data": {
        "avg_score": 4.5,
        "rating_count": 237
    }
}
```