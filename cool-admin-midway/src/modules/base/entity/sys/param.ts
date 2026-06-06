import { BaseEntity } from '../base';
import { Column, Index, Entity } from 'typeorm';

/**
 * 參數配置
 */
@Entity('base_sys_param')
export class BaseSysParamEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ comment: '鍵' })
  keyName: string;

  @Column({ comment: '名稱' })
  name: string;

  @Column({ comment: '資料', type: 'text' })
  data: string;

  @Column({
    comment: '資料型別 0-字串 1-富文本 2-檔案 ',
    default: 0,
  })
  dataType: number;

  @Column({ comment: '備註', nullable: true })
  remark: string;
}
