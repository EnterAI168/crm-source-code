SET @quote_no_length_sql := (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'crm_quote_order'
        AND column_name = 'quoteNo'
        AND character_maximum_length < 50
    ),
    'ALTER TABLE `crm_quote_order` MODIFY COLUMN `quoteNo` varchar(50) NOT NULL COMMENT ''報價單編號''',
    'SELECT 1'
  )
);

PREPARE quote_no_length_stmt FROM @quote_no_length_sql;
EXECUTE quote_no_length_stmt;
DEALLOCATE PREPARE quote_no_length_stmt;
