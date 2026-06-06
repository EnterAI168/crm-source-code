import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 產品分類
 */
@Entity('product_category')
export class ProductCategoryEntity extends BaseEntity {
  @Index()
  @Column({ comment: '分類名稱', length: 50 })
  name: string;

  @Column({ comment: '排序', default: 0 })
  orderNum: number;

  @Column({ comment: '狀態', dict: ['停用', '啟用'], default: 1 })
  status: number;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0 })
  isDeleted: number;

  @Column({ comment: '備註', nullable: true })
  remark: string;
}
