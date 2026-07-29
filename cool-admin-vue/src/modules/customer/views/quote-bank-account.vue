<template>
	<div class="quote-bank-page">
		<el-card shadow="never">
			<el-form :inline="true" :model="query" class="quote-bank-filter">
				<el-form-item label="帳戶名稱">
					<el-input v-model="query.name" clearable placeholder="請輸入帳戶名稱" />
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

			<div class="quote-bank-toolbar">
				<el-button type="primary" :disabled="!canAdd" @click="openAdd">新增存摺帳戶</el-button>
			</div>

			<el-table v-loading="loading" :data="rows" border size="small">
				<el-table-column type="index" label="序號" width="64" />
				<el-table-column prop="name" label="帳戶名稱" min-width="140" show-overflow-tooltip />
				<el-table-column prop="bankAccountName" label="戶名" min-width="180" show-overflow-tooltip />
				<el-table-column label="銀行" min-width="160" show-overflow-tooltip>
					<template #default="{ row }">
						{{ [row.bankCode, row.bankName].filter(Boolean).join(' ') || '--' }}
					</template>
				</el-table-column>
				<el-table-column prop="bankBranch" label="開戶行" min-width="120" show-overflow-tooltip />
				<el-table-column prop="bankAccountNo" label="帳號" min-width="160" show-overflow-tooltip />
				<el-table-column label="存摺封面" width="100" align="center">
					<template #default="{ row }">
						<el-image
							v-if="row.bankCoverUrl"
							:src="row.bankCoverUrl"
							:preview-src-list="[row.bankCoverUrl]"
							fit="cover"
							style="width: 48px; height: 32px"
						/>
						<span v-else>--</span>
					</template>
				</el-table-column>
				<el-table-column label="預設" width="80" align="center">
					<template #default="{ row }">
						<el-tag :type="Number(row.isDefault) === 1 ? 'warning' : 'info'" effect="plain">
							{{ Number(row.isDefault) === 1 ? '是' : '否' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="狀態" width="90" align="center">
					<template #default="{ row }">
						<el-tag :type="Number(row.isEnabled) === 1 ? 'success' : 'info'">
							{{ Number(row.isEnabled) === 1 ? '啟用' : '停用' }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column label="操作" width="160" fixed="right">
					<template #default="{ row }">
						<el-button link type="primary" :disabled="!canUpdate" @click="openEdit(row)">編輯</el-button>
						<el-button link type="danger" :disabled="!canDelete" @click="removeRow(row)">刪除</el-button>
					</template>
				</el-table-column>
			</el-table>

			<div class="quote-bank-pagination">
				<el-pagination
					v-model:current-page="pagination.page"
					v-model:page-size="pagination.size"
					:total="pagination.total"
					layout="total, sizes, prev, pager, next"
					:page-sizes="[10, 20, 50]"
					@current-change="loadList"
					@size-change="loadList"
				/>
			</div>
		</el-card>

		<el-dialog v-model="dialogVisible" :title="form.id ? '編輯存摺帳戶' : '新增存摺帳戶'" width="640px" destroy-on-close>
			<el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
				<el-form-item label="帳戶名稱" prop="name">
					<el-input v-model="form.name" maxlength="100" placeholder="如下拉顯示名稱：凱基敦北" />
				</el-form-item>
				<el-form-item label="戶名" prop="bankAccountName">
					<el-input v-model="form.bankAccountName" maxlength="200" placeholder="請輸入戶名" />
				</el-form-item>
				<el-form-item label="銀行代號">
					<el-input v-model="form.bankCode" maxlength="20" placeholder="例如 012" />
				</el-form-item>
				<el-form-item label="銀行名稱">
					<el-input v-model="form.bankName" maxlength="100" placeholder="例如 臺北富邦銀行" />
				</el-form-item>
				<el-form-item label="開戶行">
					<el-input v-model="form.bankBranch" maxlength="100" placeholder="例如 敦北分行" />
				</el-form-item>
				<el-form-item label="銀行帳號">
					<el-input v-model="form.bankAccountNo" maxlength="50" placeholder="請輸入帳號" />
				</el-form-item>
				<el-form-item label="存摺封面">
					<cl-upload v-model="form.bankCoverUrl" />
				</el-form-item>
				<el-form-item label="排序">
					<el-input-number v-model="form.sortNum" :min="0" :max="9999" />
				</el-form-item>
				<el-form-item label="設為預設">
					<el-switch v-model="form.isDefault" :active-value="1" :inactive-value="0" />
				</el-form-item>
				<el-form-item label="啟用">
					<el-switch v-model="form.isEnabled" :active-value="1" :inactive-value="0" />
				</el-form-item>
				<el-form-item label="備註">
					<el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" />
				</el-form-item>
			</el-form>
			<template #footer>
				<el-button @click="dialogVisible = false">取消</el-button>
				<el-button type="primary" :loading="saving" @click="submit">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>

<script setup lang="ts">
defineOptions({
	name: 'crm-quote-bank-account'
});

import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { checkPerm } from '/$/base';
import QuoteBankAccountService from '../service/bankAccount';

const bankAccountService = new QuoteBankAccountService();

const loading = ref(false);
const saving = ref(false);
const dialogVisible = ref(false);
const rows = ref<any[]>([]);
const formRef = ref<FormInstance>();
const query = reactive({
	name: '',
	isEnabled: undefined as number | undefined
});
const pagination = reactive({
	page: 1,
	size: 20,
	total: 0
});
const form = reactive({
	id: 0,
	name: '',
	bankAccountName: '',
	bankCode: '',
	bankName: '',
	bankBranch: '',
	bankAccountNo: '',
	bankCoverUrl: '',
	sortNum: 0,
	isDefault: 0,
	isEnabled: 1,
	remark: ''
});

const rules: FormRules = {
	name: [{ required: true, message: '請輸入帳戶名稱', trigger: 'blur' }],
	bankAccountName: [{ required: true, message: '請輸入戶名', trigger: 'blur' }]
};

const canAdd = computed(() => checkPerm('crm:quoteBankAccount:add'));
const canUpdate = computed(() => checkPerm('crm:quoteBankAccount:update'));
const canDelete = computed(() => checkPerm('crm:quoteBankAccount:delete'));

function resetForm() {
	form.id = 0;
	form.name = '';
	form.bankAccountName = '';
	form.bankCode = '';
	form.bankName = '';
	form.bankBranch = '';
	form.bankAccountNo = '';
	form.bankCoverUrl = '';
	form.sortNum = 0;
	form.isDefault = 0;
	form.isEnabled = 1;
	form.remark = '';
}

function openAdd() {
	resetForm();
	dialogVisible.value = true;
}

function openEdit(row: any) {
	resetForm();
	Object.assign(form, {
		id: Number(row.id || 0),
		name: row.name || '',
		bankAccountName: row.bankAccountName || '',
		bankCode: row.bankCode || '',
		bankName: row.bankName || '',
		bankBranch: row.bankBranch || '',
		bankAccountNo: row.bankAccountNo || '',
		bankCoverUrl: row.bankCoverUrl || '',
		sortNum: Number(row.sortNum || 0),
		isDefault: Number(row.isDefault || 0),
		isEnabled: Number(row.isEnabled ?? 1),
		remark: row.remark || ''
	});
	dialogVisible.value = true;
}

async function loadList() {
	loading.value = true;
	try {
		const res: any = await bankAccountService.page({
			page: pagination.page,
			size: pagination.size,
			name: query.name || undefined,
			isEnabled: query.isEnabled
		});
		rows.value = Array.isArray(res?.list) ? res.list : [];
		pagination.total = Number(res?.pagination?.total || 0);
	} catch (error: any) {
		ElMessage.error(error?.message || '載入失敗');
	} finally {
		loading.value = false;
	}
}

function resetSearch() {
	query.name = '';
	query.isEnabled = undefined;
	pagination.page = 1;
	loadList();
}

async function submit() {
	await formRef.value?.validate();
	saving.value = true;
	try {
		const payload = { ...form };
		if (payload.id) {
			await bankAccountService.update(payload);
		} else {
			await bankAccountService.add(payload);
		}
		ElMessage.success('保存成功');
		dialogVisible.value = false;
		await loadList();
	} catch (error: any) {
		ElMessage.error(error?.message || '保存失敗');
	} finally {
		saving.value = false;
	}
}

async function removeRow(row: any) {
	await ElMessageBox.confirm(`確定刪除存摺帳戶「${row.name}」嗎？`, '提示', {
		type: 'warning'
	});
	await bankAccountService.delete({ ids: [Number(row.id)] });
	ElMessage.success('已刪除');
	await loadList();
}

onMounted(() => {
	loadList();
});
</script>

<style scoped lang="scss">
.quote-bank-page {
	padding: 12px;
}

.quote-bank-toolbar {
	margin-bottom: 12px;
}

.quote-bank-pagination {
	display: flex;
	justify-content: flex-end;
	margin-top: 16px;
}
</style>
