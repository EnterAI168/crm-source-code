import { createApp } from 'vue';
import App from './App.vue';
import { bootstrap } from './cool';
import { startTraditionalTextObserver } from './utils/localeText';

const app = createApp(App);

// 啟動
bootstrap(app)
	.then(() => {
		app.mount('#app');
		startTraditionalTextObserver();
	})
	.catch(err => {
		console.error('COOL-ADMIN 啟動失敗', err);
	});
