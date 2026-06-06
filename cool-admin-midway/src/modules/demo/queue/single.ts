import { BaseCoolQueue, CoolQueue } from '@cool-midway/task';
import { IMidwayApplication } from '@midwayjs/core';
import { App } from '@midwayjs/core';

/**
 * 單例佇列，cluster 或 叢集模式下 只會有一個例項消費資料
 */
@CoolQueue({ type: 'single' })
export class DemoSingleQueue extends BaseCoolQueue {
  @App()
  app: IMidwayApplication;

  async data(job: any, done: any): Promise<void> {
    // 這邊可以執行定時任務具體的業務或佇列的業務
    console.log('資料', job.data);
    // 丟擲錯誤 可以讓佇列重試，預設重試5次
    //throw new Error('錯誤');
    done();
  }
}
