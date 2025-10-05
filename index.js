'use strict';

var GetIntrinsic = require('get-intrinsic');
var callBound = require('call-bound');
var inspect = require('object-inspect');
var getSideChannelMap = require('side-channel-map');

var $TypeError = require('es-errors/type');
var $WeakMap = GetIntrinsic('%WeakMap%', true);

/** @type {<K extends object, V>(thisArg: WeakMap<K, V>, key: K) => V} */
var $weakMapGet = callBound('WeakMap.prototype.get', true);
/** @type {<K extends object, V>(thisArg: WeakMap<K, V>, key: K, value: V) => void} */
var $weakMapSet = callBound('WeakMap.prototype.set', true);
/** @type {<K extends object, V>(thisArg: WeakMap<K, V>, key: K) => boolean} */
var $weakMapHas = callBound('WeakMap.prototype.has', true);
/** @type {<K extends object, V>(thisArg: WeakMap<K, V>, key: K) => boolean} */
var $weakMapDelete = callBound('WeakMap.prototype.delete', true);

// Performance optimization: Cache type check function
/** @type {(key: any) => boolean} */
var isObjectOrFunction = function (key) {
	var type = typeof key;
	return key && (type === 'object' || type === 'function');
};

/** @type {import('.')} */
module.exports = $WeakMap
	? /** @type {Exclude<import('.'), false>} */ function getSideChannelWeakMap() {
		/** @typedef {ReturnType<typeof getSideChannelWeakMap>} Channel */
		/** @typedef {Parameters<Channel['get']>[0]} K */
		/** @typedef {Parameters<Channel['set']>[1]} V */

		/** @type {WeakMap<K & object, V> | undefined} */ var $wm;
		/** @type {Channel | undefined} */ var $m;

		// Performance optimization: Track initialization state
		var wmInitialized = false;
		var mInitialized = false;

		/** @type {Channel} */
		var channel = {
			assert: function (key) {
				if (!channel.has(key)) {
					throw new $TypeError('Side channel does not contain ' + inspect(key));
				}
			},
			'delete': function (key) {
				// Fast path: Object/function with initialized WeakMap
				if (wmInitialized && isObjectOrFunction(key)) {
					// @ts-expect-error - wmInitialized ensures $wm is defined
					return $weakMapDelete($wm, key);
				}

				// Slow path: Check initialization and type
				if (isObjectOrFunction(key)) {
					if (wmInitialized) {
						// @ts-expect-error - wmInitialized ensures $wm is defined
						return $weakMapDelete($wm, key);
					}
					return false;
				}

				// Fallback to Map for primitives
				if (mInitialized) {
					// @ts-expect-error - mInitialized ensures $m is defined
					return $m['delete'](key);
				}
				return false;
			},
			get: function (key) {
				// Fast path: Object/function with initialized WeakMap
				if (wmInitialized && isObjectOrFunction(key)) {
					// @ts-expect-error - wmInitialized ensures $wm is defined
					return $weakMapGet($wm, key);
				}

				// Slow path: Check type and initialization
				if (isObjectOrFunction(key)) {
					if (wmInitialized) {
						// @ts-expect-error - wmInitialized ensures $wm is defined
						return $weakMapGet($wm, key);
					}
					return undefined;
				}

				// Fallback to Map for primitives
				// @ts-expect-error - mInitialized check protects $m access
				return mInitialized ? $m.get(key) : undefined;
			},
			has: function (key) {
				// Fast path: Object/function with initialized WeakMap
				if (wmInitialized && isObjectOrFunction(key)) {
					// @ts-expect-error - wmInitialized ensures $wm is defined
					return $weakMapHas($wm, key);
				}

				// Slow path: Check type and initialization
				if (isObjectOrFunction(key)) {
					if (wmInitialized) {
						// @ts-expect-error - wmInitialized ensures $wm is defined
						return $weakMapHas($wm, key);
					}
					return false;
				}

				// Fallback to Map for primitives
				// @ts-expect-error - mInitialized check protects $m access
				return mInitialized && $m.has(key);
			},
			set: function (key, value) {
				// Fast path: Object/function
				if (isObjectOrFunction(key)) {
					if (!wmInitialized) {
						// @ts-expect-error - $WeakMap availability checked at module level
						$wm = new $WeakMap();
						wmInitialized = true;
					}
					// @ts-expect-error - wmInitialized ensures $wm is defined
					$weakMapSet($wm, key, value);
					return;
				}

				// Fallback to Map for primitives
				if (getSideChannelMap) {
					if (!mInitialized) {
						$m = getSideChannelMap();
						mInitialized = true;
					}
					// eslint-disable-next-line no-extra-parens
					/** @type {NonNullable<typeof $m>} */ ($m).set(key, value);
				}
			}
		};

		// @ts-expect-error TODO: figure out why this is erroring
		return channel;
	}
	: getSideChannelMap;
