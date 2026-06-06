import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 微信使用者
 */
@Entity('user_wx')
export class UserWxEntity extends BaseEntity {
  @Index()
  @Column({ comment: '微信unionid', nullable: true })
  unionid: string;

  @Index()
  @Column({ comment: '微信openid' })
  openid: string;

  @Column({ comment: '頭像', nullable: true })
  avatarUrl: string;

  @Column({ comment: '暱稱', nullable: true })
  nickName: string;

  @Column({ comment: '性別 0-未知 1-男 2-女', default: 0 })
  gender: number;

  @Column({ comment: '語言', nullable: true })
  language: string;

  @Column({ comment: '城市', nullable: true })
  city: string;

  @Column({ comment: '省份', nullable: true })
  province: string;

  @Column({ comment: '國家', nullable: true })
  country: string;

  @Column({ comment: '型別 0-小程式 1-公眾號 2-H5 3-APP', default: 0 })
  type: number;
}
