import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ProductInfoEntity } from '../../entity/info';
import { ProductInfoService } from '../../service/info';

/**
 * 产品管理
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ProductInfoEntity,
  service: ProductInfoService,
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['status', 'categoryId', 'departmentId'],
  },
})
export class AdminProductInfoController extends BaseController {}
