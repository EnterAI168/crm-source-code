import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { In, Repository } from 'typeorm';
import { SpaceTypeEntity } from '../entity/type';
import { SpaceInfoEntity } from '../entity/info';

/**
 * 檔案分類
 */
@Provide()
export class SpaceTypeService extends BaseService {
  @InjectEntityModel(SpaceTypeEntity)
  spaceTypeEntity: Repository<SpaceTypeEntity>;

  @InjectEntityModel(SpaceInfoEntity)
  spaceInfoEntity: Repository<SpaceInfoEntity>;

  /**
   * 刪除
   * @param ids
   */
  async delete(ids: any) {
    await super.delete(ids);
    // 刪除該分類下的檔案資訊
    await this.spaceInfoEntity.delete({ classifyId: In(ids) });
  }
}
