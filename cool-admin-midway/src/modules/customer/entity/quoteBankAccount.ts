import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * 報價單乙方存摺帳戶
 */
@Entity('crm_quote_bank_account')
export class CrmQuoteBankAccountEntity extends BaseEntity {
  @Index()
  @Column({ comment: '帳戶名稱（下拉顯示）', length: 100 })
  name: string;

  @Column({ comment: '戶名', nullable: true, length: 200 })
  bankAccountName: string;

  @Column({ comment: '銀行代號', nullable: true, length: 20 })
  bankCode: string;

  @Column({ comment: '銀行名稱', nullable: true, length: 100 })
  bankName: string;

  @Column({ comment: '開戶行', nullable: true, length: 100 })
  bankBranch: string;

  @Column({ comment: '銀行帳號', nullable: true, length: 50 })
  bankAccountNo: string;

  @Column({ comment: '存摺封面圖片', nullable: true, length: 500 })
  bankCoverUrl: string;

  @Index()
  @Column({ comment: '是否預設 0-否 1-是', default: 0, type: 'tinyint' })
  isDefault: number;

  @Index()
  @Column({ comment: '啟用狀態 0-停用 1-啟用', default: 1, type: 'tinyint' })
  isEnabled: number;

  @Column({ comment: '排序', default: 0 })
  sortNum: number;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
