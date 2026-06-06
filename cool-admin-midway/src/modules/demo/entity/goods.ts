import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 商品模組-商品資訊
 */
@Entity('demo_goods')
export class DemoGoodsEntity extends BaseEntity {
  @Index()
  @Column({ comment: '標題', length: 50 })
  title: string;

  @Column({
    comment: '價格',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  price: number;

  @Column({ comment: '描述', nullable: true })
  description: string;

  @Column({ comment: '主圖', nullable: true })
  mainImage: string;

  @Column({ comment: '分類', dict: 'goodsType' })
  type: number;

  @Column({ comment: '狀態', dict: ['停用', '啟用'], default: 1 })
  status: number;

  @Column({
    comment: '示例圖',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  exampleImages: string[];

  @Column({ comment: '庫存', default: 0 })
  stock: number;
}
