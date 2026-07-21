import type { FormItemRule } from 'element-plus';

/** 常用信箱（與匯入校驗一致） */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const customerEmailRules: FormItemRule[] = [
	{ required: true, message: '請輸入信箱', trigger: 'blur' },
	{
		pattern: EMAIL_PATTERN,
		message: '請輸入正確的信箱格式',
		trigger: 'blur'
	}
];

/**
 * 匯入行校驗（Excel 行號從 2 開始為資料第一行）
 */
export function validateCustomerImportContact(
	_mobile: string,
	email: string,
	excelRow: number
): string | null {
	const e = (email || '').trim();
	if (!EMAIL_PATTERN.test(e)) {
		return `第 ${excelRow} 行：信箱格式不正確`;
	}
	return null;
}

export function validateCustomerImportRequired(
	row: Record<string, any>,
	excelRow: number
): string | null {
	const requiredFields = [
		{ prop: 'companyName', label: '公司名稱' },
		{ prop: 'taxNumber', label: '統一編號' },
		{ prop: 'contactName', label: '聯絡人' },
		{ prop: 'email', label: '信箱' }
	];
	const missing = requiredFields
		.filter(item => String(row?.[item.prop] ?? '').trim() === '')
		.map(item => item.label);

	if (missing.length > 0) {
		return `第 ${excelRow} 行：請填寫${missing.join('、')}`;
	}

	return null;
}
