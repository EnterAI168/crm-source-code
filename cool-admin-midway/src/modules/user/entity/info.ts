import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 使用者資訊
 */
@Entity('user_info')
export class UserInfoEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '登入唯一ID', nullable: true })
  unionid: string;

  @Column({ comment: '頭像', nullable: true })
  avatarUrl: string;

  @Column({ comment: '暱稱', nullable: true })
  nickName: string;

  @Index({ unique: true })
  @Column({ comment: '手機號', nullable: true })
  phone: string;

  @Column({ comment: '性別', dict: ['未知', '男', '女'], default: 0 })
  gender: number;

  @Column({ comment: '狀態', dict: ['停用', '正常', '已登出'], default: 1 })
  status: number;

  @Column({ comment: '登入方式', dict: ['小程式', '公眾號', 'H5'], default: 0 })
  loginType: number;

  @Column({ comment: '密碼', nullable: true })
  password: string;

  @Column({ comment: '介紹', type: 'text', nullable: true })
  description: string;
}
