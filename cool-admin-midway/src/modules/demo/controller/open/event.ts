import { Inject, Post } from '@midwayjs/core';
import {
  CoolController,
  BaseController,
  CoolEventManager,
} from '@cool-midway/core';

/**
 * 事件
 */
@CoolController()
export class OpenDemoEventController extends BaseController {
  @Inject()
  coolEventManager: CoolEventManager;

  @Post('/comm', { summary: '普通事件，本程式生效' })
  async comm() {
    await this.coolEventManager.emit('demo', { a: 2 }, 1);
    return this.ok();
  }

  @Post('/global', { summary: '全域性事件，多程式都有效' })
  async global() {
    await this.coolEventManager.globalEmit('demo', false, { a: 2 }, 1);
    return this.ok();
  }
}
