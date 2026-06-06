import { BaseEntity } from '../base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 部門
 */
@Entity('base_sys_department')
export class BaseSysDepartmentEntity extends BaseEntity {
  @Column({ comment: '部門名稱' })
  name: string;

  @Index()
  @Column({ comment: '建立者ID', nullable: true })
  userId: number;

  @Column({ comment: '上級部門ID', nullable: true })
  parentId: number;

  @Column({ comment: '排序', default: 0 })
  orderNum: number;
  // 父選單名稱
  parentName: string;
}
