import { BaseEntity } from '../base';
import { Column, Entity } from 'typeorm';

/**
 * 選單
 */
@Entity('base_sys_menu')
export class BaseSysMenuEntity extends BaseEntity {
  @Column({ comment: '父選單ID', nullable: true })
  parentId: number;

  @Column({ comment: '選單名稱' })
  name: string;

  @Column({ comment: '選單地址', nullable: true })
  router: string;

  @Column({ comment: '權限標識', type: 'text', nullable: true })
  perms: string;

  @Column({
    comment: '型別 0-目錄 1-選單 2-按鈕',
    default: 0,
  })
  type: number;

  @Column({ comment: '圖示', nullable: true })
  icon: string;

  @Column({ comment: '排序', default: 0 })
  orderNum: number;

  @Column({ comment: '檢視地址', nullable: true })
  viewPath: string;

  @Column({ comment: '路由快取', default: true })
  keepAlive: boolean;

  @Column({ comment: '是否顯示', default: true })
  isShow: boolean;

  // 父選單名稱
  parentName: string;

  // 子選單
  childMenus: any;
}
