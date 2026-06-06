import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default ({ app }) => {
  return {
    // 模組名稱
    name: 'Swagger',
    // 模組描述
    description: '處理和生成swagger檔案',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域性有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
    // swagger基本配置
    base: {
      openapi: '3.1.0',
      info: {
        title: 'Cool Admin 線上API檔案',
        version: '8.x',
        description: '本檔案是由Cool Admin內部自動構建完成',
        contact: {
          name: '開發檔案',
          url: 'https://cool-js.com',
        },
      },
      // 請求地址
      servers: [
        {
          url: `http://127.0.0.1:${app?.getConfig('koa.port') || 8001}`,
          description: '本地後台地址',
        },
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            name: 'Authorization',
            in: 'header',
          },
        },
      },
    },
  } as ModuleConfig;
};
