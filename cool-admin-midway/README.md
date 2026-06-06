<p align="center">
  <a href="https://midwayjs.org/" target="blank"><img src="https://cool-show.oss-cn-shanghai.aliyuncs.com/admin/logo.png" width="200" alt="Midway Logo" /></a>
</p>

<p align="center">cool-admin(nodejs版)一個很酷的後台權限管理系統，開源免費，Ai編碼、流程編排、模組化、外掛化、極速開發CRUD，方便快速構建迭代後台管理系統，支援原生、docker、普通伺服器等多種方式部署
到 <a href="https://cool-js.com" target="_blank">官網</a> 進一步瞭解。
<p align="center">
    <a href="https://github.com/cool-team-official/cool-admin-midway/blob/master/LICENSE" target="_blank"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="GitHub license" />
    <a href=""><img src="https://img.shields.io/github/package-json/v/cool-team-official/cool-admin-midway?style=flat-square" alt="GitHub tag"></a>
    <img src="https://img.shields.io/github/last-commit/cool-team-official/cool-admin-midway?style=flat-square" alt="GitHub tag"></a>
</p>

## 特性

Ai 時代，很多老舊的框架已經無法滿足現代化的開發需求，Cool-Admin 開發了一系列的功能，讓開發變得更簡單、更快速、更高效。

- **Ai 編碼**：通過微調大模型學習框架特有寫法，實現簡單功能從 Api 介面到前端頁面的一鍵生成[詳情](https://node.cool-admin.com/src/guide/ai.html)
- **流程編排**：通過拖拽編排方式，即可實現類似像智慧客服這樣的功能[詳情](https://node.cool-admin.com/src/guide/flow.html)
- **多租戶**：支援多租戶，採用全域性動態注入查詢條件[詳情](https://node.cool-admin.com/src/guide/core/tenant.html)
- **多語言**：基於大模型自動翻譯，無需更改原有程式碼[詳情](https://node.cool-admin.com/src/guide/core/i18n.html)
- **原生打包**：打包成 exe 等安裝包，打包完可以直接執行在 windows、mac、linux 等作業系統上[詳情](https://node.cool-admin.com/src/guide/core/pkg.html)
- **模組化**：程式碼是模組化的，清晰明瞭，方便維護
- **外掛化**：外掛化的設計，可以通過安裝外掛的方式擴充套件如：支付、簡訊、郵件等功能
- ......

![](https://cool-show.oss-cn-shanghai.aliyuncs.com/admin/flow.png)

## 技術棧

- 後端：**`node.js` `typescript`**
- 前端：**`vue.js` `element-plus` `jsx` `pinia` `vue-router`**
- 資料庫：**`mysql` `postgresql` `sqlite`**

如果你是前端，後端的這些技術選型對你是特別友好的，前端開發者可以較快速地上手。
如果你是後端，Typescript 的語法又跟 java、php 等特別類似，一切看起來也是那麼得熟悉。

如果你想使用 java 版本後端，請移步[cool-admin-java](https://cool-js.com/admin/java/introduce.html)

#### 官網

[https://cool-js.com](https://cool-js.com)

## 影片教程

[官方 B 站影片教程](https://www.bilibili.com/video/BV1j1421R7aB)

<!-- 在此次新增使用檔案 -->

## 演示

[AI 極速編碼](https://node.cool-admin.com/src/guide/ai.html)

[https://show.cool-admin.com](https://show.cool-admin.com)

- 賬戶：admin
- 密碼：123456

<img src="https://cool-show.oss-cn-shanghai.aliyuncs.com/admin/home-mini.png" alt="Admin Home"></a>

#### 專案前端

[https://github.com/cool-team-official/cool-admin-vue](https://github.com/cool-team-official/cool-admin-vue)

或

[https://gitee.com/cool-team-official/cool-admin-vue](https://gitee.com/cool-team-official/cool-admin-vue)

或

[https://gitcode.com/cool_team/cool-admin-vue](https://gitcode.com/cool_team/cool-admin-vue)

## 微信群

<img width="260" src="https://cool-show.oss-cn-shanghai.aliyuncs.com/admin/wechat.jpeg?v=1" alt="Admin Wechat"></a>

## 執行

#### 修改資料庫配置，配置檔案位於`src/config/config.local.ts`

以 Mysql 為例，其他資料庫請參考[資料庫配置檔案](https://cool-js.com/admin/node/quick.html#%E6%95%B0%E6%8D%AE%E5%BA%93%E9%85%8D%E7%BD%AE)

Mysql(`>=5.7版本`)，建議 8.0，node 版本(`>=18.x`)，首次啟動會自動初始化並匯入資料

```ts
// mysql，驅動已經內建，無需安裝
typeorm: {
    dataSource: {
      default: {
        type: 'mysql',
        host: '127.0.0.1',
        port: 3306,
        username: 'root',
        password: '123456',
        database: 'cool',
        // 自動建表 注意：線上部署的時候不要使用，有可能導致資料丟失
        synchronize: true,
        // 列印日誌
        logging: false,
        // 字元集
        charset: 'utf8mb4',
        // 是否開啟快取
        cache: true,
        // 實體路徑
        entities: ['**/modules/*/entity'],
      },
    },
  },
```

#### 安裝依賴並執行

```bash
$ npm i
$ npm run dev
```

啟動完成訪問：[http://localhost:8001/](http://localhost:8001)

注： `npm i`如果安裝失敗可以嘗試使用切換您的映象源，推薦使用[pnpm](https://pnpm.io/)安裝

## CURD(快速增刪改查)

大部分的後台管理系統，或者 API 服務都是對資料進行管理，所以可以看到大量的 CRUD 場景(增刪改查)，cool-admin 對此進行了大量地封裝，讓這塊的編碼量變得極其地少。

#### 新建一個資料表

`src/modules/demo/entity/goods.ts`，專案啟動資料庫會自動建立該表，無需手動建立

```ts
import { BaseEntity } from '../../base/entity/base';
import { Column, Entity, Index } from 'typeorm';

/**
 * 商品
 */
@Entity('demo_app_goods')
export class DemoAppGoodsEntity extends BaseEntity {
  @Column({ comment: '標題' })
  title: string;

  @Column({ comment: '圖片' })
  pic: string;

  @Column({ comment: '價格', type: 'decimal', precision: 5, scale: 2 })
  price: number;
}
```

#### 編寫 api 介面

`src/modules/demo/controller/app/goods.ts`，快速編寫 6 個 api 介面

```ts
import { CoolController, BaseController } from '@cool-midway/core';
import { DemoAppGoodsEntity } from '../../entity/goods';

/**
 * 商品
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: DemoAppGoodsEntity,
})
export class DemoAppGoodsController extends BaseController {
  /**
   * 其他介面
   */
  @Get('/other')
  async other() {
    return this.ok('hello, cool-admin!!!');
  }
}
```

這樣我們就完成了 6 個介面的編寫，對應的介面如下：

- `POST /app/demo/goods/add` 新增
- `POST /app/demo/goods/delete` 刪除
- `POST /app/demo/goods/update` 更新
- `GET /app/demo/goods/info` 單個資訊
- `POST /app/demo/goods/list` 列表資訊
- `POST /app/demo/goods/page` 分頁查詢(包含模糊查詢、欄位全匹配等)

### 部署

[部署教程](https://node.cool-admin.com/src/guide/deploy.html)

### 內建指令

- 使用 `npm run lint` 來做程式碼風格檢查。

[midway]: https://midwayjs.org

### 低價伺服器

[阿里雲、騰訊雲、華為雲低價雲伺服器，不限新老](https://cool-js.com/service/cloud)
