import { Provide, Post, Inject, Body, Get } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { BaseSysLogEntity } from '../../../entity/sys/log';
import { BaseSysUserEntity } from '../../../entity/sys/user';
import { BaseSysConfService } from '../../../service/sys/conf';
import { BaseSysLogService } from '../../../service/sys/log';

/**
 * 系統日誌
 */
@Provide()
@CoolController({
  api: ['page'],
  entity: BaseSysLogEntity,
  urlTag: {
    name: 'a',
    url: ['add'],
  },
  pageQueryOp: {
    keyWordLikeFields: ['b.name', 'a.action', 'a.ip'],
    select: ['a.*', 'b.name'],
    join: [
      {
        entity: BaseSysUserEntity,
        alias: 'b',
        condition: 'a.userId = b.id',
        type: 'leftJoin',
      },
    ],
  },
})
export class BaseSysLogController extends BaseController {
  @Inject()
  baseSysLogService: BaseSysLogService;

  @Inject()
  baseSysConfService: BaseSysConfService;

  /**
   * 清空日誌
   */
  @Post('/clear', { summary: '清理' })
  public async clear() {
    await this.baseSysLogService.clear(true);
    return this.ok();
  }

  /**
   * 設定日誌儲存時間
   */
  @Post('/setKeep', { summary: '日誌儲存時間' })
  public async setKeep(@Body('value') value: number) {
    await this.baseSysConfService.updateVaule('logKeep', value);
    return this.ok();
  }

  /**
   * 獲得日誌儲存時間
   */
  @Get('/getKeep', { summary: '獲得日誌儲存時間' })
  public async getKeep() {
    return this.ok(await this.baseSysConfService.getValue('logKeep'));
  }
}
