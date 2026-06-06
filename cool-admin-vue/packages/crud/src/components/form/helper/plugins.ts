import { type Ref, type WatchStopHandle, getCurrentInstance, watch } from "vue";
import { useConfig } from "../../../hooks";
import { uniqueFns } from "../../../utils";

export function usePlugins(enable: boolean, { visible }: { visible: Ref<boolean> }) {
	const that: any = getCurrentInstance();
	const { style } = useConfig();

	interface Event {
		onOpen: (() => void)[];
		onClose: (() => void)[];
		onSubmit: ((data: obj) => Promise<obj> | obj)[];
		[key: string]: any;
	}

	// 事件
	const ev: Event = {
		onOpen: [],
		onClose: [],
		onSubmit: []
	};

	// 監聽器
	let timer: WatchStopHandle | null = null;

	// 外掛建立
	function create(plugins: ClForm.Plugin[] = []) {
		if (!enable) {
			return false;
		}

		for (const i in ev) {
			ev[i] = [];
		}

		// 停止監聽
		if (timer) {
			timer();
		}

		// 執行
		uniqueFns([...(style.form.plugins || []), ...plugins]).forEach((p) => {
			const d: any = {
				exposed: that.exposed
			};

			for (const i in ev) {
				d[i] = (cb: any) => {
					ev[i].push(cb);
				};
			}

			p(d);
		});

		timer = watch(
			visible,
			(val) => {
				if (val) {
					setTimeout(() => {
						ev.onOpen.forEach((e) => e());
					}, 10);
				} else {
					ev.onClose.forEach((e) => e());
				}
			},
			{
				immediate: true
			}
		);
	}

	// 表單提交
	async function submit(data: any) {
		let d = data;

		for (let i = 0; i < ev.onSubmit.length; i++) {
			const d2 = await ev.onSubmit[i](d);

			if (d2) {
				d = d2;
			}
		}

		return d;
	}

	return {
		create,
		submit
	};
}
