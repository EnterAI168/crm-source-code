import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 產品規格
 */
@Entity('product_spec')
export class ProductSpecEntity extends BaseEntity {
  @Index()
  @Column({ comment: '產品ID' })
  productId: number;

  @Column({
    comment: '規格圖(多圖)',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  image: string[];

  @Column({ comment: '規格名稱', length: 100 })
  name: string;

  @Column({
    comment: '預設報價(未稅)',
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

  @Column({ comment: '備註', nullable: true })
  remark: string;

  @Column({ comment: '排序', default: 1 })
  orderNum: number;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0 })
  isDeleted: number;
}
