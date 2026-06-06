CREATE TABLE IF NOT EXISTS `crm_bonus_config` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `createTime` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updateTime` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `roleType` varchar(32) NOT NULL COMMENT '適用角色 sales-業務 internal-內勤',
  `groupCode` varchar(64) NOT NULL COMMENT '分組編碼',
  `groupName` varchar(100) NOT NULL COMMENT '分組名稱',
  `configCode` varchar(100) NOT NULL COMMENT '配置編碼',
  `configName` varchar(160) NOT NULL COMMENT '配置名稱',
  `configType` varchar(32) NOT NULL COMMENT '配置型別 rate-比例 amount-金額 threshold-門檻 text-文本',
  `conditionText` text NULL COMMENT '條件說明',
  `calcBase` varchar(200) NULL COMMENT '計算基數',
  `configValue` varchar(64) NULL COMMENT '配置值',
  `unit` varchar(32) NULL COMMENT '單位',
  `sortNum` int NOT NULL DEFAULT 0 COMMENT '排序',
  `isEnabled` tinyint NOT NULL DEFAULT 1 COMMENT '啟用狀態 0-停用 1-啟用',
  `remark` text NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_crm_bonus_config_code` (`configCode`),
  KEY `IDX_crm_bonus_config_role` (`roleType`),
  KEY `IDX_crm_bonus_config_group` (`groupCode`),
  KEY `IDX_crm_bonus_config_enabled` (`isEnabled`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='CRM獎金配置';

SET @crm_customer_parent_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/customer' AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @crm_customer_parent_id, '獎金配置', '/crm/bonus/config', 'crm:bonusConfig:page', 1, 'icon-form', 4,
  'modules/customer/views/bonus-config.vue', 1, 1, NOW(), NOW()
WHERE @crm_customer_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu WHERE router = '/crm/bonus/config'
  );

SET @bonus_config_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/bonus/config'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bonus_config_menu_id, '列表', NULL, 'crm:bonusConfig:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @bonus_config_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @bonus_config_menu_id AND perms = 'crm:bonusConfig:page');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bonus_config_menu_id, '新增', NULL, 'crm:bonusConfig:add', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @bonus_config_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @bonus_config_menu_id AND perms = 'crm:bonusConfig:add');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bonus_config_menu_id, '編輯', NULL, 'crm:bonusConfig:update', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @bonus_config_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @bonus_config_menu_id AND perms = 'crm:bonusConfig:update');

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bonus_config_menu_id, '刪除', NULL, 'crm:bonusConfig:delete', 2, NULL, 4, NULL, 0, 0, NOW(), NOW()
WHERE @bonus_config_menu_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM base_sys_menu WHERE parentId = @bonus_config_menu_id AND perms = 'crm:bonusConfig:delete');

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
JOIN base_sys_menu m ON m.router = '/crm/bonus/config' OR m.perms LIKE 'crm:bonusConfig:%'
WHERE (r.label IN ('admin', 'boss') OR r.name IN ('管理員', '老闆'))
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );
