import { CoolEps } from '@cool-midway/core';
import { Config, Inject, Provide, Scope, ScopeEnum } from '@midwayjs/core';
import * as _ from 'lodash';

/**
 * 構建檔案
 */
@Provide()
@Scope(ScopeEnum.Singleton)
export class SwaggerBuilder {
  @Config('module.swagger.base')
  swaggerBase;

  @Inject()
  eps: CoolEps;

  json = {};

  @Config('cool.eps')
  epsConfig: boolean;

  /**
   * 初始化
   */
  async init() {
    if (this.epsConfig) {
      this.build();
    }
  }

  /**
   * 構建檔案
   */
  async build() {
    const epsData = {
      app: this.eps.app || [],
      admin: this.eps.admin || [],
      module: this.eps.module || {},
    };
    this.json = this.convertToSwagger(epsData);
  }

  /**
   * Epss轉換為Swagger
   * @param dataJson
   * @returns
   */
  convertToSwagger(dataJson) {
    const swagger = {
      ...this.swaggerBase,
      paths: {},
      tags: Object.keys(dataJson.module)
        .filter(item => item != 'swagger')
        .map(moduleKey => {
          return {
            key: moduleKey,
            name: dataJson.module[moduleKey].name || '',
            description: dataJson.module[moduleKey].description || '',
          };
        }),
    };
    // 新增元件
    function addComponentSchemas(data) {
      if (_.isEmpty(data.name)) return;
      const schema = {
        type: 'object',
        properties: {},
        required: [],
      };

      data.columns.forEach(column => {
        const swaggerType = mapTypeToSwagger(column.type);
        schema.properties[column.propertyName] = {
          type: swaggerType,
          description: column.comment,
        };

        if (!column.nullable) {
          schema.required.push(column.propertyName);
        }
      });

      swagger.components.schemas[data.name] = schema;
      return data.name;
    }
    // 轉換型別
    function mapTypeToSwagger(type) {
      const typeMapping = {
        string: 'string',
        number: 'number',
        bigint: 'integer',
        datetime: 'string', // assuming datetime is formatted as ISO8601 string
      };
      return typeMapping[type] || 'string';
    }
    // 新增請求體
    function addRequest(path, schemas, data) {
      if (path == '/info' || path == '/list' || path == '/page') {
        if (path == '/info') {
          data.parameters = [
            {
              name: 'id',
              in: 'query',
              description: 'ID',
              required: true,
              schema: {
                type: 'integer',
              },
            },
          ];
        } else {
          data.requestBody = {
            description: '動態請求體',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties:
                    path == '/page'
                      ? {
                          page: {
                            type: 'integer',
                            description: '第幾頁',
                            default: 1,
                          },
                          size: {
                            type: 'integer',
                            description: '每頁大小',
                            default: 20,
                          },
                        }
                      : {},
                },
              },
            },
          };
        }
        data.responses = {
          '200': {
            description: '成功響應',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'integer',
                      description: '狀態碼',
                    },
                    message: {
                      type: 'string',
                      description: '響應訊息',
                    },
                    data: {
                      $ref: `#/components/schemas/${schemas}`,
                    },
                  },
                },
              },
            },
          },
        };
      }
      if (path == '/add' || path == '/update') {
        data.requestBody = {
          description: schemas,
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: `#/components/schemas/${schemas}`,
              },
            },
          },
        };
        data.responses = {
          '200': {
            description: '成功響應',
            content: {
              'application/json': {
                example: {
                  code: 1000,
                  message: 'success',
                  data: {
                    id: 6,
                  },
                },
              },
            },
          },
        };
      }
      if (path == '/delete') {
        data.requestBody = {
          description: schemas,
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ids: {
                    type: 'array',
                    description: 'ID陣列',
                    items: {
                      type: 'integer',
                    },
                  },
                },
              },
            },
          },
        };
        data.responses = {
          '200': {
            description: '成功響應',
            content: {
              'application/json': {
                example: {
                  code: 1000,
                  message: 'success',
                },
              },
            },
          },
        };
      }
    }
    // 處理每個模組下的API介面
    function processModuleApis(moduleApis, moduleName) {
      moduleApis.forEach(module => {
        const schemas = addComponentSchemas({
          name: module.name,
          columns: module.columns,
        });
        if (Array.isArray(module.api)) {
          module.api.forEach(api => {
            const fullPath = `${api.prefix == '/' ? '' : api.prefix}${
              api.path
            }`;
            const method = api.method.toLowerCase();

            if (!swagger.paths[fullPath]) {
              swagger.paths[fullPath] = {};
            }

            swagger.paths[fullPath][method] = {
              summary:
                `【${module.info.type.description || module.info.type.name}】` +
                  api.summary || '',
              security: api.ignoreToken
                ? []
                : [
                    {
                      ApiKeyAuth: [],
                    },
                  ],
              tags: [moduleName || '其他'],
              requestBody:
                method == 'post'
                  ? {
                      description: '請求體',
                      required: true,
                      content: {
                        'application/json': {
                          schema: {
                            type: 'object',
                            properties: {},
                          },
                        },
                      },
                    }
                  : {},
              responses: schemas
                ? {
                    '200': {
                      description: 'Success response',
                      content: {
                        'application/json': {
                          schema: {
                            $ref: `#/components/schemas/${schemas}`,
                          },
                        },
                      },
                    },
                  }
                : {},
            };
            addRequest(api.path, schemas, swagger.paths[fullPath][method]);
          });
        }
      });
    }

    // 遍歷app和admin中的所有模組
    Object.keys(dataJson.app).forEach(moduleKey => {
      if (Array.isArray(dataJson.app[moduleKey])) {
        processModuleApis(
          dataJson.app[moduleKey],
          dataJson.module[moduleKey]?.name
        );
      }
    });
    Object.keys(dataJson.admin).forEach(moduleKey => {
      if (Array.isArray(dataJson.admin[moduleKey])) {
        processModuleApis(
          dataJson.admin[moduleKey],
          dataJson.module[moduleKey]?.name
        );
      }
    });

    return swagger;
  }
}
