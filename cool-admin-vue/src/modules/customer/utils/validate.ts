import type { FormItemRule } from 'element-plus';

/** 中国大陆手机号 11 位 */
export const CN_MOBILE_PATTERN = /^1[3-9]\d{9}$/;

/** 常用邮箱（与导入校验一致） */
export const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export const customerMobileRules: FormItemRule[] = [
	{ required: true, message: '请输入手机号', trigger: 'blur' },
	{
		pattern: CN_MOBILE_PATTERN,
		message: '请输入11位中国大陆手机号',
		trigger: 'blur'
	}
];

export const customerEmailRules: FormItemRule[] = [
	{ required: true, message: '请输入邮箱', trigger: 'blur' },
	{
		pattern: EMAIL_PATTERN,
		message: '请输入正确的邮箱格式',
		trigger: 'blur'
	}
];

/**
 * 导入行校验（Excel 行号从 2 开始为数据第一行）
 */
export function validateCustomerImportContact(
	mobile: string,
	email: string,
	excelRow: number
): string | null {
	const m = (mobile || '').trim();
	const e = (email || '').trim();
	if (!CN_MOBILE_PATTERN.test(m)) {
		return `第 ${excelRow} 行：手机号须为11位中国大陆号码`;
	}
	if (!EMAIL_PATTERN.test(e)) {
		return `第 ${excelRow} 行：邮箱格式不正确`;
	}
	return null;
}
