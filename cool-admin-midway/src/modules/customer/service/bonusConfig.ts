import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { In, Repository } from 'typeorm';
import { CrmBonusConfigEntity } from '../entity/bonusConfig';

interface BonusConfigDefault {
  roleType: string;
  groupCode: string;
  groupName: string;
  configCode: string;
  configName: string;
  configType: string;
  conditionText?: string;
  calcBase?: string;
  configValue?: string;
  unit?: string;
  sortNum: number;
  remark?: string;
}

@Provide()
export class CrmBonusConfigService extends BaseService {
  @InjectEntityModel(CrmBonusConfigEntity)
  crmBonusConfigEntity: Repository<CrmBonusConfigEntity>;

  async page(query: any) {
    await this.initDefaults();

    const { roleType, groupCode, configName, isEnabled } = query || {};
    const sql = `
      SELECT *
      FROM crm_bonus_config
      WHERE isDeleted = 0
        ${this.setSql(roleType, 'and roleType = ?', [roleType])}
        ${this.setSql(groupCode, 'and groupCode = ?', [groupCode])}
        ${this.setSql(configName, 'and configName like ?', [`%${configName}%`])}
        ${this.setSql(
          isEnabled !== undefined && isEnabled !== '',
          'and isEnabled = ?',
          [Number(isEnabled)]
        )}
      ORDER BY roleType ASC, sortNum ASC, id ASC
    `;

    return await this.sqlRenderPage(sql, query, false);
  }

  async list(query?: any) {
    await this.initDefaults();

    const where: any = { isDeleted: 0 };
    if (query?.roleType) {
      where.roleType = query.roleType;
    }
    if (query?.isEnabled !== undefined && query?.isEnabled !== '') {
      where.isEnabled = Number(query.isEnabled);
    }

    return await this.crmBonusConfigEntity.find({
      where,
      order: { roleType: 'ASC', sortNum: 'ASC', id: 'ASC' },
    });
  }

  async add(param: any) {
    const data = this.normalizeParam(param);
    const exists = await this.crmBonusConfigEntity.findOneBy({
      configCode: data.configCode,
      isDeleted: 0,
    });
    if (exists) {
      throw new CoolCommException('配置編碼已存在');
    }
    return await this.crmBonusConfigEntity.save(data);
  }

  async update(param: any) {
    const id = Number(param?.id || 0);
    if (!id) {
      throw new CoolCommException('配置ID不能為空');
    }

    const oldRow = await this.crmBonusConfigEntity.findOneBy({
      id,
      isDeleted: 0,
    });
    if (!oldRow) {
      throw new CoolCommException('獎金配置不存在');
    }

    const data = this.normalizeParam(param);
    const exists = await this.crmBonusConfigEntity.findOne({
      where: {
        configCode: data.configCode,
        isDeleted: 0,
      },
    });
    if (exists && Number(exists.id) !== id) {
      throw new CoolCommException('配置編碼已存在');
    }

    await this.crmBonusConfigEntity.update({ id }, data);
  }

  async delete(ids: number[] | number) {
    const idArr = Array.isArray(ids) ? ids : [ids];
    const safeIds = idArr.map(id => Number(id)).filter(id => id > 0);
    if (safeIds.length === 0) {
      return;
    }
    await this.crmBonusConfigEntity.update(
      { id: In(safeIds) },
      { isDeleted: 1 }
    );
  }

  async initDefaultConfigs() {
    return await this.initDefaults();
  }

  private normalizeParam(param: any) {
    const roleType = String(param?.roleType || '').trim();
    const groupCode = String(param?.groupCode || '').trim();
    const groupName = String(param?.groupName || '').trim();
    const configCode = String(param?.configCode || '').trim();
    const configName = String(param?.configName || '').trim();
    const configType = String(param?.configType || '').trim();

    if (!roleType) {
      throw new CoolCommException('適用角色不能為空');
    }
    if (!groupCode || !groupName) {
      throw new CoolCommException('配置分組不能為空');
    }
    if (!configCode || !configName) {
      throw new CoolCommException('配置編碼和名稱不能為空');
    }
    if (!configType) {
      throw new CoolCommException('配置型別不能為空');
    }

    return {
      roleType,
      groupCode,
      groupName,
      configCode,
      configName,
      configType,
      conditionText: String(param?.conditionText || '').trim() || null,
      calcBase: String(param?.calcBase || '').trim() || null,
      configValue: String(param?.configValue ?? '').trim(),
      unit: String(param?.unit || '').trim() || null,
      sortNum: Number(param?.sortNum || 0),
      isEnabled: Number(param?.isEnabled ?? 1) === 0 ? 0 : 1,
      remark: String(param?.remark || '').trim() || null,
      isDeleted: 0,
    };
  }

  private async initDefaults() {
    const defaults = this.getDefaultConfigs();
    const codes = defaults.map(item => item.configCode);
    const exists = await this.crmBonusConfigEntity.find({
      where: { configCode: In(codes), isDeleted: 0 },
      select: ['configCode'],
    });
    const existsSet = new Set(exists.map(item => item.configCode));
    const needInsert = defaults.filter(item => !existsSet.has(item.configCode));

    if (needInsert.length > 0) {
      await this.crmBonusConfigEntity.save(
        needInsert.map(item => ({
          ...item,
          conditionText: item.conditionText || null,
          calcBase: item.calcBase || null,
          configValue: item.configValue ?? '',
          unit: item.unit || null,
          remark: item.remark || null,
          isEnabled: 1,
          isDeleted: 0,
        }))
      );
    }

    return {
      inserted: needInsert.length,
      total: defaults.length,
    };
  }

  private getDefaultConfigs(): BonusConfigDefault[] {
    return [
      {
        roleType: 'sales',
        groupCode: 'sales_threshold',
        groupName: '業務通用門檻',
        configCode: 'sales_main_invoice_month_threshold',
        configName: '主力發票月門檻',
        configType: 'threshold',
        conditionText: '主力產品發票月業績超過該門檻，才計算標準獎金和級距獎金',
        configValue: '300000',
        unit: '元/月',
        sortNum: 10,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_threshold',
        groupName: '業務通用門檻',
        configCode: 'sales_main_product_margin_rate',
        configName: '主力產品毛利率門檻',
        configType: 'rate',
        conditionText: '毛利率大於等於該比例為主力產品，低於該比例為副位產品',
        configValue: '50',
        unit: '%',
        sortNum: 20,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_threshold',
        groupName: '業務通用門檻',
        configCode: 'sales_new_case_year_threshold',
        configName: '新案年度金額門檻',
        configType: 'threshold',
        conditionText: '新案年度金額低於該門檻時，年終獎金按規則減半',
        configValue: '2400000',
        unit: '元/年',
        sortNum: 30,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_commission',
        groupName: '業務抽成比例',
        configCode: 'sales_main_product_bonus_rate',
        configName: '主力產品抽成比例',
        configType: 'rate',
        calcBase: '發票未稅金額',
        configValue: '5',
        unit: '%',
        sortNum: 40,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_commission',
        groupName: '業務抽成比例',
        configCode: 'sales_secondary_product_bonus_rate',
        configName: '副位產品抽成比例',
        configType: 'rate',
        calcBase: '產品毛利',
        conditionText: '副位產品參與級距時按一半金額計入',
        configValue: '5',
        unit: '%',
        sortNum: 50,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_extra',
        groupName: '業務額外獎勵',
        configCode: 'sales_one_time_payment_bonus_rate',
        configName: '一次付清加碼比例',
        configType: 'rate',
        calcBase: '發票未稅金額',
        conditionText:
          '付款階段數等於 1 時適用，僅主力產品參與，網紅/廣告分類除外',
        configValue: '0.5',
        unit: '%',
        sortNum: 60,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_extra',
        groupName: '業務額外獎勵',
        configCode: 'sales_tier_add_bonus_threshold',
        configName: '級距加碼門檻',
        configType: 'threshold',
        conditionText: '主力發票月業績大於該門檻後，發票未稅金額追加加碼比例',
        configValue: '800000',
        unit: '元/月',
        sortNum: 70,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_extra',
        groupName: '業務額外獎勵',
        configCode: 'sales_tier_add_bonus_rate',
        configName: '級距加碼比例',
        configType: 'rate',
        calcBase: '發票未稅金額',
        configValue: '1',
        unit: '%',
        sortNum: 80,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_tier_bonus',
        groupName: '業務級距獎金',
        configCode: 'sales_tier_bonus_100w',
        configName: '單月發票達 100 萬獎金',
        configType: 'amount',
        configValue: '6000',
        unit: '元',
        sortNum: 90,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_tier_bonus',
        groupName: '業務級距獎金',
        configCode: 'sales_tier_bonus_120w',
        configName: '單月發票達 120 萬獎金',
        configType: 'amount',
        configValue: '8000',
        unit: '元',
        sortNum: 100,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_tier_bonus',
        groupName: '業務級距獎金',
        configCode: 'sales_tier_bonus_150w',
        configName: '單月發票達 150 萬獎金',
        configType: 'amount',
        configValue: '15000',
        unit: '元',
        sortNum: 110,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_tier_bonus',
        groupName: '業務級距獎金',
        configCode: 'sales_tier_bonus_200w',
        configName: '單月發票達 200 萬獎金',
        configType: 'amount',
        configValue: '20000',
        unit: '元',
        sortNum: 120,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_year_bonus',
        groupName: '業務年終年中獎金',
        configCode: 'sales_year_low_avg',
        configName: '半額年終月均門檻',
        configType: 'threshold',
        configValue: '800000',
        unit: '元/月',
        sortNum: 130,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_year_bonus',
        groupName: '業務年終年中獎金',
        configCode: 'sales_year_target_avg',
        configName: '全額年終月均門檻',
        configType: 'threshold',
        configValue: '1000000',
        unit: '元/月',
        sortNum: 140,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_year_bonus',
        groupName: '業務年終年中獎金',
        configCode: 'sales_year_over_avg',
        configName: '年中半個月月均門檻',
        configType: 'threshold',
        configValue: '1200000',
        unit: '元/月',
        sortNum: 150,
      },
      {
        roleType: 'sales',
        groupCode: 'sales_payment',
        groupName: '業務付款規範',
        configCode: 'sales_payment_violation_discount_rate',
        configName: '付款違規獎金折扣',
        configType: 'rate',
        conditionText: '未經核准超出付款規範時，對應專案業務獎金按該比例發放',
        configValue: '50',
        unit: '%',
        sortNum: 160,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_manager_under_50w_rate',
        configName: '主管 49 萬以下抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.5',
        unit: '%',
        sortNum: 210,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_manager_50_59w_rate',
        configName: '主管 50-59 萬抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.8',
        unit: '%',
        sortNum: 220,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_manager_over_60w_rate',
        configName: '主管 60 萬以上抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.8',
        unit: '%',
        sortNum: 230,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_manager_renewal_rate',
        configName: '主管續約抽成',
        configType: 'rate',
        configValue: '2',
        unit: '%',
        sortNum: 240,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_senior_50_59w_rate',
        configName: '資深同仁 50-59 萬抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.2',
        unit: '%',
        sortNum: 250,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_senior_over_60w_rate',
        configName: '資深同仁 60 萬以上抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.5',
        unit: '%',
        sortNum: 260,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_senior_renewal_rate',
        configName: '資深同仁續約抽成',
        configType: 'rate',
        configValue: '2',
        unit: '%',
        sortNum: 270,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_staff_50_59w_rate',
        configName: '一般同仁 50-59 萬抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '0.8',
        unit: '%',
        sortNum: 280,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_staff_over_60w_rate',
        configName: '一般同仁 60 萬以上抽成',
        configType: 'rate',
        calcBase: '口碑部門執案金額',
        configValue: '1.2',
        unit: '%',
        sortNum: 290,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_commission',
        groupName: '內勤口碑執案抽成',
        configCode: 'internal_koubei_staff_renewal_rate',
        configName: '一般同仁續約抽成',
        configType: 'rate',
        configValue: '1.5',
        unit: '%',
        sortNum: 300,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_tier_bonus',
        groupName: '內勤口碑級距獎勵',
        configCode: 'internal_koubei_avg_65w_bonus',
        configName: '同仁執案平均 65 萬獎金',
        configType: 'amount',
        configValue: '2000',
        unit: '元',
        sortNum: 310,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_tier_bonus',
        groupName: '內勤口碑級距獎勵',
        configCode: 'internal_koubei_avg_75w_bonus',
        configName: '同仁執案平均 75 萬獎金',
        configType: 'amount',
        configValue: '4000',
        unit: '元',
        sortNum: 320,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_tier_bonus',
        groupName: '內勤口碑級距獎勵',
        configCode: 'internal_koubei_avg_85w_bonus',
        configName: '同仁執案平均 85 萬獎金',
        configType: 'amount',
        configValue: '6000',
        unit: '元',
        sortNum: 330,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_koubei_tier_bonus',
        groupName: '內勤口碑級距獎勵',
        configCode: 'internal_koubei_avg_95w_bonus',
        configName: '同仁執案平均 95 萬獎金',
        configType: 'amount',
        configValue: '8000',
        unit: '元',
        sortNum: 340,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_special_bonus',
        groupName: '內勤特殊激勵',
        configCode: 'internal_personal_case_100w_bonus',
        configName: '個人執案達 100 萬獎金',
        configType: 'amount',
        conditionText: '當月個人執案金額達到 100 萬時發放',
        configValue: '10000',
        unit: '元',
        sortNum: 350,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_integration_bonus',
        groupName: '內勤整合部門獎金',
        configCode: 'internal_integration_margin_threshold',
        configName: '整合主力產品毛利門檻',
        configType: 'rate',
        conditionText: '整合部門主力產品，口碑除外',
        configValue: '50',
        unit: '%',
        sortNum: 360,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_integration_bonus',
        groupName: '內勤整合部門獎金',
        configCode: 'internal_integration_case_200w_bonus',
        configName: '整合執案 200 萬級距獎金',
        configType: 'amount',
        configValue: '5000',
        unit: '元',
        sortNum: 370,
        remark: '檔案標註疑問：是否按報價單毛利大於 50% 計入內碼，待確認',
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_staff',
        groupName: '內勤同仁年終年中獎金',
        configCode: 'internal_staff_year_low_avg',
        configName: '同仁半額年終月均門檻',
        configType: 'threshold',
        configValue: '600000',
        unit: '元/月',
        sortNum: 380,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_staff',
        groupName: '內勤同仁年終年中獎金',
        configCode: 'internal_staff_year_target_avg',
        configName: '同仁全額年終月均門檻',
        configType: 'threshold',
        configValue: '800000',
        unit: '元/月',
        sortNum: 390,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_staff',
        groupName: '內勤同仁年終年中獎金',
        configCode: 'internal_staff_year_over_avg',
        configName: '同仁年中半個月月均門檻',
        configType: 'threshold',
        configValue: '1000000',
        unit: '元/月',
        sortNum: 400,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_manager',
        groupName: '內勤主管年終年中獎金',
        configCode: 'internal_manager_year_low_avg',
        configName: '主管半額年終月均門檻',
        configType: 'threshold',
        configValue: '400000',
        unit: '元/月',
        sortNum: 410,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_manager',
        groupName: '內勤主管年終年中獎金',
        configCode: 'internal_manager_year_target_avg',
        configName: '主管全額年終月均門檻',
        configType: 'threshold',
        configValue: '600000',
        unit: '元/月',
        sortNum: 420,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_manager',
        groupName: '內勤主管年終年中獎金',
        configCode: 'internal_manager_year_over_avg',
        configName: '主管年中半個月月均門檻',
        configType: 'threshold',
        configValue: '800000',
        unit: '元/月',
        sortNum: 430,
      },
      {
        roleType: 'internal',
        groupCode: 'internal_year_bonus_common',
        groupName: '內勤年終發放條件',
        configCode: 'internal_renewal_rate_threshold',
        configName: '續約率達標門檻',
        configType: 'rate',
        conditionText: '績效達標佔 50%，年度續約率達標再核發 50%',
        configValue: '50',
        unit: '%',
        sortNum: 440,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_tier_bonus',
        groupName: '業務主管級距獎金',
        configCode: 'sales_manager_tier_bonus_100w',
        configName: '單月發票達 100 萬獎金',
        configType: 'amount',
        conditionText: '級距業績=主力全額+副位折半（未稅）',
        configValue: '15000',
        unit: '元',
        sortNum: 510,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_tier_bonus',
        groupName: '業務主管級距獎金',
        configCode: 'sales_manager_tier_bonus_120w',
        configName: '單月發票達 120 萬獎金',
        configType: 'amount',
        conditionText: '級距業績=主力全額+副位折半（未稅）',
        configValue: '18000',
        unit: '元',
        sortNum: 520,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_tier_bonus',
        groupName: '業務主管級距獎金',
        configCode: 'sales_manager_tier_bonus_150w',
        configName: '單月發票達 150 萬獎金',
        configType: 'amount',
        conditionText: '級距業績=主力全額+副位折半（未稅）',
        configValue: '26000',
        unit: '元',
        sortNum: 530,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_tier_bonus',
        groupName: '業務主管級距獎金',
        configCode: 'sales_manager_tier_bonus_200w',
        configName: '單月發票達 200 萬獎金',
        configType: 'amount',
        conditionText: '級距業績=主力全額+副位折半（未稅）',
        configValue: '32000',
        unit: '元',
        sortNum: 540,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_extra',
        groupName: '業務主管加碼',
        configCode: 'sales_manager_main_product_bonus_threshold',
        configName: '主力產品加碼門檻',
        configType: 'threshold',
        conditionText: '當月主力未稅合計達標後，主力按未稅×比例、副位按毛利×比例計算',
        configValue: '700000',
        unit: '元/月',
        sortNum: 550,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_extra',
        groupName: '業務主管加碼',
        configCode: 'sales_manager_main_product_bonus_rate',
        configName: '主力產品加碼比例',
        configType: 'rate',
        calcBase: '發票未稅金額',
        configValue: '3',
        unit: '%',
        sortNum: 560,
      },
      {
        roleType: 'sales_manager',
        groupCode: 'sales_manager_extra',
        groupName: '業務主管加碼',
        configCode: 'sales_manager_secondary_product_bonus_rate',
        configName: '副位產品加碼比例',
        configType: 'rate',
        calcBase: '產品毛利',
        configValue: '3',
        unit: '%',
        sortNum: 570,
      },
      {
        roleType: 'integration_pm',
        groupCode: 'integration_pm_bonus',
        groupName: '整合PM獎金',
        configCode: 'integration_pm_case_200w_threshold',
        configName: '執案金額門檻',
        configType: 'threshold',
        conditionText: '單月執案金額（報價單按月均攤）達到該門檻發放固定獎金',
        configValue: '2000000',
        unit: '元/月',
        sortNum: 610,
      },
      {
        roleType: 'integration_pm',
        groupCode: 'integration_pm_bonus',
        groupName: '整合PM獎金',
        configCode: 'integration_pm_case_200w_bonus',
        configName: '執案達標獎金',
        configType: 'amount',
        configValue: '5000',
        unit: '元',
        sortNum: 620,
      },
    ];
  }
}
