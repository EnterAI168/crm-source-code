import { BaseService, CoolCommException } from '@cool-midway/core';
import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import * as md5 from 'md5';
import { Equal, Repository } from 'typeorm';
import { v1 as uuid } from 'uuid';
import { PluginService } from '../../plugin/service/info';
import { UserInfoEntity } from '../entity/info';
import { UserSmsService } from './sms';
import { UserWxService } from './wx';

/**
 * 使用者資訊
 */
@Provide()
export class UserInfoService extends BaseService {
  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  pluginService: PluginService;

  @Inject()
  userSmsService: UserSmsService;

  @Inject()
  userWxService: UserWxService;

  /**
   * 繫結小程式手機號碼
   * @param userId
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniPhone(userId: number, code: any, encryptedData: any, iv: any) {
    const phone = await this.userWxService.miniPhone(code, encryptedData, iv);
    await this.userInfoEntity.update({ id: Equal(userId) }, { phone });
    return phone;
  }

  /**
   * 取得使用者資訊
   * @param id
   * @returns
   */
  async person(id) {
    const info = await this.userInfoEntity.findOneBy({ id: Equal(id) });
    delete info.password;
    return info;
  }

  /**
   * 登出
   * @param userId
   */
  async logoff(userId: number) {
    await this.userInfoEntity.update(
      { id: userId },
      {
        status: 2,
        phone: null,
        unionid: null,
        nickName: `已登出-00${userId}`,
        avatarUrl: null,
      }
    );
  }

  /**
   * 更新使用者資訊
   * @param id
   * @param param
   * @returns
   */
  async updatePerson(id, param) {
    const info = await this.person(id);
    if (!info) throw new CoolCommException('使用者不存在');
    try {
      // 修改了頭像要重新處理
      if (param.avatarUrl && info.avatarUrl != param.avatarUrl) {
        const file = await this.pluginService.getInstance('upload');
        param.avatarUrl = await file.downAndUpload(
          param.avatarUrl,
          uuid() + '.png'
        );
      }
    } catch (err) {}
    try {
      return await this.userInfoEntity.update({ id }, param);
    } catch (err) {
      throw new CoolCommException('更新失敗，參數錯誤或者手機號碼已存在');
    }
  }

  /**
   * 更新密碼
   * @param userId
   * @param password
   * @param 驗證碼
   */
  async updatePassword(userId, password, code) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    const check = await this.userSmsService.checkCode(user.phone, code);
    if (!check) {
      throw new CoolCommException('驗證碼錯誤');
    }
    await this.userInfoEntity.update(user.id, { password: md5(password) });
  }

  /**
   * 繫結手機號碼
   * @param userId
   * @param phone
   * @param code
   */
  async bindPhone(userId, phone, code) {
    const check = await this.userSmsService.checkCode(phone, code);
    if (!check) {
      throw new CoolCommException('驗證碼錯誤');
    }
    await this.userInfoEntity.update({ id: userId }, { phone });
  }
}
