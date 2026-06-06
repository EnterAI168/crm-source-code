import { BaseEntity } from '../base';
import { Column, Entity } from 'typeorm';

/**
 * 角色部門
 */
@Entity('base_sys_role_department')
export class BaseSysRoleDepartmentEntity extends BaseEntity {
  @Column({ comment: '角色ID' })
  roleId: number;

  @Column({ comment: '部門ID' })
  departmentId: number;
}
