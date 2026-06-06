import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 任務資訊
 */
@Entity('task_info')
export class TaskInfoEntity extends BaseEntity {
  @Column({ comment: '任務ID', nullable: true })
  jobId: string;

  @Column({ comment: '任務配置', nullable: true, length: 1000 })
  repeatConf: string;

  @Column({ comment: '名稱' })
  name: string;

  @Column({ comment: 'cron', nullable: true })
  cron: string;

  @Column({ comment: '最大執行次數 不傳為無限次', nullable: true })
  limit: number;

  @Column({
    comment: '每間隔多少毫秒執行一次 如果cron設定了 這項設定就無效',
    nullable: true,
  })
  every: number;

  @Column({ comment: '備註', nullable: true })
  remark: string;

  @Column({ comment: '狀態 0-停止 1-執行', default: 1 })
  status: number;

  @Column({ comment: '開始時間', nullable: true })
  startDate: Date;

  @Column({ comment: '結束時間', nullable: true })
  endDate: Date;

  @Column({ comment: '資料', nullable: true })
  data: string;

  @Column({ comment: '執行的service例項ID', nullable: true })
  service: string;

  @Column({ comment: '狀態 0-系統 1-使用者', default: 0 })
  type: number;

  @Column({ comment: '下一次執行時間', nullable: true })
  nextRunTime: Date;

  @Column({ comment: '狀態 0-cron 1-時間間隔', default: 0 })
  taskType: number;

  @Column({ nullable: true })
  lastExecuteTime: Date;

  @Column({ nullable: true })
  lockExpireTime: Date;
}
