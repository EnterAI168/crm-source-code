import { DataSource } from 'typeorm';

export class TempDataSource extends DataSource {
  /**
   * 重新構造後設資料
   */
  async buildMetadatas() {
    await super.buildMetadatas();
  }
}
