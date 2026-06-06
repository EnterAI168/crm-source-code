import { Provide, Inject, Get, Post, Query, Config } from '@midwayjs/core';
import {
  CoolController,
  BaseController,
  CoolEps,
  TagTypes,
  CoolUrlTag,
  CoolTag,
} from '@cool-midway/core';
import { Context } from '@midwayjs/koa';
import { BaseSysParamService } from '../../service/sys/param';
import { PluginService } from '../../../plugin/service/info';

/**
 * 不需要登入的後台介面
 */
@CoolUrlTag()
@Provide()
@CoolController()
export class BaseAppCommController extends BaseController {
  @Inject()
  pluginService: PluginService;

  @Inject()
  ctx: Context;

  @Config('module.base.allowKeys')
  allowKeys: string[];

  @Inject()
  eps: CoolEps;

  @Inject()
  baseSysParamService: BaseSysParamService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/param', { summary: '參數配置' })
  async param(@Query('key') key: string) {
    if (!this.allowKeys.includes(key)) {
      return this.fail('非法操作');
    }
    return this.ok(await this.baseSysParamService.dataByKey(key));
  }

  /**
   * 實體資訊與路徑
   * @returns
   */
  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/eps', { summary: '實體資訊與路徑' })
  public async getEps() {
    return this.ok(this.eps.app);
  }

  /**
   * 檔案上傳
   */
  @Post('/upload', { summary: '檔案上傳' })
  async upload() {
    const file = await this.pluginService.getInstance('upload');
    return this.ok(await file.upload(this.ctx));
  }

  /**
   * 檔案上傳模式，本地或者雲端儲存
   */
  @Get('/uploadMode', { summary: '檔案上傳模式' })
  async uploadMode() {
    const file = await this.pluginService.getInstance('upload');
    return this.ok(await file.getMode());
  }
}
