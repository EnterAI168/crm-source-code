import { CoolConfig } from '@cool-midway/core';
import { MidwayConfig } from '@midwayjs/core';
import { CoolCacheStore } from '@cool-midway/core';
import * as path from 'path';
import { pCachePath, pUploadPath } from '../comm/path';
import { availablePort } from '../comm/port';

// redis快取
// import { redisStore } from 'cache-manager-ioredis-yet';

export default {
  // 確保每個專案唯一，專案首次啟動會自動生成
  keys: 'bc8a48e8-c0ab-4616-8d4a-5c817d28b889',
  koa: {
    port: availablePort(8008),
  },
  // 開啟非同步上下文管理
  asyncContextManager: {
    enable: true,
  },
  // 靜態檔案配置
  staticFile: {
    buffer: true,
    dirs: {
      default: {
        prefix: '/',
        dir: path.join(__dirname, '..', '..', 'public'),
      },
      static: {
        prefix: '/upload',
        dir: pUploadPath(),
      },
    },
  },
  // 檔案上傳
  upload: {
    fileSize: '200mb',
    whitelist: null,
  },
  // 快取 可切換成其他快取如：redis http://www.midwayjs.org/docs/extensions/caching
  cacheManager: {
    clients: {
      default: {
        store: CoolCacheStore,
        options: {
          path: pCachePath(),
          ttl: 0,
        },
      },
    },
  },
  // cacheManager: {
  //   clients: {
  //     default: {
  //       store: redisStore,
  //       options: {
  //         port: 6379,
  //         host: '127.0.0.1',
  //         password: '',
  //         ttl: 0,
  //         db: 0,
  //       },
  //     },
  //   },
  // },
  cool: {
    // 已經外掛化，本地檔案上傳檢視 plugin/config.ts，其他雲端儲存檢視對應外掛的使用
    file: {},
    // 是否開啟多租戶
    tenant: {
      // 是否開啟多租戶
      enable: false,
      // 需要過濾多租戶的url, 支援萬用字元， 如/admin/**/* 表示admin模組下的所有介面都進行多租戶過濾
      urls: [],
    },
    // 國際化配置
    i18n: {
      // 是否開啟
      enable: false,
      // 語言
      languages: ['zh-cn', 'zh-tw', 'en'],
    },
    // crud配置
    crud: {
      // 插入模式，save不會校驗欄位(允許傳入不存在的欄位)，insert會校驗欄位
      upsert: 'save',
      // 軟刪除
      softDelete: true,
    },
  } as CoolConfig,
} as MidwayConfig;
