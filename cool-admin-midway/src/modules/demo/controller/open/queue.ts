import { Get, Inject, Post, Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { DemoCommQueue } from '../../queue/comm';
import { DemoGetterQueue } from '../../queue/getter';

/**
 * 佇列
 */
@CoolController()
export class OpenDemoQueueController extends BaseController {
  // 普通佇列
  @Inject()
  demoCommQueue: DemoCommQueue;

  // 主動消費佇列
  @Inject()
  demoGetterQueue: DemoGetterQueue;

  /**
   * 發送資料到佇列
   */
  @Post('/add', { summary: '發送佇列資料' })
  async queue() {
    this.demoCommQueue.add({ a: 2 });
    return this.ok();
  }

  @Post('/addGetter')
  async addGetter() {
    await this.demoGetterQueue.add({ a: new Date() });
    return this.ok();
  }

  /**
   * 獲得佇列中的資料，只有當佇列型別為getter時有效
   */
  @Get('/getter')
  async getter() {
    const job = await this.demoGetterQueue.getters.getJobs(
      ['wait'],
      0,
      0,
      true
    );
    // 獲得完將資料從佇列移除
    await job[0]?.remove();
    return this.ok(job[0]?.data);
  }
}
