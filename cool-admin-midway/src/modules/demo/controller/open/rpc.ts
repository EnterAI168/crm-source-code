import { Inject, Provide, Get } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { DemoRpcService } from '../../service/rpc';

/**
 * 遠端RPC呼叫
 */
@CoolController()
export class OpenDemoRpcController extends BaseController {
  @Inject()
  demoRpcService: DemoRpcService;

  @Get('/call', { summary: '遠端呼叫' })
  async call() {
    return this.ok(await this.demoRpcService.call());
  }

  @Get('/event', { summary: '叢集事件' })
  async event() {
    await this.demoRpcService.event();
    return this.ok();
  }

  @Get('/transaction', { summary: '分散式事務' })
  async transaction() {
    await this.demoRpcService.transaction({ a: 1 });
    return this.ok();
  }
}
