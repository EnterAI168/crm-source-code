import { Body, Get, Inject, Post, Provide } from '@midwayjs/core';
import {
  CoolController,
  BaseController,
  CoolUrlTag,
  TagTypes,
  CoolTag,
} from '@cool-midway/core';
import { DictInfoService } from '../../service/info';

/**
 * 字典資訊
 */
@Provide()
@CoolController()
@CoolUrlTag()
export class AppDictInfoController extends BaseController {
  @Inject()
  dictInfoService: DictInfoService;

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Post('/data', { summary: '獲得字典資料' })
  async data(@Body('types') types: string[] = []) {
    return this.ok(await this.dictInfoService.data(types));
  }

  @CoolTag(TagTypes.IGNORE_TOKEN)
  @Get('/types', { summary: '獲得所有字典型別' })
  async types() {
    return this.ok(await this.dictInfoService.types());
  }
}
