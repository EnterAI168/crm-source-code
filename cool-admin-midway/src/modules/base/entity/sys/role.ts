import { BaseEntity, transformerJson } from '../base';
import { Column, Index, Entity } from 'typeorm';

/**
 * 角色
 */
@Entity('base_sys_role')
export class BaseSysRoleEntity extends BaseEntity {
  @Column({ comment: '使用者ID' })
  userId: string;

  @Index({ unique: true })
  @Column({ comment: '名稱' })
  name: string;

  @Index({ unique: true })
  @Column({ comment: '角色標籤', nullable: true, length: 50 })
  label: string;

  @Column({ comment: '備註', nullable: true })
  remark: string;

  @Column({ comment: '資料權限是否關聯上下級', default: false })
  relevance: boolean;

  @Column({ comment: '選單權限', type: 'json', transformer: transformerJson })
  menuIdList: number[];

  @Column({ comment: '部門權限', type: 'json', transformer: transformerJson })
  departmentIdList: number[];
}
