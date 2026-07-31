import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_bonus_config')
export class CrmBonusConfigEntity extends BaseEntity {
  @Index()
  @Column({
    comment: '適用角色 sales-業務 sales_manager-業務主管 internal-內勤 integration_pm-整合PM',
    length: 32,
  })
  roleType: string;

  @Index()
  @Column({ comment: '分組編碼', length: 64 })
  groupCode: string;

  @Column({ comment: '分組名稱', length: 100 })
  groupName: string;

  @Index({ unique: true })
  @Column({ comment: '配置編碼', length: 100 })
  configCode: string;

  @Column({ comment: '配置名稱', length: 160 })
  configName: string;

  @Column({ comment: '配置型別 rate-比例 amount-金額 threshold-門檻 text-文本', length: 32 })
  configType: string;

  @Column({ comment: '條件說明', nullable: true, type: 'text' })
  conditionText: string;

  @Column({ comment: '計算基數', nullable: true, length: 200 })
  calcBase: string;

  @Column({ comment: '配置值', nullable: true, length: 64 })
  configValue: string;

  @Column({ comment: '單位', nullable: true, length: 32 })
  unit: string;

  @Column({ comment: '排序', default: 0 })
  sortNum: number;

  @Index()
  @Column({ comment: '啟用狀態 0-停用 1-啟用', default: 1, type: 'tinyint' })
  isEnabled: number;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;

  @Column({ comment: '邏輯刪除 0-否 1-是', default: 0, type: 'tinyint' })
  isDeleted: number;
}
