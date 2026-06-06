import { BaseEntity } from '../../base/entity/base';
import { Column, Entity } from 'typeorm';

/**
 * 圖片空間資訊分類
 */
@Entity('space_type')
export class SpaceTypeEntity extends BaseEntity {
  @Column({ comment: '類別名稱' })
  name: string;

  @Column({ comment: '父分類ID', nullable: true })
  parentId: number;
}
