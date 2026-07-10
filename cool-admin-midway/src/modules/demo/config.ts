import { ModuleConfig } from '@cool-midway/core';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: 'demo模組',
    // 模組描述
    description: '演示用',
    // 中介軟體，只對本模組有效
    middlewares: [],
    // 中介軟體，全域有效
    globalMiddlewares: [],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
  } as ModuleConfig;
};
