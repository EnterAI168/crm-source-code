import { BaseEntity } from '../../base/entity/base';
import { Entity, Column, Index } from 'typeorm';

/**
 * 使用者模組-收貨地址
 */
@Entity('user_address')
export class UserAddressEntity extends BaseEntity {
  @Index()
  @Column({ comment: '使用者ID' })
  userId: number;

  @Column({ comment: '聯絡人' })
  contact: string;

  @Index()
  @Column({ comment: '手機號', length: 11 })
  phone: string;

  @Column({ comment: '省' })
  province: string;

  @Column({ comment: '市' })
  city: string;

  @Column({ comment: '區' })
  district: string;

  @Column({ comment: '地址' })
  address: string;

  @Column({ comment: '是否預設', default: false })
  isDefault: boolean;
}
