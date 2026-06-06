import { BaseLogMiddleware } from './middleware/log';
import { BaseAuthorityMiddleware } from './middleware/authority';
import { ModuleConfig } from '@cool-midway/core';
import { BaseTranslateMiddleware } from './middleware/translate';

/**
 * 模組的配置
 */
export default () => {
  return {
    // 模組名稱
    name: '權限管理',
    // 模組描述
    description: '基礎的權限管理功能，包括登入，權限校驗',
    // 中介軟體
    globalMiddlewares: [
      BaseTranslateMiddleware,
      BaseAuthorityMiddleware,
      BaseLogMiddleware,
    ],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 10,
    // app參數配置允許讀取的key
    allowKeys: [],
    // jwt 生成解密token的
    jwt: {
      // 單點登入
      sso: false,
      // 注意： 最好重新修改，防止破解
      secret: 'a27feb51-c1d2-4aba-a9aa-0014dd30a37f',
      // token
      token: {
        // 2小時過期，需要用重新整理token
        expire: 2 * 3600,
        // 15天內，如果沒操作過就需要重新登入
        refreshExpire: 24 * 3600 * 15,
      },
    },
  } as ModuleConfig;
};
