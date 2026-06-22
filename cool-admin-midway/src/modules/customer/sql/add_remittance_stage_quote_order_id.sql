ALTER TABLE `crm_remittance_stage`
ADD COLUMN `quoteOrderId` int NULL COMMENT '關聯報價單ID' AFTER `remittanceId`;

CREATE INDEX `IDX_crm_remittance_stage_quoteOrderId`
ON `crm_remittance_stage` (`quoteOrderId`);

UPDATE `crm_remittance_stage` s
INNER JOIN `crm_remittance` r ON r.id = s.remittanceId
SET s.quoteOrderId = r.quoteOrderId
WHERE s.quoteOrderId IS NULL;
