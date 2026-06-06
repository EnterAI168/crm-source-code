import { CoolController, BaseController } from '@cool-midway/core';
import { Get, Inject } from '@midwayjs/core';
import { PluginService } from '../../../plugin/service/info';
import { PassThrough } from 'stream';
import { IMidwayKoaContext } from '@midwayjs/koa';

/**
 * 事件流 服務端主動推送
 */
@CoolController()
export class OpenDemoSSEController extends BaseController {
  @Inject()
  ctx: IMidwayKoaContext;

  @Inject()
  pluginService: PluginService;

  @Get('/call', { summary: '事件流 服務端主動推送' })
  async call() {
    // 設定響應頭
    this.ctx.set('Content-Type', 'text/event-stream');
    this.ctx.set('Cache-Control', 'no-cache');
    this.ctx.set('Connection', 'keep-alive');

    const stream = new PassThrough();

    // 發送資料
    const send = (data: any) => {
      stream.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // 獲取外掛例項
    const instance: any = await this.pluginService.getInstance('ollama');
    // 呼叫chat
    const messages = [
      { role: 'system', content: '你叫小酷，是個程式設計助手' },
      { role: 'user', content: '用js寫個Hello World' },
    ];
    instance.chat(messages, { stream: true }, res => {
      send(res);
      if (res.isEnd) {
        this.ctx.res.end();
      }
    });

    this.ctx.status = 200;
    this.ctx.body = stream;
  }
}
