import { Provide, Config, Inject, Init, InjectClient } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import * as _ from 'lodash';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';
import { PluginService } from '../../plugin/service/info';

/**
 * 描述
 */
@Provide()
export class UserSmsService extends BaseService {
  // 獲得模組的配置資訊
  @Config('module.user.sms')
  config;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  @Inject()
  pluginService: PluginService;

  plugin;

  @Init()
  async init() {
    for (const key of ['sms-tx', 'sms-ali']) {
      try {
        this.plugin = await this.pluginService.getInstance(key);
        if (this.plugin) {
          this.config.pluginKey = key;
          break;
        }
      } catch (e) {
        continue;
      }
    }
  }

  /**
   * 發送驗證碼
   * @param phone
   */
  async sendSms(phone) {
    // 隨機四位驗證碼
    const code = _.random(1000, 9999);
    const pluginKey = this.config.pluginKey;
    if (!this.plugin)
      throw new CoolCommException(
        '未配置簡訊外掛，請到外掛市場下載安裝配置：https://cool-js.com/plugin?keyWord=簡訊'
      );
    try {
      if (pluginKey == 'sms-tx') {
        await this.plugin.send([phone], [code]);
      }
      if (pluginKey == 'sms-ali') {
        await this.plugin.send([phone], {
          code,
        });
      }
      this.midwayCache.set(`sms:${phone}`, code, this.config.timeout * 1000);
    } catch (error) {
      throw new CoolCommException('發送過於頻繁，請稍後再試');
    }
  }

  /**
   * 驗證驗證碼
   * @param phone
   * @param code
   * @returns
   */
  async checkCode(phone, code) {
    const cacheCode = await this.midwayCache.get(`sms:${phone}`);
    if (code && cacheCode == code) {
      return true;
    }
    return false;
  }
}
