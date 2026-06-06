import { Get, Inject, Provide, Query } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { BaseSysParamEntity } from '../../../entity/sys/param';
import { BaseSysParamService } from '../../../service/sys/param';
import { Context } from '@midwayjs/koa';

/**
 * 參數配置
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'page'],
  entity: BaseSysParamEntity,
  service: BaseSysParamService,
  pageQueryOp: {
    keyWordLikeFields: ['name', 'keyName'],
    fieldEq: ['dataType'],
  },
})
export class BaseSysParamController extends BaseController {
  @Inject()
  baseSysParamService: BaseSysParamService;

  @Inject()
  ctx: Context;

  /**
   * 根據配置參數key獲得網頁內容(富文本)
   */
  @Get('/html', { summary: '獲得網頁內容的參數值' })
  async htmlByKey(@Query('key') key: string) {
    this.ctx.body = await this.baseSysParamService.htmlByKey(key);
  }
}
