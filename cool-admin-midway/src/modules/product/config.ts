import { ModuleConfig } from '@cool-midway/core';

/**
 * 產品管理模組
 */
export default () => {
  return {
    name: '產品管理',
    description: '產品分類與產品管理',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
