-- 報價單乙方存摺帳戶：表結構 + 報價單欄位 + 預設資料 + 選單權限
-- 適用正式庫 / 測試庫，可重複執行（已存在則跳過）

-- 1) 存摺帳戶表
CREATE TABLE IF NOT EXISTS `crm_quote_bank_account` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `createTime` varchar(30) NULL COMMENT '建立時間',
  `updateTime` varchar(30) NULL COMMENT '更新時間',
  `tenantId` int NULL COMMENT '租戶ID',
  `name` varchar(100) NOT NULL COMMENT '帳戶名稱（下拉顯示）',
  `bankAccountName` varchar(200) NULL COMMENT '戶名',
  `bankCode` varchar(20) NULL COMMENT '銀行代號',
  `bankName` varchar(100) NULL COMMENT '銀行名稱',
  `bankBranch` varchar(100) NULL COMMENT '開戶行',
  `bankAccountNo` varchar(50) NULL COMMENT '銀行帳號',
  `bankCoverUrl` varchar(500) NULL COMMENT '存摺封面圖片',
  `isDefault` tinyint NOT NULL DEFAULT 0 COMMENT '是否預設 0-否 1-是',
  `isEnabled` tinyint NOT NULL DEFAULT 1 COMMENT '啟用狀態 0-停用 1-啟用',
  `sortNum` int NOT NULL DEFAULT 0 COMMENT '排序',
  `remark` text NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  PRIMARY KEY (`id`),
  KEY `IDX_crm_quote_bank_account_name` (`name`),
  KEY `IDX_crm_quote_bank_account_default` (`isDefault`),
  KEY `IDX_crm_quote_bank_account_enabled` (`isEnabled`),
  KEY `IDX_crm_quote_bank_account_tenant` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='報價單乙方存摺帳戶';

-- 2) 報價單增加存摺帳戶ID
SET @bank_account_col_exists := (
  SELECT COUNT(1)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'crm_quote_order'
    AND COLUMN_NAME = 'bankAccountId'
);

SET @bank_account_alter_sql := IF(
  @bank_account_col_exists = 0,
  'ALTER TABLE `crm_quote_order`
     ADD COLUMN `bankAccountId` int NULL COMMENT ''乙方存摺帳戶ID'' AFTER `accompanySalesmanId`,
     ADD INDEX `IDX_crm_quote_order_bank_account_id` (`bankAccountId`)',
  'SELECT ''crm_quote_order.bankAccountId already exists'' AS message'
);

PREPARE stmt FROM @bank_account_alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) 預設存摺帳戶（無資料時寫入一筆）
INSERT INTO `crm_quote_bank_account`
  (`createTime`, `updateTime`, `tenantId`, `name`, `bankAccountName`, `bankCode`, `bankName`,
   `bankBranch`, `bankAccountNo`, `bankCoverUrl`, `isDefault`, `isEnabled`, `sortNum`, `remark`, `isDeleted`)
SELECT
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'),
  NULL,
  '臺北富邦銀行',
  '確認鍵智創科技股份有限公司',
  '012',
  '臺北富邦銀行',
  '',
  '82110000259100',
  '/quote-bank-cover.jpg',
  1,
  1,
  0,
  '系統預設存摺帳戶',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM `crm_quote_bank_account` WHERE `isDeleted` = 0 LIMIT 1
);

-- 4) 舊報價單補上預設存摺帳戶
UPDATE `crm_quote_order` o
JOIN (
  SELECT id
  FROM `crm_quote_bank_account`
  WHERE isDeleted = 0 AND isEnabled = 1
  ORDER BY isDefault DESC, sortNum ASC, id ASC
  LIMIT 1
) a
SET o.bankAccountId = a.id
WHERE o.isDeleted = 0
  AND (o.bankAccountId IS NULL OR o.bankAccountId = 0);

-- 5) 選單：報價單管理 / 存摺帳戶
SET @quote_parent_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/quote' AND type = 0
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT
  @quote_parent_id, '存摺帳戶', '/crm/quote/bank-account', 'crm:quoteBankAccount:page', 1, 'icon-wallet', 8,
  'modules/customer/views/quote-bank-account.vue', 1, 1, NOW(), NOW()
WHERE @quote_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu WHERE router = '/crm/quote/bank-account'
  );

SET @bank_account_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/quote/bank-account'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bank_account_menu_id, '列表', NULL, 'crm:quoteBankAccount:page', 2, NULL, 1, NULL, 0, 0, NOW(), NOW()
WHERE @bank_account_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @bank_account_menu_id AND perms = 'crm:quoteBankAccount:page'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bank_account_menu_id, '新增', NULL, 'crm:quoteBankAccount:add', 2, NULL, 2, NULL, 0, 0, NOW(), NOW()
WHERE @bank_account_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @bank_account_menu_id AND perms = 'crm:quoteBankAccount:add'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bank_account_menu_id, '編輯', NULL, 'crm:quoteBankAccount:update', 2, NULL, 3, NULL, 0, 0, NOW(), NOW()
WHERE @bank_account_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @bank_account_menu_id AND perms = 'crm:quoteBankAccount:update'
  );

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @bank_account_menu_id, '刪除', NULL, 'crm:quoteBankAccount:delete', 2, NULL, 4, NULL, 0, 0, NOW(), NOW()
WHERE @bank_account_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @bank_account_menu_id AND perms = 'crm:quoteBankAccount:delete'
  );

-- 6) 授權管理員 / 老闆角色
INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT r.id, m.id, NOW(), NOW()
FROM base_sys_role r
JOIN base_sys_menu m
  ON m.router = '/crm/quote/bank-account'
  OR (m.parentId = @bank_account_menu_id AND m.perms LIKE 'crm:quoteBankAccount:%')
WHERE (r.label IN ('admin', 'boss') OR r.name IN ('管理員', '老闆'))
  AND @bank_account_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu rm
    WHERE rm.roleId = r.id AND rm.menuId = m.id
  );
