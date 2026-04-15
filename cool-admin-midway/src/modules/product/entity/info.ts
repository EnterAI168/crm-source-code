import { BaseEntity, transformerJson } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 产品信息
 */
@Entity('product_info')
export class ProductInfoEntity extends BaseEntity {
  @Index()
  @Column({ comment: '产品名称', length: 100 })
  name: string;

  @Column({ comment: '产品分类ID', nullable: true })
  categoryId: number;

  @Column({ comment: '内勤部门ID', nullable: true })
  departmentId: number;

  @Column({
    comment: '预设报价(未税)',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  price: number;

  @Column({
    comment: '成本',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  costPrice: number;

  @Column({
    comment: '毛利',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  grossProfit: number;

  @Column({
    comment: '毛利率',
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
  })
  grossProfitRate: number;

  @Column({ comment: '商品说明', type: 'text', nullable: true })
  description: string;

  @Column({ comment: 'Logo图', nullable: true })
  logo: string;

  @Column({
    comment: '商品图片(多图)',
    nullable: true,
    type: 'json',
    transformer: transformerJson,
  })
  images: string[];

  @Column({ comment: '一次性付款产品 0-否 1-是', default: 0 })
  isOneTimePayment: number;

  @Column({ comment: '状态', dict: ['禁用', '启用'], default: 1 })
  status: number;

  @Column({ comment: '逻辑删除 0-否 1-是', default: 0 })
  isDeleted: number;

  @Column({ comment: '备注', nullable: true })
  remark: string;
}
