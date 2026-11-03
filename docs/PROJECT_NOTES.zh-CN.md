> 发布版说明：本文基于上传的项目文档整理，目录统一为 `face-service`，并更正了网络环境、错误状态码和代理行为说明。图片、参考人脸和模型需另行放回；以英文 README 和源码为准。

# DIVINE — AI 神谕档案 项目说明文档

## 一、项目简介

这是一个概念性交互艺术项目，通过多页图片驱动的交互流程，引导用户提交个人信息、拍摄人脸，最终由 AI 生成一份"未来人生档案"。档案表面个性化，实则高度同质化，讽刺 AI 时代对个体差异的系统性消解。

**核心链路**：拍照 → insightface 换脸融合 → rembg 自动抠图 → 透明 PNG 人像悬浮在档案底图右侧。

---

## 二、项目结构

```
AI-Deity-Web/
├── ai-deity-web/              # 前端 (React + Vite)
│   ├── src/
│   │   ├── App.jsx            # 主组件（13页状态机 + 交互逻辑）
│   │   ├── App.css            # 全部样式
│   │   ├── main.jsx           # 入口
│   │   └── assets/            # 25张图片资源
│   ├── index.html
│   └── package.json
│
├── server/                    # 后端 (Express)
│   ├── index.js               # API 服务 + AI 档案生成提示词 + 人脸融合代理
│   ├── .env                   # 千帆 API Key
│   └── package.json
│
└── face-service/                    # 人脸融合服务 (Python Flask)
    ├── face_api.py            # Flask API 服务（端口3002，含 insightface + rembg）
    ├── face.py                # 原始本地运行版（带GUI）
    ├── inswapper_128.onnx     # 换脸模型
    ├── male_average.png       # 男性参考素材
    ├── female_average.png     # 女性参考素材
    └── .venv/                 # Python 虚拟环境
```

---

## 三、服务架构

```
浏览器 (localhost:5173+)
   │
   ├── GET  /                          ──→ Vite Dev Server :5173/4/5
   │
   ├── POST /api/generateArchive       ──→ Express :3001 ──→ 百度千帆 DeepSeek-v4-pro
   │                                         │
   │                                         └── 兜底: FALLBACK_ARCHIVE (内置写死)
   │
   └── POST /api/face-fusion           ──→ Express :3001 ──→ Python Flask :3002
                                            (代理转发)         ├─ insightface 换脸
                                                              └─ rembg 抠图 → PNG 透明
```

| 服务 | 技术栈 | 端口 | 关键依赖 |
|------|--------|------|----------|
| 前端 | React 19 + Vite 8 | 5173+ | — |
| Express | Node.js Express 4 | 3001 | openai, cors, dotenv |
| Python | Flask + insightface + rembg | 3002 | insightface, rembg, opencv-python, numpy, flask-cors |

> **运行说明**：Express 与 Python 服务需要运行在能相互访问的本机网络环境中；无需将禁用沙箱作为项目运行要求。

---

## 四、启动方式

### 4.1 安装依赖

```powershell
# 前端
cd ai-deity-web
npm install

# Express 后端
cd ..\server
npm install

# Python 人脸服务
cd ..\face-service
.\.venv\Scripts\pip.exe install flask flask-cors insightface rembg opencv-python numpy
```

### 4.2 启动服务（三个终端）

```powershell
# 终端1 — Python 人脸融合服务（必须先启动，加载模型需10-15秒）
cd face-service
.\.venv\Scripts\python.exe face_api.py
# → http://127.0.0.1:3002

# 终端2 — Express 后端
cd server
node index.js
# → http://localhost:3001

# 终端3 — 前端
cd ai-deity-web
npx vite --host
# → http://localhost:5173（或5174/5175，取决于端口占用）
```

浏览器打开 Vite 输出的 URL。

---

## 五、用户交互流程（13页）

```
┌─────────────┐
│  [0] 启动页  │  点击任意位置
└──────┬──────┘
       ▼
┌─────────────┐
│ [1] 引导页1  │  3秒后自动跳转
└──────┬──────┘
       ▼
┌─────────────┐
│ [2] 引导页2  │  4个问题按钮，点击任意按钮→下一页
└──────┬──────┘
       ▼
┌─────────────┐
│ [3] 输入页   │  填写 Name / Age / Occupation
│             │  点击 ✓ 确认 → POST /api/generateArchive
│             │  ├─ 成功：拿到 AI 生成的档案数据
│             │  └─ 失败：使用内置 FALLBACK_ARCHIVE_DATA
└──────┬──────┘
       ▼
┌─────────────┐
│ [4] 摄像头页 │  状态机（见下方详述）
└──────┬──────┘
       ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ [5]  │→│ [6]  │→│ [7]  │→│ [8]  │  每2秒自动切
│Load1 │ │Load2 │ │Load3 │ │Load4 │  第8页出现 "Click to View"
└──────┘ └──────┘ └──────┘ └──┬───┘
                              ▼
┌──────────────────────────────────┐
│ [9] 档案总览页（可滚动）            │
│                                  │
│  全宽底图 + 绝对定位覆盖层：         │
│  · 个人信息（姓名/年龄/职业/编号等）  │
│  · 核心价值 ×3                     │
│  · 人群关键词 ×3                   │
│  · 推荐方向 ×3                     │
│  · 神谕寄语                       │
│  · 抠图人像（透明PNG，右侧悬浮）     │
│  · 三个信封（封口/打开两种状态）     │
└──┬──────────┬──────────┬─────────┘
   ▼          ▼          ▼
┌──────┐  ┌──────┐  ┌──────┐
│ [10] │  │ [11] │  │ [12] │
│2026  │  │2030  │  │2036  │
│-2029 │  │-2035 │  │-2045 │
└──────┘  └──────┘  └──────┘
   点击任意位置 → 返回 [9]
```

### 第4页（摄像头页）状态机

| 状态 | 触发条件 | 显示内容 |
|------|----------|----------|
| `cameraLoading` | 进入页4，请求权限中 | "Accessing camera..." 闪烁 |
| `cameraDenied` | 权限被拒绝 | "Camera unavailable" + Retry / Continue 按钮 |
| 摄像头就绪 | getUserMedia 成功 | `<video>` 实时画面 + 圆形 ⬤ 拍照按钮 |
| `isMerging` | 点击 ⬤ 后 | "Analyzing & Aligning..." |
| `faceMerged` | 融合成功 | 圆形融合结果 + "Identity Aligned" → 3秒后自动跳转 |
| `mergeError` | 融合失败 | 错误提示文字，可重拍 |

**第4页无自动跳转定时器**。只有融合成功后，`handleCaptureAndMerge` 内部设3秒 `setTimeout`。

### 页面切换方式

| 页面 | 触发方式 |
|------|----------|
| 0→1 | 点击 |
| 1→2 | 3秒后自动 |
| 2→3 | 点击任意问题按钮 |
| 3→4 | 点击✓确认按钮 |
| 4→5 | 融合成功→3秒后自动 / 被拒→手动Continue |
| 5→6→7→8 | 每2秒自动 |
| 8→9 | 点击"Click to View"按钮 |
| 9→10/11/12 | 点击信封 |
| 10/11/12→9 | 点击任意位置 |
| 全部切换 | 400ms 淡入淡出动画 |

---

## 六、API 接口说明

### 6.1 POST /api/generateArchive — AI 档案生成

**请求**:
```json
{
  "name": "Alice",
  "age": "28",
  "occupation": "Software Engineer"
}
```

**响应**:
```json
{
  "userProfile": {
    "name": "Alice",
    "age": "28",
    "occupation": "Software Engineer",
    "classification": "ID-38472",
    "futureStability": "93%",
    "socialAdaptability": "89%"
  },
  "archiveMain": {
    "coreValues": ["Efficiency", "Compliance", "Optimization"],
    "crowdKeywords": ["Alignment", "System", "Coordination"],
    "recommendationDirection": ["Optimization", "Integration", "Stabilization"],
    "deityMessage": "The path is clear; deviation is deviation."
  },
  "stages": [
    { "period": "2026-2029", "title": "Calibration and Alignment", "paragraph": "..." },
    { "period": "2030-2035", "title": "Institutional Optimization", "paragraph": "..." },
    { "period": "2036-2045", "title": "System Integration", "paragraph": "..." }
  ]
}
```

### 6.2 POST /api/face-fusion — 人脸融合 + 抠图

Express :3001 代理转发到 Python :3002。请求中 `image` 支持带或不带 `data:image/jpeg;base64,` 前缀。

**请求**（Python 接受 `alpha`，当前 Express 代理仅转发 `image`）:
```json
{
  "image": "data:image/jpeg;base64,...",
  "alpha": 0.5
}
```

**成功响应**（返回透明 PNG）:
```json
{
  "success": true,
  "image": "data:image/png;base64,..."
}
```

**失败响应**（根据当前 Python 代码，缺少参数返回 400，处理失败可返回 500；同时检查 `success` 字段）:
```json
{
  "success": false,
  "error": "未在照片中检测到清晰人脸"
}
```

**融合流程**（Python 端三级降级）:
```
方案1：embedding 向量融合 → 成功则抠图返回 PNG
    ↓ 失败
方案2：像素混合（swapper.get × 2 + addWeighted）→ 成功则抠图返回 PNG
    ↓ 失败
方案3：返回原图 + 抠图 → PNG
```

---

## 七、容错设计

| 场景 | 处理方式 |
|------|----------|
| AI API 调用失败 | 使用内置 `FALLBACK_ARCHIVE_DATA` |
| AI 返回格式错误 | JSON 解析失败 → 使用兜底数据 |
| 三个输入全空 | 弹出 alert 提示填写 |
| 摄像头权限被拒绝 | 显示 "Camera unavailable" + Retry / Continue |
| 人脸检测失败（无人脸） | 返回 `{"success": false, "error": "未在照片中检测到清晰人脸"}` |
| 图片解码失败 | 返回 `{"success": false, "error": "图像数据解析失败"}` |
| Base64 解码失败 | 外层异常处理返回 `success: false`，状态码 500 |
| 融合方案1/2全失败 | 降级返回原图+抠图（方案3） |
| Python 服务不可用 | Express 代理请求失败时返回 500，前端显示错误 |
| 中文路径 cv2.imread 失败 | 使用 `np.fromfile` + `cv2.imdecode` 替代 |
| Express 无法连接 Python | 检查 Python 是否启动，以及本机 3002 端口是否可达 |

---

## 八、第9页 CSS 布局说明

### DOM 结构

```
<div .archive-scroll-page>    (relative, 100vw, 可滚动)
  <img .archive-bg>           文档流 — 全宽底图，撑开页面高度
  <div .archive-overlay>      绝对定位 — 覆盖在底图上方
    <img .fused-profile-img>  抠图人像 (z-index: 10)
    <div .archive-text-layer> 动态文字 (z-index: 20)
    <div .archive-envelope-layer> 信封按钮 (z-index: 30)
```

### 调试方法

所有文字/信封元素均带有彩色 `outline` 虚线框，方便肉眼定位：

| 虚线框颜色 | 对应内容 |
|-----------|---------|
| 红色 | 个人信息（name/age/occupation 等6行） |
| 橙色 | 核心价值（3个词） |
| 绿色 | 人群关键词（3个） |
| 蓝色 | 推荐方向（3个并排） |
| 粉红 | 神谕寄语 |
| 白色半透 | 抠图人像（`.fused-profile-img`） |

所有坐标使用 `top/left %` 相对于底图高度定位。在 App.css 中修改百分比数值，保存后 Vite HMR 即时生效，无需刷新。

调好后删除所有 `outline` 行即可进入正式状态。

---

## 九、核心设计理念

AI 提示词中规定了严格的输出规则：

- 三阶段固定人生路线（校准→优化→融合），不可改变
- 核心价值 / 关键词 / 推荐方向均从固定词池中随机选取
- 语气必须冰冷、制度式、略带压迫感
- 禁止个性化叙事、禁止温暖激励语言
- 不同职业只在表面有微小差异，底层结构高度一致

这正体现了项目主题：**AI 驱动下的未来规划同质化**——你以为得到了个性化档案，实则每个人都走向相同的终点。

同时，人脸融合 + 自动抠图将用户的"脸"从身体背景中抽离，悬浮在冰冷的档案底图之上，强化了"个体被剥离、融入系统"的视觉隐喻。
