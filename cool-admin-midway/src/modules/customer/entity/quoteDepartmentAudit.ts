import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_quote_order_department_audit')
export class CrmQuoteOrderDepartmentAuditEntity extends BaseEntity {
  @Index()
  @Column({ comment: '報價單ID' })
  quoteOrderId: number;

  @Index()
  @Column({ comment: '內勤部門ID' })
  departmentId: number;

  @Column({
    comment: '審核狀態 1-待審核 2-通過 3-拒絕',
    default: 1,
    type: 'tinyint',
  })
  auditStatus: number;

  @Column({ comment: '審核人ID', nullable: true })
  auditUserId: number;

  @Column({ comment: '審核時間', nullable: true, length: 20 })
  auditTime: string;

  @Column({ comment: '審核備註', nullable: true, type: 'text' })
  auditRemark: string;

  @Column({
    comment: '分配狀態 0-未分配 1-待分配 2-已分配',
    default: 0,
    type: 'tinyint',
  })
  assignStatus: number;

  @Column({ comment: '被分配內勤ID', nullable: true })
  assigneeId: number;

  @Column({ comment: '分配人ID', nullable: true })
  assignUserId: number;

  @Column({ comment: '分配時間', nullable: true, length: 20 })
  assignTime: string;

  @Column({ comment: '分配備註', nullable: true, type: 'text' })
  assignRemark: string;

  @Column({
    comment: '成本填寫狀態 0-未填寫 1-已填寫',
    default: 0,
    type: 'tinyint',
  })
  costStatus: number;

  @Column({ comment: '成本填寫人ID', nullable: true })
  costUserId: number;

  @Column({ comment: '成本填寫時間', nullable: true, length: 20 })
  costTime: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
