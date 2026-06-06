import { Provide } from '@midwayjs/core';
import { CoolController, BaseController } from '@cool-midway/core';
import { SpaceInfoEntity } from '../../entity/info';
import { SpaceInfoService } from '../../service/info';

/**
 * 圖片空間資訊
 */
@Provide()
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: SpaceInfoEntity,
  service: SpaceInfoService,
  pageQueryOp: {
    fieldEq: ['type', 'classifyId'],
  },
})
export class BaseAppSpaceInfoController extends BaseController {}
