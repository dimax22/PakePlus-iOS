/**
 * 数据库公共层（三个页面共用）
 * 依赖：先加载 ./sql-wasm.js（会挂载全局 initSqlJs）
 *
 * 用法：
 *   await AppDB.init();          // 打开/新建数据库，返回 db 实例
 *   AppDB.db                     // 当前 sqlite 实例
 *   await AppDB.persist();       // 写完立即落盘到 IndexedDB
 *   AppDB.exportBlob()           // 拿到 .db 的 Blob
 *   AppDB.openFromBuffer(buf)    // 用外部二进制打开的临时库（导入时用）
 */
(function () {
  var IDB_NAME = "SqlJsStore";
  var IDB_STORE = "data";
  var DB_KEY = "vocab";

  var CREATE_SQL = `CREATE TABLE IF NOT EXISTS vocab(
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ENG TEXT,
    CHI TEXT,
    STUDY_TIME INTEGER DEFAULT 0,
    CREATE_TIME DATETIME
  )`;

  var SQL = null;
  var db = null;

  // ===== IndexedDB 基础 =====
  function openIdb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var idb = e.target.result;
        if (!idb.objectStoreNames.contains(IDB_STORE)) {
          idb.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function idbGet(key) {
    return new Promise(function (resolve, reject) {
      openIdb().then(function (idb) {
        var tx = idb.transaction(IDB_STORE, "readonly");
        var req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = function () { idb.close(); resolve(req.result); };
        req.onerror = function () { idb.close(); reject(req.error); };
      });
    });
  }

  function idbPut(key, value) {
    return new Promise(function (resolve, reject) {
      openIdb().then(function (idb) {
        var tx = idb.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = function () { idb.close(); resolve(); };
        tx.onerror = function () { idb.close(); reject(tx.error); };
      });
    });
  }

  // ===== 对外方法 =====
  async function init() {
    SQL = await initSqlJs({ locateFile: function (f) { return "./" + f; } });
    var saved = await idbGet(DB_KEY);
    if (saved) {
      db = new SQL.Database(saved);
    } else {
      db = new SQL.Database();
      db.run(CREATE_SQL);
      await persist();
    }
    return db;
  }

  async function persist() {
    var binary = db.export();
    await idbPut(DB_KEY, binary);
  }

  function exportBlob() {
    return new Blob([db.export()], { type: "application/x-sqlite3" });
  }

  // 用外部 .db 文件打开一个临时库，不动当前正在用的 db
  function openFromBuffer(buf) {
    return new SQL.Database(buf);
  }

  window.AppDB = {
    init: init,
    persist: persist,
    exportBlob: exportBlob,
    openFromBuffer: openFromBuffer,
    get db() { return db; },
    get SQL() { return SQL; }
  };
})();
//（注：内容由AI生成）
