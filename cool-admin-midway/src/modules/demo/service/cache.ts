import { Provide } from '@midwayjs/core';
import { CoolCache } from '@cool-midway/core';

/**
 * 快取
 */
@Provide()
export class DemoCacheService {
  // 資料快取5秒
  @CoolCache(5000)
  async get() {
    console.log('執行方法');
    return {
      a: 1,
      b: 2,
    };
  }
}
