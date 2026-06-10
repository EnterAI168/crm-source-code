import { BaseEntity } from '../base';
import { Column, Index, Entity } from 'typeorm';

/**
 * 系統使用者
 */
@Entity('base_sys_user')
export class BaseSysUserEntity extends BaseEntity {
  @Index()
  @Column({ comment: '部門ID', nullable: true })
  departmentId: number;

  @Index()
  @Column({ comment: '建立者ID', nullable: true })
  userId: number;

  @Column({ comment: '姓名', nullable: true })
  name: string;

  @Index({ unique: true })
  @Column({ comment: '使用者名稱', length: 100 })
  username: string;

  @Column({ comment: '密碼' })
  password: string;

  @Column({
    comment: '密碼版本, 作用是改完密碼，讓原來的token失效',
    default: 1,
  })
  passwordV: number;

  @Column({ comment: '暱稱', nullable: true })
  nickName: string;

  @Column({ comment: '頭像', nullable: true })
  headImg: string;

  @Index()
  @Column({ comment: '手機', nullable: true, length: 20 })
  phone: string;

  @Column({ comment: '郵箱', nullable: true })
  email: string;

  @Column({ comment: '備註', nullable: true })
  remark: string;

  @Column({
    comment: '工資',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  salary: number;

  @Column({
    comment: '扣繳工資',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  withholdingSalary: number;

  @Column({ comment: '級別', nullable: true, length: 20 })
  level: string;

  @Column({ comment: '狀態 0-停用 1-啟用', default: 1 })
  status: number;
  // 部門名稱
  departmentName: string;
  // 角色ID列表
  roleIdList: number[];
  @Column({ comment: 'socketId', nullable: true })
  socketId: string;
}
