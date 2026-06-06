import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import { TenantSubscriber } from '../modules/base/db/tenant';

/**
 * 本地開發 npm run dev 讀取的配置檔案
 */
export default {
  typeorm: {
    dataSource: {
      default: {
        type: 'mysql',
        host: '127.0.0.1',
        port: 3308,
        username: 'root',
        password: 'root',
        database: 'cool-crm',
        // 自動建表 注意：線上部署的時候不要使用，有可能導致資料丟失
        synchronize: true,
        // 列印日誌
        logging: false,
        // 字元集
        charset: 'utf8mb4',
        // 是否開啟快取
        cache: true,
        // 實體路徑
        entities: ['**/modules/*/entity'],
        // 訂閱者
        subscribers: [TenantSubscriber],
      },
    },
  },
  cool: {
    // 實體與路徑，跟生成程式碼、前端請求、swagger檔案相關 注意：線上不建議開啟，以免暴露敏感資訊
    eps: true,
    // 是否自動匯入模組資料庫
    initDB: true,
    // 判斷是否初始化的方式
    initJudge: 'db',
    // 是否自動匯入模組選單
    initMenu: true,
  } as CoolConfig,
} as MidwayConfig;
