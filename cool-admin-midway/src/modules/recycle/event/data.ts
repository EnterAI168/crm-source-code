import { CoolEvent, EVENT, Event } from '@cool-midway/core';
import { Inject } from '@midwayjs/core';
import { RecycleDataService } from '../service/data';

/**
 * 接受資料事件
 */
@CoolEvent()
export class RecycleDataEvent {
  @Inject()
  recycleDataService: RecycleDataService;

  /**
   * 資料被刪除
   * @param params
   */
  @Event(EVENT.SOFT_DELETE)
  async softDelete(params) {
    await this.recycleDataService.record(params);
  }
}
