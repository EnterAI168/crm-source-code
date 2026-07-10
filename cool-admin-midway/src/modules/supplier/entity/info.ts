import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_supplier')
export class CrmSupplierInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '供應商公司名稱', length: 200 })
  companyName: string;

  @Column({
    comment: '廠商分類(字典 crmSupplierCategory)',
    nullable: true,
    length: 64,
  })
  category: string;

  @Column({
    comment: '分類(字典 crmSupplierBusinessCategory)',
    nullable: true,
    length: 64,
  })
  businessCategory: string;

  @Index()
  @Column({ comment: '統一編號', nullable: true, length: 100 })
  unifiedNo: string;

  @Column({ comment: '聯絡人', nullable: true, length: 100 })
  contactName: string;

  @Column({ comment: '聯絡電話', nullable: true, length: 50 })
  contactPhone: string;

  @Column({ comment: '地址', nullable: true, length: 500 })
  address: string;

  @Column({ comment: '信箱', nullable: true, length: 120 })
  email: string;

  @Column({ comment: '匯款資訊', nullable: true, length: 500 })
  remittanceInfo: string;

  @Index()
  @Column({ comment: '狀態 1-啟用 0-停用', default: 1, type: 'tinyint' })
  status: number;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
