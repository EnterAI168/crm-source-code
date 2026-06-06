import { BaseEntity } from '../../base/entity/base';
import { Column, Index, Entity } from 'typeorm';

/**
 * 檔案空間資訊
 */
@Entity('space_info')
export class SpaceInfoEntity extends BaseEntity {
  @Column({ comment: '地址' })
  url: string;

  @Column({ comment: '型別' })
  type: string;

  @Column({ comment: '分類ID', nullable: true })
  classifyId: number;

  @Index()
  @Column({ comment: '檔案id' })
  fileId: string;

  @Column({ comment: '檔名' })
  name: string;

  @Column({ comment: '檔案大小' })
  size: number;

  @Column({ comment: '檔案版本', default: 1 })
  version: number;

  @Column({ comment: '檔案位置' })
  key: string;
}
