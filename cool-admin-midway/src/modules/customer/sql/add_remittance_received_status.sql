SET @received_labor_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_remittance'
    AND column_name = 'receivedLaborInsurance'
);

SET @received_invoice_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_remittance'
    AND column_name = 'receivedInvoice'
);

SET @received_status_sql := IF(
  @received_labor_exists = 0 AND @received_invoice_exists = 0,
  'ALTER TABLE `crm_remittance`
     ADD COLUMN `receivedLaborInsurance` tinyint NOT NULL DEFAULT 0 COMMENT ''是否收到勞保單 0-否 1-是'' AFTER `invoiceFiles`,
     ADD COLUMN `receivedInvoice` tinyint NOT NULL DEFAULT 0 COMMENT ''是否收到發票 0-否 1-是'' AFTER `receivedLaborInsurance`',
  IF(
    @received_labor_exists = 0,
    'ALTER TABLE `crm_remittance`
       ADD COLUMN `receivedLaborInsurance` tinyint NOT NULL DEFAULT 0 COMMENT ''是否收到勞保單 0-否 1-是'' AFTER `invoiceFiles`',
    IF(
      @received_invoice_exists = 0,
      'ALTER TABLE `crm_remittance`
         ADD COLUMN `receivedInvoice` tinyint NOT NULL DEFAULT 0 COMMENT ''是否收到發票 0-否 1-是'' AFTER `receivedLaborInsurance`',
      'SELECT 1'
    )
  )
);

PREPARE received_status_stmt FROM @received_status_sql;
EXECUTE received_status_stmt;
DEALLOCATE PREPARE received_status_stmt;

UPDATE `crm_remittance`
SET `receivedLaborInsurance` = CASE
      WHEN `uploadFiles` IS NOT NULL AND TRIM(`uploadFiles`) <> '' AND TRIM(`uploadFiles`) <> '[]' THEN 1
      ELSE 0
    END,
    `receivedInvoice` = CASE
      WHEN `invoiceFiles` IS NOT NULL AND TRIM(`invoiceFiles`) <> '' AND TRIM(`invoiceFiles`) <> '[]' THEN 1
      ELSE 0
    END
WHERE 1 = 1;
