import { ModuleConfig } from '@cool-midway/core';
import { TaskMiddleware } from './middleware/task';

/**
 * 模組配置
 */
export default () => {
  return {
    // 模組名稱
    name: '任務排程',
    // 模組描述
    description: '任務排程模組，支援分散式任務，由redis整個叢集的任務',
    // 中介軟體
    middlewares: [TaskMiddleware],
    // 模組載入順序，預設為0，值越大越優先載入
    order: 0,
    // 日誌
    log: {
      // 日誌保留時間，單位天
      keepDays: 20,
    },
  } as ModuleConfig;
};
