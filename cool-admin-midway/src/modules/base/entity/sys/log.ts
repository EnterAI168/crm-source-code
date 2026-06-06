import { BaseEntity, transformerJson } from '../base';
import { Column, Index, Entity } from 'typeorm';

/**
 * 系統日誌
 */
@Entity('base_sys_log')
export class BaseSysLogEntity extends BaseEntity {
  @Index()
  @Column({ comment: '使用者ID', nullable: true })
  userId: number;

  @Index()
  @Column({ comment: '行為' })
  action: string;

  @Index()
  @Column({ comment: 'ip', nullable: true })
  ip: string;

  @Column({
    comment: '參數',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  params: string;
}
