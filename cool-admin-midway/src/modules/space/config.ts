import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: '檔案空間',
    // 模組描述
    description: '上傳和管理檔案資源',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域性有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
    // wps的配置
    wps: {
      // 這是個測試的appId，會有水印
      appId: 'SX20230111NDUAGQ',
    },
  } as ModuleConfig;
};
