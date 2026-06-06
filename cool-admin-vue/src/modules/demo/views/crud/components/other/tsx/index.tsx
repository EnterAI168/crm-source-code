import { defineComponent, ref } from 'vue';
import { Check } from '@element-plus/icons-vue';
import './index.scss';

interface Item {
	name: string;
	value: number;
}

export default defineComponent({
	emits: ['checked'],

	setup(props, { emit, expose, slots }) {
		// 列表資料
		const list = ref<Item[]>([
			{
				name: '雞腿堡',
				value: 1
			},
			{
				name: '牛肉堡',
				value: 2
			}
		]);

		// 選擇值
		const active = ref();

		// 是否可見
		const visible = ref(false);

		// 開啟
		function open() {
			visible.value = true;
		}

		// 選擇
		function toCheck(item: Item) {
			active.value = item.value;

			// 自定義事件
			emit('checked', item);
		}

		// 暴露方法和變數，使上級可以使用 ref 的方式來呼叫
		expose({
			toCheck
		});

		// 必須返回一個方法
		return () => {
			return (
				<div class="scope">
					<div class="h">
						<el-tag size="small" effect="dark" disable-transitions>
							tsx
						</el-tag>
						<span>tsx示例</span>
					</div>

					<div class="c">
						<el-button onClick={open}>預覽</el-button>
						<demo-code files={['other/tsx/index.tsx']} />

						{/* ref 的繫結值必須 .value */}
						<cl-dialog v-model={visible.value} title="tsx示例">
							<div class="tsx-list">
								{/* 迴圈的使用 */}
								{list.value.map(item => {
									// 插槽的使用
									return slots.default ? (
										slots.default(item)
									) : (
										<div
											// 動態樣式的使用
											class={[
												'item',
												{
													'is-active': item.value == active.value
												}
											]}
											// 事件的使用
											onClick={() => toCheck(item)}
										>
											<span>{item.name}</span>

											<el-icon>
												<Check />
											</el-icon>
										</div>
									);
								})}
							</div>
						</cl-dialog>
					</div>

					<div class="f">
						<span class="date">2024-01-01</span>
					</div>
				</div>
			);
		};
	}

	// 不推薦用該方法，在 setup 中返回模板資訊
	// render() {
	// 	return <div></div>;
	// }
});
