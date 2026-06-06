import { CoolEvent, Event } from '@cool-midway/core';
import { Inject } from '@midwayjs/core';
import { PluginCenterService } from '../service/center';

// 外掛初始化全域性事件
export const GLOBAL_EVENT_PLUGIN_INIT = 'globalPluginInit';
// 外掛移除全域性事件
export const GLOBAL_EVENT_PLUGIN_REMOVE = 'globalPluginRemove';

/**
 * 接收事件
 */
@CoolEvent()
export class PluginInitEvent {
  @Inject()
  pluginCenterService: PluginCenterService;

  /**
   * 外掛初始化事件，某個外掛重新初始化
   * @param key
   */
  @Event(GLOBAL_EVENT_PLUGIN_INIT)
  async globalPluginInit(key: string) {
    await this.pluginCenterService.initOne(key);
  }

  /**
   * 外掛移除或者關閉事件
   * @param key
   * @param isHook
   */
  @Event(GLOBAL_EVENT_PLUGIN_REMOVE)
  async globalPluginRemove(key: string, isHook: boolean) {
    await this.pluginCenterService.remove(key, isHook);
  }
}
