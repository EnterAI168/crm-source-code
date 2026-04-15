import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * 客户跟进记录
 */
@Entity('crm_customer_followup')
export class CrmCustomerFollowupEntity extends BaseEntity {
  @Index()
  @Column({ comment: '客户ID crm_customer_info.id' })
  customerId: number;

  @Column({ comment: '跟进内容', type: 'text' })
  content: string;

  @Column({ comment: '跟进时间', type: 'datetime', nullable: true })
  followTime: Date;

  @Column({ comment: '预计下次跟进时间', type: 'datetime', nullable: true })
  nextFollowTime: Date;

  @Column({ comment: '备注', type: 'text', nullable: true })
  remark: string;

  @Column({ comment: '逻辑删除 0-否 1-是', default: 0 })
  isDeleted: number;
}
