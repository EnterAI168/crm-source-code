import { Column, Entity, Index } from 'typeorm';
import { BaseEntity, transformerJson } from '../../base/entity/base';

@Index('UK_crm_contract_reminder_user_date_deleted', ['userId', 'notifyDate', 'isDeleted'], {
  unique: true,
})
@Entity('crm_contract_reminder')
export class CrmContractReminderEntity extends BaseEntity {
  @Index()
  @Column({ comment: '提醒使用者ID' })
  userId: number;

  @Column({ comment: '提醒使用者名稱稱', nullable: true, length: 100 })
  userName: string;

  @Index()
  @Column({ comment: '提醒日期 YYYY-MM-DD', length: 10 })
  notifyDate: string;

  @Column({ comment: '提醒報價單數量', default: 0 })
  quoteCount: number;

  @Column({ comment: '提醒內容', type: 'text' })
  content: string;

  @Column({
    comment: '提醒明細',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  detailJson: any;

  @Column({ comment: '是否已讀 0-否 1-是', default: 0, type: 'tinyint' })
  isRead: number;

  @Column({ comment: '閱讀時間', nullable: true, length: 20 })
  readTime: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
