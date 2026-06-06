import { DictInfoEntity } from './../../entity/info';
import { Body, Get, Inject, Post, Provide } from '@midwayjs/core';
import {
  CoolController,
  BaseController,
  CoolTag,
  TagTypes,
} from '@cool-midway/core';
import { DictInfoService } from '../../service/info';

/**
 * 字典資訊
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: DictInfoEntity,
  service: DictInfoService,
  listQueryOp: {
    fieldEq: ['typeId'],
    keyWordLikeFields: ['name'],
    addOrderBy: {
      createTime: 'ASC',
    },
  },
})
export class AdminDictInfoController extends BaseController {
  @Inject()
  dictInfoService: DictInfoService;

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
