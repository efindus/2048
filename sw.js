const versionNumber = 'v13';

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(versionNumber).then(cache => {
			return cache.addAll([
				'/',
				'/index.html',
				'/favicon.ico',
				'/static/logo.png',
				'/static/logo/128.png',
				'/static/logo/144.png',
				'/static/logo/192.png',
				'/static/logo/192t.png',
				'/static/logo/192t2.png',
				'/static/main.js',
				'/static/swiped.min.js',
				'/static/main.css',
				'/static/manifest.json',
				'/static/Roboto.woff2',
			]);
		})
	);
});

self.addEventListener('fetch', event => {
	event.respondWith(caches.match(event.request).then(response => {
		if (response !== undefined) {
			return response;
		} else {
			return fetch(event.request).then(response => {
				let responseClone = response.clone();
				
				caches.open(versionNumber).then(cache => {
					cache.put(event.request, responseClone);
				});
				return response;
			}).catch(() => {
				return caches.match('/static/logo.png');
			});
		}
	}));
});

self.addEventListener('activate', event => {
	const cacheKeeplist = [ versionNumber ];

	event.waitUntil(
		caches.keys().then(keyList => {
			return Promise.all(keyList.map(key => {
				if (cacheKeeplist.indexOf(key) === -1)
					return caches.delete(key);
			}));
		})
	);
});
