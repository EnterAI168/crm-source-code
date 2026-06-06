import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 外掛資訊
 */
@Entity('plugin_info')
export class PluginInfoEntity extends BaseEntity {
  @Column({ comment: '名稱' })
  name: string;

  @Column({ comment: '簡介' })
  description: string;

  @Index()
  @Column({ comment: 'Key名' })
  keyName: string;

  @Column({ comment: 'Hook' })
  hook: string;

  @Column({ comment: '描述', type: 'text' })
  readme: string;

  @Column({ comment: '版本' })
  version: string;

  @Column({ comment: 'Logo(base64)', type: 'text', nullable: true })
  logo: string;

  @Column({ comment: '作者' })
  author: string;

  @Column({ comment: '狀態 0-停用 1-啟用', default: 0 })
  status: number;

  @Column({ comment: '內容', type: 'json', transformer: transformerJson })
  content: {
    type: 'comm' | 'module';
    data: string;
  };

  @Column({ comment: 'ts內容', type: 'json', transformer: transformerJson })
  tsContent: {
    type: 'ts';
    data: string;
  };

  @Column({
    comment: '外掛的plugin.json',
    type: 'json',
    transformer: transformerJson,
    nullable: true,
  })
  pluginJson: any;

  @Column({
    comment: '配置',
    type: 'json',
    transformer: transformerJson,
    nullable: true,
  })
  config: any;
}
