import { ModuleConfig } from '@cool-midway/core';

export default () => {
  return {
    name: '客戶管理',
    description: '客戶公池',
    middlewares: [],
    globalMiddlewares: [],
    order: 0,
  } as ModuleConfig;
};
