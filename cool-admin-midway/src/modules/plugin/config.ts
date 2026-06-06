import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default options => {
  return {
    // 模組名稱
    name: '外掛模組',
    // 模組描述
    description: '外掛檢視、安裝、解除安裝、配置等',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域性有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
    // 基礎外掛配置
    hooks: {
      // 檔案上傳
      upload: {
        // 地址字首
        domain: `http://127.0.0.1:${options?.app?.getConfig('koa.port')}`,
      },
    },
  } as ModuleConfig;
};
