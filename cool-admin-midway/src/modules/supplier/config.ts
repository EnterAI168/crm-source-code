import { ModuleConfig } from '@cool-midway/core';

export default () => {
  return {
    name: '供應商管理',
    description: '供應商資料管理',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
