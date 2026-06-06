import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Entity, Column, Index } from 'typeorm';

/**
 * 資料回收站 軟刪除的時候資料會回收到該表
 */
@Entity('recycle_data')
export class RecycleDataEntity extends BaseEntity {
  @Column({ comment: '表', type: 'json', transformer: transformerJson })
  entityInfo: {
    // 資料來源名稱
    dataSourceName: string;
    // entity
    entity: string;
  };

  @Index()
  @Column({ comment: '操作人', nullable: true })
  userId: number;

  @Column({
    comment: '被刪除的資料',
    type: 'json',
    transformer: transformerJson,
  })
  data: object[];

  @Column({ comment: '請求的介面', nullable: true })
  url: string;

  @Column({
    comment: '請求參數',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  params: string;

  @Column({ comment: '刪除資料條數', default: 1 })
  count: number;
}
