import { DictTypeEntity } from './../entity/type';
import { DictInfoEntity } from './../entity/info';
import { Config, Provide } from '@midwayjs/core';
import { BaseService } from '@cool-midway/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import * as _ from 'lodash';

/**
 * 字典資訊
 */
@Provide()
export class DictInfoService extends BaseService {
  @InjectEntityModel(DictInfoEntity)
  dictInfoEntity: Repository<DictInfoEntity>;

  @InjectEntityModel(DictTypeEntity)
  dictTypeEntity: Repository<DictTypeEntity>;

  @Config('typeorm.dataSource.default.type')
  ormType: string;

  /**
   * 獲得字典資料
   * @param types
   */
  async data(types: string[]) {
    const result = {};
    let typeData = await this.dictTypeEntity.find();
    if (!_.isEmpty(types)) {
      typeData = await this.dictTypeEntity.findBy({ key: In(types) });
    }
    if (_.isEmpty(typeData)) {
      return {};
    }
    const data = await this.dictInfoEntity
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a.name',
        'a.typeId',
        'a.parentId',
        'a.orderNum',
        'a.value',
      ])
      .where('a.typeId in(:...typeIds)', {
        typeIds: typeData.map(e => {
          return e.id;
        }),
      })
      .orderBy('a.orderNum', 'ASC')
      .addOrderBy('a.createTime', 'ASC')
      .getMany();
    for (const item of typeData) {
      result[item.key] = _.filter(data, { typeId: item.id }).map(e => {
        const value = e.value ? Number(e.value) : e.value;
        return {
          ...e,
          // @ts-ignore
          value: isNaN(value) ? e.value : value,
        };
      });
    }
    return result;
  }

  /**
   * 獲得字典key
   * @returns
   */
  async types() {
    return await this.dictTypeEntity.find();
  }

  /**
   * 獲得單個或多個字典值
   * @param value 字典值或字典值陣列
   * @param key 字典型別
   * @returns
   */
  async getValues(value: string | string[], key: string) {
    // 取得字典型別
    const type = await this.dictTypeEntity.findOneBy({ key });
    if (!type) {
      return null; // 或者適當的錯誤處理
    }

    // 根據typeId取得所有相關的字典資訊
    const dictValues = await this.dictInfoEntity.find({
      where: { typeId: type.id },
    });

    // 如果value是字串，直接查詢
    if (typeof value === 'string') {
      return this.findValueInDictValues(value, dictValues);
    }

    // 如果value是陣列，遍歷陣列，對每個元素進行查詢
    return value.map(val => this.findValueInDictValues(val, dictValues));
  }

  /**
   * 在字典值陣列中查詢指定的值
   * @param value 要查詢的值
   * @param dictValues 字典值陣列
   * @returns
   */
  findValueInDictValues(value: string, dictValues: any[]) {
    let result = dictValues.find(dictValue => dictValue.value === value);
    if (!result) {
      result = dictValues.find(dictValue => dictValue.id === parseInt(value));
    }
    return result ? result.name : null; // 或者適當的錯誤處理
  }

  /**
   * 修改之後
   * @param data
   * @param type
   */
  async modifyAfter(data: any, type: 'delete' | 'update' | 'add') {
    if (type === 'delete') {
      for (const id of data) {
        await this.delChildDict(id);
      }
    }
  }

  /**
   * 刪除子字典
   * @param id
   */
  private async delChildDict(id) {
    const delDict = await this.dictInfoEntity.findBy({ parentId: id });
    if (_.isEmpty(delDict)) {
      return;
    }
    const delDictIds = delDict.map(e => {
      return e.id;
    });
    await this.dictInfoEntity.delete(delDictIds);
    for (const dictId of delDictIds) {
      await this.delChildDict(dictId);
    }
  }
}
