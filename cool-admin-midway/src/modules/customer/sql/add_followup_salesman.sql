-- 客戶跟進記錄增加業務員ID

ALTER TABLE `crm_customer_followup`
  ADD COLUMN `salesmanId` int NULL COMMENT '業務員ID' AFTER `customerId`;

CREATE INDEX `idx_crm_customer_followup_customer_salesman`
  ON `crm_customer_followup` (`customerId`, `salesmanId`);
