ALTER TABLE `crm_customer_followup`
  ADD COLUMN `quoteId` int NULL COMMENT '報價單ID' AFTER `customerId`;

CREATE INDEX `idx_crm_customer_followup_quote_salesman`
  ON `crm_customer_followup` (`quoteId`, `salesmanId`);
