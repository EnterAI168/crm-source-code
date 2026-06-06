import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 字典資訊
 */
@Entity('dict_info')
export class DictInfoEntity extends BaseEntity {
  @Column({ comment: '型別ID' })
  typeId: number;

  @Column({ comment: '名稱' })
  name: string;

  @Column({ comment: '值', nullable: true })
  value: string;

  @Column({ comment: '排序', default: 0 })
  orderNum: number;

  @Column({ comment: '備註', nullable: true })
  remark: string;

  @Column({ comment: '父ID', default: null })
  parentId: number;
}
