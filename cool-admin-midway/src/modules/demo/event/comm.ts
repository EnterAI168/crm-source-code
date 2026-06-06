import { CoolEvent, Event } from '@cool-midway/core';
import { EVENT_PLUGIN_READY } from '../../plugin/service/center';

/**
 * 普通事件
 */
@CoolEvent()
export class DemoCommEvent {
  /**
   * 根據事件名接收事件
   * @param msg
   * @param a
   */
  @Event('demo')
  async demo(msg, a) {
    console.log(`comm當前程式的ID是: ${process.pid}`);
    console.log('comm收到訊息', msg, a);
  }

  /**
   * 外掛已就緒
   */
  @Event(EVENT_PLUGIN_READY)
  async pluginReady() {
    // TODO 外掛已就緒
  }
}
