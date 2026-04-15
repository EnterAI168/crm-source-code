import { ModuleConfig } from '@cool-midway/core';

/**
 * 产品管理模块
 */
export default () => {
  return {
    name: '产品管理',
    description: '产品分类与产品管理',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
