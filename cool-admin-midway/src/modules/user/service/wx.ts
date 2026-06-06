import { BaseService, CoolCommException } from '@cool-midway/core';
import { Config, Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as moment from 'moment';
import { Equal, Repository } from 'typeorm';
import { v1 as uuid } from 'uuid';
import { PluginService } from '../../plugin/service/info';
import { UserInfoEntity } from '../entity/info';
import { UserWxEntity } from '../entity/wx';

/**
 * 微信
 */
@Provide()
export class UserWxService extends BaseService {
  @Config('module.user')
  config;

  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @InjectEntityModel(UserWxEntity)
  userWxEntity: Repository<UserWxEntity>;

  @Inject()
  pluginService: PluginService;

  /**
   * 獲得外掛例項
   * @returns
   */
  async getPlugin() {
    try {
      const wxPlugin: any = await this.pluginService.getInstance('wx');
      return wxPlugin;
    } catch (error) {
      throw new CoolCommException(
        '未配置微信外掛，請到外掛市場下載安裝配置：https://cool-js.com/plugin/70'
      );
    }
  }

  /**
   * 獲得小程式例項
   * @returns
   */
  async getMiniApp() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.MiniApp();
  }

  /**
   * 獲得公眾號例項
   * @returns
   */
  async getOfficialAccount() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.OfficialAccount();
  }

  /**
   * 獲得App例項
   * @returns
   */
  async getOpenPlatform() {
    const wxPlugin: any = await this.getPlugin();
    return wxPlugin.OpenPlatform();
  }

  /**
   * 獲得使用者的openId
   * @param userId
   * @param type 0-小程式 1-公眾號 2-App
   */
  async getOpenid(userId: number, type = 0) {
    const user = await this.userInfoEntity.findOneBy({
      id: Equal(userId),
      status: 1,
    });
    if (!user) {
      throw new CoolCommException('使用者不存在或已被停用');
    }
    const wx = await this.userWxEntity
      .createQueryBuilder('a')
      .where('a.type = :type', { type })
      .andWhere('(a.unionid = :unionid or a.openid =:openid )', {
        unionid: user.unionid,
        openid: user.unionid,
      })
      .getOne();
    return wx ? wx.openid : null;
  }

  /**
   * 獲得微信配置
   * @param appId
   * @param appSecret
   * @param url 當前網頁的URL，不包含#及其後面部分(必須是呼叫JS介面頁面的完整URL)
   */
  public async getWxMpConfig(url: string) {
    const token = await this.getWxToken();
    const ticket = await axios.get(
      'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
      {
        params: {
          access_token: token,
          type: 'jsapi',
        },
      }
    );

    const account = (await this.getOfficialAccount()).getAccount();
    const appid = account.getAppId();
    // 返回結果集
    const result = {
      timestamp: parseInt(moment().valueOf() / 1000 + ''),
      nonceStr: uuid(),
      appId: appid, //appid
      signature: '',
    };
    const signArr = [];
    signArr.push('jsapi_ticket=' + ticket.data.ticket);
    signArr.push('noncestr=' + result.nonceStr);
    signArr.push('timestamp=' + result.timestamp);
    signArr.push('url=' + decodeURI(url));
    // 敏感資訊加密處理
    result.signature = crypto
      .createHash('sha1')
      .update(signArr.join('&'))
      .digest('hex')
      .toUpperCase();
    return result;
  }

  /**
   * 獲得公眾號使用者資訊
   * @param code
   */
  async mpUserInfo(code) {
    const token = await this.openOrMpToken(code, 'mp');
    return await this.openOrMpUserInfo(token);
  }

  /**
   * 獲得app使用者資訊
   * @param code
   */
  async appUserInfo(code) {
    const token = await this.openOrMpToken(code, 'open');
    return await this.openOrMpUserInfo(token);
  }

  /**
   * 獲得微信token 不用code
   * @param appid
   * @param secret
   */
  public async getWxToken(type = 'mp') {
    let app;
    if (type == 'mp') {
      app = await this.getOfficialAccount();
    } else {
      app = await this.getOpenPlatform();
    }
    return await app.getAccessToken().getToken();
  }

  /**
   * 獲得使用者資訊
   * @param token
   */
  async openOrMpUserInfo(token) {
    return await axios
      .get('https://api.weixin.qq.com/sns/userinfo', {
        params: {
          access_token: token.access_token,
          openid: token.openid,
          lang: 'zh_CN',
        },
      })
      .then(res => {
        return res.data;
      });
  }

  /**
   * 獲得token嗯
   * @param code
   * @param type
   */
  async openOrMpToken(code, type = 'mp') {
    const account =
      type == 'mp'
        ? (await this.getOfficialAccount()).getAccount()
        : (await this.getMiniApp()).getAccount();
    const result = await axios.get(
      'https://api.weixin.qq.com/sns/oauth2/access_token',
      {
        params: {
          appid: account.getAppId(),
          secret: account.getSecret(),
          code,
          grant_type: 'authorization_code',
        },
      }
    );
    return result.data;
  }

  /**
   * 獲得小程式session
   * @param code 微信code
   * @param conf 配置
   */
  async miniSession(code) {
    const app = await this.getMiniApp();
    const utils = app.getUtils();
    const result = await utils.codeToSession(code);
    return result;
  }

  /**
   * 獲得小程式使用者資訊
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniUserInfo(code, encryptedData, iv) {
    const session = await this.miniSession(code);
    if (session.errcode) {
      throw new CoolCommException('登入失敗，請重試');
    }
    const info: any = await this.miniDecryptData(
      encryptedData,
      iv,
      session.session_key
    );
    if (info) {
      delete info['watermark'];
      return {
        ...info,
        openid: session['openid'],
        unionid: session['unionid'],
      };
    }
    return null;
  }

  /**
   * 獲得小程式手機
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniPhone(code, encryptedData, iv) {
    const session = await this.miniSession(code);
    if (session.errcode) {
      throw new CoolCommException('獲取手機號失敗，請重新整理重試');
    }
    const result = await this.miniDecryptData(
      encryptedData,
      iv,
      session.session_key
    );
    return result.phoneNumber;
  }

  /**
   * 小程式資訊解密
   * @param encryptedData
   * @param iv
   * @param sessionKey
   */
  async miniDecryptData(encryptedData, iv, sessionKey) {
    const app = await this.getMiniApp();
    const utils = app.getUtils();
    return await utils.decryptSession(sessionKey, iv, encryptedData);
  }
}
