import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

@Entity('crm_quote_order_history')
export class CrmQuoteOrderHistoryEntity extends BaseEntity {
  @Index()
  @Column({ comment: '報價單ID' })
  quoteOrderId: number;

  @Column({ comment: '報價單編號', nullable: true, length: 50 })
  quoteNo: string;

  @Column({ comment: '報價單專案', nullable: true, length: 100 })
  quoteName: string;

  @Column({ comment: '付款階段', default: 1 })
  stageNo: number;

  @Column({ comment: '階段名稱', nullable: true, length: 100 })
  stageName: string;

  @Column({
    comment: '金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ comment: '備註', nullable: true, length: 255 })
  remark: string;

  @Column({ comment: '快照資料', nullable: true, type: 'json', transformer: transformerJson })
  snapshot: any;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
