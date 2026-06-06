import { Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSysConfEntity } from '../../entity/sys/conf';

/**
 * 系統配置
 */
@Provide()
export class BaseSysConfService extends BaseService {
  @InjectEntityModel(BaseSysConfEntity)
  baseSysConfEntity: Repository<BaseSysConfEntity>;

  /**
   * 獲得配置參數值
   * @param key
   */
  async getValue(key) {
    const conf = await this.baseSysConfEntity.findOneBy({ cKey: key });
    if (conf) {
      return conf.cValue;
    }
  }

  /**
   * 更新配置參數
   * @param cKey
   * @param cValue
   */
  async updateVaule(cKey, cValue) {
    await this.baseSysConfEntity
      .createQueryBuilder()
      .update()
      .where({ cKey })
      .set({ cKey, cValue })
      .execute();
  }
}
