import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 字典類別
 */
@Entity('dict_type')
export class DictTypeEntity extends BaseEntity {
  @Column({ comment: '名稱' })
  name: string;

  @Column({ comment: '標識' })
  key: string;
}
