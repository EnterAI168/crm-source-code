CREATE TABLE `crm_quote_order_department_audit` (
	`id` int NOT NULL AUTO_INCREMENT,
	`createTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
	`updateTime` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
	`quoteOrderId` int NOT NULL COMMENT '報價單ID',
	`departmentId` int NOT NULL COMMENT '內勤部門ID',
	`auditStatus` tinyint NOT NULL DEFAULT 1 COMMENT '審核狀態 1-待審核 2-通過 3-拒絕',
	`auditUserId` int NULL COMMENT '審核人ID',
	`auditTime` varchar(20) NULL COMMENT '審核時間',
	`auditRemark` text NULL COMMENT '審核備註',
	`assignStatus` tinyint NOT NULL DEFAULT 0 COMMENT '分配狀態 0-未分配 1-待分配 2-已分配',
	`assigneeId` int NULL COMMENT '被分配內勤ID',
	`assignUserId` int NULL COMMENT '分配人ID',
	`assignTime` varchar(20) NULL COMMENT '分配時間',
	`assignRemark` text NULL COMMENT '分配備註',
	`costStatus` tinyint NOT NULL DEFAULT 0 COMMENT '成本填寫狀態 0-未填寫 1-已填寫',
	`costUserId` int NULL COMMENT '成本填寫人ID',
	`costTime` varchar(20) NULL COMMENT '成本填寫時間',
	`isDeleted` tinyint NOT NULL DEFAULT 0 COMMENT '邏輯刪除 0-否 1-是',
	PRIMARY KEY (`id`),
	KEY `IDX_quote_department_audit_order` (`quoteOrderId`),
	KEY `IDX_quote_department_audit_department` (`departmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='報價單部門審核';

ALTER TABLE `crm_quote_order_item`
	ADD COLUMN `departmentId` int NULL COMMENT '產品內勤部門ID' AFTER `productId`,
	ADD COLUMN `costStatus` tinyint NOT NULL DEFAULT 0 COMMENT '成本填寫狀態 0-未填寫 1-已填寫' AFTER `remark`,
	ADD COLUMN `costUserId` int NULL COMMENT '成本填寫人ID' AFTER `costStatus`,
	ADD COLUMN `costTime` varchar(20) NULL COMMENT '成本填寫時間' AFTER `costUserId`,
	ADD INDEX `IDX_quote_order_item_department` (`departmentId`);
