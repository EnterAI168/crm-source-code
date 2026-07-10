import { CoolController, BaseController } from '@cool-midway/core';
import { Body, Get, Inject, Post } from '@midwayjs/core';
import { BaseCodingService } from '../../service/coding';

/**
 * Ai編碼
 */
@CoolController()
export class AdminCodingController extends BaseController {
  @Inject()
  baseCodingService: BaseCodingService;

  @Get('/getModuleTree', { summary: '取得模組目錄結構' })
  async getModuleTree() {
    return this.ok(await this.baseCodingService.getModuleTree());
  }

  @Post('/createCode', { summary: '建立程式碼' })
  async createCode(
    @Body('codes')
    codes: {
      path: string;
      content: string;
    }[]
  ) {
    this.baseCodingService.createCode(codes);
    return this.ok();
  }
}
