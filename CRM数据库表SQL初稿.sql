-- CRM 資料庫表 SQL 初稿
-- 適用範圍：
-- 1. 基於當前 cool-admin-midway 專案已有 customer/product/base/dict 模組
-- 2. 資料庫假定為 MySQL 8.x
-- 3. 命名儘量貼近當前 TypeORM 實體風格，欄位採用 camelCase
-- 4. 當前階段不強制建立外部索引鍵，避免影響現有資料遷移與模組解耦

SET NAMES utf8mb4;

-- =========================================================
-- 一、現有表補充欄位
-- =========================================================

-- 1. 客戶表補充欄位
ALTER TABLE `crm_customer_info`
  ADD COLUMN `status` tinyint NOT NULL DEFAULT 1 COMMENT '客戶狀態 1-跟進中 2-已發報價 3-已成交 4-已失效' AFTER `isVip`,
  ADD COLUMN `sourceType` tinyint NOT NULL DEFAULT 1 COMMENT '來源型別 1-手工 2-Excel匯入 3-公池分配 4-老闆新增' AFTER `status`,
  ADD COLUMN `invalidReason` varchar(255) NULL COMMENT '失效原因' AFTER `sourceType`,
  ADD COLUMN `totalInvoiceAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '累計開票金額' AFTER `invalidReason`,
  ADD COLUMN `dealCount` int NOT NULL DEFAULT 0 COMMENT '累計成交次數' AFTER `totalInvoiceAmount`,
  ADD COLUMN `dealAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '累計成交金額' AFTER `dealCount`,
  ADD COLUMN `lastFollowTime` varchar(19) NULL COMMENT '最近跟進時間' AFTER `dealAmount`,
  ADD COLUMN `lastQuoteId` int NULL COMMENT '最近報價單ID' AFTER `lastFollowTime`;

CREATE INDEX `idx_crm_customer_info_salesman_status_deleted`
  ON `crm_customer_info` (`salesmanId`, `status`, `isDeleted`);

CREATE INDEX `idx_crm_customer_info_taxNumber`
  ON `crm_customer_info` (`taxNumber`);

CREATE INDEX `idx_crm_customer_info_email`
  ON `crm_customer_info` (`email`);

-- 2. 客戶跟進記錄補充欄位
ALTER TABLE `crm_customer_followup`
  ADD COLUMN `quoteId` int NULL COMMENT '報價單ID' AFTER `customerId`,
  ADD COLUMN `followType` tinyint NOT NULL DEFAULT 1 COMMENT '跟進型別 1-電話 2-拜訪 3-郵件 4-IM 5-其他' AFTER `content`,
  ADD COLUMN `creatorId` int NULL COMMENT '建立人ID' AFTER `remark`,
  ADD COLUMN `creatorName` varchar(100) NULL COMMENT '建立人名稱' AFTER `creatorId`;

CREATE INDEX `idx_crm_customer_followup_quoteId`
  ON `crm_customer_followup` (`quoteId`);

-- 3. 產品表補充欄位
ALTER TABLE `product_info`
  ADD COLUMN `lowestPrice` decimal(10,2) NULL COMMENT '最低報價限制' AFTER `price`,
  ADD COLUMN `taxRate` decimal(6,4) NULL COMMENT '稅率' AFTER `lowestPrice`,
  ADD COLUMN `productRoleType` tinyint NOT NULL DEFAULT 1 COMMENT '產品角色型別 1-主力 2-副位 3-附加' AFTER `isOneTimePayment`,
  ADD COLUMN `snapshotVersion` int NOT NULL DEFAULT 1 COMMENT '快照版本號' AFTER `productRoleType`;

-- 4. 產品規格表補充欄位
ALTER TABLE `product_spec`
  ADD COLUMN `lowestPrice` decimal(10,2) NULL COMMENT '規格最低報價限制' AFTER `price`,
  ADD COLUMN `taxRate` decimal(6,4) NULL COMMENT '規格稅率' AFTER `lowestPrice`,
  ADD COLUMN `isEnabled` tinyint NOT NULL DEFAULT 1 COMMENT '是否啟用 0-否 1-是' AFTER `taxRate`;

-- =========================================================
-- 二、新增業務主表
-- =========================================================

-- 5. 供應商主表
CREATE TABLE IF NOT EXISTS `crm_supplier_info` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `companyName` varchar(200) NOT NULL COMMENT '公司名稱',
  `categoryCode` varchar(64) DEFAULT NULL COMMENT '分類編碼(字典)',
  `taxNumber` varchar(50) DEFAULT NULL COMMENT '統一編號',
  `address` varchar(300) DEFAULT NULL COMMENT '地址',
  `email` varchar(120) DEFAULT NULL COMMENT '郵箱',
  `remark` text COMMENT '備註',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 0-停用 1-啟用',
  `creatorId` int DEFAULT NULL COMMENT '建立人ID',
  `creatorName` varchar(100) DEFAULT NULL COMMENT '建立人名稱',
  `lastModifierId` int DEFAULT NULL COMMENT '最後修改人ID',
  `lastModifierName` varchar(100) DEFAULT NULL COMMENT '最後修改人名稱',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_supplier_info_companyName` (`companyName`),
  KEY `idx_crm_supplier_info_taxNumber` (`taxNumber`),
  KEY `idx_crm_supplier_info_category_status` (`categoryCode`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM供應商主表';

-- 6. 報價單主表
CREATE TABLE IF NOT EXISTS `crm_quote_order` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteNo` varchar(50) NOT NULL COMMENT '報價單編號',
  `customerId` int NOT NULL COMMENT '客戶ID',
  `customerCompanyName` varchar(200) DEFAULT NULL COMMENT '客戶公司名稱快照',
  `customerContactName` varchar(100) DEFAULT NULL COMMENT '客戶聯絡人快照',
  `salesmanId` int NOT NULL COMMENT '業務員ID',
  `salesmanName` varchar(100) DEFAULT NULL COMMENT '業務員名稱',
  `departmentId` int DEFAULT NULL COMMENT '業務歸屬部門ID',
  `quoteName` varchar(200) NOT NULL COMMENT '專案名稱',
  `quoteType` tinyint NOT NULL DEFAULT 1 COMMENT '專案性質 1-新客 2-續約',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '整體狀態 1-跟進中 2-待審核 3-審核失敗 4-待分配 5-已分配 6-已發報價 7-已完成 8-已結束 9-已取消',
  `auditStatus` tinyint NOT NULL DEFAULT 0 COMMENT '審核狀態 0-未提交 1-待審核 2-通過 3-拒絕',
  `assignStatus` tinyint NOT NULL DEFAULT 0 COMMENT '分配狀態 0-未分配 1-待分配 2-已分配',
  `contractStatus` tinyint NOT NULL DEFAULT 0 COMMENT '合約狀態 0-未回傳 1-已回傳',
  `invoiceStatus` tinyint NOT NULL DEFAULT 0 COMMENT '開票狀態 0-未開票 1-部分開票 2-已開票',
  `receiptStatus` tinyint NOT NULL DEFAULT 0 COMMENT '回款狀態 0-未回款 1-部分回款 2-已回款',
  `paymentStatus` tinyint NOT NULL DEFAULT 0 COMMENT '匯款狀態 0-未匯款 1-部分匯款 2-已匯款',
  `startDate` varchar(10) DEFAULT NULL COMMENT '專案開始日期',
  `endDate` varchar(10) DEFAULT NULL COMMENT '專案結束日期',
  `finalAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '最終報價金額',
  `costAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '成本金額',
  `grossProfitAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '毛利金額',
  `grossProfitRate` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '毛利率',
  `specialDiscountRate` decimal(6,4) NOT NULL DEFAULT 0.0000 COMMENT '特殊優惠比例',
  `isVipCustomer` tinyint NOT NULL DEFAULT 0 COMMENT '是否VIP客戶 0-否 1-是',
  `isCanceled` tinyint NOT NULL DEFAULT 0 COMMENT '是否取消 0-否 1-是',
  `cancelReason` varchar(255) DEFAULT NULL COMMENT '取消原因',
  `currentAssigneeId` int DEFAULT NULL COMMENT '當前內勤處理人ID',
  `currentAssigneeName` varchar(100) DEFAULT NULL COMMENT '當前內勤處理人名稱',
  `currentDeptId` int DEFAULT NULL COMMENT '當前內勤部門ID',
  `bossVisible` tinyint NOT NULL DEFAULT 1 COMMENT '老闆可見 0-否 1-是',
  `remark` text COMMENT '備註',
  `latestVersionNo` int NOT NULL DEFAULT 1 COMMENT '最新版本號',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_quote_order_quoteNo` (`quoteNo`),
  KEY `idx_crm_quote_order_customer_deleted` (`customerId`, `isDeleted`),
  KEY `idx_crm_quote_order_salesman_status` (`salesmanId`, `status`),
  KEY `idx_crm_quote_order_assignee_status` (`currentAssigneeId`, `status`),
  KEY `idx_crm_quote_order_dept_status` (`currentDeptId`, `status`),
  KEY `idx_crm_quote_order_status_audit_assign` (`status`, `auditStatus`, `assignStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單主表';

-- 7. 報價單產品明細
CREATE TABLE IF NOT EXISTS `crm_quote_item` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `productId` int DEFAULT NULL COMMENT '產品ID',
  `specId` int DEFAULT NULL COMMENT '產品規格ID',
  `productType` tinyint NOT NULL DEFAULT 1 COMMENT '產品型別 1-主力產品 2-一次性產品 3-附加產品',
  `productRoleTypeSnapshot` tinyint NOT NULL DEFAULT 1 COMMENT '產品角色快照 1-主力 2-副位 3-附加',
  `productNameSnapshot` varchar(200) DEFAULT NULL COMMENT '產品名稱快照',
  `specNameSnapshot` varchar(200) DEFAULT NULL COMMENT '規格名稱快照',
  `departmentIdSnapshot` int DEFAULT NULL COMMENT '負責部門快照',
  `presetPriceSnapshot` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '預設報價快照',
  `lowestPriceSnapshot` decimal(10,2) DEFAULT NULL COMMENT '最低報價快照',
  `actualPrice` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '實際報價',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '數量',
  `subtotalAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '小計金額',
  `grossProfitAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '毛利金額',
  `grossProfitRate` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '毛利率',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `sortNum` int NOT NULL DEFAULT 1 COMMENT '排序',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_item_quoteId` (`quoteId`),
  KEY `idx_crm_quote_item_product_spec` (`productId`, `specId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單產品明細表';

-- 8. 報價單階段計劃
CREATE TABLE IF NOT EXISTS `crm_quote_stage` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `stageNo` int NOT NULL COMMENT '階段序號',
  `stageName` varchar(100) NOT NULL COMMENT '階段名稱',
  `ratio` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '付款比例',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '階段金額',
  `invoiceDate` varchar(19) DEFAULT NULL COMMENT '開票日期',
  `needManualInvoice` tinyint NOT NULL DEFAULT 0 COMMENT '是否手動開票 0-否 1-是',
  `expectedReceiptDate` varchar(19) DEFAULT NULL COMMENT '預計回款時間',
  `actualReceiptAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '實際回款金額',
  `actualReceiptDate` varchar(19) DEFAULT NULL COMMENT '實際回款時間',
  `receiptStatus` tinyint NOT NULL DEFAULT 0 COMMENT '回款狀態 0-未回款 1-部分回款 2-已回款',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `sortNum` int NOT NULL DEFAULT 1 COMMENT '排序',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_stage_quoteId` (`quoteId`),
  KEY `idx_crm_quote_stage_invoiceDate_status` (`invoiceDate`, `receiptStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單付款階段表';

-- 9. 報價單歷史版本
CREATE TABLE IF NOT EXISTS `crm_quote_history` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `versionNo` int NOT NULL COMMENT '版本號',
  `snapshotJson` longtext COMMENT '完整快照JSON',
  `pdfFileId` varchar(100) DEFAULT NULL COMMENT 'PDF檔案ID',
  `operatorId` int DEFAULT NULL COMMENT '操作人ID',
  `operatorName` varchar(100) DEFAULT NULL COMMENT '操作人名稱',
  `changeType` tinyint NOT NULL DEFAULT 1 COMMENT '變更型別 1-建立 2-編輯 3-審核後儲存 4-複製建立',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_history_quote_version` (`quoteId`, `versionNo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單歷史版本表';

-- 10. 報價單審核日誌
CREATE TABLE IF NOT EXISTS `crm_quote_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `auditStatus` tinyint NOT NULL COMMENT '審核結果 2-通過 3-拒絕',
  `auditRemark` varchar(500) DEFAULT NULL COMMENT '審核意見',
  `auditorId` int DEFAULT NULL COMMENT '審核人ID',
  `auditorName` varchar(100) DEFAULT NULL COMMENT '審核人名稱',
  `departmentId` int DEFAULT NULL COMMENT '審核部門ID',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_audit_log_quoteId` (`quoteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單審核日誌表';

-- 11. 報價單分配日誌
CREATE TABLE IF NOT EXISTS `crm_quote_assign_log` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `fromUserId` int DEFAULT NULL COMMENT '分配前處理人ID',
  `fromUserName` varchar(100) DEFAULT NULL COMMENT '分配前處理人名稱',
  `toUserId` int DEFAULT NULL COMMENT '分配後處理人ID',
  `toUserName` varchar(100) DEFAULT NULL COMMENT '分配後處理人名稱',
  `departmentId` int DEFAULT NULL COMMENT '部門ID',
  `remark` varchar(500) DEFAULT NULL COMMENT '備註',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_assign_log_quoteId` (`quoteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單分配日誌表';

-- 12. 合約回傳記錄
CREATE TABLE IF NOT EXISTS `crm_quote_contract` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `fileId` varchar(100) NOT NULL COMMENT '檔案ID',
  `fileName` varchar(255) DEFAULT NULL COMMENT '檔名',
  `uploadUserId` int DEFAULT NULL COMMENT '上傳人ID',
  `uploadUserName` varchar(100) DEFAULT NULL COMMENT '上傳人名稱',
  `uploadTime` varchar(19) DEFAULT NULL COMMENT '上傳時間',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_quote_contract_quoteId` (`quoteId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM報價單合約回傳表';

-- 13. 發票主表
CREATE TABLE IF NOT EXISTS `crm_invoice_order` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `quoteStageId` int DEFAULT NULL COMMENT '報價階段ID',
  `invoiceNo` varchar(50) NOT NULL COMMENT '發票編號',
  `invoiceTitle` varchar(200) DEFAULT NULL COMMENT '發票抬頭',
  `invoiceContent` varchar(255) DEFAULT NULL COMMENT '發票內容',
  `invoiceAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '發票金額',
  `invoiceProductName` varchar(255) DEFAULT NULL COMMENT '開票產品名稱',
  `customerId` int NOT NULL COMMENT '客戶ID',
  `customerEmail` varchar(120) DEFAULT NULL COMMENT '客戶郵箱',
  `salesmanId` int DEFAULT NULL COMMENT '業務員ID',
  `applyUserId` int DEFAULT NULL COMMENT '申請人ID',
  `applyUserName` varchar(100) DEFAULT NULL COMMENT '申請人名稱',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-待申請 2-待審核 3-審核通過 4-審核拒絕 5-已發送 6-作廢申請中 7-已作廢',
  `auditRemark` varchar(500) DEFAULT NULL COMMENT '審核備註',
  `auditUserId` int DEFAULT NULL COMMENT '審核人ID',
  `auditUserName` varchar(100) DEFAULT NULL COMMENT '審核人名稱',
  `auditTime` varchar(19) DEFAULT NULL COMMENT '審核時間',
  `scheduledSendDate` varchar(19) DEFAULT NULL COMMENT '計劃發送時間',
  `advanceAuditDaysSnapshot` int NOT NULL DEFAULT 3 COMMENT '提前送審天數快照',
  `sendTime` varchar(19) DEFAULT NULL COMMENT '實際發送時間',
  `isVoid` tinyint NOT NULL DEFAULT 0 COMMENT '是否作廢 0-否 1-是',
  `voidStatus` tinyint NOT NULL DEFAULT 0 COMMENT '作廢狀態 0-無 1-申請中 2-已作廢 3-拒絕',
  `voidReason` varchar(500) DEFAULT NULL COMMENT '作廢原因',
  `voidAuditRemark` varchar(500) DEFAULT NULL COMMENT '作廢審核備註',
  `attachmentFileId` varchar(100) DEFAULT NULL COMMENT '附件檔案ID',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_invoice_order_invoiceNo` (`invoiceNo`),
  KEY `idx_crm_invoice_order_quote_status` (`quoteId`, `status`),
  KEY `idx_crm_invoice_order_stage_status` (`quoteStageId`, `status`),
  KEY `idx_crm_invoice_order_senddate_status` (`scheduledSendDate`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM發票主表';

-- 14. 供應商付款單主表（對應前端“匯款單”）
CREATE TABLE IF NOT EXISTS `crm_payment_order` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `paymentNo` varchar(50) NOT NULL COMMENT '付款單編號',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `quoteNameSnapshot` varchar(200) DEFAULT NULL COMMENT '報價單名稱快照',
  `supplierId` int NOT NULL COMMENT '供應商ID',
  `supplierNameSnapshot` varchar(200) DEFAULT NULL COMMENT '供應商名稱快照',
  `supplierTaxNumberSnapshot` varchar(50) DEFAULT NULL COMMENT '供應商統一編號快照',
  `supplierAddressSnapshot` varchar(300) DEFAULT NULL COMMENT '供應商地址快照',
  `salesmanId` int DEFAULT NULL COMMENT '業務員ID',
  `salesmanName` varchar(100) DEFAULT NULL COMMENT '業務員名稱',
  `currentDeptId` int DEFAULT NULL COMMENT '當前部門ID',
  `currentAssigneeId` int DEFAULT NULL COMMENT '當前處理人ID',
  `paymentType` tinyint NOT NULL DEFAULT 1 COMMENT '匯款型別',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-未完成 2-已完成',
  `totalAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '總金額',
  `completedAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '已完成金額',
  `currentStageNo` int DEFAULT NULL COMMENT '當前階段號',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_payment_order_paymentNo` (`paymentNo`),
  KEY `idx_crm_payment_order_quote_status` (`quoteId`, `status`),
  KEY `idx_crm_payment_order_assignee_status` (`currentAssigneeId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM供應商付款單主表';

-- 15. 供應商付款階段
CREATE TABLE IF NOT EXISTS `crm_payment_stage` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `paymentOrderId` int NOT NULL COMMENT '付款單ID',
  `stageNo` int NOT NULL COMMENT '階段號',
  `stageName` varchar(100) NOT NULL COMMENT '階段名稱',
  `ratio` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '階段比例',
  `amount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '階段金額',
  `plannedPayTime` varchar(19) DEFAULT NULL COMMENT '計劃匯款時間',
  `actualPaidAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '實際已付款金額',
  `actualPaidTime` varchar(19) DEFAULT NULL COMMENT '實際已付款時間',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-未付款 2-部分付款 3-已完成',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `sortNum` int NOT NULL DEFAULT 1 COMMENT '排序',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_payment_stage_order_status` (`paymentOrderId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM供應商付款階段表';

-- 16. 供應商付款記錄
CREATE TABLE IF NOT EXISTS `crm_payment_record` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `paymentOrderId` int NOT NULL COMMENT '付款單ID',
  `paymentStageId` int NOT NULL COMMENT '付款階段ID',
  `payAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '付款金額',
  `payTime` varchar(19) DEFAULT NULL COMMENT '付款時間',
  `proofFileId` varchar(100) DEFAULT NULL COMMENT '付款憑證檔案ID',
  `operatorId` int DEFAULT NULL COMMENT '操作人ID',
  `operatorName` varchar(100) DEFAULT NULL COMMENT '操作人名稱',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_payment_record_order_stage` (`paymentOrderId`, `paymentStageId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM供應商付款記錄表';

-- 17. 客戶回款記錄
CREATE TABLE IF NOT EXISTS `crm_receipt_record` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `quoteStageId` int NOT NULL COMMENT '報價階段ID',
  `receiptAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '回款金額',
  `receiptTime` varchar(19) DEFAULT NULL COMMENT '回款時間',
  `proofFileId` varchar(100) DEFAULT NULL COMMENT '回款憑證檔案ID',
  `operatorId` int DEFAULT NULL COMMENT '操作人ID',
  `operatorName` varchar(100) DEFAULT NULL COMMENT '操作人名稱',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_receipt_record_quote_stage` (`quoteId`, `quoteStageId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM客戶回款記錄表';

-- 17.1 業務配置主表
CREATE TABLE IF NOT EXISTS `crm_business_config` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `configKey` varchar(100) NOT NULL COMMENT '配置鍵',
  `configName` varchar(100) NOT NULL COMMENT '配置名稱',
  `configValue` text COMMENT '配置值',
  `valueType` tinyint NOT NULL DEFAULT 1 COMMENT '值型別 1-字串 2-數字 3-布林 4-JSON',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 0-停用 1-啟用',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_business_config_key` (`configKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM業務配置表';

-- 18. 成本核算主表
CREATE TABLE IF NOT EXISTS `crm_cost_order` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `quoteNo` varchar(50) DEFAULT NULL COMMENT '報價單編號',
  `quoteName` varchar(200) DEFAULT NULL COMMENT '報價單名稱',
  `salesmanId` int DEFAULT NULL COMMENT '業務員ID',
  `salesmanName` varchar(100) DEFAULT NULL COMMENT '業務員名稱',
  `departmentId` int DEFAULT NULL COMMENT '處理部門ID',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-待核算 2-核算中 3-已提交 4-已複核 5-已完成',
  `totalPresetCost` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '總預設成本',
  `totalActualCost` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '總實際成本',
  `totalGrossProfit` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '總毛利',
  `totalGrossProfitRate` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '總毛利率',
  `submitUserId` int DEFAULT NULL COMMENT '提交人ID',
  `submitTime` varchar(19) DEFAULT NULL COMMENT '提交時間',
  `reviewUserId` int DEFAULT NULL COMMENT '複核人ID',
  `reviewTime` varchar(19) DEFAULT NULL COMMENT '複核時間',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_cost_order_quoteId` (`quoteId`),
  KEY `idx_crm_cost_order_department_status` (`departmentId`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM成本核算主表';

-- 19. 成本核算明細
CREATE TABLE IF NOT EXISTS `crm_cost_item` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `costOrderId` int NOT NULL COMMENT '成本核算單ID',
  `quoteItemId` int DEFAULT NULL COMMENT '報價單明細ID',
  `productType` tinyint NOT NULL DEFAULT 1 COMMENT '產品型別 1-主力產品 2-一次性產品 3-附加產品',
  `productNameSnapshot` varchar(200) DEFAULT NULL COMMENT '產品名稱快照',
  `specNameSnapshot` varchar(200) DEFAULT NULL COMMENT '規格名稱快照',
  `departmentIdSnapshot` int DEFAULT NULL COMMENT '負責部門快照',
  `presetCost` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '預設成本',
  `actualCost` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '實際成本',
  `quantity` int NOT NULL DEFAULT 1 COMMENT '數量',
  `subtotalAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '小計金額',
  `fillTime` varchar(19) DEFAULT NULL COMMENT '填寫時間',
  `operatorId` int DEFAULT NULL COMMENT '填寫人ID',
  `operatorName` varchar(100) DEFAULT NULL COMMENT '填寫人名稱',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_cost_item_orderId` (`costOrderId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM成本核算明細表';

-- 20. 月度業績彙總
CREATE TABLE IF NOT EXISTS `crm_performance_monthly` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `yearMonth` varchar(7) NOT NULL COMMENT '年月 YYYY-MM',
  `userId` int NOT NULL COMMENT '使用者ID',
  `userName` varchar(100) DEFAULT NULL COMMENT '使用者名稱稱',
  `roleCode` varchar(50) DEFAULT NULL COMMENT '角色編碼',
  `departmentId` int DEFAULT NULL COMMENT '部門ID',
  `departmentName` varchar(100) DEFAULT NULL COMMENT '部門名稱',
  `performanceType` tinyint NOT NULL DEFAULT 1 COMMENT '業績型別 1-業務員 2-內勤 3-主管 4-財務統計',
  `invoiceAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '當月開票金額',
  `receiptAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '當月回款金額',
  `estimatedBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '預計獎金',
  `actualBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '實際獎金',
  `extraBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '加碼獎金',
  `yearEndBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '年終獎',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-待確認 2-已確認 3-已完成',
  `generateTime` varchar(19) DEFAULT NULL COMMENT '生成時間',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_crm_performance_monthly_user_month_type` (`yearMonth`, `userId`, `performanceType`),
  KEY `idx_crm_performance_monthly_department_month` (`departmentId`, `yearMonth`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM月度業績彙總表';

-- 21. 月度業績明細
CREATE TABLE IF NOT EXISTS `crm_performance_detail` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `performanceMonthlyId` int NOT NULL COMMENT '月度業績彙總ID',
  `quoteId` int NOT NULL COMMENT '報價單ID',
  `quoteStageId` int DEFAULT NULL COMMENT '報價階段ID',
  `quoteType` tinyint NOT NULL DEFAULT 1 COMMENT '專案性質 1-新客 2-續約',
  `quoteAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '報價金額',
  `invoiceAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '開票金額',
  `receiptAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '回款金額',
  `mainProductRatio` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '主力產品比例',
  `subProductRatio` decimal(8,4) NOT NULL DEFAULT 0.0000 COMMENT '副位產品比例',
  `estimatedBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '預計獎金',
  `actualBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '實際獎金',
  `extraBonusAmount` decimal(12,2) NOT NULL DEFAULT 0.00 COMMENT '加碼獎金',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 1-待確認 2-已確認 3-已完成',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_performance_detail_monthly` (`performanceMonthlyId`),
  KEY `idx_crm_performance_detail_quote_stage` (`quoteId`, `quoteStageId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM月度業績明細表';

-- 22. 獎金規則主表
CREATE TABLE IF NOT EXISTS `crm_bonus_rule` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `ruleType` tinyint NOT NULL COMMENT '規則型別 1-業務員 2-內勤 3-主管 4-年終獎',
  `departmentType` tinyint DEFAULT NULL COMMENT '部門型別 1-整合 2-口碑',
  `levelCode` varchar(50) DEFAULT NULL COMMENT '等級編碼',
  `ruleName` varchar(100) NOT NULL COMMENT '規則名稱',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 0-停用 1-啟用',
  `remark` varchar(255) DEFAULT NULL COMMENT '備註',
  `isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_bonus_rule_type_department_level` (`ruleType`, `departmentType`, `levelCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM獎金規則主表';

-- 23. 獎金規則區間表
CREATE TABLE IF NOT EXISTS `crm_bonus_rule_item` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'ID',
  `ruleId` int NOT NULL COMMENT '規則主表ID',
  `minAmount` decimal(12,2) DEFAULT NULL COMMENT '最小金額',
  `maxAmount` decimal(12,2) DEFAULT NULL COMMENT '最大金額',
  `ratio` decimal(8,4) DEFAULT NULL COMMENT '比例',
  `fixedAmount` decimal(12,2) DEFAULT NULL COMMENT '固定獎金',
  `renewalRatio` decimal(8,4) DEFAULT NULL COMMENT '續約比例',
  `extraConditionJson` json DEFAULT NULL COMMENT '擴充套件條件JSON',
  `sortNum` int NOT NULL DEFAULT 1 COMMENT '排序',
  `status` tinyint NOT NULL DEFAULT 1 COMMENT '狀態 0-停用 1-啟用',
  `createTime` varchar(19) NOT NULL COMMENT '建立時間',
  `updateTime` varchar(19) NOT NULL COMMENT '更新時間',
  `tenantId` int DEFAULT NULL COMMENT '租戶ID',
  PRIMARY KEY (`id`),
  KEY `idx_crm_bonus_rule_item_ruleId` (`ruleId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='CRM獎金規則區間表';

-- =========================================================
-- 三、初始化配置與字典建議
-- =========================================================

-- 建議初始化業務配置：
-- invoiceAdvanceAuditDays = 3
-- specialDiscountMaxRate = 0.1500

INSERT INTO `crm_business_config`
(`configKey`, `configName`, `configValue`, `valueType`, `remark`, `status`, `createTime`, `updateTime`, `tenantId`)
VALUES
('invoiceAdvanceAuditDays', '發票提前送審天數', '3', 2, '預設提前3天送財務審核', 1, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), NULL),
('specialDiscountMaxRate', '特殊優惠上限', '0.1500', 2, '業務員特殊優惠最高15%', 1, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'), NULL)
ON DUPLICATE KEY UPDATE
`configName` = VALUES(`configName`),
`configValue` = VALUES(`configValue`),
`valueType` = VALUES(`valueType`),
`remark` = VALUES(`remark`),
`status` = VALUES(`status`),
`updateTime` = VALUES(`updateTime`);

-- 以下字典型別建議在 dict 模組中補充：
-- crmIndustry            客戶行業
-- crmSupplierCategory    供應商分類
-- crmQuoteType           報價單性質
-- crmFollowType          跟進型別
-- crmPaymentType         匯款型別
-- crmUserLevel           使用者等級

-- =========================================================
-- 四、說明
-- =========================================================

-- 1. 本 SQL 為初稿，優先服務後端設計與模組拆分，不代表最終生產版遷移指令碼。
-- 2. 若當前庫中已有部分欄位或表，執行前需要按實際環境調整 ALTER / CREATE 語句。
-- 3. 推薦後續再拆分為：
--    3.1 基礎表遷移指令碼
--    3.2 報價單模組指令碼
--    3.3 發票與回款指令碼
--    3.4 匯款與成本指令碼
--    3.5 業績與獎金指令碼
-- 4. 第一版已按總需求檔案對齊：
--    4.1 報價單採用主狀態 + 子狀態
--    4.2 匯款單按供應商付款建模，客戶回款獨立建模
--    4.3 發票預設提前3天送審，配置化
--    4.4 一次性付款商品預設歸入第一付款階段
--    4.5 獎金第一期只覆蓋月度獎金閉環
