# 路线 1：HTML + sql.js（WASM SQLite）+ PakePlus 打包安卓 APK

纯前端、完全离线、本地自用。数据库是标准 SQLite 文件，引擎用 WASM 在 WebView 里跑，
数据持久化到安卓本地 IndexedDB，断网可用，不需要服务器、不需要 JDK / Android Studio / SDK。

## 一、目录结构

```
android-sqlite-demo/
├── index.html          # 页面 + 全部业务逻辑（建表 / 插入 / 查询 / 持久化 / 导出）
└── assets/
    ├── sql-wasm.js     # sql.js 引擎（已下载到本地，离线用）
    └── sql-wasm.wasm   # SQLite WASM 二进制（已下载到本地，离线用）
```

## 二、环境安装（电脑端，只有一步）

1. 去 PakePlus 官网下载对应你电脑系统的安装包：<https://sjj1024.github.io/PakePlus/zh/>
   - 开源项目，Windows / macOS / Linux 都有。
2. 安装后打开即可。**不用装 JDK、Android SDK、Node、Gradle**，本地打包它自带构建链。
3. （可选）如果想走云端打包而不是本地打包，需要一个 GitHub Token；本地打包不需要。

> 手机端什么都不用装，最后 APK 传到手机直接安装。

## 三、先在电脑浏览器里把 Demo 跑通

不要直接双击 index.html（file:// 下 WASM / IndexedDB 可能被浏览器拦），起个本地静态服务：

```bash
# 进入本目录
cd android-sqlite-demo

# 任选其一起服务（二选一）
python3 -m http.server 8080
# 或者
npx serve .
```

浏览器打开 `http://localhost:8080`，验证：

1. 状态提示「数据库已就绪」。
2. 输入框随便打一条，点「插入」，列表立刻出现这条记录。
3. 刷新页面，数据还在（说明已经持久化到 IndexedDB）。
4. 点「导出 .db 文件」，下载 `notes.db`，可以用 DB Browser for SQLite 打开核对。

## 四、打包成 APK

1. 打开 PakePlus，新建项目，**选择本目录**（包含 index.html 的那一层）。
2. 填写应用名称（支持中文）、可选自定义图标。
3. 平台勾选 Android。
4. 打包方式选「本地打包」，一键构建，约几十秒到几分钟，得到 APK。
5. 把 APK 传到安卓手机，允许安装未知来源应用，装上即可，断网正常用。

## 五、Demo 代码关键点（index.html 里）

### 1. 加载本地 WASM（不要写 CDN，保证离线）

```js
const SQL = await initSqlJs({
  locateFile: file => `assets/${file}`
});
```

### 2. 首次建表

```js
db.run(`CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  created_at TEXT NOT NULL
)`);
```

### 3. 插入一条数据（参数化写法，防 SQL 注入）

```js
const now = new Date().toLocaleString('zh-CN', { hour12: false });
db.run('INSERT INTO notes (title, created_at) VALUES (?, ?)', [title, now]);
```

### 4. 查询

```js
const res = db.exec('SELECT id, title, created_at FROM notes ORDER BY id DESC');
// res[0].columns 是字段名，res[0].values 是二维数组
```

### 5. 持久化（重点）

sql.js 的库默认只在内存里，关掉页面就没。所以每次写完操作，用 `db.export()` 导出
SQLite 二进制，存进浏览器/ WebView 的 IndexedDB；下次启动再从 IndexedDB 读回来塞进
`new SQL.Database(...)`。

```js
// 存
const data = db.export();
await idbSet(DB_KEY, data.buffer);

// 取
const saved = await idbGet(DB_KEY);
db = new SQL.Database(new Uint8Array(saved));
```

### 6. 导出标准 .db 文件

```js
const data = db.export();
const blob = new Blob([data], { type: 'application/x-sqlite3' });
// 触发下载 notes.db
```

## 六、注意事项 / 局限

- **所有 JS / WASM / 图片都必须放本地相对路径**，别引用外网 CDN，否则打包后断网打不开。
- IndexedDB 清浏览器数据 / 卸载 APP 会丢库；重要数据定期用「导出 .db 文件」备份。
- 这套 WASM 方案适合自用小工具（几千行以内）。数据量上万、查询频繁，再换路线 2
  （Capacitor + 原生 SQLite 插件）。
- 想加新表/新字段，直接改 `CREATE TABLE` 语句；已有库加字段用 `ALTER TABLE`。
- 换字段名或调试时想清空旧库：在浏览器 DevTools → Application → IndexedDB 删掉
  `local-app-store`，或卸载重装 APP。

> （注：部分内容由豆包 AI 生成）