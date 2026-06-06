import { InjectClient, Provide } from '@midwayjs/core';
import { BaseService, CoolCommException } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Not, Repository } from 'typeorm';
import { BaseSysParamEntity } from '../../entity/sys/param';
import { CachingFactory, MidwayCache } from '@midwayjs/cache-manager';

/**
 * 參數配置
 */
@Provide()
export class BaseSysParamService extends BaseService {
  @InjectEntityModel(BaseSysParamEntity)
  baseSysParamEntity: Repository<BaseSysParamEntity>;

  @InjectClient(CachingFactory, 'default')
  midwayCache: MidwayCache;

  async page(query: any) {
    const { keyWord, dataType, page = 1, size = 20 } = query || {};
    const where: string[] = ['1 = 1'];
    const params: any[] = [];

    if (keyWord) {
      where.push('(name LIKE ? OR keyName LIKE ?)');
      params.push(`%${String(keyWord).trim()}%`, `%${String(keyWord).trim()}%`);
    }
    if (dataType !== undefined && dataType !== null && dataType !== '') {
      where.push('dataType = ?');
      params.push(Number(dataType));
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(size) || 20);
    const offset = (currentPage - 1) * pageSize;
    const countRows = await this.nativeQuery(
      `SELECT COUNT(1) AS count FROM base_sys_param WHERE ${where.join(' AND ')}`,
      params
    );
    const list = await this.nativeQuery(
      `
      SELECT id, createTime, updateTime, tenantId, keyName, name, data, dataType, remark
      FROM base_sys_param
      WHERE ${where.join(' AND ')}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `,
      [...params, pageSize, offset]
    );

    return {
      list,
      pagination: {
        page: currentPage,
        size: pageSize,
        total: Number(countRows?.[0]?.count || 0),
      },
    };
  }

  /**
   * 根據key獲得對應的參數
   * @param key
   */
  async dataByKey(key, refresh = false) {
    let result: any = refresh ? null : await this.midwayCache.get(`param:${key}`);
    if (!result) {
      result = await this.baseSysParamEntity.findOneBy({ keyName: key });
      this.midwayCache.set(`param:${key}`, result);
    }
    if (result) {
      if (result.dataType == 0) {
        try {
          return JSON.parse(result.data);
        } catch (error) {
          return result.data;
        }
      }
      if (result.dataType == 1) {
        return result.data;
      }
      if (result.dataType == 2) {
        return result.data.split(',');
      }
    }
    return;
  }

  /**
   * 資訊
   * @param id
   * @param infoIgnoreProperty
   * @returns
   */
  async info(id: any, infoIgnoreProperty?: string[]): Promise<any> {
    const info = await super.info(id, infoIgnoreProperty);
    return info;
  }

  /**
   * 根據key獲得對應的網頁資料
   * @param key
   */
  async htmlByKey(key) {
    let html = '<html><title>@title</title><body>@content</body></html>';
    let result: any = await this.midwayCache.get(`param:${key}`);
    if (result) {
      html = html
        .replace('@content', result.data)
        .replace('@title', result.name);
    } else {
      html = html.replace('@content', 'key notfound');
    }
    return html;
  }

  /**
   * 新增或者修改
   * @param param
   */
  async addOrUpdate(param: any, type): Promise<void> {
    const oldParam = param.id
      ? await this.baseSysParamEntity.findOneBy({ id: Number(param.id) })
      : null;
    if (type == 2) {
      param.data = Array.isArray(param.data)
        ? param.data.join(',')
        : String(param.data || '');
    }
    const find = {
      keyName: param.keyName,
    };
    if (param.id) {
      find['id'] = Not(param.id);
    }
    const check = await this.baseSysParamEntity.findOneBy(find);
    if (check) {
      throw new CoolCommException('存在相同的keyName');
    }
    await super.addOrUpdate(param, type);
    await this.refreshParamCache(param.keyName, oldParam?.keyName);
  }

  /**
   * 刪除
   * @param ids
   */
  async delete(ids: any): Promise<void> {
    const idList = Array.isArray(ids) ? ids : [ids];
    const params = await this.baseSysParamEntity
      .createQueryBuilder('a')
      .select(['a.keyName'])
      .where('a.id IN (:...ids)', { ids: idList.map(id => Number(id)) })
      .getMany();
    await super.delete(ids);
    for (const param of params) {
      await this.midwayCache.del(`param:${param.keyName}`);
    }
  }

  /**
   * 重新初始化快取
   */
  async modifyAfter() {
    const params = await this.baseSysParamEntity.find();
    for (const param of params) {
      await this.midwayCache.set(`param:${param.keyName}`, param);
    }
  }

  private async refreshParamCache(keyName: string, oldKeyName?: string) {
    if (oldKeyName && oldKeyName !== keyName) {
      await this.midwayCache.del(`param:${oldKeyName}`);
    }
    if (!keyName) {
      return;
    }
    await this.midwayCache.del(`param:${keyName}`);
    const latest = await this.baseSysParamEntity.findOneBy({ keyName });
    if (latest) {
      await this.midwayCache.set(`param:${keyName}`, latest);
    }
  }
}
