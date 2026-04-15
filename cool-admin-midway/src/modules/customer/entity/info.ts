import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

/**
 * 客户信息（公池：salesmanId 为空；分配后不再出现在公池）
 */
@Entity('crm_customer_info')
export class CrmCustomerInfoEntity extends BaseEntity {
  @Column({ comment: '公司名称', nullable: true, length: 200 })
  companyName: string;

  @Column({ comment: '地址', nullable: true, length: 300 })
  address: string;

  @Column({ comment: '统一编号', nullable: true, length: 50 })
  taxNumber: string;

  @Column({ comment: '汇款末五码', nullable: true, length: 20 })
  remittanceLast5: string;

  @Index()
  @Column({ comment: '客户名称/联系人', nullable: true, length: 100 })
  contactName: string;

  @Index()
  @Column({ comment: '手机号', nullable: true, length: 30 })
  mobile: string;

  @Column({ comment: '邮箱', nullable: true, length: 120 })
  email: string;

  @Column({ comment: '备注', nullable: true, type: 'text' })
  remark: string;

  /** 行业，字典编码 crmIndustry（数据字典中配置） */
  @Column({ comment: '行业(字典crmIndustry)', nullable: true, length: 64 })
  industry: string;

  @Column({ comment: '是否VIP 0-否 1-是', default: 0, type: 'tinyint' })
  isVip: number;

  @Index()
  @Column({ comment: '业务员ID，空表示在公池', nullable: true })
  salesmanId: number;

  @Column({ comment: '逻辑删除 0-否 1-是', default: 0 })
  isDeleted: number;
}
