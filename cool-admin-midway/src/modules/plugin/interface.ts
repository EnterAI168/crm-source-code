/**
 * 外掛資訊
 */
export interface PluginInfo {
  /** 名稱 */
  name?: string;
  /** 唯一標識 */
  key?: string;
  /** 鉤子 */
  hook?: string;
  /** 是否單例 */
  singleton?: boolean;
  /** 版本 */
  version?: string;
  /** 描述 */
  description?: string;
  /** 作者 */
  author?: string;
  /** logo */
  logo?: string;
  /** README 使用說明 */
  readme?: string;
  /** 配置 */
  config?: any;
}
