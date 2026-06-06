import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 產品資訊
 */
@Entity('product_info')
export class ProductInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '產品名稱', length: 100 })
  name: string;

  @Column({ comment: '產品分類ID', nullable: true })
  categoryId: number;

  @Column({ comment: '內勤部門ID', nullable: true })
  departmentId: number;

  @Column({
    comment: '預設報價(未稅)',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price: number;

  @Column({
    comment: '成本',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPrice: number;

  @Column({
    comment: '毛利',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  grossProfit: number;

  @Column({
    comment: '毛利率',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  grossProfitRate: number;

  @Column({ comment: '商品說明', type: 'text', nullable: true })
  description: string;

  @Column({ comment: 'Logo圖', nullable: true })
  logo: string;

  @Column({
    comment: '商品圖片(多圖)',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  images: string[];

  @Column({ comment: '一次性付款產品 0-否 1-是', default: 0 })
  isOneTimePayment: number;

  @Column({ comment: '狀態', dict: ['停用', '啟用'], default: 1 })
  status: number;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0 })
  isDeleted: number;

  @Column({ comment: '備註', nullable: true })
  remark: string;
}
