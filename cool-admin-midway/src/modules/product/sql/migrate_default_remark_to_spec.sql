-- 將產品級預設備註遷移到各規格的 remark（僅在規格 remark 為空時寫入）

UPDATE product_spec s
INNER JOIN product_info p ON p.id = s.productId
SET s.remark = p.defaultRemark,
    s.updateTime = NOW()
WHERE s.isDeleted = 0
  AND p.isDeleted = 0
  AND p.defaultRemark IS NOT NULL
  AND TRIM(p.defaultRemark) <> ''
  AND (s.remark IS NULL OR TRIM(s.remark) = '');
