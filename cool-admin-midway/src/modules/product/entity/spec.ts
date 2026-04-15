import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 产品规格
 */
@Entity('product_spec')
export class ProductSpecEntity extends BaseEntity {
  @Index()
  @Column({ comment: '产品ID' })
  productId: number;

  @Column({ comment: '规格图', nullable: true })
  image: string;

  @Column({ comment: '规格名称', length: 100 })
  name: string;

  @Column({
    comment: '预设报价(未税)',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  price: number;

  @Column({
    comment: '成本',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  costPrice: number;

  @Column({
    comment: '毛利',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  grossProfit: number;

  @Column({
    comment: '毛利率',
    type: 'decimal',
    precision: 10,
    scale: 4,
    default: 0,
  })
  grossProfitRate: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;

  @Column({ comment: '排序', default: 1 })
  orderNum: number;

  @Column({ comment: '逻辑删除 0-否 1-是', default: 0 })
  isDeleted: number;
}
