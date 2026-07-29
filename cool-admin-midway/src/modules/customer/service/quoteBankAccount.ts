import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { In, Repository } from 'typeorm';
import { CrmQuoteBankAccountEntity } from '../entity/quoteBankAccount';

@Provide()
export class CrmQuoteBankAccountService extends BaseService {
  @InjectEntityModel(CrmQuoteBankAccountEntity)
  crmQuoteBankAccountEntity: Repository<CrmQuoteBankAccountEntity>;

  async page(query: any) {
    await this.ensureDefaultAccount();
    const { name, isEnabled } = query || {};
    const sql = `
      SELECT *
      FROM crm_quote_bank_account
      WHERE isDeleted = 0
        ${this.setSql(name, 'and name like ?', [`%${name}%`])}
        ${this.setSql(
          isEnabled !== undefined && isEnabled !== '',
          'and isEnabled = ?',
          [Number(isEnabled)]
        )}
      ORDER BY isDefault DESC, sortNum ASC, id ASC
    `;
    return await this.sqlRenderPage(sql, query, false);
  }

  async list(query?: any) {
    await this.ensureDefaultAccount();
    const where: any = { isDeleted: 0 };
    if (query?.isEnabled !== undefined && query?.isEnabled !== '') {
      where.isEnabled = Number(query.isEnabled);
    }
    return await this.crmQuoteBankAccountEntity.find({
      where,
      order: { isDefault: 'DESC', sortNum: 'ASC', id: 'ASC' },
    });
  }

  async options() {
    const rows = await this.list({ isEnabled: 1 });
    return rows.map(item => ({
      label: this.buildOptionLabel(item),
      value: item.id,
      isDefault: Number(item.isDefault || 0) === 1,
      bankAccountName: item.bankAccountName,
      bankCode: item.bankCode,
      bankName: item.bankName,
      bankBranch: item.bankBranch,
      bankAccountNo: item.bankAccountNo,
      bankCoverUrl: item.bankCoverUrl,
    }));
  }

  async info(id: number) {
    const row = await this.crmQuoteBankAccountEntity.findOneBy({
      id: Number(id || 0),
      isDeleted: 0,
    });
    if (!row) {
      throw new CoolCommException('存摺帳戶不存在');
    }
    return row;
  }

  async add(param: any) {
    const data = this.normalizeParam(param);
    const saved = await this.crmQuoteBankAccountEntity.save(data);
    if (Number(saved.isDefault) === 1) {
      await this.clearOtherDefaults(saved.id);
    }
    return saved;
  }

  async update(param: any) {
    const id = Number(param?.id || 0);
    if (!id) {
      throw new CoolCommException('帳戶ID不能為空');
    }
    const oldRow = await this.crmQuoteBankAccountEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!oldRow) {
      throw new CoolCommException('存摺帳戶不存在');
    }
    const data = this.normalizeParam(param);
    await this.crmQuoteBankAccountEntity.update({ id }, data);
    if (Number(data.isDefault) === 1) {
      await this.clearOtherDefaults(id);
    }
  }

  async delete(ids: number[] | number) {
    const idArr = Array.isArray(ids) ? ids : [ids];
    const safeIds = idArr.map(id => Number(id)).filter(id => id > 0);
    if (safeIds.length === 0) {
      return;
    }
    await this.crmQuoteBankAccountEntity.update(
      { id: In(safeIds) },
      { isDeleted: 1, isDefault: 0 }
    );
  }

  async getById(id?: number) {
    const accountId = Number(id || 0);
    if (!accountId) {
      return null;
    }
    return await this.crmQuoteBankAccountEntity.findOneBy({
      id: accountId,
      isDeleted: 0,
    });
  }

  async getDefaultAccount() {
    await this.ensureDefaultAccount();
    const preferred = await this.crmQuoteBankAccountEntity.findOne({
      where: { isDeleted: 0, isEnabled: 1, isDefault: 1 },
      order: { id: 'ASC' },
    });
    if (preferred) {
      return preferred;
    }
    return await this.crmQuoteBankAccountEntity.findOne({
      where: { isDeleted: 0, isEnabled: 1 },
      order: { sortNum: 'ASC', id: 'ASC' },
    });
  }

  private async ensureDefaultAccount() {
    const count = await this.crmQuoteBankAccountEntity.count({
      where: { isDeleted: 0 },
    });
    if (count > 0) {
      return;
    }
    await this.crmQuoteBankAccountEntity.save({
      name: '臺北富邦銀行',
      bankAccountName: '確認鍵智創科技股份有限公司',
      bankCode: '012',
      bankName: '臺北富邦銀行',
      bankBranch: '',
      bankAccountNo: '82110000259100',
      bankCoverUrl: '/quote-bank-cover.jpg',
      isDefault: 1,
      isEnabled: 1,
      sortNum: 0,
      remark: '系統預設存摺帳戶',
      isDeleted: 0,
    });
  }

  private async clearOtherDefaults(keepId: number) {
    await this.crmQuoteBankAccountEntity
      .createQueryBuilder()
      .update(CrmQuoteBankAccountEntity)
      .set({ isDefault: 0 })
      .where('isDeleted = 0')
      .andWhere('id != :keepId', { keepId })
      .execute();
  }

  private normalizeParam(param: any) {
    const name = String(param?.name || '').trim();
    if (!name) {
      throw new CoolCommException('帳戶名稱不能為空');
    }
    return {
      name,
      bankAccountName: String(param?.bankAccountName || '').trim() || null,
      bankCode: String(param?.bankCode || '').trim() || null,
      bankName: String(param?.bankName || '').trim() || null,
      bankBranch: String(param?.bankBranch || '').trim() || null,
      bankAccountNo: String(param?.bankAccountNo || '').trim() || null,
      bankCoverUrl: this.normalizeFileUrl(param?.bankCoverUrl) || null,
      isDefault: Number(param?.isDefault || 0) === 1 ? 1 : 0,
      isEnabled: Number(param?.isEnabled ?? 1) === 0 ? 0 : 1,
      sortNum: Number(param?.sortNum || 0),
      remark: String(param?.remark || '').trim() || null,
      isDeleted: 0,
    };
  }

  private normalizeFileUrl(value: any) {
    if (Array.isArray(value)) {
      return String(value[0] || '').trim();
    }
    if (value && typeof value === 'object') {
      return String(value.url ?? value.path ?? value.value ?? '').trim();
    }
    return String(value || '').split(',')[0].trim();
  }

  private buildOptionLabel(item: CrmQuoteBankAccountEntity) {
    const bank = [item.bankName, item.bankBranch].filter(Boolean).join(' ');
    const account = String(item.bankAccountNo || '').trim();
    if (bank && account) {
      return `${item.name}（${bank} / ${account}）`;
    }
    if (account) {
      return `${item.name}（${account}）`;
    }
    return item.name;
  }
}
