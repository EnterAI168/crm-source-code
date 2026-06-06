import * as upload_aws from './upload-aws';
import { BaseUpload, MODETYPE } from './upload';
type AnyString = string & {};
/**
 * 外掛型別宣告
 */
interface PluginMap {
  upload: BaseUpload;
  'upload-aws': upload_aws.CoolPlugin;
}
