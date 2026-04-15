import { CoolController, BaseController } from '@cool-midway/core';
import { Provide } from '@midwayjs/core';
import { ProductCategoryEntity } from '../../entity/category';
import { ProductCategoryService } from '../../service/category';

/**
 * 产品分类
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: ProductCategoryEntity,
  service: ProductCategoryService,
  pageQueryOp: {
    keyWordLikeFields: ['name'],
    fieldEq: ['status'],
  },
  listQueryOp: {
    fieldEq: ['status'],
  },
})
export class AdminProductCategoryController extends BaseController {}
