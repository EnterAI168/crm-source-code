import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../base/entity/base';

@Entity('crm_remittance_stage')
export class CrmRemittanceStageEntity extends BaseEntity {
  @Index()
  @Column({ comment: '匯款單ID' })
  remittanceId: number;

  @Index()
  @Column({ comment: '關聯報價單ID', nullable: true })
  quoteOrderId: number;

  @Column({ comment: '階段序號', type: 'int' })
  stageOrder: number;

  @Column({ comment: '階段名稱', length: 100 })
  stageName: string;

  @Column({
    comment: '當前匯款比例',
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 0,
  })
  ratio: number;

  @Column({
    comment: '應匯款金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  amount: number;

  @Column({ comment: '預計匯款時間', nullable: true, length: 20 })
  expectedRemittanceTime: string;

  @Column({ comment: '實際匯款時間', nullable: true, length: 20 })
  actualRemittanceTime: string;

  @Column({ comment: '下階段匯款時間', nullable: true, length: 20 })
  nextStageRemittanceTime: string;

  @Column({
    comment: '實際匯款金額',
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
  })
  paidAmount: number;

  @Column({ comment: '匯款憑證檔案地址', nullable: true, length: 500 })
  voucherFile: string;

  @Column({ comment: '勞保單', nullable: true, length: 100 })
  laborInsuranceNo: string;

  @Column({ comment: '匯款狀態 0-未匯款 1-已匯款', default: 0, type: 'tinyint' })
  paymentStatus: number;

  @Column({ comment: '匯款人ID', nullable: true })
  paymentUserId: number;

  @Column({ comment: '匯款時間', nullable: true, length: 20 })
  paymentTime: string;

  @Column({ comment: '備註', nullable: true, type: 'text' })
  remark: string;
}
