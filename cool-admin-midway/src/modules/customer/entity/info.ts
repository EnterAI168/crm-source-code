import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * 客戶資訊（公池：salesmanId 為空；分配後不再出現在公池）
 */
@Entity('crm_customer_info')
export class CrmCustomerInfoEntity extends BaseEntity {
  @Column({ comment: '公司名稱', nullable: true, length: 200 })
  companyName: string;

  @Column({ comment: '地址', nullable: true, length: 300 })
  address: string;

  @Column({ comment: '統一編號', nullable: true, length: 50 })
  taxNumber: string;

  @Column({ comment: '匯款末五碼', nullable: true, length: 20 })
  remittanceLast5: string;

  @Index()
  @Column({ comment: '客戶名稱/聯絡人', nullable: true, length: 100 })
  contactName: string;

  @Index()
  @Column({ comment: '手機號', nullable: true, length: 30 })
  mobile: string;

  @Column({ comment: '郵箱', nullable: true, length: 120 })
  email: string;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  /** 行業，字典編碼 crmIndustry（資料字典中配置） */
  @Column({ comment: '行業(字典crmIndustry)', nullable: true, length: 64 })
  industry: string;

  @Column({ comment: '是否VIP 0-否 1-是', default: 0, type: 'tinyint' })
  isVip: number;

  @Column({ comment: '是否廣告投放客戶 0-否 1-是', default: 0, type: 'tinyint' })
  isAdCustomer: number;

  @Column({
    comment: '客戶狀態 1-跟進中 2-已失效 3-報價中 4-已發報價單 5-報價審核中 6-已完成',
    default: 1,
    type: 'tinyint',
  })
  status: number;

  @Column({ comment: '累計成交次數', default: 0, type: 'int' })
  dealCount: number;

  @Column({
    comment: '累計成交金額',
    default: 0,
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  dealAmount: number;

  @Index()
  @Column({ comment: '業務員ID，空表示在公池', nullable: true })
  salesmanId: number;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0 })
  isDeleted: number;
}
