const { Bootstrap } = require('@midwayjs/bootstrap');

// 顯式以元件方式引入使用者程式碼
Bootstrap.configure({
  // 這裡引用的是編譯後的入口，本地開發不走這個檔案
  // eslint-disable-next-line node/no-unpublished-require
  imports: require('./dist/index'),
  // 停用依賴注入的目錄掃描
  moduleDetector: false,
}).run();
