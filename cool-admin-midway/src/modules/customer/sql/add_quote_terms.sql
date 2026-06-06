SET @quote_terms_column_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'crm_quote_order'
    AND column_name = 'quoteTerms'
);

SET @quote_terms_column_sql := IF(
  @quote_terms_column_exists = 0,
  'ALTER TABLE `crm_quote_order` ADD COLUMN `quoteTerms` json NULL COMMENT ''報價單條款'' AFTER `priceRemark`',
  'SELECT 1'
);

PREPARE quote_terms_column_stmt FROM @quote_terms_column_sql;
EXECUTE quote_terms_column_stmt;
DEALLOCATE PREPARE quote_terms_column_stmt;
