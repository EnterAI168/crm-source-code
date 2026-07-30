-- 匯款單增加建立人；列表可見範圍改為「自己建的單」，老闆看全部
-- 歷史資料：用 salesmanId 回填 createUserId（無則仍為空，僅老闆可見）

SET @create_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_remittance'
    AND column_name = 'createUserId'
);

SET @create_user_sql := IF(
  @create_user_exists = 0,
  'ALTER TABLE `crm_remittance`
     ADD COLUMN `createUserId` int NULL COMMENT ''建立人用戶ID'' AFTER `salesmanId`,
     ADD INDEX `IDX_crm_remittance_createUserId` (`createUserId`)',
  'SELECT 1'
);

PREPARE create_user_stmt FROM @create_user_sql;
EXECUTE create_user_stmt;
DEALLOCATE PREPARE create_user_stmt;

UPDATE `crm_remittance`
SET `createUserId` = `salesmanId`
WHERE `isDeleted` = 0
  AND (`createUserId` IS NULL OR `createUserId` = 0)
  AND `salesmanId` IS NOT NULL
  AND `salesmanId` > 0;
