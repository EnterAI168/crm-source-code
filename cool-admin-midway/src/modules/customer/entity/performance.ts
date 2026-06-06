import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Index(
  'UK_crm_performance_month_user_role_deleted',
  ['performanceMonth', 'userId', 'roleType', 'isDeleted'],
  { unique: true }
)
@Entity('crm_performance')
export class CrmPerformanceEntity extends BaseEntity {
  @Index()
  @Column({ comment: '考核月份 YYYY-MM', length: 7 })
  performanceMonth: string;

  @Column({ comment: '獎金名稱', length: 50 })
  performanceName: string;

  @Index()
  @Column({ comment: '考核使用者ID' })
  userId: number;

  @Column({ comment: '考核使用者名稱稱', nullable: true, length: 100 })
  userName: string;

  @Index()
  @Column({ comment: '考核角色 sales-業務 internal-內勤', length: 32 })
  roleType: string;

  @Column({ comment: '考核開始時間', length: 30 })
  periodStart: string;

  @Column({ comment: '考核結束時間', length: 30 })
  periodEnd: string;

  @Column({
    comment: '本月開票金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  invoiceAmount: number;

  @Column({
    comment: '預計獎金',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  expectedBonus: number;

  @Column({
    comment: '本月回款金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  receiptAmount: number;

  @Column({
    comment: '實際獎金',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  actualBonus: number;

  @Column({
    comment: '狀態 1-未申請 2-已申請 3-已完成',
    default: 1,
    type: 'tinyint',
  })
  status: number;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
