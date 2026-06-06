import { BaseEntity } from '../base';
import { Column, Entity } from 'typeorm';

/**
 * 角色選單
 */
@Entity('base_sys_role_menu')
export class BaseSysRoleMenuEntity extends BaseEntity {
  @Column({ comment: '角色ID' })
  roleId: number;

  @Column({ comment: '選單ID' })
  menuId: number;
}
