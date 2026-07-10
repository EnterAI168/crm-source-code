SET @discount_audit_status_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'discountAuditStatus'
);

SET @discount_audit_reason_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'discountAuditReason'
);

SET @discount_audit_user_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'discountAuditUserId'
);

SET @discount_audit_time_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'discountAuditTime'
);

SET @discount_audit_remark_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'discountAuditRemark'
);

SET @discount_audit_sql := IF(
  @discount_audit_status_exists = 0,
  'ALTER TABLE `crm_quote_order`
     ADD COLUMN `discountAuditStatus` tinyint NOT NULL DEFAULT 0 COMMENT ''優惠審批狀態 0-無需審批 1-待老闆審批 2-直接同意 3-同意扣除超出獎金 4-不同意'' AFTER `commission`,
     ADD COLUMN `discountAuditReason` varchar(255) NULL COMMENT ''優惠審批原因'' AFTER `discountAuditStatus`,
     ADD COLUMN `discountAuditUserId` int NULL COMMENT ''優惠審批人ID'' AFTER `discountAuditReason`,
     ADD COLUMN `discountAuditTime` varchar(20) NULL COMMENT ''優惠審批時間'' AFTER `discountAuditUserId`,
     ADD COLUMN `discountAuditRemark` text NULL COMMENT ''優惠審批備註'' AFTER `discountAuditTime`',
  'SELECT 1'
);

PREPARE discount_audit_stmt FROM @discount_audit_sql;
EXECUTE discount_audit_stmt;
DEALLOCATE PREPARE discount_audit_stmt;

SET @quote_order_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE router = '/crm/quote/list'
  LIMIT 1
);

INSERT INTO base_sys_menu
  (parentId, name, router, perms, type, icon, orderNum, viewPath, keepAlive, isShow, createTime, updateTime)
SELECT @quote_order_menu_id, '優惠審批', NULL, 'crm:quoteOrder:auditDiscount', 2, NULL, 8, NULL, 0, 0, NOW(), NOW()
WHERE @quote_order_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_menu
    WHERE parentId = @quote_order_menu_id AND perms = 'crm:quoteOrder:auditDiscount'
  );

UPDATE base_sys_menu
SET name = '優惠審批', orderNum = 8, updateTime = NOW()
WHERE parentId = @quote_order_menu_id
  AND perms = 'crm:quoteOrder:auditDiscount';

SET @quote_discount_audit_menu_id := (
  SELECT id FROM base_sys_menu
  WHERE parentId = @quote_order_menu_id
    AND perms = 'crm:quoteOrder:auditDiscount'
  LIMIT 1
);

INSERT INTO base_sys_role_menu (roleId, menuId, createTime, updateTime)
SELECT DISTINCT source_role_menu.roleId, @quote_discount_audit_menu_id, NOW(), NOW()
FROM base_sys_role_menu source_role_menu
INNER JOIN base_sys_menu audit_menu ON audit_menu.id = source_role_menu.menuId
WHERE audit_menu.perms = 'crm:quoteOrder:audit'
  AND @quote_discount_audit_menu_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM base_sys_role_menu target_role_menu
    WHERE target_role_menu.roleId = source_role_menu.roleId
      AND target_role_menu.menuId = @quote_discount_audit_menu_id
  );
