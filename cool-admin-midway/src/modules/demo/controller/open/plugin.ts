import { CoolController, BaseController } from '@cool-midway/core';
import { PluginService } from '../../../plugin/service/info';
import { Get, Inject } from '@midwayjs/core';

/**
 * 外掛
 */
@CoolController()
export class OpenDemoPluginController extends BaseController {
  @Inject()
  pluginService: PluginService;

  @Get('/invoke', { summary: '呼叫外掛' })
  async invoke() {
    // 取得外掛例項
    const instance: any = await this.pluginService.getInstance('ollama');
    // 呼叫chat
    const messages = [
      { role: 'system', content: '你叫小酷，是一個智慧助理' },
      { role: 'user', content: '寫一個1000字的關於春天的文章' },
    ];
    for (let i = 0; i < 3; i++) {
      instance.chat(messages, { stream: true }, res => {
        console.log(i, res.content);
      });
    }
    return this.ok();
  }
}
