import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * 客戶跟進記錄
 */
@Entity('crm_customer_followup')
export class CrmCustomerFollowupEntity extends BaseEntity {
  @Index()
  @Column({ comment: '客戶ID crm_customer_info.id' })
  customerId: number;

  @Index()
  @Column({ comment: '報價單ID crm_quote_order.id', nullable: true })
  quoteId: number;

  @Index()
  @Column({ comment: '業務員ID', nullable: true })
  salesmanId: number;

  @Column({ comment: '跟進內容', type: 'text' })
  content: string;

  @Column({ comment: '跟進時間', type: 'datetime', nullable: true })
  followTime: Date;

  @Column({ comment: '預計下次跟進時間', type: 'datetime', nullable: true })
  nextFollowTime: Date;

  @Column({ comment: '備註', type: 'text', nullable: true })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0 })
  isDeleted: number;
}
