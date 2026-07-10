import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_quote_order_stage')
export class CrmQuoteOrderStageEntity extends BaseEntity {
  @Index()
  @Column({ comment: '報價單ID' })
  quoteOrderId: number;

  @Column({ comment: '排序號', default: 1 })
  sortNum: number;

  @Column({ comment: '階段序號', default: 1 })
  stageNo: number;

  @Column({ comment: '階段名稱', length: 50 })
  stageName: string;

  @Column({
    comment: '付款比例',
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 0,
  })
  ratio: number;

  @Column({
    comment: '階段金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ comment: '預計開票日期', nullable: true, length: 30 })
  invoiceDate: string;

  @Column({ comment: '預計回款日期', nullable: true, length: 30 })
  expectedReceiptDate: string;

  @Column({ comment: '是否手動開票 0-否 1-是', default: 0, type: 'tinyint' })
  needManualInvoice: number;

  @Column({ comment: '是否自動傳送信箱 0-否 1-是', default: 1, type: 'tinyint' })
  autoSendEmail: number;

  @Column({
    comment: '回款金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  receiptAmount: number;

  @Column({ comment: '回款憑證', nullable: true, length: 500 })
  receiptVoucher: string;

  @Column({ comment: '回款時間', nullable: true, length: 30 })
  receiptTime: string;

  @Column({ comment: '回款狀態 0-未回款 1-已回款', default: 0, type: 'tinyint' })
  receiptStatus: number;

  @Column({ comment: '開票產品名稱', nullable: true, length: 200 })
  invoiceProductName: string;

  @Column({ comment: '開票狀態 0-未申請 1-審核中 2-已作廢 3-已通過 4-已拒絕', default: 0, type: 'tinyint' })
  invoiceStatus: number;

  @Column({ comment: '申請開票時間', nullable: true, length: 30 })
  invoiceApplyTime: string;

  @Column({ comment: '發票作廢時間', nullable: true, length: 30 })
  invoiceVoidTime: string;

  @Column({ comment: '備註', nullable: true, length: 255 })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
