declare namespace getSideChannelWeakMap {
	type Channel<V, K> = {
		assert: (key: K) => void;
		has: (key: K) => boolean;
		get: (key: K) => V | undefined;
		set: (key: K, value: V) => void;
		delete: (key: K) => boolean;
	}
}

declare function getSideChannelWeakMap<V, K>(): getSideChannelWeakMap.Channel<V, K>;

declare const x: false | typeof getSideChannelWeakMap

export = x;
