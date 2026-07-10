import { ModuleConfig } from '@cool-midway/core';
import { UserMiddleware } from './middleware/app';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: '使用者模組',
    // 模組描述
    description: 'APP、小程式、公眾號等使用者',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域有效
    globalMiddlewares: [UserMiddleware],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
    // 簡訊
    sms: {
      // 驗證碼有效期，單位秒
      timeout: 60 * 3,
    },
    // jwt
    jwt: {
      // token 過期時間，單位秒
      expire: 60 * 60 * 24,
      // 重新整理token 過期時間，單位秒
      refreshExpire: 60 * 60 * 24 * 30,
      // jwt 秘鑰
      secret: 'e8bb80fe-8a81-4ef6-b338-ebef25f63bdbx',
    },
  } as ModuleConfig;
};
