import { Column, Index, Entity } from 'typeorm';
import { BaseEntity } from '../base';

/**
 * 系統配置
 */
@Entity('base_sys_conf')
export class BaseSysConfEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '配置鍵' })
  cKey: string;

  @Column({ comment: '配置值' })
  cValue: string;
}
