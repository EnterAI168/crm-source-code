import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import { entities } from '../entities';
import { TenantSubscriber } from '../modules/base/db/tenant';

/**
 * 本地開發 npm run prod 讀取的配置檔案
 */
export default {
  typeorm: {
    dataSource: {
      default: {
        type: 'mysql',
        host: 'database-1.c7kmks6w84zb.ap-east-1.rds.amazonaws.com',
        port: 3306,
        username: 'admin',
        password: 'vQQAoscnr6ee8cbH54hj',
        database: 'cool-crm',
        // 自動建表 注意：線上部署的時候不要使用，有可能導致資料丟失
        synchronize: false,
        // 列印日誌
        logging: false,
        // 字元集
        charset: 'utf8mb4',
        timezone: 'Asia/Taipei',
        // 是否開啟快取
        cache: true,
        // 實體路徑
        entities,
        // 訂閱者
        subscribers: [TenantSubscriber],
      },
    },
  },
  cool: {
    // 實體與路徑，跟生成程式碼、前端請求、swagger檔案相關 注意：線上不建議開啟，以免暴露敏感資訊
    eps: false,
    // 是否自動匯入模組資料庫
    initDB: false,
    // 判斷是否初始化的方式
    initJudge: 'db',
    // 是否自動匯入模組選單
    initMenu: false,
  } as CoolConfig,
} as MidwayConfig;
