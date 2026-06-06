<template>
	<div class="scope">
		<div class="h">
			<el-tag size="small" effect="dark" disable-transitions>rules</el-tag>
			<span>新增/刪除表單項</span>
		</div>

		<div class="c">
			<el-button @click="open">預覽</el-button>
			<demo-code :files="['form/rules.vue']" />

			<!-- 自定義表單元件 -->
			<cl-form ref="Form">
				<template #slot-cert="{ scope }">
					<div class="cert">
						<!--【很重要】prop、rules 配置格式如下 -->
						<el-form-item
							v-for="(item, index) in scope.cert"
							:key="index"
							:label="`證書${index + 1}`"
							:prop="`cert.${index}.label`"
							:rules="{
								message: `請填寫證書${index + 1}`,
								required: true
							}"
						>
							<div class="row">
								<!-- 輸入框 -->
								<el-input v-model="item.label" placeholder="請填寫證書"></el-input>

								<!-- 刪除行 -->
								<el-icon @click="rowDel(index)">
									<delete />
								</el-icon>
							</div>
						</el-form-item>

						<!-- 新增行 -->
						<el-row type="flex" justify="end">
							<el-button @click="rowAdd()">新增證書</el-button>
						</el-row>
					</div>
				</template>
			</cl-form>
		</div>

		<div class="f">
			<span class="date">2024-01-01</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useForm } from '@cool-vue/crud';
import { Delete } from '@element-plus/icons-vue';

const Form = useForm();

function open() {
	Form.value?.open({
		title: '新增/刪除表單項',
		items: [
			{
				label: '暱稱',
				prop: 'nickname',
				component: {
					name: 'el-input'
				},
				required: true
			},
			{
				prop: 'cert',
				//【很重要】預設資料格式，以實際業務為主。
				value: [
					{
						label: ''
					}
				],
				component: {
					name: 'slot-cert'
				}
			}
		],
		on: {
			submit(data, { close }) {
				close();
			}
		}
	});
}

function rowAdd() {
	Form.value?.form.cert.push({
		label: ''
	});
}

function rowDel(index: number) {
	Form.value?.form.cert.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.cert {
	.row {
		display: flex;
		align-items: center;

		.el-input {
			flex: 1;
			margin-right: 10px;
		}

		.el-icon {
			cursor: pointer;

			&:hover {
				color: red;
			}
		}
	}
}
</style>
