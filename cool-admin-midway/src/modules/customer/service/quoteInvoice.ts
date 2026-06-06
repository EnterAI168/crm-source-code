import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Context } from '@midwayjs/koa';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { Repository } from 'typeorm';
import { CrmQuoteInvoiceEntity } from '../entity/quoteInvoice';
import { CrmQuoteOrderStageEntity } from '../entity/quoteStage';
import { CrmQuoteOrderEntity } from '../entity/quoteOrder';
import { CrmCustomerInfoEntity } from '../entity/info';
import { BaseSysUserEntity } from '../../base/entity/sys/user';
import { BaseSysParamService } from '../../base/service/sys/param';
import { CrmCustomerInfoService } from './info';
import { CrmMailService } from './mail';
import { CrmEcpayInvoiceService } from './ecpayInvoice';
import * as moment from 'moment';
import axios from 'axios';

interface InvoicePdfText {
  text: string;
  x: number;
  y: number;
  size?: number;
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;
  font?: 'cjk' | 'latin';
}

interface InvoicePdfLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
}

interface InvoicePdfImage {
  data: Buffer;
  x: number;
  y: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
}

@Provide()
export class CrmQuoteInvoiceService extends BaseService {
  @InjectEntityModel(CrmQuoteInvoiceEntity)
  crmQuoteInvoiceEntity: Repository<CrmQuoteInvoiceEntity>;

  @InjectEntityModel(CrmQuoteOrderStageEntity)
  crmQuoteOrderStageEntity: Repository<CrmQuoteOrderStageEntity>;

  @InjectEntityModel(CrmQuoteOrderEntity)
  crmQuoteOrderEntity: Repository<CrmQuoteOrderEntity>;

  @InjectEntityModel(CrmCustomerInfoEntity)
  crmCustomerInfoEntity: Repository<CrmCustomerInfoEntity>;

  @InjectEntityModel(BaseSysUserEntity)
  baseSysUserEntity: Repository<BaseSysUserEntity>;

  @Inject()
  ctx: Context;

  @Inject()
  crmCustomerInfoService: CrmCustomerInfoService;

  @Inject()
  crmMailService: CrmMailService;

  @Inject()
  crmEcpayInvoiceService: CrmEcpayInvoiceService;

  @Inject()
  baseSysParamService: BaseSysParamService;

  async page(query: any) {
    const { invoiceNo, status, seller, address, page = 1, size = 20 } = query || {};
    const where: string[] = ['a.isDeleted = 0'];
    const params: any[] = [];

    if (invoiceNo) {
      where.push('a.invoiceNo LIKE ?');
      params.push(`%${String(invoiceNo).trim()}%`);
    }
    if (status) {
      where.push('a.status = ?');
      params.push(Number(status));
    }
    if (seller) {
      where.push('a.seller LIKE ?');
      params.push(`%${String(seller).trim()}%`);
    }
    if (address) {
      where.push('a.address LIKE ?');
      params.push(`%${String(address).trim()}%`);
    }

    const offset = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(size));
    const limit = Math.max(1, Number(size));
    const countRows = await this.nativeQuery(
      `SELECT COUNT(1) AS count FROM crm_quote_invoice a WHERE ${where.join(' AND ')}`,
      params
    );
    const list = await this.nativeQuery(
      `
      SELECT a.*, u.name AS salesmanName, u.nickName AS salesmanNickName, u.username AS salesmanUsername
      FROM crm_quote_invoice a
      LEFT JOIN base_sys_user u ON u.id = a.salesmanId
      WHERE ${where.join(' AND ')}
      ORDER BY a.createTime DESC, a.id DESC
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset]
    );
    return {
      list,
      pagination: {
        page: Number(page),
        size: limit,
        total: Number(countRows?.[0]?.count || 0),
      },
    };
  }

  async info(param: any) {
    const row = await this.crmQuoteInvoiceEntity.findOneBy({
      id: Number(param?.id || 0),
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('發票記錄不存在');
    }
    return row;
  }

  async audit(param: any) {
    const row = await this.info(param);
    if (Number(row.status) !== 1) {
      throw new CoolCommException('只有待審核發票可以審核');
    }
    const status = Number(param?.status);
    if (![2, 3].includes(status)) {
      throw new CoolCommException('審核狀態不正確');
    }
    const auditTime = this.now();
    if (status === 2) {
      await this.issueEcpayInvoice(row);
    }
    await this.crmQuoteInvoiceEntity.update(
      { id: row.id },
      {
        status,
        autoSendEmail:
          param?.autoSendEmail === undefined
            ? row.autoSendEmail
            : Number(param.autoSendEmail) === 0
              ? 0
              : 1,
        auditUserId: Number(this.ctx.admin?.userId || 0) || null,
        auditTime,
        auditRemark: String(param?.auditRemark || '').trim() || null,
      }
    );
    await this.crmQuoteOrderStageEntity.update(
      { id: row.quoteStageId },
      {
        invoiceStatus: status === 2 ? 3 : 4,
      }
    );
    if (status === 2) {
      await this.crmCustomerInfoService.refreshAutoVipByQuoteOrderId(
        Number(row.quoteOrderId)
      );
    }
  }

  async preview(param: any) {
    const row = await this.info(param);
    return await this.buildInvoicePreviewData(row);
  }

  private async buildInvoicePreviewData(row: CrmQuoteInvoiceEntity) {
    if (Number(row.status) !== 2) {
      throw new CoolCommException('只有審核通過的發票可以預覽');
    }
    if (Number(row.ecpayInvalidStatus) === 2 || row.voidTime) {
      throw new CoolCommException('已作廢發票不可預覽');
    }
    const amount = Number(Number(row.amount || 0).toFixed(2));
    const dutyRate =
      this.parseDutyRate(await this.baseSysParamService.dataByKey('duty')) ||
      0.05;
    const untaxedAmount =
      amount > 0 && dutyRate > 0 ? this.toMoney(amount / (1 + dutyRate)) : amount;
    const taxAmount = this.toMoney(amount - untaxedAmount);
    const invoiceSealUrl = this.normalizeFileParam(
      await this.baseSysParamService.dataByKey('invoice_company_seal')
    );
    return {
      ...row,
      invoiceDate: row.auditTime || row.applyTime || row.createTime,
      displayInvoiceNo: row.ecpayInvoiceNo || row.invoiceNo,
      formatNo: '25',
      randomNo: row.ecpayRandomNumber || String(row.id || 0).padStart(4, '0'),
      invoiceSealUrl,
      untaxedAmount,
      taxAmount,
      totalAmount: amount,
    };
  }

  async send(param: any) {
    const id = Number(param?.id || 0);
    const result = await this.sendInvoiceEmail(id);
    await this.crmQuoteInvoiceEntity.update(
      { id },
      {
        autoSendEmail: 0,
        scheduledSendTime: null,
      }
    );
    return result;
  }

  async handleScheduledInvoices() {
    const applyResult = await this.applyDueInvoices();
    const sendResult = await this.sendDueInvoices();
    return {
      apply: applyResult,
      send: sendResult,
    };
  }

  async applyDueInvoices() {
    const rows = await this.nativeQuery(
      `
      SELECT
        s.*,
        o.quoteNo,
        o.quoteName,
        o.customerId,
        o.salesmanId,
        c.companyName,
        c.contactName,
        c.address,
        c.taxNumber,
        c.email
      FROM crm_quote_order_stage s
      INNER JOIN crm_quote_order o ON o.id = s.quoteOrderId AND o.isDeleted = 0
      LEFT JOIN crm_customer_info c ON c.id = o.customerId AND c.isDeleted = 0
      WHERE s.isDeleted = 0
        AND IFNULL(s.invoiceStatus, 0) = 0
        AND IFNULL(s.autoSendEmail, 0) = 1
        AND s.invoiceDate IS NOT NULL
        AND s.invoiceDate <> ''
        AND DATE(s.invoiceDate) <= DATE(DATE_ADD(NOW(), INTERVAL 2 DAY))
      ORDER BY s.invoiceDate ASC, s.sortNum ASC, s.id ASC
      LIMIT 100
    `
    );

    let success = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (const row of rows || []) {
      try {
        const created = await this.createInvoiceApplication(row);
        created ? success++ : skipped++;
      } catch (e) {
        errors.push(e.message || String(e));
      }
    }

    return {
      total: rows?.length || 0,
      success,
      skipped,
      errors,
    };
  }

  async sendDueInvoices() {
    const rows = await this.crmQuoteInvoiceEntity
      .createQueryBuilder('a')
      .where('a.isDeleted = 0')
      .andWhere('a.status = 2')
      .andWhere('a.autoSendEmail = 1')
      .andWhere('(a.sendStatus IS NULL OR a.sendStatus IN (0, 3))')
      .andWhere('a.scheduledSendTime IS NOT NULL')
      .andWhere('a.scheduledSendTime <> :empty', { empty: '' })
      .andWhere('a.scheduledSendTime <= :now', { now: this.now() })
      .orderBy('a.scheduledSendTime', 'ASC')
      .addOrderBy('a.id', 'ASC')
      .limit(50)
      .getMany();

    let success = 0;
    const errors: string[] = [];
    for (const row of rows || []) {
      try {
        await this.sendInvoiceEmail(row.id);
        success++;
      } catch (e) {
        errors.push(e.message || String(e));
      }
    }

    return {
      total: rows?.length || 0,
      success,
      errors,
    };
  }

  private async createInvoiceApplication(row: any) {
    const existed = await this.nativeQuery(
      `
      SELECT id
      FROM crm_quote_invoice
      WHERE quoteOrderId = ?
        AND isDeleted = 0
        AND status IN (1, 2)
        AND (quoteStageId = ? OR stageNo = ?)
      LIMIT 1
      `,
      [Number(row.quoteOrderId), Number(row.id), Number(row.stageNo || 0)]
    );
    if (existed?.length) {
      return false;
    }

    const allStages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId: Number(row.quoteOrderId), isDeleted: 0 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });
    const currentIndex = allStages.findIndex(
      item => Number(item.id) === Number(row.id)
    );
    const previousStages = allStages
      .slice(0, Math.max(0, currentIndex))
      .filter(item => this.toMoney(item.amount) > 0);
    if (previousStages.some(item => Number(item.invoiceStatus) !== 3)) {
      return false;
    }

    const invoiceProductName =
      String(row.invoiceProductName || '').trim() ||
      `${row.quoteName || row.quoteNo || '報價單'}${row.stageName || `階段${row.stageNo}`}款項`;

    const invoice = await this.crmQuoteInvoiceEntity.save({
      invoiceNo: await this.generateInvoiceNo(),
      quoteOrderId: Number(row.quoteOrderId),
      quoteStageId: Number(row.id),
      quoteNo: row.quoteNo || null,
      quoteName: row.quoteName || null,
      stageNo: Number(row.stageNo || 1),
      stageName: row.stageName || null,
      ratio: row.ratio || 0,
      amount: this.toMoney(row.amount),
      invoiceProductName,
      seller: row.companyName || row.contactName || null,
      address: row.address || null,
      taxNumber: row.taxNumber || null,
      email: row.email || null,
      salesmanId: row.salesmanId || null,
      applyUserId: null,
      applyTime: this.now(),
      status: 1,
      autoSendEmail: Number(row.autoSendEmail) === 0 ? 0 : 1,
      scheduledSendTime: row.invoiceDate
        ? `${String(row.invoiceDate).slice(0, 10)} 12:00:00`
        : null,
      sendStatus: 0,
      sentTime: null,
      sendError: null,
      isDeleted: 0,
    });

    await this.crmQuoteOrderStageEntity.update(
      { id: Number(row.id) },
      {
        invoiceProductName,
        invoiceStatus: 1,
        invoiceApplyTime: this.now(),
        invoiceVoidTime: null,
      }
    );
    await this.refreshOrderInvoiceStatus(Number(row.quoteOrderId));
    return invoice.id > 0;
  }

  private async sendInvoiceEmail(id: number, force = false) {
    const row = await this.crmQuoteInvoiceEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('發票記錄不存在');
    }
    if (Number(row.status) !== 2) {
      throw new CoolCommException('只有審核通過的發票可以發送郵件');
    }
    if (Number(row.ecpayInvalidStatus) === 2 || row.voidTime) {
      throw new CoolCommException('已作廢發票不可發送郵件');
    }
    if (!force && Number(row.sendStatus) === 2) {
      return {
        id: row.id,
        sendStatus: 2,
        sentTime: row.sentTime,
      };
    }

    const lock = await this.crmQuoteInvoiceEntity
      .createQueryBuilder()
      .update(CrmQuoteInvoiceEntity)
      .set({
        sendStatus: 1,
        sendError: null,
      })
      .where('id = :id', { id })
      .andWhere('status = 2')
      .andWhere('(sendStatus IS NULL OR sendStatus <> 1)')
      .execute();
    if (!lock.affected) {
      throw new CoolCommException('發票郵件正在發送中，請稍後再試');
    }

    try {
      const customerEmail = await this.getQuoteCustomerEmail(
        Number(row.quoteOrderId)
      );
      const mail = await this.crmMailService.buildTemplateMail({
        key: 'crmInvoiceMailTemplate',
        fallbackSubject: `確認鍵發票_${row.quoteName || row.quoteNo || ''}${this.formatInvoicePeriod(row.stageNo)}`,
        fallbackHtml: this.buildInvoiceMailHtml(row),
        fallbackText: this.buildInvoiceMailText(row),
        variables: this.buildInvoiceMailVariables(row, customerEmail),
      });
      const invoicePdf = await this.buildInvoicePdfAttachment(row);
      await this.crmMailService.send({
        to: customerEmail,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: [...(mail.attachments || []), invoicePdf],
      });
      const sentTime = this.now();
      await this.crmQuoteInvoiceEntity.update(
        { id },
        {
          email: customerEmail,
          sendStatus: 2,
          sentTime,
          sendError: null,
        }
      );
      return {
        id,
        sendStatus: 2,
        sentTime,
      };
    } catch (e) {
      const message = e.message || String(e);
      await this.crmQuoteInvoiceEntity.update(
        { id },
        {
          sendStatus: 3,
          sendError: message.slice(0, 1000),
        }
      );
      throw e;
    }
  }

  private async getQuoteCustomerEmail(quoteOrderId: number) {
    if (!quoteOrderId) {
      throw new CoolCommException('報價單資訊缺失，無法發送發票郵件');
    }
    const rows = await this.nativeQuery(
      `
      SELECT c.email
      FROM crm_quote_order q
      LEFT JOIN crm_customer_info c ON c.id = q.customerId AND c.isDeleted = 0
      WHERE q.id = ? AND q.isDeleted = 0
      LIMIT 1
      `,
      [quoteOrderId]
    );
    const email = String(rows?.[0]?.email || '').trim();
    if (!email) {
      throw new CoolCommException('報價單對應客戶郵箱為空，無法發送發票郵件');
    }
    return email;
  }

  async ecpayDiagnose() {
    return this.crmEcpayInvoiceService.diagnose(
      await this.baseSysParamService.dataByKey('crmEcpayInvoice')
    );
  }

  private buildInvoiceMailHtml(row: CrmQuoteInvoiceEntity) {
    const escape = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const quoteName = row.quoteName || row.quoteNo || '';
    const periodText = this.formatInvoicePeriod(row.stageNo);
    return `
      <div style="font-family: Arial, 'Microsoft JhengHei', sans-serif; line-height: 1.8; color: #333;">
        <p>您好：</p>
        <p>附件為「${escape(quoteName)}${escape(periodText)}」發票，敬請查收。</p>
        <p>若有任何問題，再請不吝告知，謝謝。</p>
        <p>祝 順心</p>
        <p>確認鍵智創科技股份有限公司</p>
      </div>
    `;
  }

  private buildInvoiceMailText(row: CrmQuoteInvoiceEntity) {
    const quoteName = row.quoteName || row.quoteNo || '';
    const periodText = this.formatInvoicePeriod(row.stageNo);
    return [
      '您好，',
      `附件為「${quoteName}${periodText}」發票，敬請查收。`,
      '若有任何問題，再請不吝告知，謝謝。',
      '祝 順心',
      '確認鍵智創科技股份有限公司',
    ].join('\n');
  }

  private buildInvoiceMailVariables(
    row: CrmQuoteInvoiceEntity,
    customerEmail: string
  ) {
    const amount = Number(row.amount || 0).toLocaleString('zh-CN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const invoiceNo = this.displayInvoiceNo(row);
    const invoicePeriodText = this.formatInvoicePeriod(row.stageNo);
    return {
      invoiceNo,
      internalInvoiceNo: row.invoiceNo || '',
      ecpayInvoiceNo: row.ecpayInvoiceNo || '',
      ecpayInvoiceDate: row.ecpayInvoiceDate || '',
      ecpayRandomNumber: row.ecpayRandomNumber || '',
      quoteNo: row.quoteNo || '',
      quoteName: row.quoteName || '',
      stageNo: row.stageNo || '',
      stageName: row.stageName || `階段${row.stageNo || ''}`,
      invoicePeriodText,
      ratio: row.ratio || '',
      amount,
      rawAmount: row.amount || 0,
      invoiceProductName: row.invoiceProductName || '',
      seller: row.seller || '',
      address: row.address || '',
      taxNumber: row.taxNumber || '',
      email: customerEmail,
      auditTime: row.auditTime || '',
      applyTime: row.applyTime || '',
    };
  }

  private async buildInvoicePdfAttachment(row: CrmQuoteInvoiceEntity) {
    const preview = await this.buildInvoicePreviewData(row);
    const quoteName = preview.quoteName || preview.quoteNo || '發票';
    const periodText = this.formatInvoicePeriod(preview.stageNo);
    return {
      filename: `${this.safeFileName(`${quoteName}${periodText || ''}-發票`)}.pdf`,
      content: await this.buildInvoicePdf(preview),
      contentType: 'application/pdf',
    };
  }

  private async buildInvoicePdf(preview: any) {
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const texts: InvoicePdfText[] = [];
    const lines: InvoicePdfLine[] = [];
    const images: InvoicePdfImage[] = [];
    const addText = (
      text: string,
      x: number,
      y: number,
      size = 10,
      options: Partial<InvoicePdfText> = {}
    ) => {
      texts.push({ text: String(text || ''), x, y, size, ...options });
    };
    const addLabelValue = (
      label: string,
      value: any,
      x: number,
      y: number,
      labelWidth = 70,
      size = 10
    ) => {
      addText(label, x, y, size);
      addText(String(value || '-'), x + labelWidth, y, size, { font: 'latin' });
    };
    const addLine = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      width = 0.6
    ) => {
      lines.push({ x1, y1, x2, y2, width });
    };
    const drawRect = (x: number, y: number, width: number, height: number) => {
      addLine(x, y, x + width, y);
      addLine(x + width, y, x + width, y - height);
      addLine(x + width, y - height, x, y - height);
      addLine(x, y - height, x, y);
    };
    const drawTable = (
      x: number,
      y: number,
      widths: number[],
      heights: number[]
    ) => {
      const totalWidth = widths.reduce((sum, item) => sum + item, 0);
      const totalHeight = heights.reduce((sum, item) => sum + item, 0);
      drawRect(x, y, totalWidth, totalHeight);
      let cursorX = x;
      widths.slice(0, -1).forEach(width => {
        cursorX += width;
        addLine(cursorX, y, cursorX, y - totalHeight);
      });
      let cursorY = y;
      heights.slice(0, -1).forEach(height => {
        cursorY -= height;
        addLine(x, cursorY, x + totalWidth, cursorY);
      });
    };

    const left = 86;
    const tableX = left;
    const tableY = 570;
    const widths = [150, 38, 70, 70, 95];
    const centers = widths.reduce((items, width, index) => {
      const prev = index === 0 ? tableX : items[index - 1].edge;
      return [...items, { x: prev + width / 2, edge: prev + width }];
    }, [] as Array<{ x: number; edge: number }>);

    drawRect(72, 760, 451, 615);
    addText('電子發票證明聯', pageWidth / 2, 718, 14, { align: 'center' });
    addText(String(preview.invoiceDate || '').slice(0, 10) || '--', pageWidth / 2, 696, 10, {
      align: 'center',
      font: 'latin',
    });
    addLabelValue('發票號碼：', preview.displayInvoiceNo || preview.invoiceNo || '-', left, 660);
    addText(`買　　方：${preview.seller || '-'}`, left, 642);
    addLabelValue('統一編號：', preview.taxNumber || '-', left, 624);
    addText(`地　　址：${preview.address || '-'}`, left, 606, 10, {
      maxWidth: 245,
    });
    addText('格　　式：', 449, 660, 10);
    addText(String(preview.formatNo || '-'), 509, 660, 10, {
      align: 'right',
      font: 'latin',
    });
    addText('隨 機 碼：', 449, 642, 10);
    addText(String(preview.randomNo || '-'), 509, 642, 10, {
      align: 'right',
      font: 'latin',
    });

    drawTable(tableX, tableY, widths, [30, 190, 32, 32, 32, 50]);
    ['品名', '數量', '單價', '金額', '備註'].forEach((item, index) => {
      addText(item, centers[index].x, tableY - 19, 10, { align: 'center' });
    });
    addText(preview.invoiceProductName || '-', tableX + 8, tableY - 54, 10, {
      maxWidth: widths[0] - 16,
    });
    addText('1', centers[1].x, tableY - 54, 10, {
      align: 'center',
      font: 'latin',
    });
    addText(
      this.formatMoney(preview.untaxedAmount ?? preview.amount),
      centers[2].x,
      tableY - 54,
      10,
      { align: 'center', font: 'latin' }
    );
    addText(
      this.formatMoney(preview.untaxedAmount ?? preview.amount),
      centers[3].x,
      tableY - 54,
      10,
      { align: 'center', font: 'latin' }
    );
    addText(
      preview.auditRemark || '',
      tableX + widths.slice(0, 4).reduce((sum, item) => sum + item, 0) + 8,
      tableY - 54,
      10,
      { maxWidth: widths[4] - 16 }
    );

    const footerY = tableY - 220;
    addText('銷售額合計', tableX + 8, footerY - 20);
    addText(
      this.formatMoney(preview.untaxedAmount ?? preview.amount),
      centers[3].x,
      footerY - 20,
      10,
      { align: 'center', font: 'latin' }
    );
    addText('營業稅', tableX + 8, footerY - 52);
    addText('應稅', tableX + widths[0] + 8, footerY - 52);
    addText(this.formatMoney(preview.taxAmount), centers[3].x, footerY - 52, 10, {
      align: 'center',
      font: 'latin',
    });
    addText('總計', tableX + 8, footerY - 84);
    addText(this.formatMoney(preview.totalAmount), centers[3].x, footerY - 84, 10, {
      align: 'center',
      font: 'latin',
    });
    addText('總計新臺幣', tableX + 8, footerY - 118);
    addText('(中文大寫)', tableX + 8, footerY - 136);
    addText(
      this.toChineseCurrency(preview.totalAmount),
      tableX + widths[0] + widths[1] + 8,
      footerY - 124,
      10,
      { maxWidth: widths[2] + widths[3] - 16 }
    );
    addText('營業人蓋統一發票專用章', centers[4].x, footerY - 50, 9, {
      align: 'center',
      maxWidth: widths[4] - 10,
    });
    addText('確認鍵智創科技股份有限公司', centers[4].x, footerY - 86, 9, {
      align: 'center',
      maxWidth: widths[4] - 10,
    });
    const sealImage = await this.loadInvoiceSealImage(preview.invoiceSealUrl);
    if (sealImage) {
      images.push({
        ...sealImage,
        x: centers[4].x - 45,
        y: footerY - 96,
        width: 90,
        height: 62,
      });
    }

    return this.createInvoicePdf(pageWidth, pageHeight, texts, lines, images);
  }

  private createInvoicePdf(
    pageWidth: number,
    pageHeight: number,
    texts: InvoicePdfText[],
    lines: InvoicePdfLine[],
    images: InvoicePdfImage[] = []
  ) {
    const objects: string[] = [];
    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objects[2] = '<< /Type /Pages /Kids [5 0 R] /Count 1 >>';
    objects[3] = [
      '<< /Type /Font',
      '/Subtype /Type0',
      '/BaseFont /MSung-Light',
      '/Encoding /UniCNS-UCS2-H',
      '/DescendantFonts [<< /Type /Font',
      '/Subtype /CIDFontType0',
      '/BaseFont /MSung-Light',
      '/CIDSystemInfo << /Registry (Adobe) /Ordering (CNS1) /Supplement 5 >>',
      '/FontDescriptor << /Type /FontDescriptor /FontName /MSung-Light /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>',
      '>>]',
      '>>',
    ].join(' ');
    objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
    const imageResource =
      images.length > 0
        ? `/XObject << ${images
            .map((_, index) => `/Im${index + 1} ${7 + index} 0 R`)
            .join(' ')} >> `
        : '';
    objects[5] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${imageResource}>> /Contents 6 0 R >>`;
    const stream = this.createInvoicePdfStream(texts, lines, images);
    objects[6] =
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`;
    images.forEach((image, index) => {
      objects[7 + index] = [
        `<< /Type /XObject /Subtype /Image /Width ${image.imageWidth} /Height ${image.imageHeight}`,
        '/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode',
        `/Length ${image.data.length} >>`,
        'stream',
        image.data.toString('binary'),
        'endstream',
      ].join('\n');
    });

    const chunks: string[] = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
    const offsets: number[] = [0];
    let offset = Buffer.byteLength(chunks[0], 'binary');
    for (let index = 1; index < objects.length; index++) {
      const objectText = `${index} 0 obj\n${objects[index]}\nendobj\n`;
      offsets[index] = offset;
      chunks.push(objectText);
      offset += Buffer.byteLength(objectText, 'binary');
    }
    const xrefOffset = offset;
    chunks.push(
      [
        `xref\n0 ${objects.length}`,
        '0000000000 65535 f ',
        ...offsets
          .slice(1)
          .map(item => `${String(item).padStart(10, '0')} 00000 n `),
        `trailer\n<< /Size ${objects.length} /Root 1 0 R >>`,
        'startxref',
        String(xrefOffset),
        '%%EOF',
      ].join('\n')
    );
    return Buffer.from(chunks.join(''), 'binary');
  }

  private createInvoicePdfStream(
    texts: InvoicePdfText[],
    lines: InvoicePdfLine[],
    images: InvoicePdfImage[] = []
  ) {
    const lineStream = lines
      .map(
        line =>
          `${(line.width || 0.6).toFixed(2)} w ${line.x1.toFixed(2)} ${line.y1.toFixed(2)} m ${line.x2.toFixed(2)} ${line.y2.toFixed(2)} l S\n`
      )
      .join('');
    const textStream = texts
      .flatMap(item => this.wrapInvoicePdfText(item))
      .map(item => {
        const font = this.getInvoicePdfFont(item);
        const textWidth = this.getInvoicePdfTextWidth(item.text, item.size || 10, font);
        const x =
          item.align === 'center'
            ? item.x - textWidth / 2
            : item.align === 'right'
              ? item.x - textWidth
              : item.x;
        const fontName = font === 'latin' ? 'F2' : 'F1';
        const textHex =
          font === 'latin' ? this.toLatinHex(item.text) : this.toUtf16BeHex(item.text);
        return `BT /${fontName} ${item.size || 10} Tf 1 0 0 1 ${x.toFixed(2)} ${item.y.toFixed(2)} Tm <${textHex}> Tj ET\n`;
      })
      .join('');
    const imageStream = images
      .map(
        (image, index) =>
          `q ${image.width.toFixed(2)} 0 0 ${image.height.toFixed(2)} ${image.x.toFixed(2)} ${image.y.toFixed(2)} cm /Im${index + 1} Do Q\n`
      )
      .join('');
    return `${lineStream}${textStream}${imageStream}`;
  }

  private wrapInvoicePdfText(item: InvoicePdfText) {
    if (!item.maxWidth) {
      return [item];
    }
    const rows = this.wrapPdfText(item.text, item.maxWidth, item.size || 10);
    return rows.map((row, index) => ({
      ...item,
      text: row,
      y: item.y - index * ((item.size || 10) + 4),
    }));
  }

  private async loadInvoiceSealImage(url: any) {
    const sealUrl = String(url || '').trim();
    if (!sealUrl || !/\.jpe?g(?:[?#].*)?$/i.test(sealUrl)) {
      return null;
    }
    try {
      const response = await axios.get(sealUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
      });
      const data = Buffer.from(response.data);
      const size = this.getJpegSize(data);
      if (!size) {
        return null;
      }
      return {
        data,
        imageWidth: size.width,
        imageHeight: size.height,
      };
    } catch (e) {
      return null;
    }
  }

  private getJpegSize(data: Buffer) {
    if (data.length < 4 || data[0] !== 0xff || data[1] !== 0xd8) {
      return null;
    }
    let offset = 2;
    while (offset < data.length) {
      if (data[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: data.readUInt16BE(offset + 5),
          width: data.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
    return null;
  }

  private wrapPdfText(text: string, width: number, size: number) {
    const value = String(text || '');
    if (!value) {
      return [''];
    }
    const maxUnits = Math.max(4, width / size);
    const rows: string[] = [];
    let row = '';
    let rowUnits = 0;
    Array.from(value).forEach(char => {
      const units = this.getPdfCharUnits(char);
      if (row && rowUnits + units > maxUnits) {
        rows.push(row);
        row = char.trimStart();
        rowUnits = this.getPdfTextUnits(row);
        return;
      }
      row += char;
      rowUnits += units;
    });
    if (row) {
      rows.push(row);
    }
    return rows;
  }

  private getPdfTextUnits(text: string) {
    return Array.from(String(text || '')).reduce(
      (sum, char) => sum + this.getPdfCharUnits(char),
      0
    );
  }

  private getPdfCharUnits(char: string) {
    return /[\x00-\x7F]/.test(char) ? 0.55 : 1;
  }

  private getInvoicePdfFont(item: InvoicePdfText) {
    if (item.font) {
      return item.font;
    }
    return /^[\x00-\x7F]*$/.test(String(item.text || '')) ? 'latin' : 'cjk';
  }

  private getInvoicePdfTextWidth(
    text: string,
    size: number,
    font: 'cjk' | 'latin'
  ) {
    if (font === 'latin') {
      return String(text || '').length * size * 0.52;
    }
    return this.getPdfTextUnits(text) * size;
  }

  private toLatinHex(text: string) {
    return Buffer.from(String(text || ''), 'latin1').toString('hex').toUpperCase();
  }

  private toUtf16BeHex(text: string) {
    const buffer = Buffer.from(String(text || ''), 'utf16le');
    const bytes: number[] = [];
    for (let index = 0; index < buffer.length; index += 2) {
      bytes.push(buffer[index + 1], buffer[index]);
    }
    return Buffer.from(bytes).toString('hex').toUpperCase();
  }

  private formatMoney(value: any) {
    return Number(this.toMoney(value || 0)).toFixed(2);
  }

  private safeFileName(value: string) {
    return String(value || '發票').replace(/[\\/:*?"<>|]/g, '_');
  }

  private toChineseCurrency(value: any) {
    const digits = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
    const units = ['', '拾', '佰', '仟', '萬', '拾', '佰', '仟', '億'];
    const num = Math.round(Number(value || 0));
    if (!Number.isFinite(num) || num <= 0) {
      return '零元整';
    }
    const chars = String(num)
      .split('')
      .reverse()
      .map(
        (char, index) =>
          `${digits[Number(char)]}${Number(char) === 0 ? '' : units[index]}`
      )
      .reverse()
      .join('')
      .replace(/零+/g, '零')
      .replace(/零(萬|億)/g, '$1')
      .replace(/億萬/g, '億')
      .replace(/零$/g, '');
    return `${chars}元整`;
  }

  private formatInvoicePeriod(value: any) {
    const num = Number(value || 0);
    const zh = [
      '',
      '第一期',
      '第二期',
      '第三期',
      '第四期',
      '第五期',
      '第六期',
      '第七期',
      '第八期',
      '第九期',
      '第十期',
    ];
    if (Number.isInteger(num) && num > 0 && num < zh.length) {
      return zh[num];
    }
    return num > 0 ? `第${num}期` : '';
  }

  private async issueEcpayInvoice(row: CrmQuoteInvoiceEntity) {
    if (row.ecpayInvoiceNo) {
      return row;
    }

    const lock = await this.crmQuoteInvoiceEntity
      .createQueryBuilder()
      .update(CrmQuoteInvoiceEntity)
      .set({
        ecpayIssueStatus: 1,
        ecpayIssueError: null,
      })
      .where('id = :id', { id: row.id })
      .andWhere('status = 1')
      .andWhere('(ecpayInvoiceNo IS NULL OR ecpayInvoiceNo = :empty)', {
        empty: '',
      })
      .andWhere('(ecpayIssueStatus IS NULL OR ecpayIssueStatus <> 1)')
      .execute();
    if (!lock.affected) {
      const latest = await this.info({ id: row.id });
      if (latest.ecpayInvoiceNo) {
        return latest;
      }
      throw new CoolCommException('綠界發票正在開票中，請稍後再試');
    }

    try {
      const customer = await this.getQuoteCustomerContact(Number(row.quoteOrderId));
      const result = await this.crmEcpayInvoiceService.issueB2bInvoice(
        await this.baseSysParamService.dataByKey('crmEcpayInvoice'),
        {
          relateNumber: row.invoiceNo,
          customerName: row.seller || customer.companyName || customer.contactName,
          customerAddr: row.address || customer.address,
          customerIdentifier: row.taxNumber || customer.taxNumber,
          customerEmail: customer.email || row.email,
          customerPhone: customer.mobile,
          itemName: row.invoiceProductName,
          amount: Number(row.amount || 0),
          remark: row.quoteName || row.quoteNo || '',
        }
      );
      await this.crmQuoteInvoiceEntity.update(
        { id: row.id },
        {
          ecpayInvoiceNo: result.InvoiceNumber || result.InvoiceNo || null,
          ecpayInvoiceDate: result.InvoiceDate || null,
          ecpayRandomNumber: result.RandomNumber || null,
          ecpayIssueStatus: 2,
          ecpayIssueTime: this.now(),
          ecpayIssueError: null,
          ecpayIssueResponse: JSON.stringify(result),
        }
      );
      return result;
    } catch (e) {
      const message = e.message || String(e);
      await this.crmQuoteInvoiceEntity.update(
        { id: row.id },
        {
          ecpayIssueStatus: 3,
          ecpayIssueError: message.slice(0, 1000),
        }
      );
      throw e;
    }
  }

  private async getQuoteCustomerContact(quoteOrderId: number) {
    const rows = await this.nativeQuery(
      `
      SELECT c.companyName, c.contactName, c.address, c.taxNumber, c.email, c.mobile
      FROM crm_quote_order q
      LEFT JOIN crm_customer_info c ON c.id = q.customerId AND c.isDeleted = 0
      WHERE q.id = ? AND q.isDeleted = 0
      LIMIT 1
      `,
      [quoteOrderId]
    );
    return rows?.[0] || {};
  }

  private displayInvoiceNo(row: CrmQuoteInvoiceEntity) {
    return row.ecpayInvoiceNo || row.invoiceNo || '';
  }

  private async refreshOrderInvoiceStatus(quoteOrderId: number) {
    const stages = await this.crmQuoteOrderStageEntity.find({
      where: { quoteOrderId, isDeleted: 0 },
    });
    const activeStages = stages || [];
    const handledCount = activeStages.filter(item =>
      [1, 3].includes(Number(item.invoiceStatus))
    ).length;
    let invoiceStatus = 0;
    if (handledCount > 0) {
      invoiceStatus = handledCount >= activeStages.length ? 2 : 1;
    }
    await this.crmQuoteOrderEntity.update({ id: quoteOrderId }, { invoiceStatus });
  }

  private async generateInvoiceNo() {
    for (let i = 0; i < 10; i++) {
      const invoiceNo = `INV${moment().format('YYYYMMDDHHmmss')}${this.randomDigits(6)}`;
      const rows = await this.nativeQuery(
        'SELECT COUNT(1) AS count FROM crm_quote_invoice WHERE invoiceNo = ?',
        [invoiceNo]
      );
      if (Number(rows?.[0]?.count || 0) === 0) {
        return invoiceNo;
      }
    }
    throw new CoolCommException('發票ID生成失敗，請重試');
  }

  private randomDigits(length: number) {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  private toMoney(value: any) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return Number(num.toFixed(2));
  }

  private parseDutyRate(value: any) {
    const raw =
      typeof value === 'object' && value !== null
        ? value.value ?? value.data ?? value.val ?? value.content ?? ''
        : value;
    const number = Number(String(raw || '').replace('%', ''));
    if (!Number.isFinite(number) || number <= 0) {
      return 0;
    }
    return number > 1 ? number / 100 : number;
  }

  private normalizeFileParam(value: any) {
    if (Array.isArray(value)) {
      return String(value[0] || '').trim();
    }
    if (value && typeof value === 'object') {
      return String(value.url ?? value.path ?? value.value ?? '').trim();
    }
    return String(value || '').split(',')[0].trim();
  }

  private now() {
    const date = new Date();
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
