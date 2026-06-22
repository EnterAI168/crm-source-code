import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_remittance')
export class CrmRemittanceEntity extends BaseEntity {
  @Index()
  @Column({ comment: '匯款單編號', length: 32 })
  remittanceNo: string;

  @Column({ comment: '匯款專案名稱', length: 200 })
  remittanceName: string;

  @Index()
  @Column({ comment: '關聯報價單ID', nullable: true })
  quoteOrderId: number;

  @Column({ comment: '匯款型別', length: 100, nullable: true })
  remittanceType: string;

  @Index()
  @Column({ comment: '供應商ID', nullable: true })
  supplierId: number;

  @Column({ comment: '供應商公司名稱', length: 200, nullable: true })
  supplierCompanyName: string;

  @Column({ comment: '供應商地址', length: 500, nullable: true })
  supplierAddress: string;

  @Column({ comment: '供應商統一編號', length: 100, nullable: true })
  supplierUnifiedNo: string;

  @Column({ comment: '供應商郵箱', length: 120, nullable: true })
  supplierEmail: string;

  @Column({
    comment: '匯款總價',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({
    comment: '已匯款金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidAmount: number;

  @Index()
  @Column({ comment: '狀態 1-匯款中 2-已完成', default: 1, type: 'tinyint' })
  status: number;

  @Index()
  @Column({ comment: '業務員ID', nullable: true })
  salesmanId: number;

  @Column({ comment: '上傳檔案', nullable: true, type: 'text' })
  uploadFiles: string;

  @Column({ comment: '上傳發票', nullable: true, type: 'text' })
  invoiceFiles: string;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
