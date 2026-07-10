import { Inject, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { BaseSysParamService } from '../../base/service/sys/param';

interface CrmMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: CrmMailAttachment[];
}

interface CrmMailAttachment {
  filename?: string;
  path?: string;
  href?: string;
  content?: string | Buffer;
  contentType?: string;
  cid?: string;
}

interface CrmMailTemplateOptions {
  key: string;
  fallbackSubject: string;
  fallbackHtml: string;
  fallbackText?: string;
  variables?: Record<string, any>;
}

@Provide()
export class CrmMailService extends BaseService {
  @Inject()
  baseSysParamService: BaseSysParamService;

  async send(options: CrmMailOptions) {
    const config = await this.getMailConfig();
    const to = String(options?.to || '').trim();
    if (!to) {
      throw new CoolCommException('客戶信箱為空，無法傳送發票郵件');
    }
    if (!this.isValidEmail(to)) {
      throw new CoolCommException('客戶信箱格式不正確，無法傳送郵件');
    }

    const nodemailer = this.getNodemailer();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user || config.pass
          ? {
              user: config.user,
              pass: config.pass,
            }
          : undefined,
    });

    return transporter.sendMail({
      from: config.from,
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
  }

  async buildTemplateMail(options: CrmMailTemplateOptions) {
    const template = await this.getMailTemplate(options.key);
    const variables = options.variables || {};
    return {
      subject: this.renderTemplate(
        template.subject || options.fallbackSubject,
        variables,
        false
      ),
      html: this.renderTemplate(
        template.html || options.fallbackHtml,
        variables,
        true
      ),
      text: this.renderTemplate(
        template.text || options.fallbackText || '',
        variables,
        false
      ),
      attachments: this.renderAttachments(template.attachments || [], variables),
    };
  }

  private async getMailConfig() {
    const data =
      (await this.baseSysParamService.dataByKey('crmMail')) ||
      (await this.baseSysParamService.dataByKey('mail')) ||
      (await this.baseSysParamService.dataByKey('email')) ||
      {};
    const config = typeof data === 'string' ? this.parseJson(data) : data;
    const host =
      config.host ||
      config.smtpHost ||
      process.env.CRM_MAIL_HOST ||
      process.env.SMTP_HOST;
    const port = Number(
      config.port ||
        config.smtpPort ||
        process.env.CRM_MAIL_PORT ||
        process.env.SMTP_PORT ||
        465
    );
    const user =
      config.user ||
      config.username ||
      config.smtpUser ||
      process.env.CRM_MAIL_USER ||
      process.env.SMTP_USER;
    const pass =
      config.pass ||
      config.password ||
      config.smtpPass ||
      process.env.CRM_MAIL_PASS ||
      process.env.SMTP_PASS;
    const from =
      config.from ||
      config.sender ||
      process.env.CRM_MAIL_FROM ||
      process.env.SMTP_FROM ||
      user;
    const enabled = config.enabled ?? config.enable ?? true;

    if (enabled === false || enabled === 0 || enabled === '0') {
      throw new CoolCommException('郵件傳送配置已關閉');
    }
    if (!host || !from) {
      throw new CoolCommException('郵件傳送參數未配置，請在參數列表配置 crmMail');
    }

    return {
      host: String(host),
      port,
      secure: this.toBoolean(config.secure ?? port === 465),
      user: user ? String(user) : undefined,
      pass: pass ? String(pass) : undefined,
      from: config.senderName
        ? `"${String(config.senderName).replace(/"/g, '\\"')}" <${String(from)}>`
        : String(from),
    };
  }

  private async getMailTemplate(key: string) {
    const data = await this.baseSysParamService.dataByKey(key, true);
    if (!data) {
      return {};
    }
    if (typeof data === 'object') {
      return {
        subject: String(data.subject || ''),
        html: String(data.html || data.content || ''),
        text: String(data.text || ''),
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
      };
    }
    const text = String(data || '');
    const json = this.parseJson(text);
    if (json && Object.keys(json).length) {
      return {
        subject: String(json.subject || ''),
        html: String(json.html || json.content || ''),
        text: String(json.text || ''),
        attachments: Array.isArray(json.attachments) ? json.attachments : [],
      };
    }
    const subject = this.extractSubjectLine(text);
    return {
      subject,
      html: subject ? this.removeSubjectLine(text) : text,
    };
  }

  private extractSubjectLine(html: string) {
    const lines = this.htmlToTextLines(html);
    for (const line of lines) {
      const match = this.matchSubjectLine(line);
      const subject = match?.[1]?.trim();
      if (subject) {
        return subject;
      }
    }
    return '';
  }

  private removeSubjectLine(html: string) {
    let removed = false;
    const blockPattern = /<(p|h[1-6]|li)[^>]*>[\s\S]*?<\/\1>/gi;
    const withoutBlock = String(html || '').replace(blockPattern, match => {
      if (removed) {
        return match;
      }
      const lines = this.htmlToTextLines(match);
      if (lines.length === 1 && this.matchSubjectLine(lines[0])) {
        removed = true;
        return '';
      }
      return match;
    });

    if (removed) {
      return withoutBlock;
    }

    return String(html || '')
      .split(/\r?\n/)
      .filter(line => {
        const lines = this.htmlToTextLines(line);
        return !(lines.length === 1 && this.matchSubjectLine(lines[0]));
      })
      .join('\n');
  }

  private matchSubjectLine(line: string) {
    return String(line || '').match(
      /^(?:郵件主題|郵件主旨|郵件標題|郵件標題|主題|主旨|subject)\s*[:：]\s*(.+)$/i
    );
  }

  private htmlToTextLines(html: string) {
    return String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .split(/\r?\n/)
      .map(item => this.decodeHtmlText(item).trim())
      .filter(Boolean);
  }

  private decodeHtmlText(value: string) {
    return String(value || '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#34;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
      );
  }

  private renderTemplate(
    template: string,
    variables: Record<string, any>,
    escapeHtml: boolean
  ) {
    return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      const value = this.getVariableValue(variables, key);
      return escapeHtml ? this.escapeHtml(value) : String(value ?? '');
    });
  }

  private getVariableValue(variables: Record<string, any>, key: string) {
    return key.split('.').reduce((value, item) => {
      if (value === undefined || value === null) {
        return '';
      }
      return value[item];
    }, variables);
  }

  private renderAttachments(
    attachments: any[],
    variables: Record<string, any>
  ): CrmMailAttachment[] {
    return attachments
      .filter(item => item && typeof item === 'object')
      .map(item => {
        const attachment: CrmMailAttachment = {};
        if (item.filename) {
          attachment.filename = this.renderTemplate(
            String(item.filename),
            variables,
            false
          );
        }
        if (item.path) {
          attachment.path = this.renderTemplate(String(item.path), variables, false);
        }
        if (item.href) {
          attachment.href = this.renderTemplate(String(item.href), variables, false);
        }
        if (item.content) {
          attachment.content = this.renderTemplate(
            String(item.content),
            variables,
            false
          );
        }
        if (item.contentType) {
          attachment.contentType = String(item.contentType);
        }
        if (item.cid) {
          attachment.cid = String(item.cid);
        }
        return attachment;
      })
      .filter(item => item.path || item.href || item.content);
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return {};
    }
  }

  private toBoolean(value: any) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  private isValidEmail(email: string) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      String(email || '').trim()
    );
  }

  private escapeHtml(value: any) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getNodemailer() {
    try {
      return require('nodemailer');
    } catch (e) {
      throw new CoolCommException('缺少郵件依賴 nodemailer，請先執行 npm install');
    }
  }
}
