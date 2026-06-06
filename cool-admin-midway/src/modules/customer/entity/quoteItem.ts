import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_quote_order_item')
export class CrmQuoteOrderItemEntity extends BaseEntity {
  @Index()
  @Column({ comment: '報價單ID' })
  quoteOrderId: number;

  @Column({ comment: '排序號', default: 1 })
  sortNum: number;

  @Column({ comment: '產品ID', nullable: true })
  productId: number;

  @Index()
  @Column({ comment: '產品內勤部門ID', nullable: true })
  departmentId: number;

  @Column({ comment: '規格ID', nullable: true })
  specId: number;

  @Column({ comment: '產品名稱快照', length: 100 })
  productName: string;

  @Column({ comment: '規格名稱快照', nullable: true, length: 100 })
  specName: string;

  @Column({
    comment: '產品型別 1-主力 2-一次性 3-附加',
    default: 1,
    type: 'tinyint',
  })
  productType: number;

  @Column({
    comment: '實際報價',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  actualPrice: number;

  @Column({
    comment: '成本單價快照',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costPrice: number;

  @Column({ comment: '數量', default: 1 })
  quantity: number;

  @Column({
    comment: '小計金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  subtotalAmount: number;

  @Column({
    comment: '小計成本',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  subtotalCostAmount: number;

  @Column({
    comment: '小計毛利',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  grossProfitAmount: number;

  @Column({ comment: '備註', nullable: true, length: 255 })
  remark: string;

  @Column({
    comment: '成本填寫狀態 0-未填寫 1-已填寫',
    default: 0,
    type: 'tinyint',
  })
  costStatus: number;

  @Column({ comment: '成本填寫人ID', nullable: true })
  costUserId: number;

  @Column({ comment: '成本填寫時間', nullable: true, length: 20 })
  costTime: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
