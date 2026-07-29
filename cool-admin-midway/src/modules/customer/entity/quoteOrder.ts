import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

@Entity('crm_quote_order')
export class CrmQuoteOrderEntity extends BaseEntity {
  @Index()
  @Column({ comment: '報價單編號', length: 50 })
  quoteNo: string;

  @Index()
  @Column({ comment: '客戶ID' })
  customerId: number;

  @Column({ comment: '專案名稱', length: 200 })
  quoteName: string;

  @Column({ comment: '專案性質 1-新案 2-續約', default: 1, type: 'tinyint' })
  quoteType: number;

  @Index()
  @Column({ comment: '業務員ID', nullable: true })
  salesmanId: number;

  @Index()
  @Column({ comment: '陪同管理業務ID', nullable: true })
  accompanySalesmanId: number;

  @Index()
  @Column({ comment: '乙方存摺帳戶ID', nullable: true })
  bankAccountId: number;

  @Index()
  @Column({ comment: '當前內勤處理人ID', nullable: true })
  currentAssigneeId: number;

  @Column({ comment: '主狀態', default: 1, type: 'tinyint' })
  status: number;

  @Column({ comment: '審核狀態', default: 0, type: 'tinyint' })
  auditStatus: number;

  @Column({ comment: '審核人ID', nullable: true })
  auditUserId: number;

  @Column({ comment: '審核時間', nullable: true, length: 20 })
  auditTime: string;

  @Column({ comment: '審核備註', nullable: true, type: 'text' })
  auditRemark: string;

  @Column({ comment: '分配狀態', default: 0, type: 'tinyint' })
  assignStatus: number;

  @Column({ comment: '分配人ID', nullable: true })
  assignUserId: number;

  @Column({ comment: '分配時間', nullable: true, length: 20 })
  assignTime: string;

  @Column({ comment: '分配備註', nullable: true, type: 'text' })
  assignRemark: string;

  @Column({ comment: '合約狀態', default: 0, type: 'tinyint' })
  contractStatus: number;

  @Column({ comment: '發票狀態', default: 0, type: 'tinyint' })
  invoiceStatus: number;

  @Column({ comment: '回款狀態', default: 0, type: 'tinyint' })
  receiptStatus: number;

  @Column({ comment: '付款狀態', default: 0, type: 'tinyint' })
  paymentStatus: number;

  @Column({ comment: '專案開始日期', nullable: true, length: 20 })
  startDate: string;

  @Column({ comment: '專案結束日期', nullable: true, length: 20 })
  endDate: string;

  @Column({
    comment: '報價總金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  finalAmount: number;

  @Column({
    comment: '總成本',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  costAmount: number;

  @Column({
    comment: '毛利金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  grossProfitAmount: number;

  @Column({
    comment: '毛利率',
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 0,
  })
  grossProfitRate: number;

  @Column({
    comment: '優惠超出15%扣除獎金金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountDeductionAmount: number;

  @Column({
    comment: '優惠比例',
    type: 'decimal',
    precision: 8,
    scale: 2,
    default: 0,
  })
  discountRate: number;

  @Column({
    comment: '佣金',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  commission: number;

  @Column({
    comment: '優惠審批狀態 0-無需審批 1-待老闆審批 2-直接同意 3-同意扣除超出獎金 4-不同意',
    default: 0,
    type: 'tinyint',
  })
  discountAuditStatus: number;

  @Column({ comment: '優惠審批原因', nullable: true, length: 255 })
  discountAuditReason: string;

  @Column({ comment: '優惠審批人ID', nullable: true })
  discountAuditUserId: number;

  @Column({ comment: '優惠審批時間', nullable: true, length: 20 })
  discountAuditTime: string;

  @Column({ comment: '優惠審批備註', nullable: true, type: 'text' })
  discountAuditRemark: string;

  @Column({ comment: '傳送方式 0-未傳送 1-郵件傳送 2-手工標記', default: 0, type: 'tinyint' })
  sendType: number;

  @Column({ comment: '傳送信箱', nullable: true, length: 120 })
  sendEmail: string;

  @Column({ comment: '傳送人ID', nullable: true })
  sendUserId: number;

  @Column({ comment: '傳送時間', nullable: true, length: 20 })
  sendTime: string;

  @Column({ comment: '傳送備註', nullable: true, type: 'text' })
  sendRemark: string;

  @Column({ comment: '合約檔案地址', nullable: true, length: 500 })
  contractFile: string;

  @Column({ comment: '合約檔名', nullable: true, length: 200 })
  contractFileName: string;

  @Column({ comment: '合約上傳人ID', nullable: true })
  contractUploadUserId: number;

  @Column({ comment: '合約上傳時間', nullable: true, length: 20 })
  contractUploadTime: string;

  @Column({ comment: '合約備註', nullable: true, type: 'text' })
  contractRemark: string;

  @Column({ comment: '是否召開案情會議 0-否 1-是', default: 1, type: 'tinyint' })
  caseMeetingFlag: number;

  @Column({ comment: '案情會議更新人ID', nullable: true })
  caseMeetingUpdateUserId: number;

  @Column({ comment: '案情會議更新時間', nullable: true, length: 20 })
  caseMeetingUpdateTime: string;

  @Column({ comment: '執行備註', nullable: true, type: 'text' })
  execRemark: string;

  @Column({ comment: '項目狀況', nullable: true, type: 'text' })
  projectStatus: string;

  @Column({
    comment: '項目狀況圖片',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  projectStatusImages: string[];

  @Column({ comment: '項目雲端Cue表', nullable: true, type: 'text' })
  projectCueSheet: string;

  @Column({ comment: '價格備註', nullable: true, type: 'text' })
  priceRemark: string;

  @Column({ comment: '折讓申請狀態 0-未申請 1-已確認', default: 0, type: 'tinyint' })
  allowanceApplyStatus: number;

  @Column({ comment: '折讓申請人ID', nullable: true })
  allowanceApplyUserId: number;

  @Column({ comment: '折讓申請時間', nullable: true, length: 20 })
  allowanceApplyTime: string;

  @Column({
    comment: '報價單條款',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  quoteTerms: any;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
