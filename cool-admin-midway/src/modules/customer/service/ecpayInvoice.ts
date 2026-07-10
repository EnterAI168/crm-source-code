import { Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import axios from 'axios';
import * as crypto from 'crypto';

interface EcpayInvoiceConfig {
  enabled: boolean;
  env: string;
  mode: 'b2b';
  merchantId: string;
  hashKey: string;
  hashIv: string;
  endpoint: string;
  invalidEndpoint: string;
  taxType: string;
  invType: string;
  itemWord: string;
  timeout: number;
}

interface IssueInvoiceOptions {
  relateNumber: string;
  customerName?: string;
  customerAddr?: string;
  customerIdentifier?: string;
  customerEmail?: string;
  customerPhone?: string;
  itemName: string;
  amount: number;
  remark?: string;
}

interface MaintainB2bCustomerOptions {
  customerName?: string;
  customerIdentifier?: string;
  customerEmail?: string;
}

interface InvalidInvoiceOptions {
  invoiceNumber: string;
  invoiceDate: string;
  reason?: string;
}

interface NotifyInvoiceOptions {
  invoiceNumber: string;
  invoiceDate: string;
  notifyMail: string;
}

interface DownloadInvoicePdfOptions {
  invoiceNumber: string;
  invoiceDate: string;
}

interface AllowanceInvoiceOptions {
  invoiceNumber: string;
  invoiceDate: string;
  amount: number;
  itemName?: string;
  originalSequenceNumber?: number;
}

interface PostAesOptions {
  actionName: string;
  endpoint: string;
  data: any;
}

type EcpayJsonMode = 'node' | 'php';

@Provide()
export class CrmEcpayInvoiceService extends BaseService {
  private readonly ECPAY_B2B_ISSUE_AMOUNT_META_KEY = '__crmIssueAmount';

  async diagnose(configValue: any): Promise<any> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    const now = new Date();
    const beginDate = this.formatDate(now);
    const result = await this.postAesJson(config, {
      actionName: '配置診斷',
      endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/GetIssue'),
      data: {
        MerchantID: config.merchantId,
        InvoiceCategory: 0,
        InvoiceNumber: 'AA00000000',
        InvoiceDate: beginDate,
      },
    });

    return {
      ok: true,
      message: '綠界發票配置診斷通過：AES 可正常解密，帳號/Key/IV/環境匹配',
      diagnostic: result.diagnostic,
      response: result.data,
    };
  }

  async issueB2bInvoice(
    configValue: any,
    options: IssueInvoiceOptions
  ): Promise<any> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    await this.maintainB2bCustomerBeforeIssue(config, {
      customerName: options.customerName,
      customerIdentifier: options.customerIdentifier,
      customerEmail: options.customerEmail,
    });

    const issueData = this.buildB2bIssueData(config, options);
    const result = await this.postAesJson(config, {
      actionName: '開票',
      endpoint: config.endpoint,
      data: issueData,
    });
    const decrypted = result.data;
    if (Number(decrypted.RtnCode) !== 1) {
      throw new CoolCommException(
        `綠界發票開票失敗：${decrypted.RtnMsg || decrypted.RtnCode || '業務錯誤'}`
      );
    }
    return {
      ...decrypted,
      [this.ECPAY_B2B_ISSUE_AMOUNT_META_KEY]: {
        salesAmount: issueData.SalesAmount,
        taxAmount: issueData.TaxAmount,
        totalAmount: issueData.TotalAmount,
      },
    };
  }

  async invalidB2bInvoice(
    configValue: any,
    options: InvalidInvoiceOptions
  ): Promise<any> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    const result = await this.postAesJson(config, {
      actionName: '作廢',
      endpoint: config.invalidEndpoint,
      data: this.buildInvalidData(config, options),
    });
    const decrypted = result.data;
    if (Number(decrypted.RtnCode) !== 1) {
      throw new CoolCommException(
        `綠界發票作廢失敗：${decrypted.RtnMsg || decrypted.RtnCode || '業務錯誤'}`
      );
    }
    return decrypted;
  }

  async notifyB2bInvoice(
    configValue: any,
    options: NotifyInvoiceOptions
  ): Promise<any> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    const result = await this.postAesJson(config, {
      actionName: '傳送通知',
      endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/Notify'),
      data: this.buildNotifyData(config, options),
    });
    const decrypted = result.data;
    if (Number(decrypted.RtnCode) !== 1) {
      throw new CoolCommException(
        `綠界發票傳送通知失敗：${decrypted.RtnMsg || decrypted.RtnCode || '業務錯誤'}`
      );
    }
    return decrypted;
  }

  async allowanceB2bInvoice(
    configValue: any,
    options: AllowanceInvoiceOptions
  ): Promise<any> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    const result = await this.postAesJson(config, {
      actionName: '折讓',
      endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/Allowance'),
      data: this.buildAllowanceData(config, options),
    });
    const decrypted = result.data;
    if (Number(decrypted.RtnCode) !== 1) {
      throw new CoolCommException(
        `綠界發票折讓失敗：${decrypted.RtnMsg || decrypted.RtnCode || '業務錯誤'}`
      );
    }
    return {
      ...decrypted,
      [this.ECPAY_B2B_ISSUE_AMOUNT_META_KEY]: this.resolveB2bIssueAmount(
        options.amount,
        config.taxType
      ),
    };
  }

  async downloadB2bInvoicePdf(
    configValue: any,
    options: DownloadInvoicePdfOptions
  ): Promise<Buffer> {
    const config = this.normalizeConfig(configValue);
    if (!config.enabled) {
      throw new CoolCommException('綠界發票開票配置未啟用');
    }
    if (!config.merchantId || !config.hashKey || !config.hashIv) {
      throw new CoolCommException('綠界發票參數未配置，請在參數列表配置 crmEcpayInvoice');
    }
    this.validateCryptoConfig(config);

    const timestamp = Math.floor(Date.now() / 1000);
    const requestData = this.buildDownloadPdfData(config, options);
    let lastError: any = null;

    for (const jsonMode of ['node', 'php'] as EcpayJsonMode[]) {
      const response = await this.sendAesBinaryRequest(
        config,
        {
          actionName: '下載發票PDF',
          endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/DownloadB2BPdf'),
          data: requestData,
        },
        timestamp,
        jsonMode
      );

      const pdfBuffer = this.extractPdfBuffer(
        response.data,
        response.headers?.['content-type']
      );
      if (pdfBuffer) {
        return pdfBuffer;
      }

      const result = this.parseBinaryResponseData(response.data);
      if (jsonMode === 'node' && this.isEcpayDecryptFail(result)) {
        lastError = result;
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        throw new CoolCommException(
          `綠界發票下載PDF失敗：HTTP ${response.status} ${this.formatResponseData(
            result
          )}；${this.buildConfigDiagnostic(config, timestamp, jsonMode)}`
        );
      }

      if (Number(result?.TransCode) !== 1) {
        throw new CoolCommException(
          `綠界發票下載PDF失敗：${
            result?.TransMsg || result?.RtnMsg || '請求格式或加密錯誤'
          }；${this.buildConfigDiagnostic(config, timestamp, jsonMode)}`
        );
      }

      const decrypted = this.decryptResponseData(
        result.Data,
        config.hashKey,
        config.hashIv,
        '下載發票PDF'
      );
      throw new CoolCommException(
        `綠界發票下載PDF失敗：${
          decrypted?.RtnMsg || decrypted?.RtnCode || '未返回PDF內容'
        }`
      );
    }

    throw new CoolCommException(
      `綠界發票下載PDF失敗：${this.formatResponseData(lastError)}`
    );
  }

  private async postAesJson(config: EcpayInvoiceConfig, options: PostAesOptions) {
    const timestamp = Math.floor(Date.now() / 1000);
    let jsonMode: EcpayJsonMode = 'node';
    let response = await this.sendAesRequest(config, options, timestamp, jsonMode);
    if (this.isEcpayDecryptFail(response.data)) {
      jsonMode = 'php';
      response = await this.sendAesRequest(config, options, timestamp, jsonMode);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new CoolCommException(
        `綠界發票${options.actionName}失敗：HTTP ${response.status} ${this.formatResponseData(
          response.data
        )}；${this.buildConfigDiagnostic(config, timestamp, jsonMode)}`
      );
    }
    const result = response.data || {};
    if (Number(result.TransCode) !== 1) {
      throw new CoolCommException(
        `綠界發票${options.actionName}失敗：${result.TransMsg || '請求格式或加密錯誤'}；${this.buildConfigDiagnostic(
          config,
          timestamp,
          jsonMode
        )}`
      );
    }

    const decrypted = this.decryptResponseData(
      result.Data,
      config.hashKey,
      config.hashIv,
      options.actionName
    );
    return {
      data: decrypted,
      diagnostic: this.buildConfigDiagnostic(config, timestamp, jsonMode),
      raw: result,
    };
  }

  private async sendAesRequest(
    config: EcpayInvoiceConfig,
    options: PostAesOptions,
    timestamp: number,
    jsonMode: EcpayJsonMode
  ) {
    const body = {
      Data: this.aesEncrypt(options.data, config.hashKey, config.hashIv, jsonMode),
      MerchantID: config.merchantId,
      RqHeader: {
        Timestamp: timestamp,
        RqID: crypto.randomUUID(),
        Revision: '1.0.0',
      },
    };
    return axios.post(options.endpoint, body, {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });
  }

  private async sendAesBinaryRequest(
    config: EcpayInvoiceConfig,
    options: PostAesOptions,
    timestamp: number,
    jsonMode: EcpayJsonMode
  ) {
    const body = {
      Data: this.aesEncrypt(options.data, config.hashKey, config.hashIv, jsonMode),
      MerchantID: config.merchantId,
      RqHeader: {
        Timestamp: timestamp,
        RqID: crypto.randomUUID(),
        Revision: '1.0.0',
      },
    };
    return axios.post(options.endpoint, body, {
      timeout: Math.max(Number(config.timeout || 0), 60000),
      headers: {
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
    });
  }

  private isEcpayDecryptFail(data: any) {
    return (
      Number(data?.TransCode) !== 1 &&
      String(data?.TransMsg || '')
        .toLowerCase()
        .includes('decrypt')
    );
  }

  private buildEndpoint(baseEndpoint: string, pathname: string) {
    try {
      const url = new URL(baseEndpoint);
      url.pathname = pathname;
      return url.toString();
    } catch {
      return baseEndpoint;
    }
  }

  private buildB2bIssueData(config: EcpayInvoiceConfig, options: IssueInvoiceOptions) {
    const amount = this.resolveB2bIssueAmount(options.amount, config.taxType);
    const totalAmount = amount.totalAmount;
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new CoolCommException('發票金額必須大於0，無法開立綠界發票');
    }
    const customerEmail = String(options.customerEmail || '').trim();
    const customerPhone = String(options.customerPhone || '').trim();
    if (customerEmail && !this.isValidEmail(customerEmail)) {
      throw new CoolCommException('客戶信箱格式不正確，無法開立綠界發票');
    }

    const customerIdentifier = String(options.customerIdentifier || '')
      .replace(/\D/g, '')
      .slice(0, 8);
    if (!this.isValidTaiwanBusinessNumber(customerIdentifier)) {
      throw new CoolCommException('B2B發票需填寫8位有效買方統一編號，無法開立綠界發票');
    }
    const salesAmount = amount.salesAmount;
    const taxAmount = amount.taxAmount;
    const customerAddr = String(options.customerAddr || '').trim().slice(0, 100);
    const itemName = String(options.itemName || '').trim() || 'CRM服務費用';
    const data: any = {
      MerchantID: config.merchantId,
      RelateNumber: this.normalizeRelateNumber(options.relateNumber),
      CustomerIdentifier: customerIdentifier,
      CustomerEmail: customerEmail,
      CustomerAddress: customerAddr,
      CustomerTelephoneNumber: customerPhone.slice(0, 26),
      InvType: config.invType,
      TaxType: config.taxType,
      SalesAmount: salesAmount,
      TaxAmount: taxAmount,
      TotalAmount: totalAmount,
      Items: [
        {
          ItemSeq: 1,
          ItemName: itemName.slice(0, 500),
          ItemCount: 1,
          ItemWord: config.itemWord,
          ItemPrice: salesAmount,
          ItemAmount: salesAmount,
          ItemTax: taxAmount,
          ItemRemark: String(options.remark || '').trim().slice(0, 120),
        },
      ],
      InvoiceRemark: String(options.remark || '').trim().slice(0, 200),
    };
    const specialTaxType = this.resolveSpecialTaxType(config.taxType);
    if (specialTaxType) {
      data.SpecialTaxType = specialTaxType;
    }

    Object.keys(data).forEach(key => {
      if (data[key] === undefined || data[key] === null) {
        data[key] = '';
      }
    });
    return data;
  }

  private async maintainB2bCustomerBeforeIssue(
    config: EcpayInvoiceConfig,
    options: MaintainB2bCustomerOptions
  ) {
    const result = await this.postAesJson(config, {
      actionName: '交易對象維護',
      endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/MaintainMerchantCustomerData'),
      data: this.buildMaintainB2bCustomerData(config, options, 'Add'),
    });
    const decrypted = result.data || {};
    if (Number(decrypted.RtnCode) === 1) {
      return decrypted;
    }
    if (this.isB2bCustomerExistsMessage(decrypted.RtnMsg)) {
      const updateResult = await this.postAesJson(config, {
        actionName: '交易對象更新',
        endpoint: this.buildEndpoint(config.endpoint, '/B2BInvoice/MaintainMerchantCustomerData'),
        data: this.buildMaintainB2bCustomerData(config, options, 'Update'),
      });
      const updateDecrypted = updateResult.data || {};
      if (Number(updateDecrypted.RtnCode) === 1) {
        return updateDecrypted;
      }
      throw new CoolCommException(
        `綠界發票交易對象更新失敗：${
          updateDecrypted.RtnMsg || updateDecrypted.RtnCode || '業務錯誤'
        }`
      );
    }
    {
      throw new CoolCommException(
        `綠界發票交易對象維護失敗：${decrypted.RtnMsg || decrypted.RtnCode || '業務錯誤'}`
      );
    }
  }

  private buildMaintainB2bCustomerData(
    config: EcpayInvoiceConfig,
    options: MaintainB2bCustomerOptions,
    action: 'Add' | 'Update'
  ) {
    const customerIdentifier = String(options.customerIdentifier || '')
      .replace(/\D/g, '')
      .slice(0, 8);
    if (!this.isValidTaiwanBusinessNumber(customerIdentifier)) {
      throw new CoolCommException('B2B發票需填寫8位有效買方統一編號，無法維護交易對象');
    }
    const email = String(options.customerEmail || '').trim();
    if (!email || !this.isValidEmail(email)) {
      throw new CoolCommException('B2B發票交易對象需填寫有效買方信箱，無法開立綠界發票');
    }
    const companyName =
      String(options.customerName || '').trim().slice(0, 60) ||
      `買方${customerIdentifier}`;
    return {
      MerchantID: config.merchantId,
      Action: action,
      Identifier: customerIdentifier,
      type: '1',
      CompanyName: companyName,
      TradingSlang: companyName,
      ExchangeMode: '0',
      EmailAddress: email,
    };
  }

  private buildInvalidData(
    config: EcpayInvoiceConfig,
    options: InvalidInvoiceOptions
  ) {
    const invoiceNumber = String(options.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      throw new CoolCommException('綠界發票號碼為空，無法作廢');
    }
    const invoiceDate = this.normalizeInvoiceDate(options.invoiceDate);
    if (!invoiceDate) {
      throw new CoolCommException('綠界發票日期為空，無法作廢');
    }
    const reason = String(options.reason || 'CRM發票作廢').trim().slice(0, 20);
    return {
      MerchantID: config.merchantId,
      InvoiceNumber: invoiceNumber,
      InvoiceDate: invoiceDate,
      Reason: reason || 'CRM發票作廢',
    };
  }

  private buildNotifyData(
    config: EcpayInvoiceConfig,
    options: NotifyInvoiceOptions
  ) {
    const invoiceNumber = String(options.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      throw new CoolCommException('綠界發票號碼為空，無法傳送通知');
    }
    const invoiceDate = this.normalizeInvoiceDate(options.invoiceDate);
    if (!invoiceDate) {
      throw new CoolCommException('綠界發票日期為空，無法傳送通知');
    }
    const notifyMail = String(options.notifyMail || '').trim();
    if (!notifyMail || !this.isValidEmail(notifyMail)) {
      throw new CoolCommException('買方信箱為空或格式不正確，無法傳送綠界通知');
    }
    return {
      MerchantID: config.merchantId,
      InvoiceDate: invoiceDate,
      InvoiceNumber: invoiceNumber,
      NotifyMail: notifyMail,
      InvoiceTag: '1',
      Notified: 'C',
    };
  }

  private buildAllowanceData(
    config: EcpayInvoiceConfig,
    options: AllowanceInvoiceOptions
  ) {
    const invoiceNumber = String(options.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      throw new CoolCommException('綠界發票號碼為空，無法開立折讓');
    }
    const invoiceDate = this.normalizeInvoiceDate(options.invoiceDate);
    if (!invoiceDate) {
      throw new CoolCommException('綠界發票日期為空，無法開立折讓');
    }
    const amount = this.resolveB2bIssueAmount(options.amount, config.taxType);
    if (!Number.isFinite(amount.totalAmount) || amount.totalAmount <= 0) {
      throw new CoolCommException('折讓金額必須大於0');
    }
    const itemName =
      String(options.itemName || '').trim().slice(0, 500) || 'CRM折讓';
    const originalSequenceNumber = Math.max(
      1,
      Math.floor(Number(options.originalSequenceNumber || 1))
    );

    return {
      MerchantID: config.merchantId,
      TaxAmount: amount.taxAmount,
      TotalAmount: amount.salesAmount,
      Details: [
        {
          OriginalInvoiceNumber: invoiceNumber,
          OriginalInvoiceDate: invoiceDate,
          ItemName: itemName,
          OriginalSequenceNumber: originalSequenceNumber,
          ItemCount: 1,
          ItemPrice: amount.salesAmount,
          ItemAmount: amount.salesAmount,
        },
      ],
    };
  }

  private buildDownloadPdfData(
    config: EcpayInvoiceConfig,
    options: DownloadInvoicePdfOptions
  ) {
    const invoiceNumber = String(options.invoiceNumber || '').trim();
    if (!invoiceNumber) {
      throw new CoolCommException('綠界發票號碼為空，無法下載PDF');
    }
    const invoiceDate = this.normalizeInvoiceDate(options.invoiceDate);
    if (!invoiceDate) {
      throw new CoolCommException('綠界發票日期為空，無法下載PDF');
    }
    return {
      MerchantID: config.merchantId,
      InvoiceCategory: 0,
      InvoiceNo: invoiceNumber,
      InvoiceDate: invoiceDate,
      PrintStyle: 1,
    };
  }

  private normalizeConfig(value: any): EcpayInvoiceConfig {
    const raw = typeof value === 'string' ? this.parseConfigJson(value) : value || {};
    const env = String(raw.env || process.env.ECPAY_INVOICE_ENV || 'stage')
      .trim()
      .toLowerCase();
    const endpoint = this.normalizeB2bEndpoint(
      raw.endpoint,
      env,
      '/B2BInvoice/Issue'
    );
    const invalidEndpoint = this.normalizeB2bEndpoint(
      raw.invalidEndpoint ||
        (String(endpoint).includes('/B2BInvoice/Issue')
          ? String(endpoint).replace('/B2BInvoice/Issue', '/B2BInvoice/Invalid')
          : ''),
      env,
      '/B2BInvoice/Invalid'
    );
    const merchantId =
      this.pickConfigValue(raw, ['merchantId', 'MerchantID', 'merchantID']) ||
      process.env.ECPAY_INVOICE_MERCHANT_ID ||
      '';
    const hashKey =
      this.pickConfigValue(raw, ['hashKey', 'HashKey', 'HASH_KEY']) ||
      process.env.ECPAY_INVOICE_HASH_KEY ||
      '';
    const hashIv =
      this.pickConfigValue(raw, ['hashIv', 'hashIV', 'HashIV', 'HASH_IV']) ||
      process.env.ECPAY_INVOICE_HASH_IV ||
      '';
    return {
      enabled: this.toBoolean(raw.enabled ?? process.env.ECPAY_INVOICE_ENABLED ?? true),
      env,
      mode: 'b2b',
      merchantId: String(merchantId || '').trim(),
      hashKey: String(hashKey || '').trim(),
      hashIv: String(hashIv || '').trim(),
      endpoint: String(endpoint).trim(),
      invalidEndpoint: String(invalidEndpoint).trim(),
      taxType: String(raw.taxType ?? '1'),
      invType: String(raw.invType ?? '07'),
      itemWord: String(raw.itemWord ?? '項').slice(0, 6) || '項',
      timeout: Number(raw.timeout || process.env.ECPAY_INVOICE_TIMEOUT || 15000),
    };
  }

  private pickConfigValue(raw: any, keys: string[]) {
    for (const key of keys) {
      if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== '') {
        return raw[key];
      }
    }
    return '';
  }

  private validateCryptoConfig(config: EcpayInvoiceConfig) {
    if (Buffer.byteLength(config.hashKey, 'utf8') < 16) {
      throw new CoolCommException('綠界發票 HashKey 長度不足，請檢查 crmEcpayInvoice 配置');
    }
    if (Buffer.byteLength(config.hashIv, 'utf8') < 16) {
      throw new CoolCommException('綠界發票 HashIV 長度不足，請檢查 crmEcpayInvoice 配置');
    }
    const endpoint = String(config.endpoint || '').toLowerCase();
    if (config.env === 'prod' && endpoint.includes('-stage')) {
      throw new CoolCommException('綠界發票環境配置不一致：env=prod 不能使用測試環境 endpoint');
    }
    if (config.env !== 'prod' && !endpoint.includes('-stage')) {
      throw new CoolCommException('綠界發票環境配置不一致：測試環境不能使用正式 endpoint');
    }
    if (!endpoint.includes('/b2binvoice/')) {
      throw new CoolCommException('綠界發票已改為B2B模式，endpoint 必須使用 /B2BInvoice/');
    }
  }

  private resolveSpecialTaxType(taxType: string) {
    const value = String(taxType || '1');
    if (value === '3') {
      return 8;
    }
    return 0;
  }

  private resolveDutyRate(taxType: string) {
    const value = String(taxType || '1');
    return value === '1' ? 0.05 : 0;
  }

  private resolveB2bIssueAmount(value: any, taxType: string) {
    const totalAmount = this.toIntegerMoney(value);
    const dutyRate = this.resolveDutyRate(taxType);
    const salesAmount =
      dutyRate > 0 ? this.toIntegerMoney(totalAmount / (1 + dutyRate)) : totalAmount;
    const taxAmount = totalAmount - salesAmount;
    return {
      salesAmount,
      taxAmount,
      totalAmount,
    };
  }

  private normalizeRelateNumber(value: string) {
    const relateNumber = String(value || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 50);
    if (!relateNumber) {
      throw new CoolCommException('綠界發票關聯編號為空，無法開票');
    }
    return relateNumber;
  }

  private normalizeB2bEndpoint(value: any, env: string, pathname: string) {
    const fallbackBase =
      env === 'prod' ? 'https://einvoice.ecpay.com.tw' : 'https://einvoice-stage.ecpay.com.tw';
    const raw = String(value || '').trim();
    if (!raw) {
      return `${fallbackBase}${pathname}`;
    }
    try {
      const url = new URL(raw);
      if (!url.pathname.toLowerCase().includes('/b2binvoice/')) {
        url.pathname = pathname;
      }
      return url.toString();
    } catch {
      return `${fallbackBase}${pathname}`;
    }
  }

  private aesEncrypt(
    data: any,
    hashKey: string,
    hashIv: string,
    jsonMode: EcpayJsonMode = 'node'
  ) {
    const json =
      jsonMode === 'php' ? this.stringifyLikePhpJsonEncode(data) : JSON.stringify(data);
    const encoded = encodeURIComponent(json)
      .replace(/%20/g, '+')
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
      .replace(/~/g, '%7E');
    const cipher = crypto.createCipheriv(
      'aes-128-cbc',
      Buffer.from(hashKey, 'utf8').subarray(0, 16),
      Buffer.from(hashIv, 'utf8').subarray(0, 16)
    );
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(encoded, 'utf8'), cipher.final()]).toString(
      'base64'
    );
  }

  private aesDecrypt(data: string, hashKey: string, hashIv: string) {
    const decipher = crypto.createDecipheriv(
      'aes-128-cbc',
      Buffer.from(hashKey, 'utf8').subarray(0, 16),
      Buffer.from(hashIv, 'utf8').subarray(0, 16)
    );
    decipher.setAutoPadding(true);
    const decoded = Buffer.concat([
      decipher.update(String(data || ''), 'base64'),
      decipher.final(),
    ]).toString('utf8');
    return this.parseJson(decodeURIComponent(decoded.replace(/\+/g, '%20')));
  }

  private stringifyLikePhpJsonEncode(data: any) {
    return JSON.stringify(data)
      .replace(/\//g, '\\/')
      .replace(/[\u007f-\uffff]/g, char => {
        return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
      });
  }

  private decryptResponseData(
    data: string,
    hashKey: string,
    hashIv: string,
    actionName: string
  ) {
    try {
      return this.aesDecrypt(data, hashKey, hashIv);
    } catch {
      throw new CoolCommException(
        `綠界發票${actionName}失敗：響應解密失敗，請檢查 MerchantID/HashKey/HashIV/環境是否匹配`
      );
    }
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value || '{}');
    } catch (e) {
      return {};
    }
  }

  private parseConfigJson(value: string) {
    try {
      return JSON.parse(value || '{}');
    } catch (e) {
      const normalized = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '');
      try {
        return JSON.parse(normalized || '{}');
      } catch {
        throw new CoolCommException(
          '綠界發票配置 JSON 格式錯誤，請檢查 crmEcpayInvoice 參數，確認沒有多餘逗號、中文引號或不可見字元'
        );
      }
    }
  }

  private formatResponseData(data: any) {
    if (data === undefined || data === null || data === '') {
      return '無響應內容';
    }
    if (typeof data === 'string') {
      return data.slice(0, 500);
    }
    try {
      return JSON.stringify(data).slice(0, 500);
    } catch {
      return String(data).slice(0, 500);
    }
  }

  private extractPdfBuffer(content: any, contentType: any) {
    const buffer = this.toBuffer(content);
    if (!buffer.length) {
      return null;
    }
    if (this.isPdfBuffer(buffer)) {
      return buffer;
    }

    const decodedBase64Buffer = this.tryDecodePdfBase64(buffer);
    if (decodedBase64Buffer) {
      return decodedBase64Buffer;
    }

    const normalizedType = Array.isArray(contentType)
      ? String(contentType[0] || '').toLowerCase()
      : String(contentType || '').toLowerCase();
    if (normalizedType.includes('application/pdf')) {
      return null;
    }
    return null;
  }

  private parseBinaryResponseData(content: any) {
    const buffer = this.toBuffer(content);
    const text = buffer.toString('utf8').trim();
    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text.slice(0, 500) };
    }
  }

  private toBuffer(content: any) {
    if (!content) {
      return Buffer.from([]);
    }
    if (Buffer.isBuffer(content)) {
      return content;
    }
    if (content instanceof ArrayBuffer) {
      return Buffer.from(content);
    }
    if (ArrayBuffer.isView(content)) {
      return Buffer.from(content.buffer, content.byteOffset, content.byteLength);
    }
    if (typeof content === 'string') {
      return Buffer.from(content);
    }
    return Buffer.from([]);
  }

  private isPdfBuffer(buffer: Buffer) {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString('utf8') === '%PDF';
  }

  private tryDecodePdfBase64(buffer: Buffer) {
    const text = buffer.toString('utf8').trim();
    if (!text || text.length < 32) {
      return null;
    }

    const normalized = text.replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
      return null;
    }

    try {
      const decoded = Buffer.from(normalized, 'base64');
      return this.isPdfBuffer(decoded) ? decoded : null;
    } catch {
      return null;
    }
  }

  private buildConfigDiagnostic(
    config: EcpayInvoiceConfig,
    timestamp: number,
    jsonMode: EcpayJsonMode = 'node'
  ) {
    const endpoint = this.safeEndpoint(config.endpoint);
    return [
      '配置診斷',
      `env=${config.env || ''}`,
      `mode=${config.mode || 'b2b'}`,
      `merchantId=${config.merchantId || ''}`,
      `endpoint=${endpoint}`,
      `timestamp=${timestamp}`,
      `jsonMode=${jsonMode}`,
      `hashKeyBytes=${Buffer.byteLength(config.hashKey || '', 'utf8')}`,
      `hashIvBytes=${Buffer.byteLength(config.hashIv || '', 'utf8')}`,
      `hashKeyFp=${this.sha256Short(config.hashKey)}`,
      `hashIvFp=${this.sha256Short(config.hashIv)}`,
    ].join('，');
  }

  private safeEndpoint(endpoint: string) {
    try {
      const url = new URL(endpoint);
      return `${url.host}${url.pathname}`;
    } catch {
      return String(endpoint || '').slice(0, 120);
    }
  }

  private sha256Short(value: string) {
    if (!value) {
      return '';
    }
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 12);
  }

  private toBoolean(value: any) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  private isValidEmail(email: string) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  }

  private isB2bCustomerExistsMessage(message: any) {
    const text = String(message || '');
    return ['已存在', '已建立', '重複', '重複'].some(item => text.includes(item));
  }

  private isValidTaiwanBusinessNumber(value: string) {
    if (!/^\d{8}$/.test(value)) {
      return false;
    }
    const weights = [1, 2, 1, 2, 1, 2, 4, 1];
    const sum = value
      .split('')
      .map((item, index) => Number(item) * weights[index])
      .reduce((total, item) => total + Math.floor(item / 10) + (item % 10), 0);
    if (sum % 10 === 0) {
      return true;
    }
    return value[6] === '7' && (sum + 1) % 10 === 0;
  }

  private normalizeInvoiceDate(value: string) {
    const text = String(value || '').trim().replace(/\//g, '-');
    const matched = text.match(/\d{4}-\d{2}-\d{2}/);
    return matched ? matched[0] : '';
  }

  private formatDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toMoney(value: any) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return Number(num.toFixed(2));
  }

  private toIntegerMoney(value: any) {
    const num = Number(value || 0);
    if (!Number.isFinite(num)) {
      return 0;
    }
    return Math.round(num);
  }
}
