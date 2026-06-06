import { Rule, RuleType } from '@midwayjs/validate';
/**
 * 登入參數校驗
 */
export class LoginDTO {
  // 使用者名稱
  @Rule(RuleType.string().required())
  username: string;

  // 密碼
  @Rule(RuleType.string().required())
  password: string;

  // 驗證碼ID
  @Rule(RuleType.string().required())
  captchaId: string;

  // 驗證碼
  @Rule(RuleType.required())
  verifyCode: number;
}
