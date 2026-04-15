import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 产品分类
 */
@Entity('product_category')
export class ProductCategoryEntity extends BaseEntity {
  @Index()
  @Column({ comment: '分类名称', length: 50 })
  name: string;

  @Column({ comment: '排序', default: 0 })
  orderNum: number;

  @Column({ comment: '状态', dict: ['禁用', '启用'], default: 1 })
  status: number;

  @Column({ comment: '逻辑删除 0-否 1-是', default: 0 })
  isDeleted: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
