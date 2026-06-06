<template>
	<div class="bonus-config-page">
		<div class="bonus-hero">
			<div>
				<div class="bonus-hero__eyebrow">業績考核配置</div>
				<h2>獎金配置</h2>
				<p>按檔案拆成業務、內勤兩套規則，支援維護抽成比例、級距獎金、年終門檻和付款折扣。</p>
			</div>
			<div class="bonus-hero__cards">
				<div class="bonus-stat">
					<span>業務規則</span>
					<strong>{{ salesCount }}</strong>
				</div>
				<div class="bonus-stat bonus-stat--green">
					<span>內勤規則</span>
					<strong>{{ internalCount }}</strong>
				</div>
			</div>
		</div>

		<el-collapse v-model="summaryActive" class="bonus-summary-collapse">
			<el-collapse-item name="summary">
				<template #title>
					<div class="bonus-collapse-title">
						<div>
							<span class="bonus-collapse-title__main">考核規則梳理</span>
							<span class="bonus-collapse-title__sub">點選展開檢視業務/內勤規則摘要</span>
						</div>
						<el-tag type="info" effect="plain">來自獎金規章</el-tag>
					</div>
				</template>
				<el-row :gutter="14">
					<el-col :xs="24" :md="12">
						<div class="bonus-summary">
							<div class="bonus-summary__title">業務同仁</div>
							<ul>
								<li>主力產品按發票未稅金額抽成，副位產品按產品毛利抽成。</li>
								<li>主力發票月業績超過 30 萬才計算標準獎金和級距獎金。</li>
								<li>一次付清、主力發票月業績超過 80 萬有額外加碼。</li>
								<li>年終/年中按月均業績與新案年度金額綜合判斷。</li>
							</ul>
						</div>
					</el-col>
					<el-col :xs="24" :md="12">
						<div class="bonus-summary bonus-summary--green">
							<div class="bonus-summary__title">內勤同仁</div>
							<ul>
								<li>口碑部門按主管、資深同仁、一般同仁配置不同抽成。</li>
								<li>同仁執案平均金額達到級距後發放固定級距獎勵。</li>
								<li>個人當月執案達 100 萬有特殊激勵獎金。</li>
								<li>年終獎金採用績效達標和續約率達標雙軌核發。</li>
							</ul>
						</div>
					</el-col>
				</el-row>
			</el-collapse-item>
		</el-collapse>

		<el-card shadow="never">
			<el-form :inline="true" :model="query" class="bonus-filter">
				<el-form-item label="適用物件">
					<el-select v-model="query.roleType" clearable placeholder="請選擇適用物件" style="width: 160px">
						<el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="規則分組">
					<el-select v-model="query.groupCode" clearable filterable placeholder="請選擇規則分組" style="width: 220px">
						<el-option v-for="item in groupOptions" :key="item.value" :label="item.label" :value="item.value" />
					</el-select>
				</el-form-item>
				<el-form-item label="配置名稱">
					<el-input v-model="query.configName" clearable placeholder="請輸入配置名稱" />
				</el-form-item>
				<el-form-item label="狀態">
					<el-select v-model="query.isEnabled" clearable placeholder="請選擇狀態" style="width: 140px">
						<el-option label="啟用" :value="1" />
						<el-option label="停用" :value="0" />
					</el-select>
				</el-form-item>
				<el-form-item>
					<el-button type="primary" @click="loadList">搜尋</el-button>
					<el-button @click="resetSearch">重置</el-button>
				</el-form-item>
			</el-form>

			<div class="bonus-toolbar">
				<el-button type="primary" :disabled="!canAdd" @click="openAdd">新增配置</el-button>
				<el-button :disabled="!canUpdate" @click="initDefault">補齊預設配置</el-button>
			</div>

			<el-table v-loading="loading" :data="rows" border size="small" class="bonus-table">
				<el-table-column type="index" label="序號" width="64" fixed="left" />
				<el-table-column label="適用物件" width="110">
					<template #default="{ row }">
						<el-tag :type="row.roleType === 'sales' ? 'warning' : 'success'" effect="plain">
							{{ getRoleLabel(row.roleType) }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="groupName" label="規則分組" min-width="170" show-overflow-tooltip />
				<el-table-column prop="configName" label="配置名稱" min-width="210" show-overflow-tooltip />
				<el-table-column prop="conditionText" label="條件說明" min-width="260" show-overflow-tooltip />
				<el-table-column prop="calcBase" label="計算基數" min-width="180" show-overflow-tooltip />
				<el-table-column label="配置值" width="150">
					<template #default="{ row }">
						<span class="bonus-value">{{ row.configValue || '--' }}</span>
						<span class="bonus-unit">{{ row.unit || '' }}</span>
					</template>
				</el-table-column>
				<el-table-column label="型別" width="100">
					<template #default="{ row }">{{ getTypeLabel(row.configType) }}</template>
				</el-table-column>
				<el-table-column label="狀態" width="90">
					<template #default="{ row }">
						<el-tag :type="Number(row.isEnabled) === 1 ? 'success' : 'info'">
							{{ Number(row.isEnabled) === 1 ? '啟用' : '停用' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column prop="remark" label="備註" min-width="220" show-overflow-tooltip />
				<el-table-column label="操作" width="150" fixed="right">
					<template #default="{ row }">
						<el-button type="primary" link :disabled="!canUpdate" @click="openEdit(row)">編輯</el-button>
						<el-button type="danger" link :disabled="!canDelete" @click="deleteRow(row)">刪除</el-button>
					</template>
				</el-table-column>
			</el-table>

			<div class="bonus-pagination">
				<el-pagination
					v-model:current-page="pagination.page"
					v-model:page-size="pagination.size"
					background
					layout="total, sizes, prev, pager, next, jumper"
					:page-sizes="[50, 100, 200, 500]"
					:total="pagination.total"
					@current-change="loadList"
					@size-change="loadList"
				/>
			</div>
		</el-card>

		<el-dialog v-model="formVisible" :title="form.id ? '編輯獎金配置' : '新增獎金配置'" width="760px">
			<el-form ref="FormRef" :model="form" :rules="rules" label-width="110px">
				<el-row :gutter="14">
					<el-col :span="12">
						<el-form-item label="適用物件" prop="roleType">
							<el-select v-model="form.roleType" placeholder="請選擇適用物件" style="width: 100%">
								<el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="配置型別" prop="configType">
							<el-select v-model="form.configType" placeholder="請選擇配置型別" style="width: 100%">
								<el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
							</el-select>
						</el-form-item>
					</el-col>
				</el-row>
				<el-row :gutter="14">
					<el-col :span="12">
						<el-form-item label="分組編碼" prop="groupCode">
							<el-input v-model="form.groupCode" placeholder="例如 sales_commission" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="分組名稱" prop="groupName">
							<el-input v-model="form.groupName" placeholder="請輸入分組名稱" />
						</el-form-item>
					</el-col>
				</el-row>
				<el-form-item label="配置編碼" prop="configCode">
					<el-input v-model="form.configCode" placeholder="請輸入唯一配置編碼" />
				</el-form-item>
				<el-form-item label="配置名稱" prop="configName">
					<el-input v-model="form.configName" placeholder="請輸入配置名稱" />
				</el-form-item>
				<el-row :gutter="14">
					<el-col :span="14">
						<el-form-item label="配置值" prop="configValue">
							<el-input v-model="form.configValue" placeholder="請輸入比例、金額或門檻值" />
						</el-form-item>
					</el-col>
					<el-col :span="10">
						<el-form-item label="單位">
							<el-input v-model="form.unit" placeholder="例如 %、元、元/月" />
						</el-form-item>
					</el-col>
				</el-row>
				<el-form-item label="計算基數">
					<el-input v-model="form.calcBase" placeholder="例如 發票未稅金額、產品毛利" />
				</el-form-item>
				<el-form-item label="條件說明">
					<el-input v-model="form.conditionText" type="textarea" :rows="3" placeholder="請輸入適用條件或口徑說明" />
				</el-form-item>
				<el-row :gutter="14">
					<el-col :span="12">
						<el-form-item label="排序">
							<el-input-number v-model="form.sortNum" :controls="false" style="width: 100%" />
						</el-form-item>
					</el-col>
					<el-col :span="12">
						<el-form-item label="狀態">
							<el-switch v-model="form.isEnabled" :active-value="1" :inactive-value="0" active-text="啟用" inactive-text="停用" />
						</el-form-item>
					</el-col>
				</el-row>
				<el-form-item label="備註">
					<el-input v-model="form.remark" type="textarea" :rows="2" placeholder="請輸入備註" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="formVisible = false">取消</el-button>
				<el-button type="primary" :loading="saving" @click="submitForm">儲存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { checkPerm } from '/$/base';
import BonusConfigService from '../service/bonus';

const bonusService = new BonusConfigService();

const roleOptions = [
	{ label: '業務', value: 'sales' },
	{ label: '內勤', value: 'internal' }
];

const typeOptions = [
	{ label: '比例', value: 'rate' },
	{ label: '金額', value: 'amount' },
	{ label: '門檻', value: 'threshold' },
	{ label: '文本', value: 'text' }
];

const query = reactive({
	roleType: '',
	groupCode: '',
	configName: '',
	isEnabled: undefined as number | undefined
});
const pagination = reactive({ page: 1, size: 200, total: 0 });
const rows = ref<any[]>([]);
const allRows = ref<any[]>([]);
const loading = ref(false);
const formVisible = ref(false);
const saving = ref(false);
const FormRef = ref<FormInstance>();
const summaryActive = ref<string[]>([]);

const form = reactive<any>({
	id: 0,
	roleType: 'sales',
	groupCode: '',
	groupName: '',
	configCode: '',
	configName: '',
	configType: 'rate',
	conditionText: '',
	calcBase: '',
	configValue: '',
	unit: '%',
	sortNum: 0,
	isEnabled: 1,
	remark: ''
});

const rules: FormRules = {
	roleType: [{ required: true, message: '請選擇適用物件', trigger: 'change' }],
	groupCode: [{ required: true, message: '請輸入分組編碼', trigger: 'blur' }],
	groupName: [{ required: true, message: '請輸入分組名稱', trigger: 'blur' }],
	configCode: [{ required: true, message: '請輸入配置編碼', trigger: 'blur' }],
	configName: [{ required: true, message: '請輸入配置名稱', trigger: 'blur' }],
	configType: [{ required: true, message: '請選擇配置型別', trigger: 'change' }],
	configValue: [{ required: true, message: '請輸入配置值', trigger: 'blur' }]
};

const canAdd = computed(() => checkPerm('crm:bonusConfig:add'));
const canUpdate = computed(() => checkPerm('crm:bonusConfig:update'));
const canDelete = computed(() => checkPerm('crm:bonusConfig:delete'));
const salesCount = computed(() => allRows.value.filter(item => item.roleType === 'sales').length);
const internalCount = computed(() => allRows.value.filter(item => item.roleType === 'internal').length);
const groupOptions = computed(() => {
	const map = new Map<string, string>();
	allRows.value.forEach(item => {
		if (item.groupCode) {
			map.set(item.groupCode, item.groupName || item.groupCode);
		}
	});
	return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
});

function getRoleLabel(value: string) {
	return roleOptions.find(item => item.value === value)?.label || value || '--';
}

function getTypeLabel(value: string) {
	return typeOptions.find(item => item.value === value)?.label || value || '--';
}

function resetForm(row?: any) {
	Object.assign(form, {
		id: Number(row?.id || 0),
		roleType: row?.roleType || 'sales',
		groupCode: row?.groupCode || '',
		groupName: row?.groupName || '',
		configCode: row?.configCode || '',
		configName: row?.configName || '',
		configType: row?.configType || 'rate',
		conditionText: row?.conditionText || '',
		calcBase: row?.calcBase || '',
		configValue: row?.configValue ?? '',
		unit: row?.unit || (row?.configType === 'amount' ? '元' : '%'),
		sortNum: Number(row?.sortNum || 0),
		isEnabled: Number(row?.isEnabled ?? 1),
		remark: row?.remark || ''
	});
	FormRef.value?.clearValidate();
}

async function loadList() {
	loading.value = true;
	try {
		const res: any = await bonusService.page({
			...query,
			page: pagination.page,
			size: pagination.size
		});
		rows.value = Array.isArray(res?.list) ? res.list : [];
		pagination.total = Number(res?.pagination?.total || res?.total || 0);
		await loadAllRows();
	} finally {
		loading.value = false;
	}
}

async function loadAllRows() {
	const res: any = await bonusService.page({
		page: 1,
		size: 500
	});
	allRows.value = Array.isArray(res?.list) ? res.list : [];
}

function resetSearch() {
	query.roleType = '';
	query.groupCode = '';
	query.configName = '';
	query.isEnabled = undefined;
	pagination.page = 1;
	loadList();
}

function openAdd() {
	resetForm();
	formVisible.value = true;
}

function openEdit(row: any) {
	resetForm(row);
	formVisible.value = true;
}

async function submitForm() {
	await FormRef.value?.validate();
	saving.value = true;
	try {
		const data = { ...form };
		if (data.id) {
			await bonusService.update(data);
		} else {
			await bonusService.add(data);
		}
		ElMessage.success('儲存成功');
		formVisible.value = false;
		await loadList();
	} finally {
		saving.value = false;
	}
}

async function deleteRow(row: any) {
	try {
		await ElMessageBox.confirm('確認刪除該獎金配置嗎？', '刪除確認', {
			type: 'warning',
			confirmButtonText: '確認',
			cancelButtonText: '取消'
		});
	} catch {
		return;
	}

	await bonusService.delete({ ids: [Number(row.id)] });
	ElMessage.success('刪除成功');
	await loadList();
}

async function initDefault() {
	const res: any = await bonusService.initDefault();
	ElMessage.success(`已補齊預設配置 ${Number(res?.inserted || 0)} 條`);
	await loadList();
}

onMounted(() => {
	loadList();
});
</script>

<style scoped lang="scss">
.bonus-config-page {
	padding: 4px;
}

.bonus-hero {
	display: flex;
	align-items: stretch;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 14px;
	padding: 22px 24px;
	color: #fff;
	border-radius: 18px;
	background:
		radial-gradient(circle at 12% 12%, rgba(255, 255, 255, 0.24), transparent 28%),
		linear-gradient(135deg, #1d4ed8 0%, #2563eb 46%, #0f766e 100%);

	h2 {
		margin: 6px 0;
		font-size: 26px;
	}

	p {
		max-width: 720px;
		margin: 0;
		color: rgba(255, 255, 255, 0.84);
	}
}

.bonus-hero__eyebrow {
	font-size: 13px;
	letter-spacing: 2px;
	text-transform: uppercase;
	opacity: 0.78;
}

.bonus-hero__cards {
	display: flex;
	gap: 12px;
}

.bonus-stat {
	display: flex;
	min-width: 116px;
	flex-direction: column;
	justify-content: center;
	padding: 14px 16px;
	border: 1px solid rgba(255, 255, 255, 0.24);
	border-radius: 14px;
	background: rgba(255, 255, 255, 0.14);
	backdrop-filter: blur(8px);

	span {
		font-size: 13px;
		opacity: 0.82;
	}

	strong {
		margin-top: 4px;
		font-size: 28px;
		line-height: 1;
	}
}

.bonus-stat--green {
	background: rgba(16, 185, 129, 0.18);
}

.bonus-summary-collapse {
	margin-bottom: 14px;
	overflow: hidden;
	border: 1px solid #e5e7eb;
	border-radius: 4px;
	background: #fff;
}

.bonus-summary-collapse :deep(.el-collapse-item__header) {
	height: 62px;
	padding: 0 20px;
	border-bottom-color: #edf0f5;
}

.bonus-summary-collapse :deep(.el-collapse-item__content) {
	padding: 20px;
}

.bonus-collapse-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding-right: 16px;
}

.bonus-collapse-title__main {
	font-weight: 600;
	color: #111827;
}

.bonus-collapse-title__sub {
	margin-left: 12px;
	color: #94a3b8;
	font-size: 13px;
}

.bonus-summary {
	height: 100%;
	padding: 14px 16px;
	border: 1px solid #dbeafe;
	border-radius: 14px;
	background: #eff6ff;

	ul {
		margin: 10px 0 0;
		padding-left: 18px;
		color: #475569;
		line-height: 1.8;
	}
}

.bonus-summary--green {
	border-color: #ccfbf1;
	background: #f0fdfa;
}

.bonus-summary__title {
	font-weight: 700;
	color: #0f172a;
}

.bonus-filter {
	margin-bottom: 4px;
}

.bonus-toolbar {
	display: flex;
	gap: 10px;
	margin: 0 0 12px;
}

.bonus-table {
	width: 100%;
	max-height: calc(100vh - 430px);
	overflow: auto;
}

.bonus-value {
	font-weight: 700;
	color: #0f172a;
}

.bonus-unit {
	margin-left: 4px;
	color: #64748b;
}

.bonus-pagination {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}

@media (max-width: 900px) {
	.bonus-hero {
		flex-direction: column;
	}

	.bonus-hero__cards {
		width: 100%;
	}

	.bonus-stat {
		flex: 1;
	}
}
</style>
