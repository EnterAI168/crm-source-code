import { Index, PrimaryGeneratedColumn, Column } from 'typeorm';
import * as moment from 'moment';
import { CoolBaseEntity } from '@cool-midway/core';

/**
 * 時間轉換器
 */
export const transformerTime = {
  to(value) {
    return value
      ? moment(value).format('YYYY-MM-DD HH:mm:ss')
      : moment().format('YYYY-MM-DD HH:mm:ss');
  },
  from(value) {
    return value;
  },
};

/**
 * Json轉換器
 */
export const transformerJson = {
  to: value => value,
  from: value => {
    // 確保從資料庫返回的是物件
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  },
};
/**
 * 實體基類
 */
export abstract class BaseEntity extends CoolBaseEntity {
  // 預設自增
  @PrimaryGeneratedColumn('increment', {
    comment: 'ID',
  })
  id: number;

  @Index()
  @Column({
    comment: '建立時間',
    type: 'varchar',
    transformer: transformerTime,
  })
  createTime: Date;

  @Index()
  @Column({
    comment: '更新時間',
    type: 'varchar',
    transformer: transformerTime,
  })
  updateTime: Date;

  @Index()
  @Column({ comment: '租戶ID', nullable: true })
  tenantId: number;
}
