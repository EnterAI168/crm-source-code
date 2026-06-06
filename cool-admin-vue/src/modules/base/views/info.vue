<template>
	<div class="view-my">
		<el-scrollbar>
			<div class="p-[20px]">
				<div class="title">{{ $t('基本資訊') }}</div>

				<el-form label-width="100px" :model="form" :disabled="loading" label-position="top">
					<el-form-item :label="$t('頭像')">
						<cl-upload v-model="form.headImg" />
					</el-form-item>

					<el-form-item label="員工名稱">
						<el-input
							v-model="form.name"
							placeholder="請填寫員工名稱"
							clearable
						/>
					</el-form-item>

					<el-form-item :label="$t('原密碼')">
						<el-input
							v-model="form.oldPassword"
							type="password"
							:placeholder="$t('請填寫原密碼')"
							clearable
						/>
					</el-form-item>

					<el-form-item :label="$t('新密碼')">
						<el-input
							v-model="form.password"
							type="password"
							:placeholder="$t('請填寫新密碼')"
							clearable
						/>
					</el-form-item>

					<el-form-item>
						<el-button type="primary" :disabled="loading" @click="save">{{
							$t('儲存修改')
						}}</el-button>
					</el-form-item>
				</el-form>
			</div>
		</el-scrollbar>
	</div>
</template>

<script lang="ts" setup>
defineOptions({
	name: 'my-info'
});

import { ElMessage } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { useBase } from '/$/base';
import { useCool } from '/@/cool';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { service } = useCool();
const { user } = useBase();

// 表單資料
const form = reactive({
	headImg: '',
	name: '',
	password: '',
	oldPassword: ''
});

// 儲存狀態
const loading = ref(false);

// 儲存
async function save() {
	loading.value = true;

	const payload = {
		...form,
		name: String(form.name || '').trim(),
		nickName: String(form.name || '').trim()
	};

	await service.base.comm
		.personUpdate(payload)
		.then(() => {
			form.password = '';
			form.oldPassword = '';

			ElMessage.success(t('修改成功'));
			user.get();
		})
		.catch(err => {
			ElMessage.error(err.message);
		});

	loading.value = false;
}

onMounted(() => {
	form.headImg = user.info?.headImg || '';
	form.name = user.info?.name || user.info?.nickName || '';
});
</script>

<style lang="scss">
.view-my {
	background-color: var(--el-bg-color);
	height: 100%;
	box-sizing: border-box;
	border-radius: 6px;

	.el-form {
		width: 400px;
		max-width: 100%;
	}

	.title {
		margin-bottom: 30px;
		font-size: 15px;
		font-weight: bold;
	}
}
</style>
