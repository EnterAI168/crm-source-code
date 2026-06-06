import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: '資料回收',
    // 模組描述
    description: '收集被刪除的資料，管理和恢復',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域性有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
  } as ModuleConfig;
};
