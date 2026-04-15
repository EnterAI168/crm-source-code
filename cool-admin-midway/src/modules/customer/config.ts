import { ModuleConfig } from '@cool-midway/core';

export default () => {
  return {
    name: '客户管理',
    description: '客户公池',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
