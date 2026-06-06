import { IMidwayContext, IMidwayApplication } from '@midwayjs/core';
import { PluginInfo } from '../interface';

/**
 * hook基類
 */
export class BasePluginHook {
  /** 請求上下文，用到此項無法本地除錯，需安裝到cool-admin中才能除錯 */
  ctx: IMidwayContext;
  /** 應用例項，用到此項無法本地除錯，需安裝到cool-admin中才能除錯 */
  app: IMidwayApplication;
  /** 外掛資訊 */
  pluginInfo: PluginInfo;
  /**
   * 初始化
   */
  async init(
    pluginInfo: PluginInfo,
    ctx?: IMidwayContext,
    app?: IMidwayApplication
  ) {
    this.pluginInfo = pluginInfo;
    this.ctx = ctx;
    this.app = app;
  }
}
