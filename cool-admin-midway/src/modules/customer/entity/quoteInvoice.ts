import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_quote_invoice')
export class CrmQuoteInvoiceEntity extends BaseEntity {
  @Index()
  @Column({ comment: '發票ID', length: 50 })
  invoiceNo: string;

  @Index()
  @Column({ comment: '報價單ID' })
  quoteOrderId: number;

  @Index()
  @Column({ comment: '付款階段ID' })
  quoteStageId: number;

  @Column({ comment: '報價單編號', nullable: true, length: 50 })
  quoteNo: string;

  @Column({ comment: '專案名稱', nullable: true, length: 100 })
  quoteName: string;

  @Column({ comment: '付款階段', default: 1 })
  stageNo: number;

  @Column({ comment: '階段名稱', nullable: true, length: 100 })
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
    comment: '發票金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ comment: '開票產品', nullable: true, length: 200 })
  invoiceProductName: string;

  @Column({ comment: '賣方', nullable: true, length: 100 })
  seller: string;

  @Column({ comment: '地址', nullable: true, length: 255 })
  address: string;

  @Column({ comment: '統一編號', nullable: true, length: 50 })
  taxNumber: string;

  @Column({ comment: '郵箱', nullable: true, length: 100 })
  email: string;

  @Column({ comment: '業務員ID', nullable: true })
  salesmanId: number;

  @Column({ comment: '申請人ID', nullable: true })
  applyUserId: number;

  @Column({ comment: '申請時間', nullable: true, length: 30 })
  applyTime: string;

  @Column({ comment: '狀態 1-待審核 2-已通過 3-已拒絕', default: 1, type: 'tinyint' })
  status: number;

  @Column({ comment: '審核人ID', nullable: true })
  auditUserId: number;

  @Column({ comment: '審核時間', nullable: true, length: 30 })
  auditTime: string;

  @Column({ comment: '審核備註', nullable: true, length: 255 })
  auditRemark: string;

  @Column({ comment: '綠界發票號碼', nullable: true, length: 20 })
  ecpayInvoiceNo: string;

  @Column({ comment: '綠界發票日期', nullable: true, length: 30 })
  ecpayInvoiceDate: string;

  @Column({ comment: '綠界發票隨機碼', nullable: true, length: 10 })
  ecpayRandomNumber: string;

  @Column({ comment: '綠界開票狀態 0-未開票 1-開票中 2-已開票 3-開票失敗', default: 0, type: 'tinyint' })
  ecpayIssueStatus: number;

  @Column({ comment: '綠界開票失敗原因', nullable: true, type: 'text' })
  ecpayIssueError: string;

  @Column({ comment: '綠界開票時間', nullable: true, length: 30 })
  ecpayIssueTime: string;

  @Column({ comment: '綠界開票返回內容', nullable: true, type: 'text' })
  ecpayIssueResponse: string;

  @Column({ comment: '綠界作廢狀態 0-未作廢 1-作廢中 2-已作廢 3-作廢失敗', default: 0, type: 'tinyint' })
  ecpayInvalidStatus: number;

  @Column({ comment: '綠界作廢時間', nullable: true, length: 30 })
  ecpayInvalidTime: string;

  @Column({ comment: '綠界作廢原因', nullable: true, length: 255 })
  ecpayInvalidReason: string;

  @Column({ comment: '綠界作廢失敗原因', nullable: true, type: 'text' })
  ecpayInvalidError: string;

  @Column({ comment: '綠界作廢返回內容', nullable: true, type: 'text' })
  ecpayInvalidResponse: string;

  @Column({ comment: '是否自動發送郵箱 0-否 1-是', default: 1, type: 'tinyint' })
  autoSendEmail: number;

  @Column({ comment: '預計發送時間', nullable: true, length: 30 })
  scheduledSendTime: string;

  @Column({ comment: '郵件發送狀態 0-待發送 1-發送中 2-已發送 3-發送失敗', default: 0, type: 'tinyint' })
  sendStatus: number;

  @Column({ comment: '郵件發送時間', nullable: true, length: 30 })
  sentTime: string;

  @Column({ comment: '郵件發送失敗原因', nullable: true, type: 'text' })
  sendError: string;

  @Column({ comment: '作廢時間', nullable: true, length: 30 })
  voidTime: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
