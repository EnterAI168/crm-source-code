<template>
	<cl-crud ref="Crud">
		<cl-row>
			<el-form class="user-search-form" :model="searchForm" inline>
				<el-form-item label="使用者姓名">
					<el-input
						v-model="searchForm.name"
						class="user-search-form__field"
						clearable
						placeholder="請輸入使用者姓名"
						@keyup.enter="onSearch"
					/>
				</el-form-item>

				<el-form-item label="英文名稱">
					<el-input
						v-model="searchForm.englishName"
						class="user-search-form__field"
						clearable
						placeholder="請輸入英文名稱"
						@keyup.enter="onSearch"
					/>
				</el-form-item>

				<el-form-item label="部門">
					<el-tree-select
						v-model="searchForm.departmentId"
						class="user-search-form__field"
						node-key="id"
						clearable
						filterable
						check-strictly
						default-expand-all
						:data="departmentTree"
						:props="{
							label: 'name',
							value: 'id',
							children: 'children'
						}"
					/>
				</el-form-item>

				<el-form-item label="手機號">
					<el-input
						v-model="searchForm.phone"
						class="user-search-form__field"
						clearable
						placeholder="請輸入手機號"
						@keyup.enter="onSearch"
					/>
				</el-form-item>

				<el-form-item label="郵箱">
					<el-input
						v-model="searchForm.email"
						class="user-search-form__field"
						clearable
						placeholder="請輸入郵箱"
						@keyup.enter="onSearch"
					/>
				</el-form-item>

				<el-form-item class="user-search-form__actions">
					<el-button type="primary" @click="onSearch">搜尋</el-button>
					<el-button @click="onResetSearch">重置</el-button>
				</el-form-item>
			</el-form>
		</cl-row>

		<cl-row>
			<cl-refresh-btn />
			<cl-add-btn />
			<cl-multi-delete-btn />
		</cl-row>

		<cl-row>
			<cl-table ref="Table" />
		</cl-row>

		<cl-row>
			<cl-flex1 />
			<cl-pagination />
		</cl-row>

		<el-dialog
			v-model="resetPasswordVisible"
			title="重置密碼"
			width="420px"
			destroy-on-close
			:close-on-click-modal="false"
		>
			<el-form ref="ResetPasswordFormRef" :model="resetPasswordForm" :rules="resetPasswordRules" label-width="96px">
				<el-form-item label="密碼" prop="password">
					<el-input
						v-model="resetPasswordForm.password"
						show-password
						placeholder="請輸入密碼"
						@keyup.enter="handleResetPassword"
					/>
				</el-form-item>

				<el-form-item label="確認密碼" prop="confirmPassword">
					<el-input
						v-model="resetPasswordForm.confirmPassword"
						show-password
						placeholder="請再次輸入密碼"
						@keyup.enter="handleResetPassword"
					/>
				</el-form-item>
			</el-form>

			<template #footer>
				<div class="reset-password-dialog__footer">
					<el-button @click="closeResetPasswordDialog">取消</el-button>
					<el-button type="primary" :loading="resetPasswordLoading" @click="handleResetPassword">
						確認
					</el-button>
				</div>
			</template>
		</el-dialog>

		<cl-upsert ref="Upsert">
			<template #slot-login-phone>
				<div class="user-login-phone-field">
					<el-input
						:model-value="loginPhoneDisplayValue"
						clearable
						:disabled="isUpsertReadonly"
						placeholder="請輸入手機號"
						@input="onLoginPhoneInput"
					/>
					<div class="user-login-phone-tip">預設手機號為員工登入賬號</div>
				</div>
			</template>

			<template #slot-department>
				<cl-dept-select
					:model-value="currentDepartmentId"
					:check-strictly="true"
					@update:model-value="onDepartmentSelect"
					@change="onDepartmentSelect"
				/>
			</template>

			<template #slot-role>
				<el-select
					:model-value="currentRoleId"
					clearable
					filterable
					:disabled="isUpsertReadonly || roleSelectDisabled"
					placeholder="請選擇"
					@change="onRoleSelect"
				>
					<el-option
						v-for="item in roleOptions"
						:key="item.value"
						:label="item.label"
						:value="item.value"
					/>
				</el-select>
			</template>

			<template #slot-level>
				<el-select
					:model-value="currentLevelValue"
					clearable
					:disabled="isUpsertReadonly || levelSelectDisabled"
					placeholder="請選擇"
					@change="onLevelSelect"
				>
					<el-option
						v-for="item in levelOptions"
						:key="item.value"
						:label="item.label"
						:value="item.value"
					/>
				</el-select>
			</template>

			<template #slot-withholding-salary>
				<el-input :model-value="currentWithholdingSalary" disabled />
			</template>
		</cl-upsert>
	</cl-crud>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'sys-user'
});

import { useTable, useUpsert, useCrud } from '@cool-vue/crud';
import { useCool } from '/@/cool';
import { BaseService } from '/@/cool/service/base';
import { Plugins } from '/#/crud';
import { checkPerm } from '../../utils/permission';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { computed, h, onMounted, ref } from 'vue';
import { deepTree } from '/@/cool/utils';

const { service } = useCool();

const roles = ref<Eps.BaseSysRoleEntity[]>([]);
const departments = ref<Eps.BaseSysDepartmentEntity[]>([]);
const departmentTree = ref<any[]>([]);
const searchForm = ref(createSearchForm());
const loginPhoneValue = ref('');
const roleOptions = ref<{ label: string; value: number }[]>([]);
const roleSelectDisabled = ref(false);
const levelOptions = ref<{ label: string; value: string }[]>([]);
const levelSelectDisabled = ref(false);
const showLevel = ref(false);
const employeeWithholdingRate = ref(0);
const resetPasswordVisible = ref(false);
const resetPasswordLoading = ref(false);
const resetPasswordUserId = ref<number>();
const ResetPasswordFormRef = ref<FormInstance>();
const resetPasswordForm = ref({
	password: '',
	confirmPassword: ''
});

const resetPasswordRules: FormRules = {
	password: [
		{ required: true, message: '請輸入密碼', trigger: 'blur' },
		{ min: 6, max: 16, message: '密碼長度在 6 到 16 個字元', trigger: 'blur' }
	],
	confirmPassword: [
		{ required: true, message: '請再次輸入密碼', trigger: 'blur' },
		{
			trigger: 'blur',
			validator: (_rule, value, callback) => {
				if (!value) {
					callback(new Error('請再次輸入密碼'));
					return;
				}

				if (value !== resetPasswordForm.value.password) {
					callback(new Error('兩次輸入的密碼不一致'));
					return;
				}

				callback();
			}
		}
	]
};

let roleLoading: Promise<void> | null = null;
let departmentLoading: Promise<void> | null = null;
let withholdingRateLoading: Promise<void> | null = null;

const INTERNAL_ROLE_LABEL = 'office_clerk';
const INTERNAL_MANAGER_ROLE_LABEL = 'office_clerk_manager';
const SALESMAN_ROLE_LABEL = 'salesperson';
const FINANCE_ROLE_LABEL = 'finance';

const CRM_ROOT_NAME = 'CRM';
const OFFICE_DEPARTMENT_NAME = '內勤部門';
const SALES_DEPARTMENT_NAME = '業務部門';
const FINANCE_DEPARTMENT_NAME = '財務部門';

const LEVEL_MANAGER = '主管';
const LEVEL_SENIOR = '資深同仁';
const LEVEL_NORMAL = '一般同仁';

function createSearchForm() {
	return {
		name: '',
		englishName: '',
		departmentId: undefined as number | undefined,
		phone: '',
		email: ''
	};
}

const isUpsertReadonly = computed(() => Upsert.value?.mode === 'info');
const currentDepartmentId = computed(() => Upsert.value?.getForm('departmentId'));
const currentRoleId = computed(() => normalizeSingleRoleId(Upsert.value?.getForm('roleIdList')));
const currentLevelValue = computed(() => Upsert.value?.getForm('level'));
const currentWithholdingSalary = computed(() => {
	const storedValue = Upsert.value?.getForm('withholdingSalary');
	const salary = Upsert.value?.getForm('salary');
	if (salary !== undefined && salary !== null && salary !== '') {
		return toMoney(calcWithholdingSalary(salary));
	}
	return toMoney(storedValue);
});
const loginPhoneDisplayValue = computed(
	() => loginPhoneValue.value || Upsert.value?.getForm('phone') || Upsert.value?.getForm('username') || ''
);

const Crud = useCrud({
	service: service.base.sys.user,
	async onDelete(selection, { next }) {
		const ids = selection
			.map((item: any) => Number(item?.id || 0))
			.filter((id: number) => Number.isFinite(id) && id > 0);

		if (!ids.length) {
			return;
		}

		try {
			const result = await service.base.sys.user.request({
				url: '/deleteCheck',
				method: 'POST',
				data: { ids }
			});

			const blockedUsers = (Array.isArray(result) ? result : []).filter(
				(item: any) => Number(item?.customerCount || 0) > 0
			);

			if (blockedUsers.length > 0) {
				const names = blockedUsers
					.map((item: any) => item?.userName || `ID:${item?.userId || ''}`)
					.join('、');
				ElMessage.warning(`請先將 ${names} 的客戶轉移到客戶公池後再刪除`);
				return;
			}

			next({ ids });
		} catch (error: any) {
			ElMessage.error(error?.message || '刪除前檢查失敗');
		}
	}
});

const canTransferCustomersToPool = computed(() => {
	const perms = service.base.sys.user?._permission || {};
	return !!(perms.update || perms.page);
});
const canResetPassword = computed(() => checkPerm('base:sys:user:resetPassword'));

const Table = useTable({
	columns: [
		{ type: 'selection', width: 60 },
		{
			label: '使用者資訊',
			prop: 'name',
			minWidth: 260,
			render: (row: any) =>
				h('div', { class: 'user-info-cell' }, [
					h('div', { class: 'user-info-cell__name' }, row?.name || '-'),
					h('div', { class: 'user-info-cell__meta' }, `英文名稱：${row?.englishName || '-'}`),
					h('div', { class: 'user-info-cell__meta' }, `郵箱：${row?.email || '-'}`),
					h(
						'div',
						{ class: 'user-info-cell__meta' },
						`手機號：${row?.phone || row?.username || '-'}`
					)
				])
		},
		{ prop: 'departmentName', label: '所屬部門', minWidth: 160, showOverflowTooltip: true },
		{ prop: 'status', label: '狀態', width: 110, component: { name: 'cl-switch' } },
		{
			prop: 'level',
			label: '級別',
			minWidth: 140,
			showOverflowTooltip: true,
			formatter: (row: any) => row?.level || '--'
		},
		{ prop: 'salary', label: '月工資', width: 140 },
		{ prop: 'withholdingSalary', label: '扣繳工資', width: 140 },
		{
			type: 'op',
			width: 320,
			buttons: ({ scope }: any) => [
				'info',
				'edit',
				{
					label: '轉公池',
					type: 'warning',
					hidden: !canShowTransferCustomersButton(scope.row),
					onClick() {
						handleTransferCustomersToPool(scope.row);
					}
				},
				{
					label: '重置密碼',
					type: 'primary',
					hidden: !canResetPassword.value,
					onClick() {
						openResetPasswordDialog(scope.row);
					}
				},
				'delete'
			]
		}
	]
});

const Upsert = useUpsert({
	dialog: { width: '800px' },
	items: [
		{
			prop: 'headImg',
			label: '頭像',
			component: {
				name: 'cl-upload',
				props: { text: '選擇頭像' }
			}
		},
		{
			prop: 'name',
			label: '員工名稱',
			span: 12,
			required: true,
			component: { name: 'el-input' }
		},
		{
			prop: 'englishName',
			label: '英文名稱',
			span: 12,
			required: true,
			rules: [{ required: true, message: '請輸入英文名稱', trigger: 'blur' }],
			component: { name: 'el-input' }
		},
		{
			prop: 'username',
			label: '手機號',
			span: 12,
			rules: [{ required: true, message: '請輸入手機號', trigger: 'blur' }],
			component: { name: 'slot-login-phone' }
		},
		() => ({
			prop: 'password',
			label: '密碼',
			span: 12,
			required: Upsert.value?.mode === 'add',
			hidden: Upsert.value?.mode !== 'add',
			component: {
				name: 'el-input',
				props: {
					type: 'password',
					showPassword: true,
					autocomplete: 'new-password'
				}
			},
			rules: [
				{
					min: 6,
					max: 16,
					message: '密碼長度在 6 到 16 個字元'
				}
			]
		}),
		{
			prop: 'departmentId',
			label: '部門',
			span: 12,
			required: true,
			component: { name: 'slot-department' }
		},
		{
			prop: 'roleIdList',
			label: '角色',
			span: 12,
			required: true,
			component: { name: 'slot-role' }
		},
		{
			prop: 'salary',
			label: '工資',
			span: 12,
			component: {
				name: 'el-input',
				props: {
					type: 'number',
					min: 0,
					step: '0.01',
					style: { width: '100%' }
				}
			}
		},
		{
			prop: 'withholdingSalary',
			label: '扣繳工資',
			span: 12,
			component: { name: 'slot-withholding-salary' }
		},
		{
			prop: 'level',
			label: '員工等級',
			span: 12,
			hidden: () => !showLevel.value,
			component: { name: 'slot-level' }
		},
		{
			prop: 'email',
			label: '郵箱',
			span: 12,
			component: { name: 'el-input' }
		},
		{
			prop: 'remark',
			label: '備註',
			component: {
				name: 'el-input',
				props: { type: 'textarea', rows: 4 }
			}
		},
		{
			prop: 'status',
			label: '狀態',
			value: 1,
			component: {
				name: 'el-radio-group',
				options: [
					{ label: '啟用', value: 1 },
					{ label: '停用', value: 0 }
				]
			}
		}
	],
	onSubmit(data, { next }) {
		const phone = String(loginPhoneValue.value || data.username || '').trim();
		const departmentId = Number(data.departmentId || 0);
		const roleId = currentRoleId.value;
		const selectedRole = getRoleById(roleId);

		if (!phone) return ElMessage.warning('請輸入手機號');
		if (!departmentId) return ElMessage.warning('請選擇部門');
		if (!roleId || !selectedRole) return ElMessage.warning('請選擇角色');
		if (isOfficeRole(selectedRole) && ![LEVEL_SENIOR, LEVEL_NORMAL].includes(String(data.level || '').trim())) {
			return ElMessage.warning('請選擇員工等級');
		}

		next({
			...data,
			name: String(data.name || '').trim(),
			nickName: String(data.name || '').trim(),
			username: phone,
			phone,
			level: isOfficeManagerRole(selectedRole)
				? LEVEL_MANAGER
				: isOfficeRole(selectedRole)
					? data.level
					: undefined,
			roleIdList: [roleId]
		});
	},
	async onOpen() {
		await Promise.all([ensureRolesLoaded(), ensureDepartmentsLoaded(), ensureWithholdingRateLoaded()]);
		loginPhoneValue.value = '';
		Upsert.value?.setForm('username', '');
		Upsert.value?.setForm('phone', '');
		Upsert.value?.setForm('departmentId', undefined);
		Upsert.value?.setForm('salary', undefined);
		Upsert.value?.setForm('withholdingSalary', 0);
		resetRoleState();
	},
	async onOpened(data) {
		await Promise.all([ensureRolesLoaded(), ensureDepartmentsLoaded(), ensureWithholdingRateLoaded()]);
		let detail = data;
		if (data?.id) {
			detail = await service.base.sys.user.info({ id: data.id });
		}

		const roleId = normalizeSingleRoleId(detail?.roleIdList);
		const departmentId = Number(detail?.departmentId || 0) || undefined;
		const loginPhone = String(detail?.phone || detail?.username || '');

		loginPhoneValue.value = loginPhone;
		Upsert.value?.setForm('username', loginPhone);
		Upsert.value?.setForm('phone', loginPhone);
		Upsert.value?.setForm('departmentId', departmentId);
		Upsert.value?.setForm('salary', detail?.salary ?? undefined);
		Upsert.value?.setForm('withholdingSalary', detail?.withholdingSalary ?? calcWithholdingSalary(detail?.salary));
		applyDepartmentRoleRule(departmentId, roleId, detail?.level);
	},
	plugins: [Plugins.Form.setFocus('name')]
});

function normalizeSingleRoleId(value: any) {
	const roleId = Array.isArray(value) ? value[0] : value;
	const id = Number(roleId);
	return Number.isNaN(id) ? undefined : id;
}

function toMoney(value: any) {
	const num = Number(value ?? 0);
	return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function calcWithholdingSalary(salary: any) {
	const rawSalary = Number(salary || 0);
	if (!Number.isFinite(rawSalary) || rawSalary <= 0) {
		return 0;
	}
	const rate = Math.min(Math.max(Number(employeeWithholdingRate.value || 0), 0), 100);
	return Number((rawSalary - rawSalary * (rate / 100)).toFixed(2));
}

function toRoleOptions(list: any[]) {
	return list.map(e => ({ label: e.name || '', value: Number(e.id) }));
}

function getRoleById(roleId?: number) {
	return roles.value.find(e => Number(e.id) === Number(roleId));
}

function isOfficeRole(role?: any) {
	return role?.label === INTERNAL_ROLE_LABEL;
}

function isOfficeManagerRole(role?: any) {
	return role?.label === INTERNAL_MANAGER_ROLE_LABEL;
}

function isSalesRole(role?: any) {
	return role?.label === SALESMAN_ROLE_LABEL || String(role?.name || '').includes('業務');
}

function isFinanceRole(role?: any) {
	return (
		role?.label === FINANCE_ROLE_LABEL ||
		String(role?.label || '').toLowerCase().includes('finance') ||
		String(role?.name || '').includes('財務')
	);
}

function getOfficeRole() {
	return roles.value.find(isOfficeRole);
}

function getOfficeManagerRole() {
	return roles.value.find(isOfficeManagerRole);
}

function getSalesRole() {
	return roles.value.find(isSalesRole);
}

function getFinanceRole() {
	return roles.value.find(isFinanceRole);
}

function canShowTransferCustomersButton(row: any) {
	if (!canTransferCustomersToPool.value) return false;
	const roleName = String(row?.roleName || '');
	const departmentName = String(row?.departmentName || '');
	return roleName.includes('業務') || departmentName.includes('業務');
}

function resetResetPasswordForm() {
	resetPasswordForm.value.password = '';
	resetPasswordForm.value.confirmPassword = '';
	ResetPasswordFormRef.value?.clearValidate();
}

function closeResetPasswordDialog() {
	resetPasswordVisible.value = false;
	resetPasswordUserId.value = undefined;
	resetPasswordLoading.value = false;
	resetResetPasswordForm();
}

function openResetPasswordDialog(row: any) {
	const userId = Number(row?.id || 0);
	if (!userId) {
		ElMessage.warning('找不到使用者資料');
		return;
	}

	resetPasswordUserId.value = userId;
	resetPasswordVisible.value = true;
	resetResetPasswordForm();
}

async function handleResetPassword() {
	if (!resetPasswordUserId.value) {
		ElMessage.warning('找不到使用者資料');
		return;
	}

	try {
		const valid = await ResetPasswordFormRef.value?.validate();
		if (!valid) return;

		resetPasswordLoading.value = true;
		await service.base.sys.user.request({
			url: '/resetPassword',
			method: 'POST',
			data: {
				id: resetPasswordUserId.value,
				password: resetPasswordForm.value.password
			}
		});
		ElMessage.success('重置密碼成功');
		closeResetPasswordDialog();
	} catch (error: any) {
		if (error?.message) {
			ElMessage.error(error.message);
		}
	} finally {
		resetPasswordLoading.value = false;
	}
}

async function handleTransferCustomersToPool(row: any) {
	const userName = String(row?.name || row?.nickName || row?.username || '該使用者');
	try {
		await ElMessageBox.confirm(
			`確認將「${userName}」名下的客戶全部轉移到客戶公池嗎？轉移後可由老闆重新分配給其他業務員。`,
			'轉移客戶到公池',
			{
				type: 'warning',
				confirmButtonText: '確認',
				cancelButtonText: '取消'
			}
		);

		const result = await service.base.sys.user.request({
			url: '/transferCustomersToPool',
			method: 'POST',
			data: { userId: Number(row.id) }
		});

		const movedCount = Number(result?.movedCount || 0);
		ElMessage.success(
			movedCount > 0
				? `已成功轉移 ${movedCount} 筆客戶到公池`
				: '該業務目前沒有可轉移的客戶'
		);
	} catch (error: any) {
		if (error === 'cancel' || error === 'close' || error?.message === 'cancel') {
			return;
		}
		ElMessage.error(error?.message || '轉移客戶到公池失敗');
	}
}

function findDepartmentPath(id?: number, list: any[] = departmentTree.value, path: any[] = []): any[] {
	if (!id) return [];

	for (const item of list) {
		const nextPath = [...path, item];
		if (Number(item?.id) === Number(id)) {
			return nextPath;
		}

		const children = Array.isArray(item?.children) ? item.children : [];
		if (children.length > 0) {
			const childPath = findDepartmentPath(id, children, nextPath);
			if (childPath.length > 0) return childPath;
		}
	}

	return [];
}

function getDepartmentRule(departmentId?: number) {
	const path = findDepartmentPath(departmentId);
	const names = path.map(e => String(e?.name || ''));

	if (path.length === 1 && names[0] === CRM_ROOT_NAME) return 'crm-root';
	if (names.includes(OFFICE_DEPARTMENT_NAME)) return 'office';
	if (names.includes(SALES_DEPARTMENT_NAME)) return 'sales';
	if (names.includes(FINANCE_DEPARTMENT_NAME)) return 'finance';

	return 'other';
}

function getAllowedRolesByRule(rule: string) {
	switch (rule) {
		case 'office':
			return roles.value.filter(role => isOfficeRole(role) || isOfficeManagerRole(role));
		case 'sales': {
			const role = getSalesRole();
			return role ? [role] : [];
		}
		case 'finance': {
			const role = getFinanceRole();
			return role ? [role] : [];
		}
		default:
			return roles.value.slice();
	}
}

function updateLevelField(roleId?: number, currentLevel?: string) {
	const role = getRoleById(roleId);
	const normalizedCurrentLevel = String(currentLevel || '').trim();

	if (isOfficeManagerRole(role)) {
		showLevel.value = true;
		levelSelectDisabled.value = true;
		levelOptions.value = [{ label: LEVEL_MANAGER, value: LEVEL_MANAGER }];
		Upsert.value?.setForm('level', LEVEL_MANAGER);
		return;
	}

	if (isOfficeRole(role)) {
		showLevel.value = true;
		levelSelectDisabled.value = false;
		levelOptions.value = [
			{ label: LEVEL_SENIOR, value: LEVEL_SENIOR },
			{ label: LEVEL_NORMAL, value: LEVEL_NORMAL }
		];
		if ([LEVEL_SENIOR, LEVEL_NORMAL].includes(normalizedCurrentLevel)) {
			Upsert.value?.setForm('level', normalizedCurrentLevel);
		} else {
			Upsert.value?.setForm('level', undefined);
		}
		return;
	}

	showLevel.value = false;
	levelSelectDisabled.value = false;
	levelOptions.value = [];
	Upsert.value?.setForm('level', undefined);
}

function applyDepartmentRoleRule(departmentId?: number, currentRoleId?: number, currentLevel?: string) {
	const rule = getDepartmentRule(departmentId);
	const allowedRoles = getAllowedRolesByRule(rule);
	let nextRoleId = currentRoleId;

	roleOptions.value = toRoleOptions(allowedRoles);
	roleSelectDisabled.value = rule === 'sales' || rule === 'finance';

	if (rule === 'office' && !allowedRoles.some(e => Number(e.id) === Number(currentRoleId))) {
		nextRoleId = getOfficeRole()?.id || getOfficeManagerRole()?.id;
	}

	if (rule === 'sales') {
		nextRoleId = getSalesRole()?.id;
	}

	if (rule === 'finance') {
		nextRoleId = getFinanceRole()?.id;
	}

	if ((rule === 'crm-root' || rule === 'other') && currentRoleId && !allowedRoles.some(e => Number(e.id) === Number(currentRoleId))) {
		nextRoleId = undefined;
	}

	Upsert.value?.setForm('roleIdList', nextRoleId);
	updateLevelField(nextRoleId, currentLevel);
}

function resetRoleState() {
	roleOptions.value = toRoleOptions(roles.value);
	roleSelectDisabled.value = false;
	showLevel.value = false;
	levelSelectDisabled.value = false;
	levelOptions.value = [];
	Upsert.value?.setForm('roleIdList', undefined);
	Upsert.value?.setForm('level', undefined);
}

function onDepartmentSelect(value: any) {
	const departmentId = Number(Array.isArray(value) ? value[0] : value || 0) || undefined;
	Upsert.value?.setForm('departmentId', departmentId);
	applyDepartmentRoleRule(departmentId, currentRoleId.value, currentLevelValue.value);
}

function onRoleSelect(value: any) {
	const roleId = normalizeSingleRoleId(value);
	Upsert.value?.setForm('roleIdList', roleId);
	updateLevelField(roleId, currentLevelValue.value);
}

function onLevelSelect(value: string) {
	Upsert.value?.setForm('level', value);
}

function onLoginPhoneInput(value: string) {
	loginPhoneValue.value = value;
	Upsert.value?.setForm('username', value);
	Upsert.value?.setForm('phone', value);
}

function ensureRolesLoaded() {
	if (roles.value.length > 0) return Promise.resolve();
	if (roleLoading) return roleLoading;

	roleLoading = service.base.sys.role
		.list()
		.then(res => {
			roles.value = res || [];
			roleOptions.value = toRoleOptions(roles.value);
		})
		.finally(() => {
			roleLoading = null;
		});

	return roleLoading;
}

function ensureDepartmentsLoaded() {
	if (departments.value.length > 0) return Promise.resolve();
	if (departmentLoading) return departmentLoading;

	departmentLoading = service.base.sys.department
		.list()
		.then(res => {
			departments.value = res || [];
			departmentTree.value = deepTree(departments.value);
		})
		.finally(() => {
			departmentLoading = null;
		});

	return departmentLoading;
}

function ensureWithholdingRateLoaded() {
	if (withholdingRateLoading) return withholdingRateLoading;

	const paramService = new BaseService('admin/base/sys/param');
	withholdingRateLoading = paramService
		.request({
			url: '/data',
			method: 'GET',
			params: { key: 'employee_withholding_rate' }
		})
		.then(res => {
			const rate = Number(res || 0);
			employeeWithholdingRate.value = Number.isFinite(rate) ? Math.min(Math.max(rate, 0), 100) : 0;
		})
		.finally(() => {
			withholdingRateLoading = null;
		});

	return withholdingRateLoading;
}

function findDepartmentNode(id?: number, list: any[] = departmentTree.value): any {
	if (!id) return null;

	for (const item of list) {
		if (Number(item?.id) === Number(id)) return item;

		const children = Array.isArray(item?.children) ? item.children : [];
		if (children.length > 0) {
			const child = findDepartmentNode(id, children);
			if (child) return child;
		}
	}

	return null;
}

function collectDepartmentIds(list: any[] = []) {
	const ids: number[] = [];

	for (const item of list) {
		if (item?.id) ids.push(Number(item.id));
		const children = Array.isArray(item?.children) ? item.children : [];
		if (children.length > 0) ids.push(...collectDepartmentIds(children));
	}

	return ids;
}

function buildSearchParams() {
	const params: Record<string, any> = {
		name: undefined,
		englishName: undefined,
		phone: undefined,
		email: undefined,
		departmentIds: []
	};
	const name = searchForm.value.name?.trim();
	const englishName = searchForm.value.englishName?.trim();
	const phone = searchForm.value.phone?.trim();
	const email = searchForm.value.email?.trim();
	const departmentId = Number(searchForm.value.departmentId || 0);

	if (name) params.name = name;
	if (englishName) params.englishName = englishName;
	if (phone) params.phone = phone;
	if (email) params.email = email;

	if (departmentId > 0) {
		const node = findDepartmentNode(departmentId);
		params.departmentIds = node ? collectDepartmentIds([node]) : [departmentId];
	}

	return params;
}

function refresh(params?: any) {
	Crud.value?.refresh(params);
}

function onSearch() {
	refresh({ page: 1, ...buildSearchParams() });
}

function onResetSearch() {
	searchForm.value = createSearchForm();
	refresh({
		page: 1,
		name: undefined,
		englishName: undefined,
		phone: undefined,
		email: undefined,
		departmentIds: []
	});
}

onMounted(() => {
	setTimeout(() => {
		refresh({
			page: 1,
			...buildSearchParams()
		});
	}, 0);
});

ensureDepartmentsLoaded();
</script>

<style scoped>
.user-search-form {
	display: flex;
	flex-wrap: wrap;
	width: 100%;
	padding: 4px 0 8px;
}

.user-search-form :deep(.el-form-item) {
	margin-right: 12px;
	margin-bottom: 12px;
}

.user-search-form__field {
	width: 220px;
}

.user-search-form__actions {
	margin-right: 0;
}

.user-login-phone-field {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.user-login-phone-tip {
	font-size: 12px;
	line-height: 1.2;
	color: #909399;
}

:deep(.user-info-cell) {
	display: flex;
	flex-direction: column;
	gap: 4px;
	line-height: 1.4;
}

:deep(.user-info-cell__name) {
	font-weight: 600;
	color: #111827;
}

:deep(.user-info-cell__meta) {
	color: #6b7280;
	font-size: 12px;
}
</style>
