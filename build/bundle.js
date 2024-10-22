
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	const identity = (x) => x;

	/** @returns {void} */
	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	let src_url_equal_anchor;

	/**
	 * @param {string} element_src
	 * @param {string} url
	 * @returns {boolean}
	 */
	function src_url_equal(element_src, url) {
		if (element_src === url) return true;
		if (!src_url_equal_anchor) {
			src_url_equal_anchor = document.createElement('a');
		}
		// This is actually faster than doing URL(..).href
		src_url_equal_anchor.href = url;
		return element_src === src_url_equal_anchor.href;
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @returns {void} */
	function validate_store(store, name) {
		if (store != null && typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(store, ...callbacks) {
		if (store == null) {
			for (const callback of callbacks) {
				callback(undefined);
			}
			return noop;
		}
		const unsub = store.subscribe(...callbacks);
		return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
	}

	/**
	 * Get the current value from a store by subscribing and immediately unsubscribing.
	 *
	 * https://svelte.dev/docs/svelte-store#get
	 * @template T
	 * @param {import('../store/public.js').Readable<T>} store
	 * @returns {T}
	 */
	function get_store_value(store) {
		let value;
		subscribe(store, (_) => (value = _))();
		return value;
	}

	/** @returns {void} */
	function component_subscribe(component, store, callback) {
		component.$$.on_destroy.push(subscribe(store, callback));
	}

	function null_to_empty(value) {
		return value == null ? '' : value;
	}

	/** @param {number | string} value
	 * @returns {[number, string]}
	 */
	function split_css_unit(value) {
		const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
		return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
	}

	const is_client = typeof window !== 'undefined';

	/** @type {() => number} */
	let now = is_client ? () => window.performance.now() : () => Date.now();

	let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

	const tasks = new Set();

	/**
	 * @param {number} now
	 * @returns {void}
	 */
	function run_tasks(now) {
		tasks.forEach((task) => {
			if (!task.c(now)) {
				tasks.delete(task);
				task.f();
			}
		});
		if (tasks.size !== 0) raf(run_tasks);
	}

	/**
	 * Creates a new task that runs on each raf frame
	 * until it returns a falsy value or is aborted
	 * @param {import('./private.js').TaskCallback} callback
	 * @returns {import('./private.js').Task}
	 */
	function loop(callback) {
		/** @type {import('./private.js').TaskEntry} */
		let task;
		if (tasks.size === 0) raf(run_tasks);
		return {
			promise: new Promise((fulfill) => {
				tasks.add((task = { c: callback, f: fulfill }));
			}),
			abort() {
				tasks.delete(task);
			}
		};
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} node
	 * @returns {ShadowRoot | Document}
	 */
	function get_root_for_style(node) {
		if (!node) return document;
		const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
		if (root && /** @type {ShadowRoot} */ (root).host) {
			return /** @type {ShadowRoot} */ (root);
		}
		return node.ownerDocument;
	}

	/**
	 * @param {Node} node
	 * @returns {CSSStyleSheet}
	 */
	function append_empty_stylesheet(node) {
		const style_element = element('style');
		// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
		// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
		// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
		// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
		// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
		style_element.textContent = '/* empty */';
		append_stylesheet(get_root_for_style(node), style_element);
		return style_element.sheet;
	}

	/**
	 * @param {ShadowRoot | Document} node
	 * @param {HTMLStyleElement} style
	 * @returns {CSSStyleSheet}
	 */
	function append_stylesheet(node, style) {
		append(/** @type {Document} */ (node).head || node, style);
		return style.sheet;
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @template {keyof SVGElementTagNameMap} K
	 * @param {K} name
	 * @returns {SVGElement}
	 */
	function svg_element(name) {
		return document.createElementNS('http://www.w3.org/2000/svg', name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @returns {Text} */
	function empty() {
		return text('');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function stop_propagation(fn) {
		return function (event) {
			event.stopPropagation();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_style(node, key, value, important) {
		if (value == null) {
			node.style.removeProperty(key);
		} else {
			node.style.setProperty(key, value, important ? 'important' : '');
		}
	}

	/**
	 * @returns {void} */
	function toggle_class(element, name, toggle) {
		// The `!!` is required because an `undefined` flag means flipping the current state.
		element.classList.toggle(name, !!toggle);
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}
	/** */
	class HtmlTag {
		/**
		 * @private
		 * @default false
		 */
		is_svg = false;
		/** parent for creating node */
		e = undefined;
		/** html tag nodes */
		n = undefined;
		/** target */
		t = undefined;
		/** anchor */
		a = undefined;
		constructor(is_svg = false) {
			this.is_svg = is_svg;
			this.e = this.n = null;
		}

		/**
		 * @param {string} html
		 * @returns {void}
		 */
		c(html) {
			this.h(html);
		}

		/**
		 * @param {string} html
		 * @param {HTMLElement | SVGElement} target
		 * @param {HTMLElement | SVGElement} anchor
		 * @returns {void}
		 */
		m(html, target, anchor = null) {
			if (!this.e) {
				if (this.is_svg)
					this.e = svg_element(/** @type {keyof SVGElementTagNameMap} */ (target.nodeName));
				/** #7364  target for <template> may be provided as #document-fragment(11) */ else
					this.e = element(
						/** @type {keyof HTMLElementTagNameMap} */ (
							target.nodeType === 11 ? 'TEMPLATE' : target.nodeName
						)
					);
				this.t =
					target.tagName !== 'TEMPLATE'
						? target
						: /** @type {HTMLTemplateElement} */ (target).content;
				this.c(html);
			}
			this.i(anchor);
		}

		/**
		 * @param {string} html
		 * @returns {void}
		 */
		h(html) {
			this.e.innerHTML = html;
			this.n = Array.from(
				this.e.nodeName === 'TEMPLATE' ? this.e.content.childNodes : this.e.childNodes
			);
		}

		/**
		 * @returns {void} */
		i(anchor) {
			for (let i = 0; i < this.n.length; i += 1) {
				insert(this.t, this.n[i], anchor);
			}
		}

		/**
		 * @param {string} html
		 * @returns {void}
		 */
		p(html) {
			this.d();
			this.h(html);
			this.i(this.a);
		}

		/**
		 * @returns {void} */
		d() {
			this.n.forEach(detach);
		}
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	// we need to store the information for multiple documents because a Svelte application could also contain iframes
	// https://github.com/sveltejs/svelte/issues/3624
	/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
	const managed_styles = new Map();

	let active = 0;

	// https://github.com/darkskyapp/string-hash/blob/master/index.js
	/**
	 * @param {string} str
	 * @returns {number}
	 */
	function hash(str) {
		let hash = 5381;
		let i = str.length;
		while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
		return hash >>> 0;
	}

	/**
	 * @param {Document | ShadowRoot} doc
	 * @param {Element & ElementCSSInlineStyle} node
	 * @returns {{ stylesheet: any; rules: {}; }}
	 */
	function create_style_information(doc, node) {
		const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
		managed_styles.set(doc, info);
		return info;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {number} a
	 * @param {number} b
	 * @param {number} duration
	 * @param {number} delay
	 * @param {(t: number) => number} ease
	 * @param {(t: number, u: number) => string} fn
	 * @param {number} uid
	 * @returns {string}
	 */
	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
		const step = 16.666 / duration;
		let keyframes = '{\n';
		for (let p = 0; p <= 1; p += step) {
			const t = a + (b - a) * ease(p);
			keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
		}
		const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
		const name = `__svelte_${hash(rule)}_${uid}`;
		const doc = get_root_for_style(node);
		const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
		if (!rules[name]) {
			rules[name] = true;
			stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
		}
		const animation = node.style.animation || '';
		node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
		active += 1;
		return name;
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {string} [name]
	 * @returns {void}
	 */
	function delete_rule(node, name) {
		const previous = (node.style.animation || '').split(', ');
		const next = previous.filter(
			name
				? (anim) => anim.indexOf(name) < 0 // remove specific animation
				: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
		);
		const deleted = previous.length - next.length;
		if (deleted) {
			node.style.animation = next.join(', ');
			active -= deleted;
			if (!active) clear_rules();
		}
	}

	/** @returns {void} */
	function clear_rules() {
		raf(() => {
			if (active) return;
			managed_styles.forEach((info) => {
				const { ownerNode } = info.stylesheet;
				// there is no ownerNode if it runs on jsdom.
				if (ownerNode) detach(ownerNode);
			});
			managed_styles.clear();
		});
	}

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	/**
	 * Schedules a callback to run immediately before the component is unmounted.
	 *
	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
	 * only one that runs inside a server-side component.
	 *
	 * https://svelte.dev/docs/svelte#ondestroy
	 * @param {() => any} fn
	 * @returns {void}
	 */
	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
	function update($$) {
		if ($$.fragment !== null) {
			$$.update();
			run_all($$.before_update);
			const dirty = $$.dirty;
			$$.dirty = [-1];
			$$.fragment && $$.fragment.p($$.ctx, dirty);
			$$.after_update.forEach(add_render_callback);
		}
	}

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	/**
	 * @type {Promise<void> | null}
	 */
	let promise;

	/**
	 * @returns {Promise<void>}
	 */
	function wait() {
		if (!promise) {
			promise = Promise.resolve();
			promise.then(() => {
				promise = null;
			});
		}
		return promise;
	}

	/**
	 * @param {Element} node
	 * @param {INTRO | OUTRO | boolean} direction
	 * @param {'start' | 'end'} kind
	 * @returns {void}
	 */
	function dispatch(node, direction, kind) {
		node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
	}

	const outroing = new Set();

	/**
	 * @type {Outro}
	 */
	let outros;

	/**
	 * @returns {void} */
	function group_outros() {
		outros = {
			r: 0,
			c: [],
			p: outros // parent group
		};
	}

	/**
	 * @returns {void} */
	function check_outros() {
		if (!outros.r) {
			run_all(outros.c);
		}
		outros = outros.p;
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} local
	 * @param {0 | 1} [detach]
	 * @param {() => void} [callback]
	 * @returns {void}
	 */
	function transition_out(block, local, detach, callback) {
		if (block && block.o) {
			if (outroing.has(block)) return;
			outroing.add(block);
			outros.c.push(() => {
				outroing.delete(block);
				if (callback) {
					if (detach) block.d(1);
					callback();
				}
			});
			block.o(local);
		} else if (callback) {
			callback();
		}
	}

	/**
	 * @type {import('../transition/public.js').TransitionConfig}
	 */
	const null_transition = { duration: 0 };

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ start(): void; invalidate(): void; end(): void; }}
	 */
	function create_in_transition(node, fn, params) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'in' };
		let config = fn(node, params, options);
		let running = false;
		let animation_name;
		let task;
		let uid = 0;

		/**
		 * @returns {void} */
		function cleanup() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;
			if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
			tick(0, 1);
			const start_time = now() + delay;
			const end_time = start_time + duration;
			if (task) task.abort();
			running = true;
			add_render_callback(() => dispatch(node, true, 'start'));
			task = loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(1, 0);
						dispatch(node, true, 'end');
						cleanup();
						return (running = false);
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(t, 1 - t);
					}
				}
				return running;
			});
		}
		let started = false;
		return {
			start() {
				if (started) return;
				started = true;
				delete_rule(node);
				if (is_function(config)) {
					config = config(options);
					wait().then(go);
				} else {
					go();
				}
			},
			invalidate() {
				started = false;
			},
			end() {
				if (running) {
					cleanup();
					running = false;
				}
			}
		};
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @returns {{ end(reset: any): void; }}
	 */
	function create_out_transition(node, fn, params) {
		/** @type {TransitionOptions} */
		const options = { direction: 'out' };
		let config = fn(node, params, options);
		let running = true;
		let animation_name;
		const group = outros;
		group.r += 1;
		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function go() {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			if (css) animation_name = create_rule(node, 1, 0, duration, delay, easing, css);

			const start_time = now() + delay;
			const end_time = start_time + duration;
			add_render_callback(() => dispatch(node, false, 'start'));

			if ('inert' in node) {
				original_inert_value = /** @type {HTMLElement} */ (node).inert;
				node.inert = true;
			}

			loop((now) => {
				if (running) {
					if (now >= end_time) {
						tick(0, 1);
						dispatch(node, false, 'end');
						if (!--group.r) {
							// this will result in `end()` being called,
							// so we don't need to clean up here
							run_all(group.c);
						}
						return false;
					}
					if (now >= start_time) {
						const t = easing((now - start_time) / duration);
						tick(1 - t, t);
					}
				}
				return running;
			});
		}

		if (is_function(config)) {
			wait().then(() => {
				// @ts-ignore
				config = config(options);
				go();
			});
		} else {
			go();
		}

		return {
			end(reset) {
				if (reset && 'inert' in node) {
					node.inert = original_inert_value;
				}
				if (reset && config.tick) {
					config.tick(1, 0);
				}
				if (running) {
					if (animation_name) delete_rule(node, animation_name);
					running = false;
				}
			}
		};
	}

	/**
	 * @param {Element & ElementCSSInlineStyle} node
	 * @param {TransitionFn} fn
	 * @param {any} params
	 * @param {boolean} intro
	 * @returns {{ run(b: 0 | 1): void; end(): void; }}
	 */
	function create_bidirectional_transition(node, fn, params, intro) {
		/**
		 * @type {TransitionOptions} */
		const options = { direction: 'both' };
		let config = fn(node, params, options);
		let t = intro ? 0 : 1;

		/**
		 * @type {Program | null} */
		let running_program = null;

		/**
		 * @type {PendingProgram | null} */
		let pending_program = null;
		let animation_name = null;

		/** @type {boolean} */
		let original_inert_value;

		/**
		 * @returns {void} */
		function clear_animation() {
			if (animation_name) delete_rule(node, animation_name);
		}

		/**
		 * @param {PendingProgram} program
		 * @param {number} duration
		 * @returns {Program}
		 */
		function init(program, duration) {
			const d = /** @type {Program['d']} */ (program.b - t);
			duration *= Math.abs(d);
			return {
				a: t,
				b: program.b,
				d,
				duration,
				start: program.start,
				end: program.start + duration,
				group: program.group
			};
		}

		/**
		 * @param {INTRO | OUTRO} b
		 * @returns {void}
		 */
		function go(b) {
			const {
				delay = 0,
				duration = 300,
				easing = identity,
				tick = noop,
				css
			} = config || null_transition;

			/**
			 * @type {PendingProgram} */
			const program = {
				start: now() + delay,
				b
			};

			if (!b) {
				// @ts-ignore todo: improve typings
				program.group = outros;
				outros.r += 1;
			}

			if ('inert' in node) {
				if (b) {
					if (original_inert_value !== undefined) {
						// aborted/reversed outro — restore previous inert value
						node.inert = original_inert_value;
					}
				} else {
					original_inert_value = /** @type {HTMLElement} */ (node).inert;
					node.inert = true;
				}
			}

			if (running_program || pending_program) {
				pending_program = program;
			} else {
				// if this is an intro, and there's a delay, we need to do
				// an initial tick and/or apply CSS animation immediately
				if (css) {
					clear_animation();
					animation_name = create_rule(node, t, b, duration, delay, easing, css);
				}
				if (b) tick(0, 1);
				running_program = init(program, duration);
				add_render_callback(() => dispatch(node, b, 'start'));
				loop((now) => {
					if (pending_program && now > pending_program.start) {
						running_program = init(pending_program, duration);
						pending_program = null;
						dispatch(node, running_program.b, 'start');
						if (css) {
							clear_animation();
							animation_name = create_rule(
								node,
								t,
								running_program.b,
								running_program.duration,
								0,
								easing,
								config.css
							);
						}
					}
					if (running_program) {
						if (now >= running_program.end) {
							tick((t = running_program.b), 1 - t);
							dispatch(node, running_program.b, 'end');
							if (!pending_program) {
								// we're done
								if (running_program.b) {
									// intro — we can tidy up immediately
									clear_animation();
								} else {
									// outro — needs to be coordinated
									if (!--running_program.group.r) run_all(running_program.group.c);
								}
							}
							running_program = null;
						} else if (now >= running_program.start) {
							const p = now - running_program.start;
							t = running_program.a + running_program.d * easing(p / running_program.duration);
							tick(t, 1 - t);
						}
					}
					return !!(running_program || pending_program);
				});
			}
		}
		return {
			run(b) {
				if (is_function(config)) {
					wait().then(() => {
						const opts = { direction: b ? 'in' : 'out' };
						// @ts-ignore
						config = config(opts);
						go(b);
					});
				} else {
					go(b);
				}
			},
			end() {
				clear_animation();
				running_program = pending_program = null;
			}
		};
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	/** @returns {void} */
	function create_component(block) {
		block && block.c();
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
					}
					return ret;
			  })
			: [];
		$$.update();
		ready = true;
		run_all($$.before_update);
		// `false` as a special case of no DOM component
		$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
		if (options.target) {
			if (options.hydrate) {
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.19';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/*
	Adapted from https://github.com/mattdesl
	Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
	*/

	/**
	 * https://svelte.dev/docs/svelte-easing
	 * @param {number} t
	 * @returns {number}
	 */
	function cubicOut(t) {
		const f = t - 1.0;
		return f * f * f + 1.0;
	}

	/**
	 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
	 *
	 * https://svelte.dev/docs/svelte-transition#fade
	 * @param {Element} node
	 * @param {import('./public').FadeParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
		const o = +getComputedStyle(node).opacity;
		return {
			delay,
			duration,
			easing,
			css: (t) => `opacity: ${t * o}`
		};
	}

	/**
	 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
	 *
	 * https://svelte.dev/docs/svelte-transition#fly
	 * @param {Element} node
	 * @param {import('./public').FlyParams} [params]
	 * @returns {import('./public').TransitionConfig}
	 */
	function fly(
		node,
		{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}
	) {
		const style = getComputedStyle(node);
		const target_opacity = +style.opacity;
		const transform = style.transform === 'none' ? '' : style.transform;
		const od = target_opacity * (1 - opacity);
		const [xValue, xUnit] = split_css_unit(x);
		const [yValue, yUnit] = split_css_unit(y);
		return {
			delay,
			duration,
			easing,
			css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
		};
	}

	var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function getDefaultExportFromCjs (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	var purify = {exports: {}};

	/*! @license DOMPurify 3.1.7 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.1.7/LICENSE */

	(function (module, exports) {
		(function (global, factory) {
		  module.exports = factory() ;
		})(commonjsGlobal, (function () {
		  const {
		    entries,
		    setPrototypeOf,
		    isFrozen,
		    getPrototypeOf,
		    getOwnPropertyDescriptor
		  } = Object;
		  let {
		    freeze,
		    seal,
		    create
		  } = Object; // eslint-disable-line import/no-mutable-exports
		  let {
		    apply,
		    construct
		  } = typeof Reflect !== 'undefined' && Reflect;
		  if (!freeze) {
		    freeze = function freeze(x) {
		      return x;
		    };
		  }
		  if (!seal) {
		    seal = function seal(x) {
		      return x;
		    };
		  }
		  if (!apply) {
		    apply = function apply(fun, thisValue, args) {
		      return fun.apply(thisValue, args);
		    };
		  }
		  if (!construct) {
		    construct = function construct(Func, args) {
		      return new Func(...args);
		    };
		  }
		  const arrayForEach = unapply(Array.prototype.forEach);
		  const arrayPop = unapply(Array.prototype.pop);
		  const arrayPush = unapply(Array.prototype.push);
		  const stringToLowerCase = unapply(String.prototype.toLowerCase);
		  const stringToString = unapply(String.prototype.toString);
		  const stringMatch = unapply(String.prototype.match);
		  const stringReplace = unapply(String.prototype.replace);
		  const stringIndexOf = unapply(String.prototype.indexOf);
		  const stringTrim = unapply(String.prototype.trim);
		  const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
		  const regExpTest = unapply(RegExp.prototype.test);
		  const typeErrorCreate = unconstruct(TypeError);

		  /**
		   * Creates a new function that calls the given function with a specified thisArg and arguments.
		   *
		   * @param {Function} func - The function to be wrapped and called.
		   * @returns {Function} A new function that calls the given function with a specified thisArg and arguments.
		   */
		  function unapply(func) {
		    return function (thisArg) {
		      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
		        args[_key - 1] = arguments[_key];
		      }
		      return apply(func, thisArg, args);
		    };
		  }

		  /**
		   * Creates a new function that constructs an instance of the given constructor function with the provided arguments.
		   *
		   * @param {Function} func - The constructor function to be wrapped and called.
		   * @returns {Function} A new function that constructs an instance of the given constructor function with the provided arguments.
		   */
		  function unconstruct(func) {
		    return function () {
		      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
		        args[_key2] = arguments[_key2];
		      }
		      return construct(func, args);
		    };
		  }

		  /**
		   * Add properties to a lookup table
		   *
		   * @param {Object} set - The set to which elements will be added.
		   * @param {Array} array - The array containing elements to be added to the set.
		   * @param {Function} transformCaseFunc - An optional function to transform the case of each element before adding to the set.
		   * @returns {Object} The modified set with added elements.
		   */
		  function addToSet(set, array) {
		    let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
		    if (setPrototypeOf) {
		      // Make 'in' and truthy checks like Boolean(set.constructor)
		      // independent of any properties defined on Object.prototype.
		      // Prevent prototype setters from intercepting set as a this value.
		      setPrototypeOf(set, null);
		    }
		    let l = array.length;
		    while (l--) {
		      let element = array[l];
		      if (typeof element === 'string') {
		        const lcElement = transformCaseFunc(element);
		        if (lcElement !== element) {
		          // Config presets (e.g. tags.js, attrs.js) are immutable.
		          if (!isFrozen(array)) {
		            array[l] = lcElement;
		          }
		          element = lcElement;
		        }
		      }
		      set[element] = true;
		    }
		    return set;
		  }

		  /**
		   * Clean up an array to harden against CSPP
		   *
		   * @param {Array} array - The array to be cleaned.
		   * @returns {Array} The cleaned version of the array
		   */
		  function cleanArray(array) {
		    for (let index = 0; index < array.length; index++) {
		      const isPropertyExist = objectHasOwnProperty(array, index);
		      if (!isPropertyExist) {
		        array[index] = null;
		      }
		    }
		    return array;
		  }

		  /**
		   * Shallow clone an object
		   *
		   * @param {Object} object - The object to be cloned.
		   * @returns {Object} A new object that copies the original.
		   */
		  function clone(object) {
		    const newObject = create(null);
		    for (const [property, value] of entries(object)) {
		      const isPropertyExist = objectHasOwnProperty(object, property);
		      if (isPropertyExist) {
		        if (Array.isArray(value)) {
		          newObject[property] = cleanArray(value);
		        } else if (value && typeof value === 'object' && value.constructor === Object) {
		          newObject[property] = clone(value);
		        } else {
		          newObject[property] = value;
		        }
		      }
		    }
		    return newObject;
		  }

		  /**
		   * This method automatically checks if the prop is function or getter and behaves accordingly.
		   *
		   * @param {Object} object - The object to look up the getter function in its prototype chain.
		   * @param {String} prop - The property name for which to find the getter function.
		   * @returns {Function} The getter function found in the prototype chain or a fallback function.
		   */
		  function lookupGetter(object, prop) {
		    while (object !== null) {
		      const desc = getOwnPropertyDescriptor(object, prop);
		      if (desc) {
		        if (desc.get) {
		          return unapply(desc.get);
		        }
		        if (typeof desc.value === 'function') {
		          return unapply(desc.value);
		        }
		      }
		      object = getPrototypeOf(object);
		    }
		    function fallbackValue() {
		      return null;
		    }
		    return fallbackValue;
		  }

		  const html$1 = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);

		  // SVG
		  const svg$1 = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);
		  const svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);

		  // List of SVG elements that are disallowed by default.
		  // We still need to know them so that we can do namespace
		  // checks properly in case one wants to add them to
		  // allow-list.
		  const svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);
		  const mathMl$1 = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'mprescripts']);

		  // Similarly to SVG, we want to know all MathML elements,
		  // even those that we disallow by default.
		  const mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);
		  const text = freeze(['#text']);

		  const html = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'playsinline', 'popover', 'popovertarget', 'popovertargetaction', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'wrap', 'xmlns', 'slot']);
		  const svg = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'exponent', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'intercept', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'slope', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'tablevalues', 'targetx', 'targety', 'transform', 'transform-origin', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);
		  const mathMl = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);
		  const xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

		  // eslint-disable-next-line unicorn/better-regex
		  const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
		  const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
		  const TMPLIT_EXPR = seal(/\${[\w\W]*}/gm);
		  const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/); // eslint-disable-line no-useless-escape
		  const ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
		  const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
		  );
		  const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
		  const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g // eslint-disable-line no-control-regex
		  );
		  const DOCTYPE_NAME = seal(/^html$/i);
		  const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);

		  var EXPRESSIONS = /*#__PURE__*/Object.freeze({
		    __proto__: null,
		    MUSTACHE_EXPR: MUSTACHE_EXPR,
		    ERB_EXPR: ERB_EXPR,
		    TMPLIT_EXPR: TMPLIT_EXPR,
		    DATA_ATTR: DATA_ATTR,
		    ARIA_ATTR: ARIA_ATTR,
		    IS_ALLOWED_URI: IS_ALLOWED_URI,
		    IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA,
		    ATTR_WHITESPACE: ATTR_WHITESPACE,
		    DOCTYPE_NAME: DOCTYPE_NAME,
		    CUSTOM_ELEMENT: CUSTOM_ELEMENT
		  });

		  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
		  const NODE_TYPE = {
		    element: 1,
		    attribute: 2,
		    text: 3,
		    cdataSection: 4,
		    entityReference: 5,
		    // Deprecated
		    entityNode: 6,
		    // Deprecated
		    progressingInstruction: 7,
		    comment: 8,
		    document: 9,
		    documentType: 10,
		    documentFragment: 11,
		    notation: 12 // Deprecated
		  };
		  const getGlobal = function getGlobal() {
		    return typeof window === 'undefined' ? null : window;
		  };

		  /**
		   * Creates a no-op policy for internal use only.
		   * Don't export this function outside this module!
		   * @param {TrustedTypePolicyFactory} trustedTypes The policy factory.
		   * @param {HTMLScriptElement} purifyHostElement The Script element used to load DOMPurify (to determine policy name suffix).
		   * @return {TrustedTypePolicy} The policy created (or null, if Trusted Types
		   * are not supported or creating the policy failed).
		   */
		  const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
		    if (typeof trustedTypes !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
		      return null;
		    }

		    // Allow the callers to control the unique policy name
		    // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
		    // Policy creation with duplicate names throws in Trusted Types.
		    let suffix = null;
		    const ATTR_NAME = 'data-tt-policy-suffix';
		    if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
		      suffix = purifyHostElement.getAttribute(ATTR_NAME);
		    }
		    const policyName = 'dompurify' + (suffix ? '#' + suffix : '');
		    try {
		      return trustedTypes.createPolicy(policyName, {
		        createHTML(html) {
		          return html;
		        },
		        createScriptURL(scriptUrl) {
		          return scriptUrl;
		        }
		      });
		    } catch (_) {
		      // Policy creation failed (most likely another DOMPurify script has
		      // already run). Skip creating the policy, as this will only cause errors
		      // if TT are enforced.
		      console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
		      return null;
		    }
		  };
		  function createDOMPurify() {
		    let window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
		    const DOMPurify = root => createDOMPurify(root);

		    /**
		     * Version label, exposed for easier checks
		     * if DOMPurify is up to date or not
		     */
		    DOMPurify.version = '3.1.7';

		    /**
		     * Array of elements that DOMPurify removed during sanitation.
		     * Empty if nothing was removed.
		     */
		    DOMPurify.removed = [];
		    if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document) {
		      // Not running in a browser, provide a factory function
		      // so that you can pass your own Window
		      DOMPurify.isSupported = false;
		      return DOMPurify;
		    }
		    let {
		      document
		    } = window;
		    const originalDocument = document;
		    const currentScript = originalDocument.currentScript;
		    const {
		      DocumentFragment,
		      HTMLTemplateElement,
		      Node,
		      Element,
		      NodeFilter,
		      NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap,
		      HTMLFormElement,
		      DOMParser,
		      trustedTypes
		    } = window;
		    const ElementPrototype = Element.prototype;
		    const cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
		    const remove = lookupGetter(ElementPrototype, 'remove');
		    const getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
		    const getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
		    const getParentNode = lookupGetter(ElementPrototype, 'parentNode');

		    // As per issue #47, the web-components registry is inherited by a
		    // new document created via createHTMLDocument. As per the spec
		    // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
		    // a new empty registry is used when creating a template contents owner
		    // document, so we use that as our parent document to ensure nothing
		    // is inherited.
		    if (typeof HTMLTemplateElement === 'function') {
		      const template = document.createElement('template');
		      if (template.content && template.content.ownerDocument) {
		        document = template.content.ownerDocument;
		      }
		    }
		    let trustedTypesPolicy;
		    let emptyHTML = '';
		    const {
		      implementation,
		      createNodeIterator,
		      createDocumentFragment,
		      getElementsByTagName
		    } = document;
		    const {
		      importNode
		    } = originalDocument;
		    let hooks = {};

		    /**
		     * Expose whether this browser supports running the full DOMPurify.
		     */
		    DOMPurify.isSupported = typeof entries === 'function' && typeof getParentNode === 'function' && implementation && implementation.createHTMLDocument !== undefined;
		    const {
		      MUSTACHE_EXPR,
		      ERB_EXPR,
		      TMPLIT_EXPR,
		      DATA_ATTR,
		      ARIA_ATTR,
		      IS_SCRIPT_OR_DATA,
		      ATTR_WHITESPACE,
		      CUSTOM_ELEMENT
		    } = EXPRESSIONS;
		    let {
		      IS_ALLOWED_URI: IS_ALLOWED_URI$1
		    } = EXPRESSIONS;

		    /**
		     * We consider the elements and attributes below to be safe. Ideally
		     * don't add any new ones but feel free to remove unwanted ones.
		     */

		    /* allowed element names */
		    let ALLOWED_TAGS = null;
		    const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);

		    /* Allowed attribute names */
		    let ALLOWED_ATTR = null;
		    const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);

		    /*
		     * Configure how DOMPUrify should handle custom elements and their attributes as well as customized built-in elements.
		     * @property {RegExp|Function|null} tagNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any custom elements)
		     * @property {RegExp|Function|null} attributeNameCheck one of [null, regexPattern, predicate]. Default: `null` (disallow any attributes not on the allow list)
		     * @property {boolean} allowCustomizedBuiltInElements allow custom elements derived from built-ins if they pass CUSTOM_ELEMENT_HANDLING.tagNameCheck. Default: `false`.
		     */
		    let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
		      tagNameCheck: {
		        writable: true,
		        configurable: false,
		        enumerable: true,
		        value: null
		      },
		      attributeNameCheck: {
		        writable: true,
		        configurable: false,
		        enumerable: true,
		        value: null
		      },
		      allowCustomizedBuiltInElements: {
		        writable: true,
		        configurable: false,
		        enumerable: true,
		        value: false
		      }
		    }));

		    /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
		    let FORBID_TAGS = null;

		    /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
		    let FORBID_ATTR = null;

		    /* Decide if ARIA attributes are okay */
		    let ALLOW_ARIA_ATTR = true;

		    /* Decide if custom data attributes are okay */
		    let ALLOW_DATA_ATTR = true;

		    /* Decide if unknown protocols are okay */
		    let ALLOW_UNKNOWN_PROTOCOLS = false;

		    /* Decide if self-closing tags in attributes are allowed.
		     * Usually removed due to a mXSS issue in jQuery 3.0 */
		    let ALLOW_SELF_CLOSE_IN_ATTR = true;

		    /* Output should be safe for common template engines.
		     * This means, DOMPurify removes data attributes, mustaches and ERB
		     */
		    let SAFE_FOR_TEMPLATES = false;

		    /* Output should be safe even for XML used within HTML and alike.
		     * This means, DOMPurify removes comments when containing risky content.
		     */
		    let SAFE_FOR_XML = true;

		    /* Decide if document with <html>... should be returned */
		    let WHOLE_DOCUMENT = false;

		    /* Track whether config is already set on this instance of DOMPurify. */
		    let SET_CONFIG = false;

		    /* Decide if all elements (e.g. style, script) must be children of
		     * document.body. By default, browsers might move them to document.head */
		    let FORCE_BODY = false;

		    /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
		     * string (or a TrustedHTML object if Trusted Types are supported).
		     * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
		     */
		    let RETURN_DOM = false;

		    /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
		     * string  (or a TrustedHTML object if Trusted Types are supported) */
		    let RETURN_DOM_FRAGMENT = false;

		    /* Try to return a Trusted Type object instead of a string, return a string in
		     * case Trusted Types are not supported  */
		    let RETURN_TRUSTED_TYPE = false;

		    /* Output should be free from DOM clobbering attacks?
		     * This sanitizes markups named with colliding, clobberable built-in DOM APIs.
		     */
		    let SANITIZE_DOM = true;

		    /* Achieve full DOM Clobbering protection by isolating the namespace of named
		     * properties and JS variables, mitigating attacks that abuse the HTML/DOM spec rules.
		     *
		     * HTML/DOM spec rules that enable DOM Clobbering:
		     *   - Named Access on Window (§7.3.3)
		     *   - DOM Tree Accessors (§3.1.5)
		     *   - Form Element Parent-Child Relations (§4.10.3)
		     *   - Iframe srcdoc / Nested WindowProxies (§4.8.5)
		     *   - HTMLCollection (§4.2.10.2)
		     *
		     * Namespace isolation is implemented by prefixing `id` and `name` attributes
		     * with a constant string, i.e., `user-content-`
		     */
		    let SANITIZE_NAMED_PROPS = false;
		    const SANITIZE_NAMED_PROPS_PREFIX = 'user-content-';

		    /* Keep element content when removing element? */
		    let KEEP_CONTENT = true;

		    /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
		     * of importing it into a new Document and returning a sanitized copy */
		    let IN_PLACE = false;

		    /* Allow usage of profiles like html, svg and mathMl */
		    let USE_PROFILES = {};

		    /* Tags to ignore content of when KEEP_CONTENT is true */
		    let FORBID_CONTENTS = null;
		    const DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);

		    /* Tags that are safe for data: URIs */
		    let DATA_URI_TAGS = null;
		    const DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);

		    /* Attributes safe for values like "javascript:" */
		    let URI_SAFE_ATTRIBUTES = null;
		    const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);
		    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
		    const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
		    const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
		    /* Document namespace */
		    let NAMESPACE = HTML_NAMESPACE;
		    let IS_EMPTY_INPUT = false;

		    /* Allowed XHTML+XML namespaces */
		    let ALLOWED_NAMESPACES = null;
		    const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);

		    /* Parsing of strict XHTML documents */
		    let PARSER_MEDIA_TYPE = null;
		    const SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
		    const DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
		    let transformCaseFunc = null;

		    /* Keep a reference to config to pass to hooks */
		    let CONFIG = null;

		    /* Ideally, do not touch anything below this line */
		    /* ______________________________________________ */

		    const formElement = document.createElement('form');
		    const isRegexOrFunction = function isRegexOrFunction(testValue) {
		      return testValue instanceof RegExp || testValue instanceof Function;
		    };

		    /**
		     * _parseConfig
		     *
		     * @param  {Object} cfg optional config literal
		     */
		    // eslint-disable-next-line complexity
		    const _parseConfig = function _parseConfig() {
		      let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		      if (CONFIG && CONFIG === cfg) {
		        return;
		      }

		      /* Shield configuration object from tampering */
		      if (!cfg || typeof cfg !== 'object') {
		        cfg = {};
		      }

		      /* Shield configuration object from prototype pollution */
		      cfg = clone(cfg);
		      PARSER_MEDIA_TYPE =
		      // eslint-disable-next-line unicorn/prefer-includes
		      SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;

		      // HTML tags and attributes are not case-sensitive, converting to lowercase. Keeping XHTML as is.
		      transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? stringToString : stringToLowerCase;

		      /* Set configuration parameters */
		      ALLOWED_TAGS = objectHasOwnProperty(cfg, 'ALLOWED_TAGS') ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
		      ALLOWED_ATTR = objectHasOwnProperty(cfg, 'ALLOWED_ATTR') ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
		      ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, 'ALLOWED_NAMESPACES') ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
		      URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, 'ADD_URI_SAFE_ATTR') ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES),
		      // eslint-disable-line indent
		      cfg.ADD_URI_SAFE_ATTR,
		      // eslint-disable-line indent
		      transformCaseFunc // eslint-disable-line indent
		      ) // eslint-disable-line indent
		      : DEFAULT_URI_SAFE_ATTRIBUTES;
		      DATA_URI_TAGS = objectHasOwnProperty(cfg, 'ADD_DATA_URI_TAGS') ? addToSet(clone(DEFAULT_DATA_URI_TAGS),
		      // eslint-disable-line indent
		      cfg.ADD_DATA_URI_TAGS,
		      // eslint-disable-line indent
		      transformCaseFunc // eslint-disable-line indent
		      ) // eslint-disable-line indent
		      : DEFAULT_DATA_URI_TAGS;
		      FORBID_CONTENTS = objectHasOwnProperty(cfg, 'FORBID_CONTENTS') ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
		      FORBID_TAGS = objectHasOwnProperty(cfg, 'FORBID_TAGS') ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : {};
		      FORBID_ATTR = objectHasOwnProperty(cfg, 'FORBID_ATTR') ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : {};
		      USE_PROFILES = objectHasOwnProperty(cfg, 'USE_PROFILES') ? cfg.USE_PROFILES : false;
		      ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
		      ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
		      ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
		      ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false; // Default true
		      SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
		      SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false; // Default true
		      WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
		      RETURN_DOM = cfg.RETURN_DOM || false; // Default false
		      RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
		      RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
		      FORCE_BODY = cfg.FORCE_BODY || false; // Default false
		      SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
		      SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false; // Default false
		      KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
		      IN_PLACE = cfg.IN_PLACE || false; // Default false
		      IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
		      NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
		      CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
		      if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
		        CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
		      }
		      if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
		        CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
		      }
		      if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
		        CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
		      }
		      if (SAFE_FOR_TEMPLATES) {
		        ALLOW_DATA_ATTR = false;
		      }
		      if (RETURN_DOM_FRAGMENT) {
		        RETURN_DOM = true;
		      }

		      /* Parse profile info */
		      if (USE_PROFILES) {
		        ALLOWED_TAGS = addToSet({}, text);
		        ALLOWED_ATTR = [];
		        if (USE_PROFILES.html === true) {
		          addToSet(ALLOWED_TAGS, html$1);
		          addToSet(ALLOWED_ATTR, html);
		        }
		        if (USE_PROFILES.svg === true) {
		          addToSet(ALLOWED_TAGS, svg$1);
		          addToSet(ALLOWED_ATTR, svg);
		          addToSet(ALLOWED_ATTR, xml);
		        }
		        if (USE_PROFILES.svgFilters === true) {
		          addToSet(ALLOWED_TAGS, svgFilters);
		          addToSet(ALLOWED_ATTR, svg);
		          addToSet(ALLOWED_ATTR, xml);
		        }
		        if (USE_PROFILES.mathMl === true) {
		          addToSet(ALLOWED_TAGS, mathMl$1);
		          addToSet(ALLOWED_ATTR, mathMl);
		          addToSet(ALLOWED_ATTR, xml);
		        }
		      }

		      /* Merge configuration parameters */
		      if (cfg.ADD_TAGS) {
		        if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
		          ALLOWED_TAGS = clone(ALLOWED_TAGS);
		        }
		        addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
		      }
		      if (cfg.ADD_ATTR) {
		        if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
		          ALLOWED_ATTR = clone(ALLOWED_ATTR);
		        }
		        addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
		      }
		      if (cfg.ADD_URI_SAFE_ATTR) {
		        addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
		      }
		      if (cfg.FORBID_CONTENTS) {
		        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
		          FORBID_CONTENTS = clone(FORBID_CONTENTS);
		        }
		        addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
		      }

		      /* Add #text in case KEEP_CONTENT is set to true */
		      if (KEEP_CONTENT) {
		        ALLOWED_TAGS['#text'] = true;
		      }

		      /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
		      if (WHOLE_DOCUMENT) {
		        addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
		      }

		      /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
		      if (ALLOWED_TAGS.table) {
		        addToSet(ALLOWED_TAGS, ['tbody']);
		        delete FORBID_TAGS.tbody;
		      }
		      if (cfg.TRUSTED_TYPES_POLICY) {
		        if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== 'function') {
		          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
		        }
		        if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== 'function') {
		          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
		        }

		        // Overwrite existing TrustedTypes policy.
		        trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;

		        // Sign local variables required by `sanitize`.
		        emptyHTML = trustedTypesPolicy.createHTML('');
		      } else {
		        // Uninitialized policy, attempt to initialize the internal dompurify policy.
		        if (trustedTypesPolicy === undefined) {
		          trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
		        }

		        // If creating the internal policy succeeded sign internal variables.
		        if (trustedTypesPolicy !== null && typeof emptyHTML === 'string') {
		          emptyHTML = trustedTypesPolicy.createHTML('');
		        }
		      }

		      // Prevent further manipulation of configuration.
		      // Not available in IE8, Safari 5, etc.
		      if (freeze) {
		        freeze(cfg);
		      }
		      CONFIG = cfg;
		    };
		    const MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);
		    const HTML_INTEGRATION_POINTS = addToSet({}, ['annotation-xml']);

		    // Certain elements are allowed in both SVG and HTML
		    // namespace. We need to specify them explicitly
		    // so that they don't get erroneously deleted from
		    // HTML namespace.
		    const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ['title', 'style', 'font', 'a', 'script']);

		    /* Keep track of all possible SVG and MathML tags
		     * so that we can perform the namespace checks
		     * correctly. */
		    const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
		    const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);

		    /**
		     * @param  {Element} element a DOM element whose namespace is being checked
		     * @returns {boolean} Return false if the element has a
		     *  namespace that a spec-compliant parser would never
		     *  return. Return true otherwise.
		     */
		    const _checkValidNamespace = function _checkValidNamespace(element) {
		      let parent = getParentNode(element);

		      // In JSDOM, if we're inside shadow DOM, then parentNode
		      // can be null. We just simulate parent in this case.
		      if (!parent || !parent.tagName) {
		        parent = {
		          namespaceURI: NAMESPACE,
		          tagName: 'template'
		        };
		      }
		      const tagName = stringToLowerCase(element.tagName);
		      const parentTagName = stringToLowerCase(parent.tagName);
		      if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
		        return false;
		      }
		      if (element.namespaceURI === SVG_NAMESPACE) {
		        // The only way to switch from HTML namespace to SVG
		        // is via <svg>. If it happens via any other tag, then
		        // it should be killed.
		        if (parent.namespaceURI === HTML_NAMESPACE) {
		          return tagName === 'svg';
		        }

		        // The only way to switch from MathML to SVG is via`
		        // svg if parent is either <annotation-xml> or MathML
		        // text integration points.
		        if (parent.namespaceURI === MATHML_NAMESPACE) {
		          return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
		        }

		        // We only allow elements that are defined in SVG
		        // spec. All others are disallowed in SVG namespace.
		        return Boolean(ALL_SVG_TAGS[tagName]);
		      }
		      if (element.namespaceURI === MATHML_NAMESPACE) {
		        // The only way to switch from HTML namespace to MathML
		        // is via <math>. If it happens via any other tag, then
		        // it should be killed.
		        if (parent.namespaceURI === HTML_NAMESPACE) {
		          return tagName === 'math';
		        }

		        // The only way to switch from SVG to MathML is via
		        // <math> and HTML integration points
		        if (parent.namespaceURI === SVG_NAMESPACE) {
		          return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
		        }

		        // We only allow elements that are defined in MathML
		        // spec. All others are disallowed in MathML namespace.
		        return Boolean(ALL_MATHML_TAGS[tagName]);
		      }
		      if (element.namespaceURI === HTML_NAMESPACE) {
		        // The only way to switch from SVG to HTML is via
		        // HTML integration points, and from MathML to HTML
		        // is via MathML text integration points
		        if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
		          return false;
		        }
		        if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
		          return false;
		        }

		        // We disallow tags that are specific for MathML
		        // or SVG and should never appear in HTML namespace
		        return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
		      }

		      // For XHTML and XML documents that support custom namespaces
		      if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && ALLOWED_NAMESPACES[element.namespaceURI]) {
		        return true;
		      }

		      // The code should never reach this place (this means
		      // that the element somehow got namespace that is not
		      // HTML, SVG, MathML or allowed via ALLOWED_NAMESPACES).
		      // Return false just in case.
		      return false;
		    };

		    /**
		     * _forceRemove
		     *
		     * @param  {Node} node a DOM node
		     */
		    const _forceRemove = function _forceRemove(node) {
		      arrayPush(DOMPurify.removed, {
		        element: node
		      });
		      try {
		        // eslint-disable-next-line unicorn/prefer-dom-node-remove
		        getParentNode(node).removeChild(node);
		      } catch (_) {
		        remove(node);
		      }
		    };

		    /**
		     * _removeAttribute
		     *
		     * @param  {String} name an Attribute name
		     * @param  {Node} node a DOM node
		     */
		    const _removeAttribute = function _removeAttribute(name, node) {
		      try {
		        arrayPush(DOMPurify.removed, {
		          attribute: node.getAttributeNode(name),
		          from: node
		        });
		      } catch (_) {
		        arrayPush(DOMPurify.removed, {
		          attribute: null,
		          from: node
		        });
		      }
		      node.removeAttribute(name);

		      // We void attribute values for unremovable "is"" attributes
		      if (name === 'is' && !ALLOWED_ATTR[name]) {
		        if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
		          try {
		            _forceRemove(node);
		          } catch (_) {}
		        } else {
		          try {
		            node.setAttribute(name, '');
		          } catch (_) {}
		        }
		      }
		    };

		    /**
		     * _initDocument
		     *
		     * @param  {String} dirty a string of dirty markup
		     * @return {Document} a DOM, filled with the dirty markup
		     */
		    const _initDocument = function _initDocument(dirty) {
		      /* Create a HTML document */
		      let doc = null;
		      let leadingWhitespace = null;
		      if (FORCE_BODY) {
		        dirty = '<remove></remove>' + dirty;
		      } else {
		        /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
		        const matches = stringMatch(dirty, /^[\r\n\t ]+/);
		        leadingWhitespace = matches && matches[0];
		      }
		      if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && NAMESPACE === HTML_NAMESPACE) {
		        // Root of XHTML doc must contain xmlns declaration (see https://www.w3.org/TR/xhtml1/normative.html#strict)
		        dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
		      }
		      const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
		      /*
		       * Use the DOMParser API by default, fallback later if needs be
		       * DOMParser not work for svg when has multiple root element.
		       */
		      if (NAMESPACE === HTML_NAMESPACE) {
		        try {
		          doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
		        } catch (_) {}
		      }

		      /* Use createHTMLDocument in case DOMParser is not available */
		      if (!doc || !doc.documentElement) {
		        doc = implementation.createDocument(NAMESPACE, 'template', null);
		        try {
		          doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
		        } catch (_) {
		          // Syntax error if dirtyPayload is invalid xml
		        }
		      }
		      const body = doc.body || doc.documentElement;
		      if (dirty && leadingWhitespace) {
		        body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
		      }

		      /* Work on whole document or just its body */
		      if (NAMESPACE === HTML_NAMESPACE) {
		        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
		      }
		      return WHOLE_DOCUMENT ? doc.documentElement : body;
		    };

		    /**
		     * Creates a NodeIterator object that you can use to traverse filtered lists of nodes or elements in a document.
		     *
		     * @param  {Node} root The root element or node to start traversing on.
		     * @return {NodeIterator} The created NodeIterator
		     */
		    const _createNodeIterator = function _createNodeIterator(root) {
		      return createNodeIterator.call(root.ownerDocument || root, root,
		      // eslint-disable-next-line no-bitwise
		      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
		    };

		    /**
		     * _isClobbered
		     *
		     * @param  {Node} elm element to check for clobbering attacks
		     * @return {Boolean} true if clobbered, false if safe
		     */
		    const _isClobbered = function _isClobbered(elm) {
		      return elm instanceof HTMLFormElement && (typeof elm.nodeName !== 'string' || typeof elm.textContent !== 'string' || typeof elm.removeChild !== 'function' || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== 'function' || typeof elm.setAttribute !== 'function' || typeof elm.namespaceURI !== 'string' || typeof elm.insertBefore !== 'function' || typeof elm.hasChildNodes !== 'function');
		    };

		    /**
		     * Checks whether the given object is a DOM node.
		     *
		     * @param  {Node} object object to check whether it's a DOM node
		     * @return {Boolean} true is object is a DOM node
		     */
		    const _isNode = function _isNode(object) {
		      return typeof Node === 'function' && object instanceof Node;
		    };

		    /**
		     * _executeHook
		     * Execute user configurable hooks
		     *
		     * @param  {String} entryPoint  Name of the hook's entry point
		     * @param  {Node} currentNode node to work on with the hook
		     * @param  {Object} data additional hook parameters
		     */
		    const _executeHook = function _executeHook(entryPoint, currentNode, data) {
		      if (!hooks[entryPoint]) {
		        return;
		      }
		      arrayForEach(hooks[entryPoint], hook => {
		        hook.call(DOMPurify, currentNode, data, CONFIG);
		      });
		    };

		    /**
		     * _sanitizeElements
		     *
		     * @protect nodeName
		     * @protect textContent
		     * @protect removeChild
		     *
		     * @param   {Node} currentNode to check for permission to exist
		     * @return  {Boolean} true if node was killed, false if left alive
		     */
		    const _sanitizeElements = function _sanitizeElements(currentNode) {
		      let content = null;

		      /* Execute a hook if present */
		      _executeHook('beforeSanitizeElements', currentNode, null);

		      /* Check if element is clobbered or can clobber */
		      if (_isClobbered(currentNode)) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Now let's check the element's type and name */
		      const tagName = transformCaseFunc(currentNode.nodeName);

		      /* Execute a hook if present */
		      _executeHook('uponSanitizeElement', currentNode, {
		        tagName,
		        allowedTags: ALLOWED_TAGS
		      });

		      /* Detect mXSS attempts abusing namespace confusion */
		      if (currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w]/g, currentNode.innerHTML) && regExpTest(/<[/\w]/g, currentNode.textContent)) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Remove any occurrence of processing instructions */
		      if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Remove any kind of possibly harmful comments */
		      if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Remove element if anything forbids its presence */
		      if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
		        /* Check if we have a custom element to handle */
		        if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
		          if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
		            return false;
		          }
		          if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
		            return false;
		          }
		        }

		        /* Keep content except for bad-listed elements */
		        if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
		          const parentNode = getParentNode(currentNode) || currentNode.parentNode;
		          const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
		          if (childNodes && parentNode) {
		            const childCount = childNodes.length;
		            for (let i = childCount - 1; i >= 0; --i) {
		              const childClone = cloneNode(childNodes[i], true);
		              childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
		              parentNode.insertBefore(childClone, getNextSibling(currentNode));
		            }
		          }
		        }
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Check whether element has a valid namespace */
		      if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Make sure that older browsers don't get fallback-tag mXSS */
		      if ((tagName === 'noscript' || tagName === 'noembed' || tagName === 'noframes') && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
		        _forceRemove(currentNode);
		        return true;
		      }

		      /* Sanitize element content to be template-safe */
		      if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
		        /* Get the element's text content */
		        content = currentNode.textContent;
		        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
		          content = stringReplace(content, expr, ' ');
		        });
		        if (currentNode.textContent !== content) {
		          arrayPush(DOMPurify.removed, {
		            element: currentNode.cloneNode()
		          });
		          currentNode.textContent = content;
		        }
		      }

		      /* Execute a hook if present */
		      _executeHook('afterSanitizeElements', currentNode, null);
		      return false;
		    };

		    /**
		     * _isValidAttribute
		     *
		     * @param  {string} lcTag Lowercase tag name of containing element.
		     * @param  {string} lcName Lowercase attribute name.
		     * @param  {string} value Attribute value.
		     * @return {Boolean} Returns true if `value` is valid, otherwise false.
		     */
		    // eslint-disable-next-line complexity
		    const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
		      /* Make sure attribute cannot clobber */
		      if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
		        return false;
		      }

		      /* Allow valid data-* attributes: At least one character after "-"
		          (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
		          XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
		          We don't need to check the value; it's always URI safe. */
		      if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
		        if (
		        // First condition does a very basic check if a) it's basically a valid custom element tagname AND
		        // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
		        // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
		        _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName)) ||
		        // Alternative, second condition checks if it's an `is`-attribute, AND
		        // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
		        lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ; else {
		          return false;
		        }
		        /* Check value is safe. First, is attr inert? If so, is safe */
		      } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if (value) {
		        return false;
		      } else ;
		      return true;
		    };

		    /**
		     * _isBasicCustomElement
		     * checks if at least one dash is included in tagName, and it's not the first char
		     * for more sophisticated checking see https://github.com/sindresorhus/validate-element-name
		     *
		     * @param {string} tagName name of the tag of the node to sanitize
		     * @returns {boolean} Returns true if the tag name meets the basic criteria for a custom element, otherwise false.
		     */
		    const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
		      return tagName !== 'annotation-xml' && stringMatch(tagName, CUSTOM_ELEMENT);
		    };

		    /**
		     * _sanitizeAttributes
		     *
		     * @protect attributes
		     * @protect nodeName
		     * @protect removeAttribute
		     * @protect setAttribute
		     *
		     * @param  {Node} currentNode to sanitize
		     */
		    const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
		      /* Execute a hook if present */
		      _executeHook('beforeSanitizeAttributes', currentNode, null);
		      const {
		        attributes
		      } = currentNode;

		      /* Check if we have attributes; if not we might have a text node */
		      if (!attributes) {
		        return;
		      }
		      const hookEvent = {
		        attrName: '',
		        attrValue: '',
		        keepAttr: true,
		        allowedAttributes: ALLOWED_ATTR
		      };
		      let l = attributes.length;

		      /* Go backwards over all attributes; safely remove bad ones */
		      while (l--) {
		        const attr = attributes[l];
		        const {
		          name,
		          namespaceURI,
		          value: attrValue
		        } = attr;
		        const lcName = transformCaseFunc(name);
		        let value = name === 'value' ? attrValue : stringTrim(attrValue);

		        /* Execute a hook if present */
		        hookEvent.attrName = lcName;
		        hookEvent.attrValue = value;
		        hookEvent.keepAttr = true;
		        hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
		        _executeHook('uponSanitizeAttribute', currentNode, hookEvent);
		        value = hookEvent.attrValue;

		        /* Did the hooks approve of the attribute? */
		        if (hookEvent.forceKeepAttr) {
		          continue;
		        }

		        /* Remove attribute */
		        _removeAttribute(name, currentNode);

		        /* Did the hooks approve of the attribute? */
		        if (!hookEvent.keepAttr) {
		          continue;
		        }

		        /* Work around a security issue in jQuery 3.0 */
		        if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
		          _removeAttribute(name, currentNode);
		          continue;
		        }

		        /* Sanitize attribute content to be template-safe */
		        if (SAFE_FOR_TEMPLATES) {
		          arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
		            value = stringReplace(value, expr, ' ');
		          });
		        }

		        /* Is `value` valid for this attribute? */
		        const lcTag = transformCaseFunc(currentNode.nodeName);
		        if (!_isValidAttribute(lcTag, lcName, value)) {
		          continue;
		        }

		        /* Full DOM Clobbering protection via namespace isolation,
		         * Prefix id and name attributes with `user-content-`
		         */
		        if (SANITIZE_NAMED_PROPS && (lcName === 'id' || lcName === 'name')) {
		          // Remove the attribute with this value
		          _removeAttribute(name, currentNode);

		          // Prefix the value and later re-create the attribute with the sanitized value
		          value = SANITIZE_NAMED_PROPS_PREFIX + value;
		        }

		        /* Work around a security issue with comments inside attributes */
		        if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title)/i, value)) {
		          _removeAttribute(name, currentNode);
		          continue;
		        }

		        /* Handle attributes that require Trusted Types */
		        if (trustedTypesPolicy && typeof trustedTypes === 'object' && typeof trustedTypes.getAttributeType === 'function') {
		          if (namespaceURI) ; else {
		            switch (trustedTypes.getAttributeType(lcTag, lcName)) {
		              case 'TrustedHTML':
		                {
		                  value = trustedTypesPolicy.createHTML(value);
		                  break;
		                }
		              case 'TrustedScriptURL':
		                {
		                  value = trustedTypesPolicy.createScriptURL(value);
		                  break;
		                }
		            }
		          }
		        }

		        /* Handle invalid data-* attribute set by try-catching it */
		        try {
		          if (namespaceURI) {
		            currentNode.setAttributeNS(namespaceURI, name, value);
		          } else {
		            /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
		            currentNode.setAttribute(name, value);
		          }
		          if (_isClobbered(currentNode)) {
		            _forceRemove(currentNode);
		          } else {
		            arrayPop(DOMPurify.removed);
		          }
		        } catch (_) {}
		      }

		      /* Execute a hook if present */
		      _executeHook('afterSanitizeAttributes', currentNode, null);
		    };

		    /**
		     * _sanitizeShadowDOM
		     *
		     * @param  {DocumentFragment} fragment to iterate over recursively
		     */
		    const _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
		      let shadowNode = null;
		      const shadowIterator = _createNodeIterator(fragment);

		      /* Execute a hook if present */
		      _executeHook('beforeSanitizeShadowDOM', fragment, null);
		      while (shadowNode = shadowIterator.nextNode()) {
		        /* Execute a hook if present */
		        _executeHook('uponSanitizeShadowNode', shadowNode, null);

		        /* Sanitize tags and elements */
		        if (_sanitizeElements(shadowNode)) {
		          continue;
		        }

		        /* Deep shadow DOM detected */
		        if (shadowNode.content instanceof DocumentFragment) {
		          _sanitizeShadowDOM(shadowNode.content);
		        }

		        /* Check attributes, sanitize if necessary */
		        _sanitizeAttributes(shadowNode);
		      }

		      /* Execute a hook if present */
		      _executeHook('afterSanitizeShadowDOM', fragment, null);
		    };

		    /**
		     * Sanitize
		     * Public method providing core sanitation functionality
		     *
		     * @param {String|Node} dirty string or DOM node
		     * @param {Object} cfg object
		     */
		    // eslint-disable-next-line complexity
		    DOMPurify.sanitize = function (dirty) {
		      let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
		      let body = null;
		      let importedNode = null;
		      let currentNode = null;
		      let returnNode = null;
		      /* Make sure we have a string to sanitize.
		        DO NOT return early, as this will return the wrong type if
		        the user has requested a DOM object rather than a string */
		      IS_EMPTY_INPUT = !dirty;
		      if (IS_EMPTY_INPUT) {
		        dirty = '<!-->';
		      }

		      /* Stringify, in case dirty is an object */
		      if (typeof dirty !== 'string' && !_isNode(dirty)) {
		        if (typeof dirty.toString === 'function') {
		          dirty = dirty.toString();
		          if (typeof dirty !== 'string') {
		            throw typeErrorCreate('dirty is not a string, aborting');
		          }
		        } else {
		          throw typeErrorCreate('toString is not a function');
		        }
		      }

		      /* Return dirty HTML if DOMPurify cannot run */
		      if (!DOMPurify.isSupported) {
		        return dirty;
		      }

		      /* Assign config vars */
		      if (!SET_CONFIG) {
		        _parseConfig(cfg);
		      }

		      /* Clean up removed elements */
		      DOMPurify.removed = [];

		      /* Check if dirty is correctly typed for IN_PLACE */
		      if (typeof dirty === 'string') {
		        IN_PLACE = false;
		      }
		      if (IN_PLACE) {
		        /* Do some early pre-sanitization to avoid unsafe root nodes */
		        if (dirty.nodeName) {
		          const tagName = transformCaseFunc(dirty.nodeName);
		          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
		            throw typeErrorCreate('root node is forbidden and cannot be sanitized in-place');
		          }
		        }
		      } else if (dirty instanceof Node) {
		        /* If dirty is a DOM element, append to an empty document to avoid
		           elements being stripped by the parser */
		        body = _initDocument('<!---->');
		        importedNode = body.ownerDocument.importNode(dirty, true);
		        if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === 'BODY') {
		          /* Node is already a body, use as is */
		          body = importedNode;
		        } else if (importedNode.nodeName === 'HTML') {
		          body = importedNode;
		        } else {
		          // eslint-disable-next-line unicorn/prefer-dom-node-append
		          body.appendChild(importedNode);
		        }
		      } else {
		        /* Exit directly if we have nothing to do */
		        if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
		        // eslint-disable-next-line unicorn/prefer-includes
		        dirty.indexOf('<') === -1) {
		          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
		        }

		        /* Initialize the document to work on */
		        body = _initDocument(dirty);

		        /* Check we have a DOM node from the data */
		        if (!body) {
		          return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : '';
		        }
		      }

		      /* Remove first element node (ours) if FORCE_BODY is set */
		      if (body && FORCE_BODY) {
		        _forceRemove(body.firstChild);
		      }

		      /* Get node iterator */
		      const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);

		      /* Now start iterating over the created document */
		      while (currentNode = nodeIterator.nextNode()) {
		        /* Sanitize tags and elements */
		        if (_sanitizeElements(currentNode)) {
		          continue;
		        }

		        /* Shadow DOM detected, sanitize it */
		        if (currentNode.content instanceof DocumentFragment) {
		          _sanitizeShadowDOM(currentNode.content);
		        }

		        /* Check attributes, sanitize if necessary */
		        _sanitizeAttributes(currentNode);
		      }

		      /* If we sanitized `dirty` in-place, return it. */
		      if (IN_PLACE) {
		        return dirty;
		      }

		      /* Return sanitized string or DOM */
		      if (RETURN_DOM) {
		        if (RETURN_DOM_FRAGMENT) {
		          returnNode = createDocumentFragment.call(body.ownerDocument);
		          while (body.firstChild) {
		            // eslint-disable-next-line unicorn/prefer-dom-node-append
		            returnNode.appendChild(body.firstChild);
		          }
		        } else {
		          returnNode = body;
		        }
		        if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
		          /*
		            AdoptNode() is not used because internal state is not reset
		            (e.g. the past names map of a HTMLFormElement), this is safe
		            in theory but we would rather not risk another attack vector.
		            The state that is cloned by importNode() is explicitly defined
		            by the specs.
		          */
		          returnNode = importNode.call(originalDocument, returnNode, true);
		        }
		        return returnNode;
		      }
		      let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;

		      /* Serialize doctype if allowed */
		      if (WHOLE_DOCUMENT && ALLOWED_TAGS['!doctype'] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
		        serializedHTML = '<!DOCTYPE ' + body.ownerDocument.doctype.name + '>\n' + serializedHTML;
		      }

		      /* Sanitize final string template-safe */
		      if (SAFE_FOR_TEMPLATES) {
		        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
		          serializedHTML = stringReplace(serializedHTML, expr, ' ');
		        });
		      }
		      return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
		    };

		    /**
		     * Public method to set the configuration once
		     * setConfig
		     *
		     * @param {Object} cfg configuration object
		     */
		    DOMPurify.setConfig = function () {
		      let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
		      _parseConfig(cfg);
		      SET_CONFIG = true;
		    };

		    /**
		     * Public method to remove the configuration
		     * clearConfig
		     *
		     */
		    DOMPurify.clearConfig = function () {
		      CONFIG = null;
		      SET_CONFIG = false;
		    };

		    /**
		     * Public method to check if an attribute value is valid.
		     * Uses last set config, if any. Otherwise, uses config defaults.
		     * isValidAttribute
		     *
		     * @param  {String} tag Tag name of containing element.
		     * @param  {String} attr Attribute name.
		     * @param  {String} value Attribute value.
		     * @return {Boolean} Returns true if `value` is valid. Otherwise, returns false.
		     */
		    DOMPurify.isValidAttribute = function (tag, attr, value) {
		      /* Initialize shared config vars if necessary. */
		      if (!CONFIG) {
		        _parseConfig({});
		      }
		      const lcTag = transformCaseFunc(tag);
		      const lcName = transformCaseFunc(attr);
		      return _isValidAttribute(lcTag, lcName, value);
		    };

		    /**
		     * AddHook
		     * Public method to add DOMPurify hooks
		     *
		     * @param {String} entryPoint entry point for the hook to add
		     * @param {Function} hookFunction function to execute
		     */
		    DOMPurify.addHook = function (entryPoint, hookFunction) {
		      if (typeof hookFunction !== 'function') {
		        return;
		      }
		      hooks[entryPoint] = hooks[entryPoint] || [];
		      arrayPush(hooks[entryPoint], hookFunction);
		    };

		    /**
		     * RemoveHook
		     * Public method to remove a DOMPurify hook at a given entryPoint
		     * (pops it from the stack of hooks if more are present)
		     *
		     * @param {String} entryPoint entry point for the hook to remove
		     * @return {Function} removed(popped) hook
		     */
		    DOMPurify.removeHook = function (entryPoint) {
		      if (hooks[entryPoint]) {
		        return arrayPop(hooks[entryPoint]);
		      }
		    };

		    /**
		     * RemoveHooks
		     * Public method to remove all DOMPurify hooks at a given entryPoint
		     *
		     * @param  {String} entryPoint entry point for the hooks to remove
		     */
		    DOMPurify.removeHooks = function (entryPoint) {
		      if (hooks[entryPoint]) {
		        hooks[entryPoint] = [];
		      }
		    };

		    /**
		     * RemoveAllHooks
		     * Public method to remove all DOMPurify hooks
		     */
		    DOMPurify.removeAllHooks = function () {
		      hooks = {};
		    };
		    return DOMPurify;
		  }
		  var purify = createDOMPurify();

		  return purify;

		}));
		
	} (purify));

	var purifyExports = purify.exports;
	var DOMPurify = /*@__PURE__*/getDefaultExportFromCjs(purifyExports);

	/**
	 * marked v14.1.3 - a markdown parser
	 * Copyright (c) 2011-2024, Christopher Jeffrey. (MIT Licensed)
	 * https://github.com/markedjs/marked
	 */

	/**
	 * DO NOT EDIT THIS FILE
	 * The code in this file is generated from files in ./src/
	 */

	/**
	 * Gets the original marked default options.
	 */
	function _getDefaults() {
	    return {
	        async: false,
	        breaks: false,
	        extensions: null,
	        gfm: true,
	        hooks: null,
	        pedantic: false,
	        renderer: null,
	        silent: false,
	        tokenizer: null,
	        walkTokens: null,
	    };
	}
	let _defaults = _getDefaults();
	function changeDefaults(newDefaults) {
	    _defaults = newDefaults;
	}

	/**
	 * Helpers
	 */
	const escapeTest = /[&<>"']/;
	const escapeReplace = new RegExp(escapeTest.source, 'g');
	const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/;
	const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g');
	const escapeReplacements = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#39;',
	};
	const getEscapeReplacement = (ch) => escapeReplacements[ch];
	function escape$1(html, encode) {
	    if (encode) {
	        if (escapeTest.test(html)) {
	            return html.replace(escapeReplace, getEscapeReplacement);
	        }
	    }
	    else {
	        if (escapeTestNoEncode.test(html)) {
	            return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
	        }
	    }
	    return html;
	}
	const caret = /(^|[^\[])\^/g;
	function edit(regex, opt) {
	    let source = typeof regex === 'string' ? regex : regex.source;
	    opt = opt || '';
	    const obj = {
	        replace: (name, val) => {
	            let valSource = typeof val === 'string' ? val : val.source;
	            valSource = valSource.replace(caret, '$1');
	            source = source.replace(name, valSource);
	            return obj;
	        },
	        getRegex: () => {
	            return new RegExp(source, opt);
	        },
	    };
	    return obj;
	}
	function cleanUrl(href) {
	    try {
	        href = encodeURI(href).replace(/%25/g, '%');
	    }
	    catch {
	        return null;
	    }
	    return href;
	}
	const noopTest = { exec: () => null };
	function splitCells(tableRow, count) {
	    // ensure that every cell-delimiting pipe has a space
	    // before it to distinguish it from an escaped pipe
	    const row = tableRow.replace(/\|/g, (match, offset, str) => {
	        let escaped = false;
	        let curr = offset;
	        while (--curr >= 0 && str[curr] === '\\')
	            escaped = !escaped;
	        if (escaped) {
	            // odd number of slashes means | is escaped
	            // so we leave it alone
	            return '|';
	        }
	        else {
	            // add space before unescaped |
	            return ' |';
	        }
	    }), cells = row.split(/ \|/);
	    let i = 0;
	    // First/last cell in a row cannot be empty if it has no leading/trailing pipe
	    if (!cells[0].trim()) {
	        cells.shift();
	    }
	    if (cells.length > 0 && !cells[cells.length - 1].trim()) {
	        cells.pop();
	    }
	    if (count) {
	        if (cells.length > count) {
	            cells.splice(count);
	        }
	        else {
	            while (cells.length < count)
	                cells.push('');
	        }
	    }
	    for (; i < cells.length; i++) {
	        // leading or trailing whitespace is ignored per the gfm spec
	        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
	    }
	    return cells;
	}
	/**
	 * Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
	 * /c*$/ is vulnerable to REDOS.
	 *
	 * @param str
	 * @param c
	 * @param invert Remove suffix of non-c chars instead. Default falsey.
	 */
	function rtrim(str, c, invert) {
	    const l = str.length;
	    if (l === 0) {
	        return '';
	    }
	    // Length of suffix matching the invert condition.
	    let suffLen = 0;
	    // Step left until we fail to match the invert condition.
	    while (suffLen < l) {
	        const currChar = str.charAt(l - suffLen - 1);
	        if (currChar === c && !invert) {
	            suffLen++;
	        }
	        else if (currChar !== c && invert) {
	            suffLen++;
	        }
	        else {
	            break;
	        }
	    }
	    return str.slice(0, l - suffLen);
	}
	function findClosingBracket(str, b) {
	    if (str.indexOf(b[1]) === -1) {
	        return -1;
	    }
	    let level = 0;
	    for (let i = 0; i < str.length; i++) {
	        if (str[i] === '\\') {
	            i++;
	        }
	        else if (str[i] === b[0]) {
	            level++;
	        }
	        else if (str[i] === b[1]) {
	            level--;
	            if (level < 0) {
	                return i;
	            }
	        }
	    }
	    return -1;
	}

	function outputLink(cap, link, raw, lexer) {
	    const href = link.href;
	    const title = link.title ? escape$1(link.title) : null;
	    const text = cap[1].replace(/\\([\[\]])/g, '$1');
	    if (cap[0].charAt(0) !== '!') {
	        lexer.state.inLink = true;
	        const token = {
	            type: 'link',
	            raw,
	            href,
	            title,
	            text,
	            tokens: lexer.inlineTokens(text),
	        };
	        lexer.state.inLink = false;
	        return token;
	    }
	    return {
	        type: 'image',
	        raw,
	        href,
	        title,
	        text: escape$1(text),
	    };
	}
	function indentCodeCompensation(raw, text) {
	    const matchIndentToCode = raw.match(/^(\s+)(?:```)/);
	    if (matchIndentToCode === null) {
	        return text;
	    }
	    const indentToCode = matchIndentToCode[1];
	    return text
	        .split('\n')
	        .map(node => {
	        const matchIndentInNode = node.match(/^\s+/);
	        if (matchIndentInNode === null) {
	            return node;
	        }
	        const [indentInNode] = matchIndentInNode;
	        if (indentInNode.length >= indentToCode.length) {
	            return node.slice(indentToCode.length);
	        }
	        return node;
	    })
	        .join('\n');
	}
	/**
	 * Tokenizer
	 */
	class _Tokenizer {
	    options;
	    rules; // set by the lexer
	    lexer; // set by the lexer
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    space(src) {
	        const cap = this.rules.block.newline.exec(src);
	        if (cap && cap[0].length > 0) {
	            return {
	                type: 'space',
	                raw: cap[0],
	            };
	        }
	    }
	    code(src) {
	        const cap = this.rules.block.code.exec(src);
	        if (cap) {
	            const text = cap[0].replace(/^(?: {1,4}| {0,3}\t)/gm, '');
	            return {
	                type: 'code',
	                raw: cap[0],
	                codeBlockStyle: 'indented',
	                text: !this.options.pedantic
	                    ? rtrim(text, '\n')
	                    : text,
	            };
	        }
	    }
	    fences(src) {
	        const cap = this.rules.block.fences.exec(src);
	        if (cap) {
	            const raw = cap[0];
	            const text = indentCodeCompensation(raw, cap[3] || '');
	            return {
	                type: 'code',
	                raw,
	                lang: cap[2] ? cap[2].trim().replace(this.rules.inline.anyPunctuation, '$1') : cap[2],
	                text,
	            };
	        }
	    }
	    heading(src) {
	        const cap = this.rules.block.heading.exec(src);
	        if (cap) {
	            let text = cap[2].trim();
	            // remove trailing #s
	            if (/#$/.test(text)) {
	                const trimmed = rtrim(text, '#');
	                if (this.options.pedantic) {
	                    text = trimmed.trim();
	                }
	                else if (!trimmed || / $/.test(trimmed)) {
	                    // CommonMark requires space before trailing #s
	                    text = trimmed.trim();
	                }
	            }
	            return {
	                type: 'heading',
	                raw: cap[0],
	                depth: cap[1].length,
	                text,
	                tokens: this.lexer.inline(text),
	            };
	        }
	    }
	    hr(src) {
	        const cap = this.rules.block.hr.exec(src);
	        if (cap) {
	            return {
	                type: 'hr',
	                raw: rtrim(cap[0], '\n'),
	            };
	        }
	    }
	    blockquote(src) {
	        const cap = this.rules.block.blockquote.exec(src);
	        if (cap) {
	            let lines = rtrim(cap[0], '\n').split('\n');
	            let raw = '';
	            let text = '';
	            const tokens = [];
	            while (lines.length > 0) {
	                let inBlockquote = false;
	                const currentLines = [];
	                let i;
	                for (i = 0; i < lines.length; i++) {
	                    // get lines up to a continuation
	                    if (/^ {0,3}>/.test(lines[i])) {
	                        currentLines.push(lines[i]);
	                        inBlockquote = true;
	                    }
	                    else if (!inBlockquote) {
	                        currentLines.push(lines[i]);
	                    }
	                    else {
	                        break;
	                    }
	                }
	                lines = lines.slice(i);
	                const currentRaw = currentLines.join('\n');
	                const currentText = currentRaw
	                    // precede setext continuation with 4 spaces so it isn't a setext
	                    .replace(/\n {0,3}((?:=+|-+) *)(?=\n|$)/g, '\n    $1')
	                    .replace(/^ {0,3}>[ \t]?/gm, '');
	                raw = raw ? `${raw}\n${currentRaw}` : currentRaw;
	                text = text ? `${text}\n${currentText}` : currentText;
	                // parse blockquote lines as top level tokens
	                // merge paragraphs if this is a continuation
	                const top = this.lexer.state.top;
	                this.lexer.state.top = true;
	                this.lexer.blockTokens(currentText, tokens, true);
	                this.lexer.state.top = top;
	                // if there is no continuation then we are done
	                if (lines.length === 0) {
	                    break;
	                }
	                const lastToken = tokens[tokens.length - 1];
	                if (lastToken?.type === 'code') {
	                    // blockquote continuation cannot be preceded by a code block
	                    break;
	                }
	                else if (lastToken?.type === 'blockquote') {
	                    // include continuation in nested blockquote
	                    const oldToken = lastToken;
	                    const newText = oldToken.raw + '\n' + lines.join('\n');
	                    const newToken = this.blockquote(newText);
	                    tokens[tokens.length - 1] = newToken;
	                    raw = raw.substring(0, raw.length - oldToken.raw.length) + newToken.raw;
	                    text = text.substring(0, text.length - oldToken.text.length) + newToken.text;
	                    break;
	                }
	                else if (lastToken?.type === 'list') {
	                    // include continuation in nested list
	                    const oldToken = lastToken;
	                    const newText = oldToken.raw + '\n' + lines.join('\n');
	                    const newToken = this.list(newText);
	                    tokens[tokens.length - 1] = newToken;
	                    raw = raw.substring(0, raw.length - lastToken.raw.length) + newToken.raw;
	                    text = text.substring(0, text.length - oldToken.raw.length) + newToken.raw;
	                    lines = newText.substring(tokens[tokens.length - 1].raw.length).split('\n');
	                    continue;
	                }
	            }
	            return {
	                type: 'blockquote',
	                raw,
	                tokens,
	                text,
	            };
	        }
	    }
	    list(src) {
	        let cap = this.rules.block.list.exec(src);
	        if (cap) {
	            let bull = cap[1].trim();
	            const isordered = bull.length > 1;
	            const list = {
	                type: 'list',
	                raw: '',
	                ordered: isordered,
	                start: isordered ? +bull.slice(0, -1) : '',
	                loose: false,
	                items: [],
	            };
	            bull = isordered ? `\\d{1,9}\\${bull.slice(-1)}` : `\\${bull}`;
	            if (this.options.pedantic) {
	                bull = isordered ? bull : '[*+-]';
	            }
	            // Get next list item
	            const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
	            let endsWithBlankLine = false;
	            // Check if current bullet point can start a new List Item
	            while (src) {
	                let endEarly = false;
	                let raw = '';
	                let itemContents = '';
	                if (!(cap = itemRegex.exec(src))) {
	                    break;
	                }
	                if (this.rules.block.hr.test(src)) { // End list if bullet was actually HR (possibly move into itemRegex?)
	                    break;
	                }
	                raw = cap[0];
	                src = src.substring(raw.length);
	                let line = cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(3 * t.length));
	                let nextLine = src.split('\n', 1)[0];
	                let blankLine = !line.trim();
	                let indent = 0;
	                if (this.options.pedantic) {
	                    indent = 2;
	                    itemContents = line.trimStart();
	                }
	                else if (blankLine) {
	                    indent = cap[1].length + 1;
	                }
	                else {
	                    indent = cap[2].search(/[^ ]/); // Find first non-space char
	                    indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
	                    itemContents = line.slice(indent);
	                    indent += cap[1].length;
	                }
	                if (blankLine && /^[ \t]*$/.test(nextLine)) { // Items begin with at most one blank line
	                    raw += nextLine + '\n';
	                    src = src.substring(nextLine.length + 1);
	                    endEarly = true;
	                }
	                if (!endEarly) {
	                    const nextBulletRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`);
	                    const hrRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`);
	                    const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
	                    const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
	                    const htmlBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}<[a-z].*>`, 'i');
	                    // Check if following lines should be included in List Item
	                    while (src) {
	                        const rawLine = src.split('\n', 1)[0];
	                        let nextLineWithoutTabs;
	                        nextLine = rawLine;
	                        // Re-align to follow commonmark nesting rules
	                        if (this.options.pedantic) {
	                            nextLine = nextLine.replace(/^ {1,4}(?=( {4})*[^ ])/g, '  ');
	                            nextLineWithoutTabs = nextLine;
	                        }
	                        else {
	                            nextLineWithoutTabs = nextLine.replace(/\t/g, '    ');
	                        }
	                        // End list item if found code fences
	                        if (fencesBeginRegex.test(nextLine)) {
	                            break;
	                        }
	                        // End list item if found start of new heading
	                        if (headingBeginRegex.test(nextLine)) {
	                            break;
	                        }
	                        // End list item if found start of html block
	                        if (htmlBeginRegex.test(nextLine)) {
	                            break;
	                        }
	                        // End list item if found start of new bullet
	                        if (nextBulletRegex.test(nextLine)) {
	                            break;
	                        }
	                        // Horizontal rule found
	                        if (hrRegex.test(nextLine)) {
	                            break;
	                        }
	                        if (nextLineWithoutTabs.search(/[^ ]/) >= indent || !nextLine.trim()) { // Dedent if possible
	                            itemContents += '\n' + nextLineWithoutTabs.slice(indent);
	                        }
	                        else {
	                            // not enough indentation
	                            if (blankLine) {
	                                break;
	                            }
	                            // paragraph continuation unless last line was a different block level element
	                            if (line.replace(/\t/g, '    ').search(/[^ ]/) >= 4) { // indented code block
	                                break;
	                            }
	                            if (fencesBeginRegex.test(line)) {
	                                break;
	                            }
	                            if (headingBeginRegex.test(line)) {
	                                break;
	                            }
	                            if (hrRegex.test(line)) {
	                                break;
	                            }
	                            itemContents += '\n' + nextLine;
	                        }
	                        if (!blankLine && !nextLine.trim()) { // Check if current line is blank
	                            blankLine = true;
	                        }
	                        raw += rawLine + '\n';
	                        src = src.substring(rawLine.length + 1);
	                        line = nextLineWithoutTabs.slice(indent);
	                    }
	                }
	                if (!list.loose) {
	                    // If the previous item ended with a blank line, the list is loose
	                    if (endsWithBlankLine) {
	                        list.loose = true;
	                    }
	                    else if (/\n[ \t]*\n[ \t]*$/.test(raw)) {
	                        endsWithBlankLine = true;
	                    }
	                }
	                let istask = null;
	                let ischecked;
	                // Check for task list items
	                if (this.options.gfm) {
	                    istask = /^\[[ xX]\] /.exec(itemContents);
	                    if (istask) {
	                        ischecked = istask[0] !== '[ ] ';
	                        itemContents = itemContents.replace(/^\[[ xX]\] +/, '');
	                    }
	                }
	                list.items.push({
	                    type: 'list_item',
	                    raw,
	                    task: !!istask,
	                    checked: ischecked,
	                    loose: false,
	                    text: itemContents,
	                    tokens: [],
	                });
	                list.raw += raw;
	            }
	            // Do not consume newlines at end of final item. Alternatively, make itemRegex *start* with any newlines to simplify/speed up endsWithBlankLine logic
	            list.items[list.items.length - 1].raw = list.items[list.items.length - 1].raw.trimEnd();
	            list.items[list.items.length - 1].text = list.items[list.items.length - 1].text.trimEnd();
	            list.raw = list.raw.trimEnd();
	            // Item child tokens handled here at end because we needed to have the final item to trim it first
	            for (let i = 0; i < list.items.length; i++) {
	                this.lexer.state.top = false;
	                list.items[i].tokens = this.lexer.blockTokens(list.items[i].text, []);
	                if (!list.loose) {
	                    // Check if list should be loose
	                    const spacers = list.items[i].tokens.filter(t => t.type === 'space');
	                    const hasMultipleLineBreaks = spacers.length > 0 && spacers.some(t => /\n.*\n/.test(t.raw));
	                    list.loose = hasMultipleLineBreaks;
	                }
	            }
	            // Set all items to loose if list is loose
	            if (list.loose) {
	                for (let i = 0; i < list.items.length; i++) {
	                    list.items[i].loose = true;
	                }
	            }
	            return list;
	        }
	    }
	    html(src) {
	        const cap = this.rules.block.html.exec(src);
	        if (cap) {
	            const token = {
	                type: 'html',
	                block: true,
	                raw: cap[0],
	                pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
	                text: cap[0],
	            };
	            return token;
	        }
	    }
	    def(src) {
	        const cap = this.rules.block.def.exec(src);
	        if (cap) {
	            const tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
	            const href = cap[2] ? cap[2].replace(/^<(.*)>$/, '$1').replace(this.rules.inline.anyPunctuation, '$1') : '';
	            const title = cap[3] ? cap[3].substring(1, cap[3].length - 1).replace(this.rules.inline.anyPunctuation, '$1') : cap[3];
	            return {
	                type: 'def',
	                tag,
	                raw: cap[0],
	                href,
	                title,
	            };
	        }
	    }
	    table(src) {
	        const cap = this.rules.block.table.exec(src);
	        if (!cap) {
	            return;
	        }
	        if (!/[:|]/.test(cap[2])) {
	            // delimiter row must have a pipe (|) or colon (:) otherwise it is a setext heading
	            return;
	        }
	        const headers = splitCells(cap[1]);
	        const aligns = cap[2].replace(/^\||\| *$/g, '').split('|');
	        const rows = cap[3] && cap[3].trim() ? cap[3].replace(/\n[ \t]*$/, '').split('\n') : [];
	        const item = {
	            type: 'table',
	            raw: cap[0],
	            header: [],
	            align: [],
	            rows: [],
	        };
	        if (headers.length !== aligns.length) {
	            // header and align columns must be equal, rows can be different.
	            return;
	        }
	        for (const align of aligns) {
	            if (/^ *-+: *$/.test(align)) {
	                item.align.push('right');
	            }
	            else if (/^ *:-+: *$/.test(align)) {
	                item.align.push('center');
	            }
	            else if (/^ *:-+ *$/.test(align)) {
	                item.align.push('left');
	            }
	            else {
	                item.align.push(null);
	            }
	        }
	        for (let i = 0; i < headers.length; i++) {
	            item.header.push({
	                text: headers[i],
	                tokens: this.lexer.inline(headers[i]),
	                header: true,
	                align: item.align[i],
	            });
	        }
	        for (const row of rows) {
	            item.rows.push(splitCells(row, item.header.length).map((cell, i) => {
	                return {
	                    text: cell,
	                    tokens: this.lexer.inline(cell),
	                    header: false,
	                    align: item.align[i],
	                };
	            }));
	        }
	        return item;
	    }
	    lheading(src) {
	        const cap = this.rules.block.lheading.exec(src);
	        if (cap) {
	            return {
	                type: 'heading',
	                raw: cap[0],
	                depth: cap[2].charAt(0) === '=' ? 1 : 2,
	                text: cap[1],
	                tokens: this.lexer.inline(cap[1]),
	            };
	        }
	    }
	    paragraph(src) {
	        const cap = this.rules.block.paragraph.exec(src);
	        if (cap) {
	            const text = cap[1].charAt(cap[1].length - 1) === '\n'
	                ? cap[1].slice(0, -1)
	                : cap[1];
	            return {
	                type: 'paragraph',
	                raw: cap[0],
	                text,
	                tokens: this.lexer.inline(text),
	            };
	        }
	    }
	    text(src) {
	        const cap = this.rules.block.text.exec(src);
	        if (cap) {
	            return {
	                type: 'text',
	                raw: cap[0],
	                text: cap[0],
	                tokens: this.lexer.inline(cap[0]),
	            };
	        }
	    }
	    escape(src) {
	        const cap = this.rules.inline.escape.exec(src);
	        if (cap) {
	            return {
	                type: 'escape',
	                raw: cap[0],
	                text: escape$1(cap[1]),
	            };
	        }
	    }
	    tag(src) {
	        const cap = this.rules.inline.tag.exec(src);
	        if (cap) {
	            if (!this.lexer.state.inLink && /^<a /i.test(cap[0])) {
	                this.lexer.state.inLink = true;
	            }
	            else if (this.lexer.state.inLink && /^<\/a>/i.test(cap[0])) {
	                this.lexer.state.inLink = false;
	            }
	            if (!this.lexer.state.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
	                this.lexer.state.inRawBlock = true;
	            }
	            else if (this.lexer.state.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
	                this.lexer.state.inRawBlock = false;
	            }
	            return {
	                type: 'html',
	                raw: cap[0],
	                inLink: this.lexer.state.inLink,
	                inRawBlock: this.lexer.state.inRawBlock,
	                block: false,
	                text: cap[0],
	            };
	        }
	    }
	    link(src) {
	        const cap = this.rules.inline.link.exec(src);
	        if (cap) {
	            const trimmedUrl = cap[2].trim();
	            if (!this.options.pedantic && /^</.test(trimmedUrl)) {
	                // commonmark requires matching angle brackets
	                if (!(/>$/.test(trimmedUrl))) {
	                    return;
	                }
	                // ending angle bracket cannot be escaped
	                const rtrimSlash = rtrim(trimmedUrl.slice(0, -1), '\\');
	                if ((trimmedUrl.length - rtrimSlash.length) % 2 === 0) {
	                    return;
	                }
	            }
	            else {
	                // find closing parenthesis
	                const lastParenIndex = findClosingBracket(cap[2], '()');
	                if (lastParenIndex > -1) {
	                    const start = cap[0].indexOf('!') === 0 ? 5 : 4;
	                    const linkLen = start + cap[1].length + lastParenIndex;
	                    cap[2] = cap[2].substring(0, lastParenIndex);
	                    cap[0] = cap[0].substring(0, linkLen).trim();
	                    cap[3] = '';
	                }
	            }
	            let href = cap[2];
	            let title = '';
	            if (this.options.pedantic) {
	                // split pedantic href and title
	                const link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);
	                if (link) {
	                    href = link[1];
	                    title = link[3];
	                }
	            }
	            else {
	                title = cap[3] ? cap[3].slice(1, -1) : '';
	            }
	            href = href.trim();
	            if (/^</.test(href)) {
	                if (this.options.pedantic && !(/>$/.test(trimmedUrl))) {
	                    // pedantic allows starting angle bracket without ending angle bracket
	                    href = href.slice(1);
	                }
	                else {
	                    href = href.slice(1, -1);
	                }
	            }
	            return outputLink(cap, {
	                href: href ? href.replace(this.rules.inline.anyPunctuation, '$1') : href,
	                title: title ? title.replace(this.rules.inline.anyPunctuation, '$1') : title,
	            }, cap[0], this.lexer);
	        }
	    }
	    reflink(src, links) {
	        let cap;
	        if ((cap = this.rules.inline.reflink.exec(src))
	            || (cap = this.rules.inline.nolink.exec(src))) {
	            const linkString = (cap[2] || cap[1]).replace(/\s+/g, ' ');
	            const link = links[linkString.toLowerCase()];
	            if (!link) {
	                const text = cap[0].charAt(0);
	                return {
	                    type: 'text',
	                    raw: text,
	                    text,
	                };
	            }
	            return outputLink(cap, link, cap[0], this.lexer);
	        }
	    }
	    emStrong(src, maskedSrc, prevChar = '') {
	        let match = this.rules.inline.emStrongLDelim.exec(src);
	        if (!match)
	            return;
	        // _ can't be between two alphanumerics. \p{L}\p{N} includes non-english alphabet/numbers as well
	        if (match[3] && prevChar.match(/[\p{L}\p{N}]/u))
	            return;
	        const nextChar = match[1] || match[2] || '';
	        if (!nextChar || !prevChar || this.rules.inline.punctuation.exec(prevChar)) {
	            // unicode Regex counts emoji as 1 char; spread into array for proper count (used multiple times below)
	            const lLength = [...match[0]].length - 1;
	            let rDelim, rLength, delimTotal = lLength, midDelimTotal = 0;
	            const endReg = match[0][0] === '*' ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
	            endReg.lastIndex = 0;
	            // Clip maskedSrc to same section of string as src (move to lexer?)
	            maskedSrc = maskedSrc.slice(-1 * src.length + lLength);
	            while ((match = endReg.exec(maskedSrc)) != null) {
	                rDelim = match[1] || match[2] || match[3] || match[4] || match[5] || match[6];
	                if (!rDelim)
	                    continue; // skip single * in __abc*abc__
	                rLength = [...rDelim].length;
	                if (match[3] || match[4]) { // found another Left Delim
	                    delimTotal += rLength;
	                    continue;
	                }
	                else if (match[5] || match[6]) { // either Left or Right Delim
	                    if (lLength % 3 && !((lLength + rLength) % 3)) {
	                        midDelimTotal += rLength;
	                        continue; // CommonMark Emphasis Rules 9-10
	                    }
	                }
	                delimTotal -= rLength;
	                if (delimTotal > 0)
	                    continue; // Haven't found enough closing delimiters
	                // Remove extra characters. *a*** -> *a*
	                rLength = Math.min(rLength, rLength + delimTotal + midDelimTotal);
	                // char length can be >1 for unicode characters;
	                const lastCharLength = [...match[0]][0].length;
	                const raw = src.slice(0, lLength + match.index + lastCharLength + rLength);
	                // Create `em` if smallest delimiter has odd char count. *a***
	                if (Math.min(lLength, rLength) % 2) {
	                    const text = raw.slice(1, -1);
	                    return {
	                        type: 'em',
	                        raw,
	                        text,
	                        tokens: this.lexer.inlineTokens(text),
	                    };
	                }
	                // Create 'strong' if smallest delimiter has even char count. **a***
	                const text = raw.slice(2, -2);
	                return {
	                    type: 'strong',
	                    raw,
	                    text,
	                    tokens: this.lexer.inlineTokens(text),
	                };
	            }
	        }
	    }
	    codespan(src) {
	        const cap = this.rules.inline.code.exec(src);
	        if (cap) {
	            let text = cap[2].replace(/\n/g, ' ');
	            const hasNonSpaceChars = /[^ ]/.test(text);
	            const hasSpaceCharsOnBothEnds = /^ /.test(text) && / $/.test(text);
	            if (hasNonSpaceChars && hasSpaceCharsOnBothEnds) {
	                text = text.substring(1, text.length - 1);
	            }
	            text = escape$1(text, true);
	            return {
	                type: 'codespan',
	                raw: cap[0],
	                text,
	            };
	        }
	    }
	    br(src) {
	        const cap = this.rules.inline.br.exec(src);
	        if (cap) {
	            return {
	                type: 'br',
	                raw: cap[0],
	            };
	        }
	    }
	    del(src) {
	        const cap = this.rules.inline.del.exec(src);
	        if (cap) {
	            return {
	                type: 'del',
	                raw: cap[0],
	                text: cap[2],
	                tokens: this.lexer.inlineTokens(cap[2]),
	            };
	        }
	    }
	    autolink(src) {
	        const cap = this.rules.inline.autolink.exec(src);
	        if (cap) {
	            let text, href;
	            if (cap[2] === '@') {
	                text = escape$1(cap[1]);
	                href = 'mailto:' + text;
	            }
	            else {
	                text = escape$1(cap[1]);
	                href = text;
	            }
	            return {
	                type: 'link',
	                raw: cap[0],
	                text,
	                href,
	                tokens: [
	                    {
	                        type: 'text',
	                        raw: text,
	                        text,
	                    },
	                ],
	            };
	        }
	    }
	    url(src) {
	        let cap;
	        if (cap = this.rules.inline.url.exec(src)) {
	            let text, href;
	            if (cap[2] === '@') {
	                text = escape$1(cap[0]);
	                href = 'mailto:' + text;
	            }
	            else {
	                // do extended autolink path validation
	                let prevCapZero;
	                do {
	                    prevCapZero = cap[0];
	                    cap[0] = this.rules.inline._backpedal.exec(cap[0])?.[0] ?? '';
	                } while (prevCapZero !== cap[0]);
	                text = escape$1(cap[0]);
	                if (cap[1] === 'www.') {
	                    href = 'http://' + cap[0];
	                }
	                else {
	                    href = cap[0];
	                }
	            }
	            return {
	                type: 'link',
	                raw: cap[0],
	                text,
	                href,
	                tokens: [
	                    {
	                        type: 'text',
	                        raw: text,
	                        text,
	                    },
	                ],
	            };
	        }
	    }
	    inlineText(src) {
	        const cap = this.rules.inline.text.exec(src);
	        if (cap) {
	            let text;
	            if (this.lexer.state.inRawBlock) {
	                text = cap[0];
	            }
	            else {
	                text = escape$1(cap[0]);
	            }
	            return {
	                type: 'text',
	                raw: cap[0],
	                text,
	            };
	        }
	    }
	}

	/**
	 * Block-Level Grammar
	 */
	const newline = /^(?:[ \t]*(?:\n|$))+/;
	const blockCode = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
	const fences = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
	const hr = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
	const heading = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
	const bullet = /(?:[*+-]|\d{1,9}[.)])/;
	const lheading = edit(/^(?!bull |blockCode|fences|blockquote|heading|html)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html))+?)\n {0,3}(=+|-+) *(?:\n+|$)/)
	    .replace(/bull/g, bullet) // lists can interrupt
	    .replace(/blockCode/g, /(?: {4}| {0,3}\t)/) // indented code blocks can interrupt
	    .replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/) // fenced code blocks can interrupt
	    .replace(/blockquote/g, / {0,3}>/) // blockquote can interrupt
	    .replace(/heading/g, / {0,3}#{1,6}/) // ATX heading can interrupt
	    .replace(/html/g, / {0,3}<[^\n>]+>\n/) // block html can interrupt
	    .getRegex();
	const _paragraph = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
	const blockText = /^[^\n]+/;
	const _blockLabel = /(?!\s*\])(?:\\.|[^\[\]\\])+/;
	const def = edit(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/)
	    .replace('label', _blockLabel)
	    .replace('title', /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/)
	    .getRegex();
	const list = edit(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/)
	    .replace(/bull/g, bullet)
	    .getRegex();
	const _tag = 'address|article|aside|base|basefont|blockquote|body|caption'
	    + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
	    + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
	    + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
	    + '|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title'
	    + '|tr|track|ul';
	const _comment = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
	const html = edit('^ {0,3}(?:' // optional indentation
	    + '<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
	    + '|comment[^\\n]*(\\n+|$)' // (2)
	    + '|<\\?[\\s\\S]*?(?:\\?>\\n*|$)' // (3)
	    + '|<![A-Z][\\s\\S]*?(?:>\\n*|$)' // (4)
	    + '|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)' // (5)
	    + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)' // (6)
	    + '|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)' // (7) open tag
	    + '|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ \t]*)+\\n|$)' // (7) closing tag
	    + ')', 'i')
	    .replace('comment', _comment)
	    .replace('tag', _tag)
	    .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
	    .getRegex();
	const paragraph = edit(_paragraph)
	    .replace('hr', hr)
	    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	    .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
	    .replace('|table', '')
	    .replace('blockquote', ' {0,3}>')
	    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	    .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
	    .getRegex();
	const blockquote = edit(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/)
	    .replace('paragraph', paragraph)
	    .getRegex();
	/**
	 * Normal Block Grammar
	 */
	const blockNormal = {
	    blockquote,
	    code: blockCode,
	    def,
	    fences,
	    heading,
	    hr,
	    html,
	    lheading,
	    list,
	    newline,
	    paragraph,
	    table: noopTest,
	    text: blockText,
	};
	/**
	 * GFM Block Grammar
	 */
	const gfmTable = edit('^ *([^\\n ].*)\\n' // Header
	    + ' {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)' // Align
	    + '(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)') // Cells
	    .replace('hr', hr)
	    .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	    .replace('blockquote', ' {0,3}>')
	    .replace('code', '(?: {4}| {0,3}\t)[^\\n]')
	    .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	    .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	    .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	    .replace('tag', _tag) // tables can be interrupted by type (6) html blocks
	    .getRegex();
	const blockGfm = {
	    ...blockNormal,
	    table: gfmTable,
	    paragraph: edit(_paragraph)
	        .replace('hr', hr)
	        .replace('heading', ' {0,3}#{1,6}(?:\\s|$)')
	        .replace('|lheading', '') // setext headings don't interrupt commonmark paragraphs
	        .replace('table', gfmTable) // interrupt paragraphs with table
	        .replace('blockquote', ' {0,3}>')
	        .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
	        .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
	        .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)')
	        .replace('tag', _tag) // pars can be interrupted by type (6) html blocks
	        .getRegex(),
	};
	/**
	 * Pedantic grammar (original John Gruber's loose markdown specification)
	 */
	const blockPedantic = {
	    ...blockNormal,
	    html: edit('^ *(?:comment *(?:\\n|\\s*$)'
	        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
	        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
	        .replace('comment', _comment)
	        .replace(/tag/g, '(?!(?:'
	        + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
	        + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
	        + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
	        .getRegex(),
	    def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
	    heading: /^(#{1,6})(.*)(?:\n+|$)/,
	    fences: noopTest, // fences not supported
	    lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,
	    paragraph: edit(_paragraph)
	        .replace('hr', hr)
	        .replace('heading', ' *#{1,6} *[^\n]')
	        .replace('lheading', lheading)
	        .replace('|table', '')
	        .replace('blockquote', ' {0,3}>')
	        .replace('|fences', '')
	        .replace('|list', '')
	        .replace('|html', '')
	        .replace('|tag', '')
	        .getRegex(),
	};
	/**
	 * Inline-Level Grammar
	 */
	const escape = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
	const inlineCode = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
	const br = /^( {2,}|\\)\n(?!\s*$)/;
	const inlineText = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
	// list of unicode punctuation marks, plus any missing characters from CommonMark spec
	const _punctuation = '\\p{P}\\p{S}';
	const punctuation = edit(/^((?![*_])[\spunctuation])/, 'u')
	    .replace(/punctuation/g, _punctuation).getRegex();
	// sequences em should skip over [title](link), `code`, <html>
	const blockSkip = /\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g;
	const emStrongLDelim = edit(/^(?:\*+(?:((?!\*)[punct])|[^\s*]))|^_+(?:((?!_)[punct])|([^\s_]))/, 'u')
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const emStrongRDelimAst = edit('^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)' // Skip orphan inside strong
	    + '|[^*]+(?=[^*])' // Consume to delim
	    + '|(?!\\*)[punct](\\*+)(?=[\\s]|$)' // (1) #*** can only be a Right Delimiter
	    + '|[^punct\\s](\\*+)(?!\\*)(?=[punct\\s]|$)' // (2) a***#, a*** can only be a Right Delimiter
	    + '|(?!\\*)[punct\\s](\\*+)(?=[^punct\\s])' // (3) #***a, ***a can only be Left Delimiter
	    + '|[\\s](\\*+)(?!\\*)(?=[punct])' // (4) ***# can only be Left Delimiter
	    + '|(?!\\*)[punct](\\*+)(?!\\*)(?=[punct])' // (5) #***# can be either Left or Right Delimiter
	    + '|[^punct\\s](\\*+)(?=[^punct\\s])', 'gu') // (6) a***a can be either Left or Right Delimiter
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	// (6) Not allowed for _
	const emStrongRDelimUnd = edit('^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)' // Skip orphan inside strong
	    + '|[^_]+(?=[^_])' // Consume to delim
	    + '|(?!_)[punct](_+)(?=[\\s]|$)' // (1) #___ can only be a Right Delimiter
	    + '|[^punct\\s](_+)(?!_)(?=[punct\\s]|$)' // (2) a___#, a___ can only be a Right Delimiter
	    + '|(?!_)[punct\\s](_+)(?=[^punct\\s])' // (3) #___a, ___a can only be Left Delimiter
	    + '|[\\s](_+)(?!_)(?=[punct])' // (4) ___# can only be Left Delimiter
	    + '|(?!_)[punct](_+)(?!_)(?=[punct])', 'gu') // (5) #___# can be either Left or Right Delimiter
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const anyPunctuation = edit(/\\([punct])/, 'gu')
	    .replace(/punct/g, _punctuation)
	    .getRegex();
	const autolink = edit(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/)
	    .replace('scheme', /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/)
	    .replace('email', /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/)
	    .getRegex();
	const _inlineComment = edit(_comment).replace('(?:-->|$)', '-->').getRegex();
	const tag = edit('^comment'
	    + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
	    + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
	    + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
	    + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
	    + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>') // CDATA section
	    .replace('comment', _inlineComment)
	    .replace('attribute', /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/)
	    .getRegex();
	const _inlineLabel = /(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
	const link = edit(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/)
	    .replace('label', _inlineLabel)
	    .replace('href', /<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/)
	    .replace('title', /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/)
	    .getRegex();
	const reflink = edit(/^!?\[(label)\]\[(ref)\]/)
	    .replace('label', _inlineLabel)
	    .replace('ref', _blockLabel)
	    .getRegex();
	const nolink = edit(/^!?\[(ref)\](?:\[\])?/)
	    .replace('ref', _blockLabel)
	    .getRegex();
	const reflinkSearch = edit('reflink|nolink(?!\\()', 'g')
	    .replace('reflink', reflink)
	    .replace('nolink', nolink)
	    .getRegex();
	/**
	 * Normal Inline Grammar
	 */
	const inlineNormal = {
	    _backpedal: noopTest, // only used for GFM url
	    anyPunctuation,
	    autolink,
	    blockSkip,
	    br,
	    code: inlineCode,
	    del: noopTest,
	    emStrongLDelim,
	    emStrongRDelimAst,
	    emStrongRDelimUnd,
	    escape,
	    link,
	    nolink,
	    punctuation,
	    reflink,
	    reflinkSearch,
	    tag,
	    text: inlineText,
	    url: noopTest,
	};
	/**
	 * Pedantic Inline Grammar
	 */
	const inlinePedantic = {
	    ...inlineNormal,
	    link: edit(/^!?\[(label)\]\((.*?)\)/)
	        .replace('label', _inlineLabel)
	        .getRegex(),
	    reflink: edit(/^!?\[(label)\]\s*\[([^\]]*)\]/)
	        .replace('label', _inlineLabel)
	        .getRegex(),
	};
	/**
	 * GFM Inline Grammar
	 */
	const inlineGfm = {
	    ...inlineNormal,
	    escape: edit(escape).replace('])', '~|])').getRegex(),
	    url: edit(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/, 'i')
	        .replace('email', /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/)
	        .getRegex(),
	    _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,
	    del: /^(~~?)(?=[^\s~])([\s\S]*?[^\s~])\1(?=[^~]|$)/,
	    text: /^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/,
	};
	/**
	 * GFM + Line Breaks Inline Grammar
	 */
	const inlineBreaks = {
	    ...inlineGfm,
	    br: edit(br).replace('{2,}', '*').getRegex(),
	    text: edit(inlineGfm.text)
	        .replace('\\b_', '\\b_| {2,}\\n')
	        .replace(/\{2,\}/g, '*')
	        .getRegex(),
	};
	/**
	 * exports
	 */
	const block = {
	    normal: blockNormal,
	    gfm: blockGfm,
	    pedantic: blockPedantic,
	};
	const inline = {
	    normal: inlineNormal,
	    gfm: inlineGfm,
	    breaks: inlineBreaks,
	    pedantic: inlinePedantic,
	};

	/**
	 * Block Lexer
	 */
	class _Lexer {
	    tokens;
	    options;
	    state;
	    tokenizer;
	    inlineQueue;
	    constructor(options) {
	        // TokenList cannot be created in one go
	        this.tokens = [];
	        this.tokens.links = Object.create(null);
	        this.options = options || _defaults;
	        this.options.tokenizer = this.options.tokenizer || new _Tokenizer();
	        this.tokenizer = this.options.tokenizer;
	        this.tokenizer.options = this.options;
	        this.tokenizer.lexer = this;
	        this.inlineQueue = [];
	        this.state = {
	            inLink: false,
	            inRawBlock: false,
	            top: true,
	        };
	        const rules = {
	            block: block.normal,
	            inline: inline.normal,
	        };
	        if (this.options.pedantic) {
	            rules.block = block.pedantic;
	            rules.inline = inline.pedantic;
	        }
	        else if (this.options.gfm) {
	            rules.block = block.gfm;
	            if (this.options.breaks) {
	                rules.inline = inline.breaks;
	            }
	            else {
	                rules.inline = inline.gfm;
	            }
	        }
	        this.tokenizer.rules = rules;
	    }
	    /**
	     * Expose Rules
	     */
	    static get rules() {
	        return {
	            block,
	            inline,
	        };
	    }
	    /**
	     * Static Lex Method
	     */
	    static lex(src, options) {
	        const lexer = new _Lexer(options);
	        return lexer.lex(src);
	    }
	    /**
	     * Static Lex Inline Method
	     */
	    static lexInline(src, options) {
	        const lexer = new _Lexer(options);
	        return lexer.inlineTokens(src);
	    }
	    /**
	     * Preprocessing
	     */
	    lex(src) {
	        src = src
	            .replace(/\r\n|\r/g, '\n');
	        this.blockTokens(src, this.tokens);
	        for (let i = 0; i < this.inlineQueue.length; i++) {
	            const next = this.inlineQueue[i];
	            this.inlineTokens(next.src, next.tokens);
	        }
	        this.inlineQueue = [];
	        return this.tokens;
	    }
	    blockTokens(src, tokens = [], lastParagraphClipped = false) {
	        if (this.options.pedantic) {
	            src = src.replace(/\t/g, '    ').replace(/^ +$/gm, '');
	        }
	        let token;
	        let lastToken;
	        let cutSrc;
	        while (src) {
	            if (this.options.extensions
	                && this.options.extensions.block
	                && this.options.extensions.block.some((extTokenizer) => {
	                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
	                        src = src.substring(token.raw.length);
	                        tokens.push(token);
	                        return true;
	                    }
	                    return false;
	                })) {
	                continue;
	            }
	            // newline
	            if (token = this.tokenizer.space(src)) {
	                src = src.substring(token.raw.length);
	                if (token.raw.length === 1 && tokens.length > 0) {
	                    // if there's a single \n as a spacer, it's terminating the last line,
	                    // so move it there so that we don't get unnecessary paragraph tags
	                    tokens[tokens.length - 1].raw += '\n';
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // code
	            if (token = this.tokenizer.code(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                // An indented code block cannot interrupt a paragraph.
	                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // fences
	            if (token = this.tokenizer.fences(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // heading
	            if (token = this.tokenizer.heading(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // hr
	            if (token = this.tokenizer.hr(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // blockquote
	            if (token = this.tokenizer.blockquote(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // list
	            if (token = this.tokenizer.list(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // html
	            if (token = this.tokenizer.html(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // def
	            if (token = this.tokenizer.def(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && (lastToken.type === 'paragraph' || lastToken.type === 'text')) {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.raw;
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else if (!this.tokens.links[token.tag]) {
	                    this.tokens.links[token.tag] = {
	                        href: token.href,
	                        title: token.title,
	                    };
	                }
	                continue;
	            }
	            // table (gfm)
	            if (token = this.tokenizer.table(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // lheading
	            if (token = this.tokenizer.lheading(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // top-level paragraph
	            // prevent paragraph consuming extensions by clipping 'src' to extension start
	            cutSrc = src;
	            if (this.options.extensions && this.options.extensions.startBlock) {
	                let startIndex = Infinity;
	                const tempSrc = src.slice(1);
	                let tempStart;
	                this.options.extensions.startBlock.forEach((getStartIndex) => {
	                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
	                    if (typeof tempStart === 'number' && tempStart >= 0) {
	                        startIndex = Math.min(startIndex, tempStart);
	                    }
	                });
	                if (startIndex < Infinity && startIndex >= 0) {
	                    cutSrc = src.substring(0, startIndex + 1);
	                }
	            }
	            if (this.state.top && (token = this.tokenizer.paragraph(cutSrc))) {
	                lastToken = tokens[tokens.length - 1];
	                if (lastParagraphClipped && lastToken?.type === 'paragraph') {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue.pop();
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                lastParagraphClipped = (cutSrc.length !== src.length);
	                src = src.substring(token.raw.length);
	                continue;
	            }
	            // text
	            if (token = this.tokenizer.text(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && lastToken.type === 'text') {
	                    lastToken.raw += '\n' + token.raw;
	                    lastToken.text += '\n' + token.text;
	                    this.inlineQueue.pop();
	                    this.inlineQueue[this.inlineQueue.length - 1].src = lastToken.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            if (src) {
	                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
	                if (this.options.silent) {
	                    console.error(errMsg);
	                    break;
	                }
	                else {
	                    throw new Error(errMsg);
	                }
	            }
	        }
	        this.state.top = true;
	        return tokens;
	    }
	    inline(src, tokens = []) {
	        this.inlineQueue.push({ src, tokens });
	        return tokens;
	    }
	    /**
	     * Lexing/Compiling
	     */
	    inlineTokens(src, tokens = []) {
	        let token, lastToken, cutSrc;
	        // String with links masked to avoid interference with em and strong
	        let maskedSrc = src;
	        let match;
	        let keepPrevChar, prevChar;
	        // Mask out reflinks
	        if (this.tokens.links) {
	            const links = Object.keys(this.tokens.links);
	            if (links.length > 0) {
	                while ((match = this.tokenizer.rules.inline.reflinkSearch.exec(maskedSrc)) != null) {
	                    if (links.includes(match[0].slice(match[0].lastIndexOf('[') + 1, -1))) {
	                        maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex);
	                    }
	                }
	            }
	        }
	        // Mask out other blocks
	        while ((match = this.tokenizer.rules.inline.blockSkip.exec(maskedSrc)) != null) {
	            maskedSrc = maskedSrc.slice(0, match.index) + '[' + 'a'.repeat(match[0].length - 2) + ']' + maskedSrc.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
	        }
	        // Mask out escaped characters
	        while ((match = this.tokenizer.rules.inline.anyPunctuation.exec(maskedSrc)) != null) {
	            maskedSrc = maskedSrc.slice(0, match.index) + '++' + maskedSrc.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
	        }
	        while (src) {
	            if (!keepPrevChar) {
	                prevChar = '';
	            }
	            keepPrevChar = false;
	            // extensions
	            if (this.options.extensions
	                && this.options.extensions.inline
	                && this.options.extensions.inline.some((extTokenizer) => {
	                    if (token = extTokenizer.call({ lexer: this }, src, tokens)) {
	                        src = src.substring(token.raw.length);
	                        tokens.push(token);
	                        return true;
	                    }
	                    return false;
	                })) {
	                continue;
	            }
	            // escape
	            if (token = this.tokenizer.escape(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // tag
	            if (token = this.tokenizer.tag(src)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // link
	            if (token = this.tokenizer.link(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // reflink, nolink
	            if (token = this.tokenizer.reflink(src, this.tokens.links)) {
	                src = src.substring(token.raw.length);
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && token.type === 'text' && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            // em & strong
	            if (token = this.tokenizer.emStrong(src, maskedSrc, prevChar)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // code
	            if (token = this.tokenizer.codespan(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // br
	            if (token = this.tokenizer.br(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // del (gfm)
	            if (token = this.tokenizer.del(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // autolink
	            if (token = this.tokenizer.autolink(src)) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // url (gfm)
	            if (!this.state.inLink && (token = this.tokenizer.url(src))) {
	                src = src.substring(token.raw.length);
	                tokens.push(token);
	                continue;
	            }
	            // text
	            // prevent inlineText consuming extensions by clipping 'src' to extension start
	            cutSrc = src;
	            if (this.options.extensions && this.options.extensions.startInline) {
	                let startIndex = Infinity;
	                const tempSrc = src.slice(1);
	                let tempStart;
	                this.options.extensions.startInline.forEach((getStartIndex) => {
	                    tempStart = getStartIndex.call({ lexer: this }, tempSrc);
	                    if (typeof tempStart === 'number' && tempStart >= 0) {
	                        startIndex = Math.min(startIndex, tempStart);
	                    }
	                });
	                if (startIndex < Infinity && startIndex >= 0) {
	                    cutSrc = src.substring(0, startIndex + 1);
	                }
	            }
	            if (token = this.tokenizer.inlineText(cutSrc)) {
	                src = src.substring(token.raw.length);
	                if (token.raw.slice(-1) !== '_') { // Track prevChar before string of ____ started
	                    prevChar = token.raw.slice(-1);
	                }
	                keepPrevChar = true;
	                lastToken = tokens[tokens.length - 1];
	                if (lastToken && lastToken.type === 'text') {
	                    lastToken.raw += token.raw;
	                    lastToken.text += token.text;
	                }
	                else {
	                    tokens.push(token);
	                }
	                continue;
	            }
	            if (src) {
	                const errMsg = 'Infinite loop on byte: ' + src.charCodeAt(0);
	                if (this.options.silent) {
	                    console.error(errMsg);
	                    break;
	                }
	                else {
	                    throw new Error(errMsg);
	                }
	            }
	        }
	        return tokens;
	    }
	}

	/**
	 * Renderer
	 */
	class _Renderer {
	    options;
	    parser; // set by the parser
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    space(token) {
	        return '';
	    }
	    code({ text, lang, escaped }) {
	        const langString = (lang || '').match(/^\S*/)?.[0];
	        const code = text.replace(/\n$/, '') + '\n';
	        if (!langString) {
	            return '<pre><code>'
	                + (escaped ? code : escape$1(code, true))
	                + '</code></pre>\n';
	        }
	        return '<pre><code class="language-'
	            + escape$1(langString)
	            + '">'
	            + (escaped ? code : escape$1(code, true))
	            + '</code></pre>\n';
	    }
	    blockquote({ tokens }) {
	        const body = this.parser.parse(tokens);
	        return `<blockquote>\n${body}</blockquote>\n`;
	    }
	    html({ text }) {
	        return text;
	    }
	    heading({ tokens, depth }) {
	        return `<h${depth}>${this.parser.parseInline(tokens)}</h${depth}>\n`;
	    }
	    hr(token) {
	        return '<hr>\n';
	    }
	    list(token) {
	        const ordered = token.ordered;
	        const start = token.start;
	        let body = '';
	        for (let j = 0; j < token.items.length; j++) {
	            const item = token.items[j];
	            body += this.listitem(item);
	        }
	        const type = ordered ? 'ol' : 'ul';
	        const startAttr = (ordered && start !== 1) ? (' start="' + start + '"') : '';
	        return '<' + type + startAttr + '>\n' + body + '</' + type + '>\n';
	    }
	    listitem(item) {
	        let itemBody = '';
	        if (item.task) {
	            const checkbox = this.checkbox({ checked: !!item.checked });
	            if (item.loose) {
	                if (item.tokens.length > 0 && item.tokens[0].type === 'paragraph') {
	                    item.tokens[0].text = checkbox + ' ' + item.tokens[0].text;
	                    if (item.tokens[0].tokens && item.tokens[0].tokens.length > 0 && item.tokens[0].tokens[0].type === 'text') {
	                        item.tokens[0].tokens[0].text = checkbox + ' ' + item.tokens[0].tokens[0].text;
	                    }
	                }
	                else {
	                    item.tokens.unshift({
	                        type: 'text',
	                        raw: checkbox + ' ',
	                        text: checkbox + ' ',
	                    });
	                }
	            }
	            else {
	                itemBody += checkbox + ' ';
	            }
	        }
	        itemBody += this.parser.parse(item.tokens, !!item.loose);
	        return `<li>${itemBody}</li>\n`;
	    }
	    checkbox({ checked }) {
	        return '<input '
	            + (checked ? 'checked="" ' : '')
	            + 'disabled="" type="checkbox">';
	    }
	    paragraph({ tokens }) {
	        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
	    }
	    table(token) {
	        let header = '';
	        // header
	        let cell = '';
	        for (let j = 0; j < token.header.length; j++) {
	            cell += this.tablecell(token.header[j]);
	        }
	        header += this.tablerow({ text: cell });
	        let body = '';
	        for (let j = 0; j < token.rows.length; j++) {
	            const row = token.rows[j];
	            cell = '';
	            for (let k = 0; k < row.length; k++) {
	                cell += this.tablecell(row[k]);
	            }
	            body += this.tablerow({ text: cell });
	        }
	        if (body)
	            body = `<tbody>${body}</tbody>`;
	        return '<table>\n'
	            + '<thead>\n'
	            + header
	            + '</thead>\n'
	            + body
	            + '</table>\n';
	    }
	    tablerow({ text }) {
	        return `<tr>\n${text}</tr>\n`;
	    }
	    tablecell(token) {
	        const content = this.parser.parseInline(token.tokens);
	        const type = token.header ? 'th' : 'td';
	        const tag = token.align
	            ? `<${type} align="${token.align}">`
	            : `<${type}>`;
	        return tag + content + `</${type}>\n`;
	    }
	    /**
	     * span level renderer
	     */
	    strong({ tokens }) {
	        return `<strong>${this.parser.parseInline(tokens)}</strong>`;
	    }
	    em({ tokens }) {
	        return `<em>${this.parser.parseInline(tokens)}</em>`;
	    }
	    codespan({ text }) {
	        return `<code>${text}</code>`;
	    }
	    br(token) {
	        return '<br>';
	    }
	    del({ tokens }) {
	        return `<del>${this.parser.parseInline(tokens)}</del>`;
	    }
	    link({ href, title, tokens }) {
	        const text = this.parser.parseInline(tokens);
	        const cleanHref = cleanUrl(href);
	        if (cleanHref === null) {
	            return text;
	        }
	        href = cleanHref;
	        let out = '<a href="' + href + '"';
	        if (title) {
	            out += ' title="' + title + '"';
	        }
	        out += '>' + text + '</a>';
	        return out;
	    }
	    image({ href, title, text }) {
	        const cleanHref = cleanUrl(href);
	        if (cleanHref === null) {
	            return text;
	        }
	        href = cleanHref;
	        let out = `<img src="${href}" alt="${text}"`;
	        if (title) {
	            out += ` title="${title}"`;
	        }
	        out += '>';
	        return out;
	    }
	    text(token) {
	        return 'tokens' in token && token.tokens ? this.parser.parseInline(token.tokens) : token.text;
	    }
	}

	/**
	 * TextRenderer
	 * returns only the textual part of the token
	 */
	class _TextRenderer {
	    // no need for block level renderers
	    strong({ text }) {
	        return text;
	    }
	    em({ text }) {
	        return text;
	    }
	    codespan({ text }) {
	        return text;
	    }
	    del({ text }) {
	        return text;
	    }
	    html({ text }) {
	        return text;
	    }
	    text({ text }) {
	        return text;
	    }
	    link({ text }) {
	        return '' + text;
	    }
	    image({ text }) {
	        return '' + text;
	    }
	    br() {
	        return '';
	    }
	}

	/**
	 * Parsing & Compiling
	 */
	class _Parser {
	    options;
	    renderer;
	    textRenderer;
	    constructor(options) {
	        this.options = options || _defaults;
	        this.options.renderer = this.options.renderer || new _Renderer();
	        this.renderer = this.options.renderer;
	        this.renderer.options = this.options;
	        this.renderer.parser = this;
	        this.textRenderer = new _TextRenderer();
	    }
	    /**
	     * Static Parse Method
	     */
	    static parse(tokens, options) {
	        const parser = new _Parser(options);
	        return parser.parse(tokens);
	    }
	    /**
	     * Static Parse Inline Method
	     */
	    static parseInline(tokens, options) {
	        const parser = new _Parser(options);
	        return parser.parseInline(tokens);
	    }
	    /**
	     * Parse Loop
	     */
	    parse(tokens, top = true) {
	        let out = '';
	        for (let i = 0; i < tokens.length; i++) {
	            const anyToken = tokens[i];
	            // Run any renderer extensions
	            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
	                const genericToken = anyToken;
	                const ret = this.options.extensions.renderers[genericToken.type].call({ parser: this }, genericToken);
	                if (ret !== false || !['space', 'hr', 'heading', 'code', 'table', 'blockquote', 'list', 'html', 'paragraph', 'text'].includes(genericToken.type)) {
	                    out += ret || '';
	                    continue;
	                }
	            }
	            const token = anyToken;
	            switch (token.type) {
	                case 'space': {
	                    out += this.renderer.space(token);
	                    continue;
	                }
	                case 'hr': {
	                    out += this.renderer.hr(token);
	                    continue;
	                }
	                case 'heading': {
	                    out += this.renderer.heading(token);
	                    continue;
	                }
	                case 'code': {
	                    out += this.renderer.code(token);
	                    continue;
	                }
	                case 'table': {
	                    out += this.renderer.table(token);
	                    continue;
	                }
	                case 'blockquote': {
	                    out += this.renderer.blockquote(token);
	                    continue;
	                }
	                case 'list': {
	                    out += this.renderer.list(token);
	                    continue;
	                }
	                case 'html': {
	                    out += this.renderer.html(token);
	                    continue;
	                }
	                case 'paragraph': {
	                    out += this.renderer.paragraph(token);
	                    continue;
	                }
	                case 'text': {
	                    let textToken = token;
	                    let body = this.renderer.text(textToken);
	                    while (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
	                        textToken = tokens[++i];
	                        body += '\n' + this.renderer.text(textToken);
	                    }
	                    if (top) {
	                        out += this.renderer.paragraph({
	                            type: 'paragraph',
	                            raw: body,
	                            text: body,
	                            tokens: [{ type: 'text', raw: body, text: body }],
	                        });
	                    }
	                    else {
	                        out += body;
	                    }
	                    continue;
	                }
	                default: {
	                    const errMsg = 'Token with "' + token.type + '" type was not found.';
	                    if (this.options.silent) {
	                        console.error(errMsg);
	                        return '';
	                    }
	                    else {
	                        throw new Error(errMsg);
	                    }
	                }
	            }
	        }
	        return out;
	    }
	    /**
	     * Parse Inline Tokens
	     */
	    parseInline(tokens, renderer) {
	        renderer = renderer || this.renderer;
	        let out = '';
	        for (let i = 0; i < tokens.length; i++) {
	            const anyToken = tokens[i];
	            // Run any renderer extensions
	            if (this.options.extensions && this.options.extensions.renderers && this.options.extensions.renderers[anyToken.type]) {
	                const ret = this.options.extensions.renderers[anyToken.type].call({ parser: this }, anyToken);
	                if (ret !== false || !['escape', 'html', 'link', 'image', 'strong', 'em', 'codespan', 'br', 'del', 'text'].includes(anyToken.type)) {
	                    out += ret || '';
	                    continue;
	                }
	            }
	            const token = anyToken;
	            switch (token.type) {
	                case 'escape': {
	                    out += renderer.text(token);
	                    break;
	                }
	                case 'html': {
	                    out += renderer.html(token);
	                    break;
	                }
	                case 'link': {
	                    out += renderer.link(token);
	                    break;
	                }
	                case 'image': {
	                    out += renderer.image(token);
	                    break;
	                }
	                case 'strong': {
	                    out += renderer.strong(token);
	                    break;
	                }
	                case 'em': {
	                    out += renderer.em(token);
	                    break;
	                }
	                case 'codespan': {
	                    out += renderer.codespan(token);
	                    break;
	                }
	                case 'br': {
	                    out += renderer.br(token);
	                    break;
	                }
	                case 'del': {
	                    out += renderer.del(token);
	                    break;
	                }
	                case 'text': {
	                    out += renderer.text(token);
	                    break;
	                }
	                default: {
	                    const errMsg = 'Token with "' + token.type + '" type was not found.';
	                    if (this.options.silent) {
	                        console.error(errMsg);
	                        return '';
	                    }
	                    else {
	                        throw new Error(errMsg);
	                    }
	                }
	            }
	        }
	        return out;
	    }
	}

	class _Hooks {
	    options;
	    block;
	    constructor(options) {
	        this.options = options || _defaults;
	    }
	    static passThroughHooks = new Set([
	        'preprocess',
	        'postprocess',
	        'processAllTokens',
	    ]);
	    /**
	     * Process markdown before marked
	     */
	    preprocess(markdown) {
	        return markdown;
	    }
	    /**
	     * Process HTML after marked is finished
	     */
	    postprocess(html) {
	        return html;
	    }
	    /**
	     * Process all tokens before walk tokens
	     */
	    processAllTokens(tokens) {
	        return tokens;
	    }
	    /**
	     * Provide function to tokenize markdown
	     */
	    provideLexer() {
	        return this.block ? _Lexer.lex : _Lexer.lexInline;
	    }
	    /**
	     * Provide function to parse tokens
	     */
	    provideParser() {
	        return this.block ? _Parser.parse : _Parser.parseInline;
	    }
	}

	class Marked {
	    defaults = _getDefaults();
	    options = this.setOptions;
	    parse = this.parseMarkdown(true);
	    parseInline = this.parseMarkdown(false);
	    Parser = _Parser;
	    Renderer = _Renderer;
	    TextRenderer = _TextRenderer;
	    Lexer = _Lexer;
	    Tokenizer = _Tokenizer;
	    Hooks = _Hooks;
	    constructor(...args) {
	        this.use(...args);
	    }
	    /**
	     * Run callback for every token
	     */
	    walkTokens(tokens, callback) {
	        let values = [];
	        for (const token of tokens) {
	            values = values.concat(callback.call(this, token));
	            switch (token.type) {
	                case 'table': {
	                    const tableToken = token;
	                    for (const cell of tableToken.header) {
	                        values = values.concat(this.walkTokens(cell.tokens, callback));
	                    }
	                    for (const row of tableToken.rows) {
	                        for (const cell of row) {
	                            values = values.concat(this.walkTokens(cell.tokens, callback));
	                        }
	                    }
	                    break;
	                }
	                case 'list': {
	                    const listToken = token;
	                    values = values.concat(this.walkTokens(listToken.items, callback));
	                    break;
	                }
	                default: {
	                    const genericToken = token;
	                    if (this.defaults.extensions?.childTokens?.[genericToken.type]) {
	                        this.defaults.extensions.childTokens[genericToken.type].forEach((childTokens) => {
	                            const tokens = genericToken[childTokens].flat(Infinity);
	                            values = values.concat(this.walkTokens(tokens, callback));
	                        });
	                    }
	                    else if (genericToken.tokens) {
	                        values = values.concat(this.walkTokens(genericToken.tokens, callback));
	                    }
	                }
	            }
	        }
	        return values;
	    }
	    use(...args) {
	        const extensions = this.defaults.extensions || { renderers: {}, childTokens: {} };
	        args.forEach((pack) => {
	            // copy options to new object
	            const opts = { ...pack };
	            // set async to true if it was set to true before
	            opts.async = this.defaults.async || opts.async || false;
	            // ==-- Parse "addon" extensions --== //
	            if (pack.extensions) {
	                pack.extensions.forEach((ext) => {
	                    if (!ext.name) {
	                        throw new Error('extension name required');
	                    }
	                    if ('renderer' in ext) { // Renderer extensions
	                        const prevRenderer = extensions.renderers[ext.name];
	                        if (prevRenderer) {
	                            // Replace extension with func to run new extension but fall back if false
	                            extensions.renderers[ext.name] = function (...args) {
	                                let ret = ext.renderer.apply(this, args);
	                                if (ret === false) {
	                                    ret = prevRenderer.apply(this, args);
	                                }
	                                return ret;
	                            };
	                        }
	                        else {
	                            extensions.renderers[ext.name] = ext.renderer;
	                        }
	                    }
	                    if ('tokenizer' in ext) { // Tokenizer Extensions
	                        if (!ext.level || (ext.level !== 'block' && ext.level !== 'inline')) {
	                            throw new Error("extension level must be 'block' or 'inline'");
	                        }
	                        const extLevel = extensions[ext.level];
	                        if (extLevel) {
	                            extLevel.unshift(ext.tokenizer);
	                        }
	                        else {
	                            extensions[ext.level] = [ext.tokenizer];
	                        }
	                        if (ext.start) { // Function to check for start of token
	                            if (ext.level === 'block') {
	                                if (extensions.startBlock) {
	                                    extensions.startBlock.push(ext.start);
	                                }
	                                else {
	                                    extensions.startBlock = [ext.start];
	                                }
	                            }
	                            else if (ext.level === 'inline') {
	                                if (extensions.startInline) {
	                                    extensions.startInline.push(ext.start);
	                                }
	                                else {
	                                    extensions.startInline = [ext.start];
	                                }
	                            }
	                        }
	                    }
	                    if ('childTokens' in ext && ext.childTokens) { // Child tokens to be visited by walkTokens
	                        extensions.childTokens[ext.name] = ext.childTokens;
	                    }
	                });
	                opts.extensions = extensions;
	            }
	            // ==-- Parse "overwrite" extensions --== //
	            if (pack.renderer) {
	                const renderer = this.defaults.renderer || new _Renderer(this.defaults);
	                for (const prop in pack.renderer) {
	                    if (!(prop in renderer)) {
	                        throw new Error(`renderer '${prop}' does not exist`);
	                    }
	                    if (['options', 'parser'].includes(prop)) {
	                        // ignore options property
	                        continue;
	                    }
	                    const rendererProp = prop;
	                    const rendererFunc = pack.renderer[rendererProp];
	                    const prevRenderer = renderer[rendererProp];
	                    // Replace renderer with func to run extension, but fall back if false
	                    renderer[rendererProp] = (...args) => {
	                        let ret = rendererFunc.apply(renderer, args);
	                        if (ret === false) {
	                            ret = prevRenderer.apply(renderer, args);
	                        }
	                        return ret || '';
	                    };
	                }
	                opts.renderer = renderer;
	            }
	            if (pack.tokenizer) {
	                const tokenizer = this.defaults.tokenizer || new _Tokenizer(this.defaults);
	                for (const prop in pack.tokenizer) {
	                    if (!(prop in tokenizer)) {
	                        throw new Error(`tokenizer '${prop}' does not exist`);
	                    }
	                    if (['options', 'rules', 'lexer'].includes(prop)) {
	                        // ignore options, rules, and lexer properties
	                        continue;
	                    }
	                    const tokenizerProp = prop;
	                    const tokenizerFunc = pack.tokenizer[tokenizerProp];
	                    const prevTokenizer = tokenizer[tokenizerProp];
	                    // Replace tokenizer with func to run extension, but fall back if false
	                    // @ts-expect-error cannot type tokenizer function dynamically
	                    tokenizer[tokenizerProp] = (...args) => {
	                        let ret = tokenizerFunc.apply(tokenizer, args);
	                        if (ret === false) {
	                            ret = prevTokenizer.apply(tokenizer, args);
	                        }
	                        return ret;
	                    };
	                }
	                opts.tokenizer = tokenizer;
	            }
	            // ==-- Parse Hooks extensions --== //
	            if (pack.hooks) {
	                const hooks = this.defaults.hooks || new _Hooks();
	                for (const prop in pack.hooks) {
	                    if (!(prop in hooks)) {
	                        throw new Error(`hook '${prop}' does not exist`);
	                    }
	                    if (['options', 'block'].includes(prop)) {
	                        // ignore options and block properties
	                        continue;
	                    }
	                    const hooksProp = prop;
	                    const hooksFunc = pack.hooks[hooksProp];
	                    const prevHook = hooks[hooksProp];
	                    if (_Hooks.passThroughHooks.has(prop)) {
	                        // @ts-expect-error cannot type hook function dynamically
	                        hooks[hooksProp] = (arg) => {
	                            if (this.defaults.async) {
	                                return Promise.resolve(hooksFunc.call(hooks, arg)).then(ret => {
	                                    return prevHook.call(hooks, ret);
	                                });
	                            }
	                            const ret = hooksFunc.call(hooks, arg);
	                            return prevHook.call(hooks, ret);
	                        };
	                    }
	                    else {
	                        // @ts-expect-error cannot type hook function dynamically
	                        hooks[hooksProp] = (...args) => {
	                            let ret = hooksFunc.apply(hooks, args);
	                            if (ret === false) {
	                                ret = prevHook.apply(hooks, args);
	                            }
	                            return ret;
	                        };
	                    }
	                }
	                opts.hooks = hooks;
	            }
	            // ==-- Parse WalkTokens extensions --== //
	            if (pack.walkTokens) {
	                const walkTokens = this.defaults.walkTokens;
	                const packWalktokens = pack.walkTokens;
	                opts.walkTokens = function (token) {
	                    let values = [];
	                    values.push(packWalktokens.call(this, token));
	                    if (walkTokens) {
	                        values = values.concat(walkTokens.call(this, token));
	                    }
	                    return values;
	                };
	            }
	            this.defaults = { ...this.defaults, ...opts };
	        });
	        return this;
	    }
	    setOptions(opt) {
	        this.defaults = { ...this.defaults, ...opt };
	        return this;
	    }
	    lexer(src, options) {
	        return _Lexer.lex(src, options ?? this.defaults);
	    }
	    parser(tokens, options) {
	        return _Parser.parse(tokens, options ?? this.defaults);
	    }
	    parseMarkdown(blockType) {
	        // eslint-disable-next-line @typescript-eslint/no-explicit-any
	        const parse = (src, options) => {
	            const origOpt = { ...options };
	            const opt = { ...this.defaults, ...origOpt };
	            const throwError = this.onError(!!opt.silent, !!opt.async);
	            // throw error if an extension set async to true but parse was called with async: false
	            if (this.defaults.async === true && origOpt.async === false) {
	                return throwError(new Error('marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise.'));
	            }
	            // throw error in case of non string input
	            if (typeof src === 'undefined' || src === null) {
	                return throwError(new Error('marked(): input parameter is undefined or null'));
	            }
	            if (typeof src !== 'string') {
	                return throwError(new Error('marked(): input parameter is of type '
	                    + Object.prototype.toString.call(src) + ', string expected'));
	            }
	            if (opt.hooks) {
	                opt.hooks.options = opt;
	                opt.hooks.block = blockType;
	            }
	            const lexer = opt.hooks ? opt.hooks.provideLexer() : (blockType ? _Lexer.lex : _Lexer.lexInline);
	            const parser = opt.hooks ? opt.hooks.provideParser() : (blockType ? _Parser.parse : _Parser.parseInline);
	            if (opt.async) {
	                return Promise.resolve(opt.hooks ? opt.hooks.preprocess(src) : src)
	                    .then(src => lexer(src, opt))
	                    .then(tokens => opt.hooks ? opt.hooks.processAllTokens(tokens) : tokens)
	                    .then(tokens => opt.walkTokens ? Promise.all(this.walkTokens(tokens, opt.walkTokens)).then(() => tokens) : tokens)
	                    .then(tokens => parser(tokens, opt))
	                    .then(html => opt.hooks ? opt.hooks.postprocess(html) : html)
	                    .catch(throwError);
	            }
	            try {
	                if (opt.hooks) {
	                    src = opt.hooks.preprocess(src);
	                }
	                let tokens = lexer(src, opt);
	                if (opt.hooks) {
	                    tokens = opt.hooks.processAllTokens(tokens);
	                }
	                if (opt.walkTokens) {
	                    this.walkTokens(tokens, opt.walkTokens);
	                }
	                let html = parser(tokens, opt);
	                if (opt.hooks) {
	                    html = opt.hooks.postprocess(html);
	                }
	                return html;
	            }
	            catch (e) {
	                return throwError(e);
	            }
	        };
	        return parse;
	    }
	    onError(silent, async) {
	        return (e) => {
	            e.message += '\nPlease report this to https://github.com/markedjs/marked.';
	            if (silent) {
	                const msg = '<p>An error occurred:</p><pre>'
	                    + escape$1(e.message + '', true)
	                    + '</pre>';
	                if (async) {
	                    return Promise.resolve(msg);
	                }
	                return msg;
	            }
	            if (async) {
	                return Promise.reject(e);
	            }
	            throw e;
	        };
	    }
	}

	const markedInstance = new Marked();
	function marked(src, opt) {
	    return markedInstance.parse(src, opt);
	}
	/**
	 * Sets the default options.
	 *
	 * @param options Hash of options
	 */
	marked.options =
	    marked.setOptions = function (options) {
	        markedInstance.setOptions(options);
	        marked.defaults = markedInstance.defaults;
	        changeDefaults(marked.defaults);
	        return marked;
	    };
	/**
	 * Gets the original marked default options.
	 */
	marked.getDefaults = _getDefaults;
	marked.defaults = _defaults;
	/**
	 * Use Extension
	 */
	marked.use = function (...args) {
	    markedInstance.use(...args);
	    marked.defaults = markedInstance.defaults;
	    changeDefaults(marked.defaults);
	    return marked;
	};
	/**
	 * Run callback for every token
	 */
	marked.walkTokens = function (tokens, callback) {
	    return markedInstance.walkTokens(tokens, callback);
	};
	/**
	 * Compiles markdown to HTML without enclosing `p` tag.
	 *
	 * @param src String of markdown source to be compiled
	 * @param options Hash of options
	 * @return String of compiled HTML
	 */
	marked.parseInline = markedInstance.parseInline;
	/**
	 * Expose
	 */
	marked.Parser = _Parser;
	marked.parser = _Parser.parse;
	marked.Renderer = _Renderer;
	marked.TextRenderer = _TextRenderer;
	marked.Lexer = _Lexer;
	marked.lexer = _Lexer.lex;
	marked.Tokenizer = _Tokenizer;
	marked.Hooks = _Hooks;
	marked.parse = marked;
	marked.options;
	marked.setOptions;
	marked.use;
	marked.walkTokens;
	marked.parseInline;
	_Parser.parse;
	_Lexer.lex;

	// src/utils/assetHelper.js
	function getAssetPath(assetType, filename, assetPaths) {
	  if (!filename) return '';

	  const typeMap = {
	    'character': 'characters',   // Added this line
	    'background': 'backgrounds',
	    'sound': 'sounds',
	    'music': 'music',
	    'style': 'styles' // If needed
	    // Remove 'full' and 'close' if they're no longer used
	  };

	  const pathType = typeMap[assetType];

	  if (pathType && assetPaths[pathType]) {
	    // Ensure there's a slash between the path and filename
	    // Also, remove any trailing slash from assetPaths[pathType] to prevent double slashes
	    const sanitizedPath = assetPaths[pathType].endsWith('/')
	      ? assetPaths[pathType].slice(0, -1)
	      : assetPaths[pathType];
	    return `${sanitizedPath}/${filename}`;
	  }

	  console.warn(`Asset type "${assetType}" is not defined in assetPaths.`);
	  return filename; // Fallback to filename if pathType not found
	}

	// src/utils/transitions.js

	// Define the different transition effects
	const transitions = {
	  no_effect: {
	    name: null,
	    duration: 0
	  },
	  fade_short: {
	    name: fade, // Directly use Svelte's fade transition
	    duration: 500 // 0.5 seconds
	  },
	  fade_long: {
	    name: fade, // Directly use Svelte's fade transition
	    duration: 2000 // 2 seconds
	  },
	  fade_scale: {
	    name: 'fadeScale', // Custom transition name
	    duration: 700 // 0.7 seconds
	  }
	};

	// Function to get transition based on the slide
	function getTransition(slide) {
	  return transitions[slide.transition] || transitions.no_effect;
	}

	/**
	 * Custom fade transition with customizable duration.
	 * @param {Object} params - Transition parameters.
	 * @param {number} params.duration - Duration of the transition in milliseconds.
	 */
	function customFade(node, { duration = 500 }) {
	  return {
	    duration,
	    css: t => `
      opacity: ${t}
    `
	  };
	}

	/**
	 * Custom fly transition with direction and duration.
	 * @param {Object} params - Transition parameters.
	 * @param {string} params.direction - Direction from which the element flies in ('left', 'right', 'up', 'down').
	 * @param {number} params.duration - Duration of the transition in milliseconds.
	 */
	function customFly(node, { direction = 'left', duration = 500 }) {
	  let x = 0;
	  let y = 0;

	  switch(direction) {
	    case 'left':
	      x = -200;
	      break;
	    case 'right':
	      x = 200;
	      break;
	    case 'up':
	      y = -200;
	      break;
	    case 'down':
	      y = 200;
	      break;
	  }

	  return {
	    duration,
	    easing: cubicOut,
	    css: t => `
      transform: translate(${x * (1 - t)}px, ${y * (1 - t)}px);
      opacity: ${t}
    `
	  };
	}

	/**
	 * Combined Fade and Scale Transition
	 * @param {Object} params - Transition parameters.
	 * @param {number} params.duration - Duration of the transition in milliseconds.
	 */
	function fadeScale(node, { duration = 700 }) {
	  return {
	    duration,
	    easing: cubicOut,
	    css: t => `
      opacity: ${t};
      transform: scale(${t});
    `
	  };
	}

	/* src\components\TransitionWrapper.svelte generated by Svelte v4.2.19 */
	const file$6 = "src\\components\\TransitionWrapper.svelte";

	// (99:0) {:else}
	function create_else_block$1(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;
		let img_intro;
		let img_outro;
		let current;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*character*/ ctx[0].speaker || 'Character');
				attr_dev(img, "loading", "lazy");
				attr_dev(img, "class", "svelte-ln043p");
				toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				add_location(img, file$6, 100, 2, 3324);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (!current || dirty & /*character, assetPaths*/ 3 && !src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*character*/ 1 && img_alt_value !== (img_alt_value = /*character*/ ctx[0].speaker || 'Character')) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (!current || dirty & /*imgborder*/ 4) {
					toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (img_outro) img_outro.end(1);
						img_intro = create_in_transition(img, fade, { duration: 500 });
						img_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (img_intro) img_intro.invalidate();

				if (local) {
					img_outro = create_out_transition(img, fade, { duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block$1.name,
			type: "else",
			source: "(99:0) {:else}",
			ctx
		});

		return block;
	}

	// (90:41) 
	function create_if_block_3$1(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;
		let img_intro;
		let img_outro;
		let current;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*character*/ ctx[0].speaker || 'Character');
				attr_dev(img, "loading", "lazy");
				attr_dev(img, "class", "svelte-ln043p");
				toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				add_location(img, file$6, 90, 2, 2997);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (!current || dirty & /*character, assetPaths*/ 3 && !src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*character*/ 1 && img_alt_value !== (img_alt_value = /*character*/ ctx[0].speaker || 'Character')) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (!current || dirty & /*imgborder*/ 4) {
					toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (img_outro) img_outro.end(1);
						img_intro = create_in_transition(img, customFly, /*transitionOptions*/ ctx[4]);
						img_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (img_intro) img_intro.invalidate();

				if (local) {
					img_outro = create_out_transition(img, fade, { duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3$1.name,
			type: "if",
			source: "(90:41) ",
			ctx
		});

		return block;
	}

	// (81:42) 
	function create_if_block_2$1(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;
		let img_intro;
		let img_outro;
		let current;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*character*/ ctx[0].speaker || 'Character');
				attr_dev(img, "loading", "lazy");
				attr_dev(img, "class", "svelte-ln043p");
				toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				add_location(img, file$6, 81, 2, 2698);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (!current || dirty & /*character, assetPaths*/ 3 && !src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*character*/ 1 && img_alt_value !== (img_alt_value = /*character*/ ctx[0].speaker || 'Character')) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (!current || dirty & /*imgborder*/ 4) {
					toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (img_outro) img_outro.end(1);
						img_intro = create_in_transition(img, customFade, /*transitionOptions*/ ctx[4]);
						img_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (img_intro) img_intro.invalidate();

				if (local) {
					img_outro = create_out_transition(img, fade, { duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2$1.name,
			type: "if",
			source: "(81:42) ",
			ctx
		});

		return block;
	}

	// (72:35) 
	function create_if_block_1$2(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;
		let img_intro;
		let img_outro;
		let current;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*character*/ ctx[0].speaker || 'Character');
				attr_dev(img, "loading", "lazy");
				attr_dev(img, "class", "svelte-ln043p");
				toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				add_location(img, file$6, 72, 2, 2405);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (!current || dirty & /*character, assetPaths*/ 3 && !src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*character*/ 1 && img_alt_value !== (img_alt_value = /*character*/ ctx[0].speaker || 'Character')) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (!current || dirty & /*imgborder*/ 4) {
					toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (img_outro) img_outro.end(1);
						img_intro = create_in_transition(img, fly, /*transitionOptions*/ ctx[4]);
						img_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (img_intro) img_intro.invalidate();

				if (local) {
					img_outro = create_out_transition(img, fade, { duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$2.name,
			type: "if",
			source: "(72:35) ",
			ctx
		});

		return block;
	}

	// (63:0) {#if transitionType === 'fade'}
	function create_if_block$4(ctx) {
		let img;
		let img_src_value;
		let img_alt_value;
		let img_intro;
		let img_outro;
		let current;

		const block = {
			c: function create() {
				img = element("img");
				if (!src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) attr_dev(img, "src", img_src_value);
				attr_dev(img, "alt", img_alt_value = /*character*/ ctx[0].speaker || 'Character');
				attr_dev(img, "loading", "lazy");
				attr_dev(img, "class", "svelte-ln043p");
				toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				add_location(img, file$6, 63, 2, 2118);
			},
			m: function mount(target, anchor) {
				insert_dev(target, img, anchor);
				current = true;
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;

				if (!current || dirty & /*character, assetPaths*/ 3 && !src_url_equal(img.src, img_src_value = getAssetPath('character', /*character*/ ctx[0].imageSrc, /*assetPaths*/ ctx[1]))) {
					attr_dev(img, "src", img_src_value);
				}

				if (!current || dirty & /*character*/ 1 && img_alt_value !== (img_alt_value = /*character*/ ctx[0].speaker || 'Character')) {
					attr_dev(img, "alt", img_alt_value);
				}

				if (!current || dirty & /*imgborder*/ 4) {
					toggle_class(img, "enhanced", /*imgborder*/ ctx[2]);
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (img_outro) img_outro.end(1);
						img_intro = create_in_transition(img, fade, /*transitionOptions*/ ctx[4]);
						img_intro.start();
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (img_intro) img_intro.invalidate();

				if (local) {
					img_outro = create_out_transition(img, fade, { duration: 500 });
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(img);
				}

				if (detaching && img_outro) img_outro.end();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$4.name,
			type: "if",
			source: "(63:0) {#if transitionType === 'fade'}",
			ctx
		});

		return block;
	}

	function create_fragment$6(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;

		const if_block_creators = [
			create_if_block$4,
			create_if_block_1$2,
			create_if_block_2$1,
			create_if_block_3$1,
			create_else_block$1
		];

		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (/*transitionType*/ ctx[3] === 'fade') return 0;
			if (/*transitionType*/ ctx[3] === 'fly') return 1;
			if (/*transitionType*/ ctx[3] === 'customFade') return 2;
			if (/*transitionType*/ ctx[3] === 'customFly') return 3;
			return 4;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, [dirty]) {
				if_block.p(ctx, dirty);
			},
			i: function intro(local) {
				transition_in(if_block);
			},
			o: function outro(local) {
				transition_out(if_block);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$6.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function determineTransition(transition) {
		if (!transition || !transition.type) {
			return { type: 'fade', options: { duration: 500 } };
		}

		switch (transition.type) {
			case 'fade':
				return {
					type: 'fade',
					options: { duration: transition.duration || 500 }
				};
			case 'fly':
				return {
					type: 'fly',
					options: {
						x: transition.direction === 'left'
						? -200
						: transition.direction === 'right' ? 200 : 0,
						y: transition.direction === 'up'
						? -200
						: transition.direction === 'down' ? 200 : 0,
						duration: transition.duration || 500
					}
				};
			case 'customFade':
				return {
					type: 'customFade',
					options: { duration: transition.duration || 500 }
				};
			case 'customFly':
				return {
					type: 'customFly',
					options: {
						direction: transition.direction || 'left',
						duration: transition.duration || 500
					}
				};
			default:
				return { type: 'fade', options: { duration: 500 } };
		}
	}

	function instance$6($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('TransitionWrapper', slots, []);
		let { transition = {} } = $$props;
		let { character = {} } = $$props;
		let { assetPaths = {} } = $$props;
		let { imgborder = false } = $$props;
		const { type: transitionType, options: transitionOptions } = determineTransition(transition);
		const writable_props = ['transition', 'character', 'assetPaths', 'imgborder'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TransitionWrapper> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('transition' in $$props) $$invalidate(5, transition = $$props.transition);
			if ('character' in $$props) $$invalidate(0, character = $$props.character);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
			if ('imgborder' in $$props) $$invalidate(2, imgborder = $$props.imgborder);
		};

		$$self.$capture_state = () => ({
			fade,
			fly,
			customFade,
			customFly,
			getAssetPath,
			transition,
			character,
			assetPaths,
			imgborder,
			determineTransition,
			transitionType,
			transitionOptions
		});

		$$self.$inject_state = $$props => {
			if ('transition' in $$props) $$invalidate(5, transition = $$props.transition);
			if ('character' in $$props) $$invalidate(0, character = $$props.character);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
			if ('imgborder' in $$props) $$invalidate(2, imgborder = $$props.imgborder);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			character,
			assetPaths,
			imgborder,
			transitionType,
			transitionOptions,
			transition
		];
	}

	class TransitionWrapper extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$6, create_fragment$6, safe_not_equal, {
				transition: 5,
				character: 0,
				assetPaths: 1,
				imgborder: 2
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "TransitionWrapper",
				options,
				id: create_fragment$6.name
			});
		}

		get transition() {
			throw new Error("<TransitionWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set transition(value) {
			throw new Error("<TransitionWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get character() {
			throw new Error("<TransitionWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set character(value) {
			throw new Error("<TransitionWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get assetPaths() {
			throw new Error("<TransitionWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set assetPaths(value) {
			throw new Error("<TransitionWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get imgborder() {
			throw new Error("<TransitionWrapper>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set imgborder(value) {
			throw new Error("<TransitionWrapper>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	const subscriber_queue = [];

	/**
	 * Create a `Writable` store that allows both updating and reading by subscription.
	 *
	 * https://svelte.dev/docs/svelte-store#writable
	 * @template T
	 * @param {T} [value] initial value
	 * @param {import('./public.js').StartStopNotifier<T>} [start]
	 * @returns {import('./public.js').Writable<T>}
	 */
	function writable(value, start = noop) {
		/** @type {import('./public.js').Unsubscriber} */
		let stop;
		/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
		const subscribers = new Set();
		/** @param {T} new_value
		 * @returns {void}
		 */
		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (stop) {
					// store is ready
					const run_queue = !subscriber_queue.length;
					for (const subscriber of subscribers) {
						subscriber[1]();
						subscriber_queue.push(subscriber, value);
					}
					if (run_queue) {
						for (let i = 0; i < subscriber_queue.length; i += 2) {
							subscriber_queue[i][0](subscriber_queue[i + 1]);
						}
						subscriber_queue.length = 0;
					}
				}
			}
		}

		/**
		 * @param {import('./public.js').Updater<T>} fn
		 * @returns {void}
		 */
		function update(fn) {
			set(fn(value));
		}

		/**
		 * @param {import('./public.js').Subscriber<T>} run
		 * @param {import('./private.js').Invalidator<T>} [invalidate]
		 * @returns {import('./public.js').Unsubscriber}
		 */
		function subscribe(run, invalidate = noop) {
			/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
			const subscriber = [run, invalidate];
			subscribers.add(subscriber);
			if (subscribers.size === 1) {
				stop = start(set, update) || noop;
			}
			run(value);
			return () => {
				subscribers.delete(subscriber);
				if (subscribers.size === 0 && stop) {
					stop();
					stop = null;
				}
			};
		}
		return { set, update, subscribe };
	}

	// src/stores.js

	// Default asset directories
	const assetPaths = writable({
	  characters: '/images/characters/',
	  backgrounds: '/images/backgrounds/',
	  music: '/music/',
	  sounds: '/sounds/',
	  styles: '/styles/' // If you have stylesheets or related assets
	});

	const currentStage = writable(0);
	const slides = writable([]);
	const history = writable([]);
	const backgroundImage = writable('');
	const currentChapter = writable(0);
	const backgroundMusic = writable(''); // Initialize as empty
	const backgroundVolume = writable(0.5); // Default volume set to 50%

	// Record player choices
	const playerChoices = writable([]);

	// **Audio Management Stores and Functions**

	// Track the currently playing audio instance
	const currentAudio = writable(null);

	// Default volume for sound effects (50%)
	const soundEffectVolume = writable(0.4);

	/**
	 * Play a sound with specified volume.
	 * @param {string} soundPath - The path to the sound file.
	 * @param {boolean} isMuted - Whether the sound is muted.
	 * @param {number} [volume=0.5] - Volume level (0.0 to 1.0). Defaults to 50%.
	 */
	function playSound(soundPath, isMuted, volume = 0.5) {
	  if (soundPath && !isMuted) {
	    // Pause and reset any currently playing audio
	    currentAudio.subscribe(audio => {
	      if (audio) {
	        audio.pause();
	        audio.currentTime = 0;
	      }
	    })();
	    
	    const audio = new Audio(soundPath);
	    audio.volume = volume;
	    audio.play().catch(error => {
	      console.error('Sound effect playback failed:', error);
	    });
	    
	    currentAudio.set(audio);
	  }
	}

	/* src\components\ClickToAdvanceOverlay.svelte generated by Svelte v4.2.19 */
	const file$5 = "src\\components\\ClickToAdvanceOverlay.svelte";

	function create_fragment$5(ctx) {
		let div;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "overlay svelte-1o1lzq8");
				add_location(div, file$5, 19, 2, 403);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (!mounted) {
					dispose = listen_dev(
						div,
						"click",
						function () {
							if (is_function(/*onAdvance*/ ctx[0])) /*onAdvance*/ ctx[0].apply(this, arguments);
						},
						false,
						false,
						false,
						false
					);

					mounted = true;
				}
			},
			p: function update(new_ctx, [dirty]) {
				ctx = new_ctx;
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$5.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ClickToAdvanceOverlay', slots, []);

		let { onAdvance = () => {
			
		} } = $$props;

		const writable_props = ['onAdvance'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ClickToAdvanceOverlay> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('onAdvance' in $$props) $$invalidate(0, onAdvance = $$props.onAdvance);
		};

		$$self.$capture_state = () => ({ onAdvance });

		$$self.$inject_state = $$props => {
			if ('onAdvance' in $$props) $$invalidate(0, onAdvance = $$props.onAdvance);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [onAdvance];
	}

	class ClickToAdvanceOverlay extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$5, safe_not_equal, { onAdvance: 0 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ClickToAdvanceOverlay",
				options,
				id: create_fragment$5.name
			});
		}

		get onAdvance() {
			throw new Error("<ClickToAdvanceOverlay>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set onAdvance(value) {
			throw new Error("<ClickToAdvanceOverlay>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\slides\DialogueSlide.svelte generated by Svelte v4.2.19 */

	const { console: console_1$4 } = globals;
	const file$4 = "src\\slides\\DialogueSlide.svelte";

	function get_each_context$2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[11] = list[i];
		child_ctx[13] = i;
		return child_ctx;
	}

	// (299:6) {#if character}
	function create_if_block$3(ctx) {
		let div;
		let transitionwrapper;
		let t;
		let div_class_value;
		let current;

		transitionwrapper = new TransitionWrapper({
				props: {
					character: /*character*/ ctx[11],
					transition: /*character*/ ctx[11].transition,
					assetPaths: /*assetPaths*/ ctx[1],
					imgborder: /*character*/ ctx[11].imgborder
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				div = element("div");
				create_component(transitionwrapper.$$.fragment);
				t = space();
				attr_dev(div, "class", div_class_value = "character-image " + /*character*/ ctx[11].position + " " + /*character*/ ctx[11].imageType + " svelte-1ug835e");
				add_location(div, file$4, 299, 8, 7411);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(transitionwrapper, div, null);
				append_dev(div, t);
				current = true;
			},
			p: function update(ctx, dirty) {
				const transitionwrapper_changes = {};
				if (dirty & /*characters*/ 1) transitionwrapper_changes.character = /*character*/ ctx[11];
				if (dirty & /*characters*/ 1) transitionwrapper_changes.transition = /*character*/ ctx[11].transition;
				if (dirty & /*assetPaths*/ 2) transitionwrapper_changes.assetPaths = /*assetPaths*/ ctx[1];
				if (dirty & /*characters*/ 1) transitionwrapper_changes.imgborder = /*character*/ ctx[11].imgborder;
				transitionwrapper.$set(transitionwrapper_changes);

				if (!current || dirty & /*characters*/ 1 && div_class_value !== (div_class_value = "character-image " + /*character*/ ctx[11].position + " " + /*character*/ ctx[11].imageType + " svelte-1ug835e")) {
					attr_dev(div, "class", div_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(transitionwrapper.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(transitionwrapper.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(transitionwrapper);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$3.name,
			type: "if",
			source: "(299:6) {#if character}",
			ctx
		});

		return block;
	}

	// (298:4) {#each characters as character, index}
	function create_each_block$2(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*character*/ ctx[11] && create_if_block$3(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*character*/ ctx[11]) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*characters*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block$3(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$2.name,
			type: "each",
			source: "(298:4) {#each characters as character, index}",
			ctx
		});

		return block;
	}

	function create_fragment$4(ctx) {
		let div3;
		let div0;
		let t0;
		let div2;
		let div1;
		let div2_intro;
		let div2_outro;
		let t1;
		let clicktoadvanceoverlay;
		let current;
		let each_value = ensure_array_like_dev(/*characters*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
		}

		const out = i => transition_out(each_blocks[i], 1, 1, () => {
			each_blocks[i] = null;
		});

		clicktoadvanceoverlay = new ClickToAdvanceOverlay({
				props: {
					onAdvance: /*handleDialogueAdvance*/ ctx[4]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				div3 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t0 = space();
				div2 = element("div");
				div1 = element("div");
				t1 = space();
				create_component(clicktoadvanceoverlay.$$.fragment);
				attr_dev(div0, "class", "portraits-container svelte-1ug835e");
				add_location(div0, file$4, 296, 2, 7301);
				attr_dev(div1, "class", "dialogue-text svelte-1ug835e");
				add_location(div1, file$4, 319, 4, 7907);
				attr_dev(div2, "class", "dialogue-box svelte-1ug835e");
				add_location(div2, file$4, 314, 2, 7799);
				attr_dev(div3, "class", "dialogue-slide svelte-1ug835e");
				set_style(div3, "background-image", "url('" + /*backgroundPath*/ ctx[3] + "')");
				add_location(div3, file$4, 293, 0, 7182);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div3, anchor);
				append_dev(div3, div0);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div0, null);
					}
				}

				append_dev(div3, t0);
				append_dev(div3, div2);
				append_dev(div2, div1);
				div1.innerHTML = /*sanitizedHTML*/ ctx[2];
				append_dev(div3, t1);
				mount_component(clicktoadvanceoverlay, div3, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*characters, assetPaths*/ 3) {
					each_value = ensure_array_like_dev(/*characters*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$2(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
							transition_in(each_blocks[i], 1);
						} else {
							each_blocks[i] = create_each_block$2(child_ctx);
							each_blocks[i].c();
							transition_in(each_blocks[i], 1);
							each_blocks[i].m(div0, null);
						}
					}

					group_outros();

					for (i = each_value.length; i < each_blocks.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				if (!current || dirty & /*sanitizedHTML*/ 4) div1.innerHTML = /*sanitizedHTML*/ ctx[2];
				if (!current || dirty & /*backgroundPath*/ 8) {
					set_style(div3, "background-image", "url('" + /*backgroundPath*/ ctx[3] + "')");
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value.length; i += 1) {
					transition_in(each_blocks[i]);
				}

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (div2_outro) div2_outro.end(1);
						div2_intro = create_in_transition(div2, fade, { duration: 500 });
						div2_intro.start();
					});
				}

				transition_in(clicktoadvanceoverlay.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				each_blocks = each_blocks.filter(Boolean);

				for (let i = 0; i < each_blocks.length; i += 1) {
					transition_out(each_blocks[i]);
				}

				if (div2_intro) div2_intro.invalidate();

				if (local) {
					div2_outro = create_out_transition(div2, fade, { duration: 500 });
				}

				transition_out(clicktoadvanceoverlay.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div3);
				}

				destroy_each(each_blocks, detaching);
				if (detaching && div2_outro) div2_outro.end();
				destroy_component(clicktoadvanceoverlay);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$4.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$4($$self, $$props, $$invalidate) {
		let backgroundPath;
		let soundEffectPath;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('DialogueSlide', slots, []);
		let { characters = [] } = $$props;
		let { dialogueText = '' } = $$props;
		let { background = '' } = $$props;
		let { soundEffect = '' } = $$props;
		let { isMuted = false } = $$props;

		let { updateSlide = () => {
			
		} } = $$props;

		let { assetPaths = {} } = $$props;
		let sanitizedHTML = '';

		// Function to handle dialogue advance
		function handleDialogueAdvance(event) {
			console.log('DialogueSlide handleDialogueAdvance triggered');
			updateSlide();
		} // Removed playSound() from here to prevent double playback

		// Play sound effect on mount at full volume
		onMount(() => {
			playSound(soundEffectPath, isMuted); // Full volume on mount
		});

		const writable_props = [
			'characters',
			'dialogueText',
			'background',
			'soundEffect',
			'isMuted',
			'updateSlide',
			'assetPaths'
		];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$4.warn(`<DialogueSlide> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('characters' in $$props) $$invalidate(0, characters = $$props.characters);
			if ('dialogueText' in $$props) $$invalidate(5, dialogueText = $$props.dialogueText);
			if ('background' in $$props) $$invalidate(6, background = $$props.background);
			if ('soundEffect' in $$props) $$invalidate(7, soundEffect = $$props.soundEffect);
			if ('isMuted' in $$props) $$invalidate(8, isMuted = $$props.isMuted);
			if ('updateSlide' in $$props) $$invalidate(9, updateSlide = $$props.updateSlide);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
		};

		$$self.$capture_state = () => ({
			onMount,
			DOMPurify,
			marked,
			getAssetPath,
			TransitionWrapper,
			fade,
			playSound,
			ClickToAdvanceOverlay,
			characters,
			dialogueText,
			background,
			soundEffect,
			isMuted,
			updateSlide,
			assetPaths,
			sanitizedHTML,
			handleDialogueAdvance,
			soundEffectPath,
			backgroundPath
		});

		$$self.$inject_state = $$props => {
			if ('characters' in $$props) $$invalidate(0, characters = $$props.characters);
			if ('dialogueText' in $$props) $$invalidate(5, dialogueText = $$props.dialogueText);
			if ('background' in $$props) $$invalidate(6, background = $$props.background);
			if ('soundEffect' in $$props) $$invalidate(7, soundEffect = $$props.soundEffect);
			if ('isMuted' in $$props) $$invalidate(8, isMuted = $$props.isMuted);
			if ('updateSlide' in $$props) $$invalidate(9, updateSlide = $$props.updateSlide);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
			if ('sanitizedHTML' in $$props) $$invalidate(2, sanitizedHTML = $$props.sanitizedHTML);
			if ('soundEffectPath' in $$props) soundEffectPath = $$props.soundEffectPath;
			if ('backgroundPath' in $$props) $$invalidate(3, backgroundPath = $$props.backgroundPath);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*background, assetPaths*/ 66) {
				// Compute full paths using the utility function
				$$invalidate(3, backgroundPath = getAssetPath('background', background, assetPaths));
			}

			if ($$self.$$.dirty & /*soundEffect, assetPaths*/ 130) {
				soundEffectPath = getAssetPath('sound', soundEffect, assetPaths);
			}

			if ($$self.$$.dirty & /*dialogueText*/ 32) {
				// Parse and sanitize HTML
				$$invalidate(2, sanitizedHTML = DOMPurify.sanitize(marked.parse(dialogueText), {
					ALLOWED_TAGS: [
						'b',
						'i',
						'em',
						'strong',
						'a',
						'p',
						'br',
						'ul',
						'ol',
						'li',
						'span',
						'div',
						'h1',
						'h2',
						'h3',
						'h4',
						'h5',
						'h6',
						'img',
						'table',
						'thead',
						'tbody',
						'tr',
						'th',
						'td',
						'blockquote',
						'code',
						'pre'
					],
					ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
				}));
			}
		};

		return [
			characters,
			assetPaths,
			sanitizedHTML,
			backgroundPath,
			handleDialogueAdvance,
			dialogueText,
			background,
			soundEffect,
			isMuted,
			updateSlide
		];
	}

	class DialogueSlide extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$4, create_fragment$4, safe_not_equal, {
				characters: 0,
				dialogueText: 5,
				background: 6,
				soundEffect: 7,
				isMuted: 8,
				updateSlide: 9,
				assetPaths: 1
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "DialogueSlide",
				options,
				id: create_fragment$4.name
			});
		}

		get characters() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set characters(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get dialogueText() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set dialogueText(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get background() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set background(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get soundEffect() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set soundEffect(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get isMuted() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set isMuted(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get updateSlide() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set updateSlide(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get assetPaths() {
			throw new Error("<DialogueSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set assetPaths(value) {
			throw new Error("<DialogueSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\slides\ChoicesSlide.svelte generated by Svelte v4.2.19 */

	const { console: console_1$3 } = globals;
	const file$3 = "src\\slides\\ChoicesSlide.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		child_ctx[17] = i;
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[15] = list[i];
		child_ctx[17] = i;
		return child_ctx;
	}

	// (306:6) {#if choice.character}
	function create_if_block_1$1(ctx) {
		let div;
		let transitionwrapper;
		let t;
		let div_class_value;
		let current;

		transitionwrapper = new TransitionWrapper({
				props: {
					character: /*choice*/ ctx[15].character,
					transition: /*choice*/ ctx[15].character.transition,
					assetPaths: /*assetPaths*/ ctx[1],
					imgborder: /*choice*/ ctx[15].character.imgborder !== undefined
					? /*choice*/ ctx[15].character.imgborder
					: false
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				div = element("div");
				create_component(transitionwrapper.$$.fragment);
				t = space();
				attr_dev(div, "class", div_class_value = "" + (null_to_empty(`portrait-${/*choice*/ ctx[15].character.imageType}`) + " svelte-v4d7b5"));
				add_location(div, file$3, 306, 8, 7986);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				mount_component(transitionwrapper, div, null);
				append_dev(div, t);
				current = true;
			},
			p: function update(ctx, dirty) {
				const transitionwrapper_changes = {};
				if (dirty & /*choices*/ 1) transitionwrapper_changes.character = /*choice*/ ctx[15].character;
				if (dirty & /*choices*/ 1) transitionwrapper_changes.transition = /*choice*/ ctx[15].character.transition;
				if (dirty & /*assetPaths*/ 2) transitionwrapper_changes.assetPaths = /*assetPaths*/ ctx[1];

				if (dirty & /*choices*/ 1) transitionwrapper_changes.imgborder = /*choice*/ ctx[15].character.imgborder !== undefined
				? /*choice*/ ctx[15].character.imgborder
				: false;

				transitionwrapper.$set(transitionwrapper_changes);

				if (!current || dirty & /*choices*/ 1 && div_class_value !== (div_class_value = "" + (null_to_empty(`portrait-${/*choice*/ ctx[15].character.imageType}`) + " svelte-v4d7b5"))) {
					attr_dev(div, "class", div_class_value);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(transitionwrapper.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(transitionwrapper.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				destroy_component(transitionwrapper);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1$1.name,
			type: "if",
			source: "(306:6) {#if choice.character}",
			ctx
		});

		return block;
	}

	// (305:4) {#each choices as choice, index}
	function create_each_block_1(ctx) {
		let if_block_anchor;
		let current;
		let if_block = /*choice*/ ctx[15].character && create_if_block_1$1(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (/*choice*/ ctx[15].character) {
					if (if_block) {
						if_block.p(ctx, dirty);

						if (dirty & /*choices*/ 1) {
							transition_in(if_block, 1);
						}
					} else {
						if_block = create_if_block_1$1(ctx);
						if_block.c();
						transition_in(if_block, 1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();

					transition_out(if_block, 1, 1, () => {
						if_block = null;
					});

					check_outros();
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(305:4) {#each choices as choice, index}",
			ctx
		});

		return block;
	}

	// (322:4) {#each choices as choice, index}
	function create_each_block$1(ctx) {
		let div1;
		let div0;
		let p;
		let t0_value = /*choice*/ ctx[15].choiceText + "";
		let t0;
		let t1;
		let button;
		let t2;
		let button_aria_label_value;
		let t3;
		let mounted;
		let dispose;

		function click_handler() {
			return /*click_handler*/ ctx[12](/*choice*/ ctx[15]);
		}

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				p = element("p");
				t0 = text(t0_value);
				t1 = space();
				button = element("button");
				t2 = text("Choose");
				t3 = space();
				attr_dev(p, "class", "choice-text svelte-v4d7b5");
				add_location(p, file$3, 324, 10, 8578);
				attr_dev(button, "class", "choose-button svelte-v4d7b5");
				attr_dev(button, "aria-label", button_aria_label_value = `Choose option: ${/*choice*/ ctx[15].choiceText}`);
				add_location(button, file$3, 325, 10, 8636);
				attr_dev(div0, "class", "choice-box svelte-v4d7b5");
				add_location(div0, file$3, 323, 8, 8542);
				attr_dev(div1, "class", "choice-container svelte-v4d7b5");
				add_location(div1, file$3, 322, 6, 8502);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, p);
				append_dev(p, t0);
				append_dev(div0, t1);
				append_dev(div0, button);
				append_dev(button, t2);
				append_dev(div1, t3);

				if (!mounted) {
					dispose = listen_dev(button, "click", stop_propagation(click_handler), false, false, true, false);
					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty & /*choices*/ 1 && t0_value !== (t0_value = /*choice*/ ctx[15].choiceText + "")) set_data_dev(t0, t0_value);

				if (dirty & /*choices*/ 1 && button_aria_label_value !== (button_aria_label_value = `Choose option: ${/*choice*/ ctx[15].choiceText}`)) {
					attr_dev(button, "aria-label", button_aria_label_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block$1.name,
			type: "each",
			source: "(322:4) {#each choices as choice, index}",
			ctx
		});

		return block;
	}

	// (339:2) {#if showPopup}
	function create_if_block$2(ctx) {
		let div1;
		let div0;
		let p;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				div1 = element("div");
				div0 = element("div");
				p = element("p");
				add_location(p, file$3, 341, 8, 9071);
				attr_dev(div0, "class", "popup-message svelte-v4d7b5");
				add_location(div0, file$3, 340, 6, 9034);
				attr_dev(div1, "class", "popup-overlay svelte-v4d7b5");
				add_location(div1, file$3, 339, 4, 8971);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div1, anchor);
				append_dev(div1, div0);
				append_dev(div0, p);
				p.innerHTML = /*sanitizedPopupMessage*/ ctx[3];

				if (!mounted) {
					dispose = listen_dev(div1, "click", /*handlePopupClick*/ ctx[6], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*sanitizedPopupMessage*/ 8) p.innerHTML = /*sanitizedPopupMessage*/ ctx[3];		},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div1);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$2.name,
			type: "if",
			source: "(339:2) {#if showPopup}",
			ctx
		});

		return block;
	}

	function create_fragment$3(ctx) {
		let div2;
		let div0;
		let t0;
		let div1;
		let t1;
		let current;
		let each_value_1 = ensure_array_like_dev(/*choices*/ ctx[0]);
		let each_blocks_1 = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
			each_blocks_1[i] = null;
		});

		let each_value = ensure_array_like_dev(/*choices*/ ctx[0]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		let if_block = /*showPopup*/ ctx[2] && create_if_block$2(ctx);

		const block = {
			c: function create() {
				div2 = element("div");
				div0 = element("div");

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t0 = space();
				div1 = element("div");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t1 = space();
				if (if_block) if_block.c();
				attr_dev(div0, "class", "portraits-container svelte-v4d7b5");
				add_location(div0, file$3, 303, 2, 7875);
				attr_dev(div1, "class", "choices-container svelte-v4d7b5");
				add_location(div1, file$3, 320, 2, 8425);
				attr_dev(div2, "class", "choices-slide svelte-v4d7b5");
				set_style(div2, "background-image", "url('" + /*backgroundPath*/ ctx[4] + "')");
				add_location(div2, file$3, 300, 0, 7757);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div0);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					if (each_blocks_1[i]) {
						each_blocks_1[i].m(div0, null);
					}
				}

				append_dev(div2, t0);
				append_dev(div2, div1);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				append_dev(div2, t1);
				if (if_block) if_block.m(div2, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (dirty & /*choices, assetPaths, undefined*/ 3) {
					each_value_1 = ensure_array_like_dev(/*choices*/ ctx[0]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(child_ctx, dirty);
							transition_in(each_blocks_1[i], 1);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							transition_in(each_blocks_1[i], 1);
							each_blocks_1[i].m(div0, null);
						}
					}

					group_outros();

					for (i = each_value_1.length; i < each_blocks_1.length; i += 1) {
						out(i);
					}

					check_outros();
				}

				if (dirty & /*choices, selectChoice*/ 33) {
					each_value = ensure_array_like_dev(/*choices*/ ctx[0]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (/*showPopup*/ ctx[2]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$2(ctx);
						if_block.c();
						if_block.m(div2, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (!current || dirty & /*backgroundPath*/ 16) {
					set_style(div2, "background-image", "url('" + /*backgroundPath*/ ctx[4] + "')");
				}
			},
			i: function intro(local) {
				if (current) return;

				for (let i = 0; i < each_value_1.length; i += 1) {
					transition_in(each_blocks_1[i]);
				}

				current = true;
			},
			o: function outro(local) {
				each_blocks_1 = each_blocks_1.filter(Boolean);

				for (let i = 0; i < each_blocks_1.length; i += 1) {
					transition_out(each_blocks_1[i]);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				destroy_each(each_blocks_1, detaching);
				destroy_each(each_blocks, detaching);
				if (if_block) if_block.d();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$3.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$3($$self, $$props, $$invalidate) {
		let backgroundPath;
		let soundEffectPath;
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('ChoicesSlide', slots, []);
		let { choices = [] } = $$props;
		let { background = '' } = $$props;
		let { soundEffect = '' } = $$props;
		let { isMuted = false } = $$props;

		let { updateSlide = () => {
			
		} } = $$props;

		let { assetPaths = {} } = $$props;
		let showPopup = false; // Controls popup visibility
		let selectedChoice = null; // Stores the player's selected choice
		let sanitizedPopupMessage = '';

		// Handle choice selection
		function selectChoice(choice) {
			console.log(`selectChoice called for: ${choice.choiceText}`); // Logging for debugging
			$$invalidate(11, selectedChoice = choice);

			// Record the decision
			playerChoices.update(existingChoices => [...existingChoices, choice.choiceText]);

			// Play sound effect at 50% volume
			playSound(soundEffectPath, isMuted);

			// Show popup message
			$$invalidate(2, showPopup = true);
		}

		// Handle click on popup to proceed
		function handlePopupClick() {
			$$invalidate(2, showPopup = false);

			// Navigate to the next slide based on the selected choice
			updateSlide(selectedChoice.nextId);
		}

		// Handle keyboard navigation
		function handleKeydown(event) {
			if (showPopup) return; // Ignore if popup is active

			if (event.key === 'ArrowLeft' && choices[0]) {
				selectChoice(choices[0]);
			} else if (event.key === 'ArrowRight' && choices[1]) {
				selectChoice(choices[1]);
			}
		}

		// Play sound effect on mount at full volume
		onMount(() => {
			console.log('ChoicesSlide mounted'); // Logging for debugging

			if (soundEffectPath && !isMuted) {
				playSound(soundEffectPath, isMuted); // Full volume on mount
			}

			window.addEventListener('keydown', handleKeydown);
		});

		// Remove keyboard listener on destroy
		onDestroy(() => {
			window.removeEventListener('keydown', handleKeydown);
		});

		const writable_props = ['choices', 'background', 'soundEffect', 'isMuted', 'updateSlide', 'assetPaths'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$3.warn(`<ChoicesSlide> was created with unknown prop '${key}'`);
		});

		const click_handler = choice => selectChoice(choice);

		$$self.$$set = $$props => {
			if ('choices' in $$props) $$invalidate(0, choices = $$props.choices);
			if ('background' in $$props) $$invalidate(7, background = $$props.background);
			if ('soundEffect' in $$props) $$invalidate(8, soundEffect = $$props.soundEffect);
			if ('isMuted' in $$props) $$invalidate(9, isMuted = $$props.isMuted);
			if ('updateSlide' in $$props) $$invalidate(10, updateSlide = $$props.updateSlide);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
		};

		$$self.$capture_state = () => ({
			onMount,
			onDestroy,
			DOMPurify,
			playerChoices,
			playSound,
			soundEffectVolume,
			getAssetPath,
			TransitionWrapper,
			fade,
			choices,
			background,
			soundEffect,
			isMuted,
			updateSlide,
			assetPaths,
			showPopup,
			selectedChoice,
			sanitizedPopupMessage,
			selectChoice,
			handlePopupClick,
			handleKeydown,
			soundEffectPath,
			backgroundPath
		});

		$$self.$inject_state = $$props => {
			if ('choices' in $$props) $$invalidate(0, choices = $$props.choices);
			if ('background' in $$props) $$invalidate(7, background = $$props.background);
			if ('soundEffect' in $$props) $$invalidate(8, soundEffect = $$props.soundEffect);
			if ('isMuted' in $$props) $$invalidate(9, isMuted = $$props.isMuted);
			if ('updateSlide' in $$props) $$invalidate(10, updateSlide = $$props.updateSlide);
			if ('assetPaths' in $$props) $$invalidate(1, assetPaths = $$props.assetPaths);
			if ('showPopup' in $$props) $$invalidate(2, showPopup = $$props.showPopup);
			if ('selectedChoice' in $$props) $$invalidate(11, selectedChoice = $$props.selectedChoice);
			if ('sanitizedPopupMessage' in $$props) $$invalidate(3, sanitizedPopupMessage = $$props.sanitizedPopupMessage);
			if ('soundEffectPath' in $$props) soundEffectPath = $$props.soundEffectPath;
			if ('backgroundPath' in $$props) $$invalidate(4, backgroundPath = $$props.backgroundPath);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*background, assetPaths*/ 130) {
				// Compute full paths using the utility function
				$$invalidate(4, backgroundPath = getAssetPath('background', background, assetPaths));
			}

			if ($$self.$$.dirty & /*soundEffect, assetPaths*/ 258) {
				soundEffectPath = getAssetPath('sound', soundEffect, assetPaths);
			}

			if ($$self.$$.dirty & /*selectedChoice*/ 2048) {
				// Parse and sanitize popup message based on selected choice
				if (selectedChoice) {
					$$invalidate(3, sanitizedPopupMessage = selectedChoice.popupMessage
					? DOMPurify.sanitize(selectedChoice.popupMessage, {
							ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
							ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
						})
					: 'You made a choice. Click anywhere to continue.');
				}
			}
		};

		return [
			choices,
			assetPaths,
			showPopup,
			sanitizedPopupMessage,
			backgroundPath,
			selectChoice,
			handlePopupClick,
			background,
			soundEffect,
			isMuted,
			updateSlide,
			selectedChoice,
			click_handler
		];
	}

	class ChoicesSlide extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$3, create_fragment$3, safe_not_equal, {
				choices: 0,
				background: 7,
				soundEffect: 8,
				isMuted: 9,
				updateSlide: 10,
				assetPaths: 1
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "ChoicesSlide",
				options,
				id: create_fragment$3.name
			});
		}

		get choices() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set choices(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get background() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set background(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get soundEffect() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set soundEffect(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get isMuted() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set isMuted(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get updateSlide() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set updateSlide(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get assetPaths() {
			throw new Error("<ChoicesSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set assetPaths(value) {
			throw new Error("<ChoicesSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\slides\InfoSlide.svelte generated by Svelte v4.2.19 */

	const { console: console_1$2 } = globals;
	const file$2 = "src\\slides\\InfoSlide.svelte";

	function create_fragment$2(ctx) {
		let div2;
		let div1;
		let div0;
		let div1_intro;
		let t;
		let clicktoadvanceoverlay;
		let current;

		clicktoadvanceoverlay = new ClickToAdvanceOverlay({
				props: { onAdvance: /*handleClick*/ ctx[2] },
				$$inline: true
			});

		const block = {
			c: function create() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				t = space();
				create_component(clicktoadvanceoverlay.$$.fragment);
				attr_dev(div0, "class", "info-content svelte-awtb3c");
				add_location(div0, file$2, 201, 4, 5301);
				attr_dev(div1, "class", "info-box svelte-awtb3c");
				add_location(div1, file$2, 197, 2, 5225);
				attr_dev(div2, "class", "info-slide svelte-awtb3c");
				set_style(div2, "background-image", "url('" + /*backgroundPath*/ ctx[1] + "')");
				add_location(div2, file$2, 195, 0, 5100);
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div2, anchor);
				append_dev(div2, div1);
				append_dev(div1, div0);
				div0.innerHTML = /*sanitizedHTML*/ ctx[0];
				append_dev(div2, t);
				mount_component(clicktoadvanceoverlay, div2, null);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				if (!current || dirty & /*sanitizedHTML*/ 1) div0.innerHTML = /*sanitizedHTML*/ ctx[0];
				if (!current || dirty & /*backgroundPath*/ 2) {
					set_style(div2, "background-image", "url('" + /*backgroundPath*/ ctx[1] + "')");
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					if (!div1_intro) {
						add_render_callback(() => {
							div1_intro = create_in_transition(div1, fadeScale, { duration: 700 });
							div1_intro.start();
						});
					}
				}

				transition_in(clicktoadvanceoverlay.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(clicktoadvanceoverlay.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div2);
				}

				destroy_component(clicktoadvanceoverlay);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$2.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$2($$self, $$props, $$invalidate) {
		let backgroundPath;
		let soundEffectPath;
		let $assetPaths;
		validate_store(assetPaths, 'assetPaths');
		component_subscribe($$self, assetPaths, $$value => $$invalidate(9, $assetPaths = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('InfoSlide', slots, []);
		let { text = '' } = $$props;
		let { reference = '' } = $$props;
		let { updateSlide } = $$props;
		let { soundEffect = '' } = $$props;
		let { background = '' } = $$props;
		let { isMuted = false } = $$props;
		let sanitizedHTML = '';

		// Function to handle click events
		function handleClick(event) {
			console.log('InfoSlide handleClick triggered');
			updateSlide();
		} // Removed playSound() from here to prevent double playback

		// Play sound effect on mount at full volume
		onMount(() => {
			playSound(soundEffectPath, isMuted); // Full volume on mount
		});

		$$self.$$.on_mount.push(function () {
			if (updateSlide === undefined && !('updateSlide' in $$props || $$self.$$.bound[$$self.$$.props['updateSlide']])) {
				console_1$2.warn("<InfoSlide> was created without expected prop 'updateSlide'");
			}
		});

		const writable_props = ['text', 'reference', 'updateSlide', 'soundEffect', 'background', 'isMuted'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<InfoSlide> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('text' in $$props) $$invalidate(3, text = $$props.text);
			if ('reference' in $$props) $$invalidate(4, reference = $$props.reference);
			if ('updateSlide' in $$props) $$invalidate(5, updateSlide = $$props.updateSlide);
			if ('soundEffect' in $$props) $$invalidate(6, soundEffect = $$props.soundEffect);
			if ('background' in $$props) $$invalidate(7, background = $$props.background);
			if ('isMuted' in $$props) $$invalidate(8, isMuted = $$props.isMuted);
		};

		$$self.$capture_state = () => ({
			assetPaths,
			playSound,
			soundEffectVolume,
			onMount,
			DOMPurify,
			marked,
			getAssetPath,
			ClickToAdvanceOverlay,
			fadeScale,
			getTransition,
			text,
			reference,
			updateSlide,
			soundEffect,
			background,
			isMuted,
			sanitizedHTML,
			handleClick,
			soundEffectPath,
			backgroundPath,
			$assetPaths
		});

		$$self.$inject_state = $$props => {
			if ('text' in $$props) $$invalidate(3, text = $$props.text);
			if ('reference' in $$props) $$invalidate(4, reference = $$props.reference);
			if ('updateSlide' in $$props) $$invalidate(5, updateSlide = $$props.updateSlide);
			if ('soundEffect' in $$props) $$invalidate(6, soundEffect = $$props.soundEffect);
			if ('background' in $$props) $$invalidate(7, background = $$props.background);
			if ('isMuted' in $$props) $$invalidate(8, isMuted = $$props.isMuted);
			if ('sanitizedHTML' in $$props) $$invalidate(0, sanitizedHTML = $$props.sanitizedHTML);
			if ('soundEffectPath' in $$props) soundEffectPath = $$props.soundEffectPath;
			if ('backgroundPath' in $$props) $$invalidate(1, backgroundPath = $$props.backgroundPath);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*background, $assetPaths*/ 640) {
				// Compute full paths using the utility function
				$$invalidate(1, backgroundPath = getAssetPath('background', background, $assetPaths));
			}

			if ($$self.$$.dirty & /*soundEffect, $assetPaths*/ 576) {
				soundEffectPath = getAssetPath('sound', soundEffect, $assetPaths);
			}

			if ($$self.$$.dirty & /*text*/ 8) {
				// Parse Markdown to HTML and sanitize it whenever 'text' changes
				$$invalidate(0, sanitizedHTML = DOMPurify.sanitize(marked.parse(text), {
					ALLOWED_TAGS: [
						'b',
						'i',
						'em',
						'strong',
						'a',
						'p',
						'br',
						'ul',
						'ol',
						'li',
						'span',
						'div',
						'h1',
						'h2',
						'h3',
						'h4',
						'h5',
						'h6',
						'img',
						'table',
						'thead',
						'tbody',
						'tr',
						'th',
						'td',
						'blockquote',
						'code',
						'pre'
					],
					ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class', 'src', 'alt']
				}));
			}
		};

		return [
			sanitizedHTML,
			backgroundPath,
			handleClick,
			text,
			reference,
			updateSlide,
			soundEffect,
			background,
			isMuted,
			$assetPaths
		];
	}

	class InfoSlide extends SvelteComponentDev {
		constructor(options) {
			super(options);

			init(this, options, instance$2, create_fragment$2, safe_not_equal, {
				text: 3,
				reference: 4,
				updateSlide: 5,
				soundEffect: 6,
				background: 7,
				isMuted: 8
			});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "InfoSlide",
				options,
				id: create_fragment$2.name
			});
		}

		get text() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set text(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get reference() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set reference(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get updateSlide() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set updateSlide(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get soundEffect() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set soundEffect(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get background() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set background(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get isMuted() {
			throw new Error("<InfoSlide>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set isMuted(value) {
			throw new Error("<InfoSlide>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src\components\FlashScreen.svelte generated by Svelte v4.2.19 */

	const { Error: Error_1, console: console_1$1 } = globals;
	const file$1 = "src\\components\\FlashScreen.svelte";

	// (110:4) {#if buttonLabel}
	function create_if_block$1(ctx) {
		let button;
		let t;
		let button_aria_label_value;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				t = text(/*buttonLabel*/ ctx[2]);
				attr_dev(button, "class", "action-button svelte-10wl3do");

				attr_dev(button, "aria-label", button_aria_label_value = /*screenType*/ ctx[0] === 'start'
				? 'Start Game'
				: 'Restart Game');

				add_location(button, file$1, 110, 6, 3329);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);
				append_dev(button, t);

				if (!mounted) {
					dispose = listen_dev(button, "click", stop_propagation(/*handleButtonClick*/ ctx[3]), false, false, true, false);
					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty & /*buttonLabel*/ 4) set_data_dev(t, /*buttonLabel*/ ctx[2]);

				if (dirty & /*screenType*/ 1 && button_aria_label_value !== (button_aria_label_value = /*screenType*/ ctx[0] === 'start'
				? 'Start Game'
				: 'Restart Game')) {
					attr_dev(button, "aria-label", button_aria_label_value);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block$1.name,
			type: "if",
			source: "(110:4) {#if buttonLabel}",
			ctx
		});

		return block;
	}

	function create_fragment$1(ctx) {
		let div;
		let html_tag;
		let t;
		let div_transition;
		let current;
		let mounted;
		let dispose;
		let if_block = /*buttonLabel*/ ctx[2] && create_if_block$1(ctx);

		const block = {
			c: function create() {
				div = element("div");
				html_tag = new HtmlTag(false);
				t = space();
				if (if_block) if_block.c();
				html_tag.a = t;
				attr_dev(div, "class", "flash-screen svelte-10wl3do");
				add_location(div, file$1, 107, 2, 3185);
			},
			l: function claim(nodes) {
				throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				html_tag.m(/*content*/ ctx[1], div);
				append_dev(div, t);
				if (if_block) if_block.m(div, null);
				current = true;

				if (!mounted) {
					dispose = listen_dev(div, "click", /*handleButtonClick*/ ctx[3], false, false, false, false);
					mounted = true;
				}
			},
			p: function update(ctx, [dirty]) {
				if (!current || dirty & /*content*/ 2) html_tag.p(/*content*/ ctx[1]);

				if (/*buttonLabel*/ ctx[2]) {
					if (if_block) {
						if_block.p(ctx, dirty);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.m(div, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},
			i: function intro(local) {
				if (current) return;

				if (local) {
					add_render_callback(() => {
						if (!current) return;
						if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: 1000 }, true);
						div_transition.run(1);
					});
				}

				current = true;
			},
			o: function outro(local) {
				if (local) {
					if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: 1000 }, false);
					div_transition.run(0);
				}

				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (if_block) if_block.d();
				if (detaching && div_transition) div_transition.end();
				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment$1.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance$1($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('FlashScreen', slots, []);
		let { screenType = 'start' } = $$props;

		let { onProceed = () => {
			
		} } = $$props;

		let content = '';
		let buttonLabel = '';
		let buttonAction = ''; // Defines what action to perform on click

		// Fetch the flashscreen content based on screenType
		async function fetchContent() {
			try {
				const response = await fetch('/flashscreens.json');

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				$$invalidate(1, content = data[screenType]?.content || '');

				if (data[screenType]?.button) {
					$$invalidate(2, buttonLabel = data[screenType].button.label || '');
					buttonAction = data[screenType].button.action || '';
				}
			} catch(error) {
				console.error('Error fetching flashscreens.json:', error);

				$$invalidate(1, content = screenType === 'start'
				? '<h1>Click to Start</h1><p><em>\"Default Start Quote\" - Unknown</em></p>'
				: '<h1>Thank You for Playing</h1><p><em>\"Default End Quote\" - Unknown</em></p>');

				$$invalidate(2, buttonLabel = screenType === 'start' ? 'Start Game' : 'Restart Game');
				buttonAction = screenType === 'start' ? 'start' : 'reload';
			}
		}

		onMount(() => {
			fetchContent();
		});

		// Handle button click based on action
		function handleButtonClick() {
			if (buttonAction === 'start') {
				onProceed();
			} else if (buttonAction === 'reload') {
				window.location.reload();
			} else {
				onProceed();
			}
		}

		const writable_props = ['screenType', 'onProceed'];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<FlashScreen> was created with unknown prop '${key}'`);
		});

		$$self.$$set = $$props => {
			if ('screenType' in $$props) $$invalidate(0, screenType = $$props.screenType);
			if ('onProceed' in $$props) $$invalidate(4, onProceed = $$props.onProceed);
		};

		$$self.$capture_state = () => ({
			onMount,
			fade,
			screenType,
			onProceed,
			content,
			buttonLabel,
			buttonAction,
			fetchContent,
			handleButtonClick
		});

		$$self.$inject_state = $$props => {
			if ('screenType' in $$props) $$invalidate(0, screenType = $$props.screenType);
			if ('onProceed' in $$props) $$invalidate(4, onProceed = $$props.onProceed);
			if ('content' in $$props) $$invalidate(1, content = $$props.content);
			if ('buttonLabel' in $$props) $$invalidate(2, buttonLabel = $$props.buttonLabel);
			if ('buttonAction' in $$props) buttonAction = $$props.buttonAction;
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [screenType, content, buttonLabel, handleButtonClick, onProceed];
	}

	class FlashScreen extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, { screenType: 0, onProceed: 4 });

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "FlashScreen",
				options,
				id: create_fragment$1.name
			});
		}

		get screenType() {
			throw new Error_1("<FlashScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set screenType(value) {
			throw new Error_1("<FlashScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get onProceed() {
			throw new Error_1("<FlashScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set onProceed(value) {
			throw new Error_1("<FlashScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	// src/utils/appLogic.js

	// Function to pre-load images and sound effects
	function preloadImages(slideData) {
	  slideData.forEach((slide) => {
	    if (slide.background) {
	      const img = new Image();
	      img.src = getAssetPath('background', slide.background, get_store_value(assetPaths));
	    }
	    // Pre-load sound effects if any
	    if (slide.soundEffect) {
	      const audio = new Audio();
	      audio.src = getAssetPath('sound', slide.soundEffect, get_store_value(assetPaths));
	    }
	  });
	}

	// Fetch the slides from the current chapter's JSON file and preload images
	/**
	 * Loads a chapter by fetching its JSON file and updating relevant stores.
	 */
	async function loadChapter(chapterIndex) {
	  try {
	    console.log(`Loading Chapter ${chapterIndex}`);
	    const response = await fetch(`/chapter${chapterIndex}.json`);
	    if (response.ok) {
	      const chapterData = await response.json();
	      
	      // Update slides
	      slides.set(chapterData.slides || []);
	      
	      // Preload images and sounds
	      preloadImages(chapterData.slides || []);
	      
	      // Update background music if specified
	      if (chapterData.music) {
	        backgroundMusic.set(chapterData.music); // Only the filename
	        backgroundVolume.set(chapterData.volume !== undefined ? chapterData.volume : 0.5);
	      } else {
	        backgroundMusic.set(''); // No music
	      }
	      
	      // Reset current stage and history
	      currentStage.set(0);
	      console.log(`currentStage reset to 0 for Chapter ${chapterIndex}`);
	      
	      history.set([]);
	      
	      // Optionally, update background image if needed
	      if (chapterData.backgroundImage) {
	        backgroundImage.set(getAssetPath('background', chapterData.backgroundImage, get_store_value(assetPaths)));
	      }
	      
	    } else {
	      console.error(`Failed to load chapter${chapterIndex}.json`);
	    }
	  } catch (error) {
	    console.error(`Error loading chapter${chapterIndex}.json:`, error);
	  }
	}

	// Function to update the current slide and save history
	function updateSlide(nextId = null) {
	  if (nextId !== null) {
	    // Navigate directly to the specified nextId
	    currentStage.set(nextId);
	    // Update background
	    const slidesArray = get_store_value(slides);
	    if (slidesArray[nextId] && slidesArray[nextId].background) {
	      backgroundImage.set(getAssetPath('background', slidesArray[nextId].background, get_store_value(assetPaths)));
	    } else {
	      backgroundImage.set(''); // Or set to a default background
	    }
	  } else {
	    // Advance to the next slide sequentially
	    slides.update(($slides) => {
	      const newStage = get_store_value(currentStage) + 1;
	      if (newStage < $slides.length) {
	        // Save current stage to history
	        history.update(($history) => {
	          $history.push(get_store_value(currentStage));
	          return $history;
	        });

	        // Update background for the new slide
	        if ($slides[newStage].background) {
	          backgroundImage.set(getAssetPath('background', $slides[newStage].background, get_store_value(assetPaths)));
	        } else {
	          backgroundImage.set(''); // Or set to a default background
	        }

	        // Update current stage
	        currentStage.set(newStage);
	      } else {
	        console.warn('Reached the end of slides.');
	        // Optional: Handle end of slides, e.g., show an end screen or loop back
	      }
	      return $slides;
	    });
	  }
	}

	// Function to go back to the previous slide
	function goBack() {
	  history.update(($history) => {
	    if ($history.length > 0) {
	      const previousStage = $history.pop();
	      currentStage.set(previousStage); // Go back to the previous slide in history
	      
	      // Update background
	      const slidesArray = get_store_value(slides);
	      if (slidesArray[previousStage] && slidesArray[previousStage].background) {
	        backgroundImage.set(getAssetPath('background', slidesArray[previousStage].background, get_store_value(assetPaths)));
	      } else {
	        backgroundImage.set(''); // Or set to a default background
	      }
	    }
	    return $history;
	  });
	}

	// Function to load the next chapter
	function loadNextChapter() {
	  currentChapter.update(($chapter) => {
	    const newChapter = $chapter + 1;
	    console.log(`Transitioning to Chapter ${newChapter}`);
	    loadChapter(newChapter);
	    return newChapter;
	  });
	}

	/* src\App.svelte generated by Svelte v4.2.19 */

	const { console: console_1 } = globals;
	const file = "src\\App.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[25] = list[i];
		child_ctx[27] = i;
		return child_ctx;
	}

	// (176:0) {:else}
	function create_else_block(ctx) {
		let div5;
		let audio;
		let t0;
		let div4;
		let t1;
		let t2;
		let div3;
		let t3;
		let div1;
		let div0;
		let t4;
		let t5;
		let div2;
		let t6;
		let t7;
		let button;
		let button_aria_label_value;
		let t8;
		let current;
		let mounted;
		let dispose;
		let if_block0 = /*$slides*/ ctx[14].length > 0 && create_if_block_7(ctx);
		let if_block1 = /*$history*/ ctx[15].length > 0 && create_if_block_6(ctx);
		let if_block2 = /*$currentStage*/ ctx[8] === (/*slideCounts*/ ctx[2][/*$currentChapter*/ ctx[7]] || 0) - 1 && create_if_block_5(ctx);
		let each_value = ensure_array_like_dev(/*cumulativeSlideCounts*/ ctx[10]);
		let each_blocks = [];

		for (let i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function select_block_type_2(ctx, dirty) {
			if (/*isMuted*/ ctx[0]) return create_if_block_3;
			return create_else_block_1;
		}

		let current_block_type = select_block_type_2(ctx);
		let if_block3 = current_block_type(ctx);
		let if_block4 = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.reference && create_if_block_2(ctx);

		const block = {
			c: function create() {
				div5 = element("div");
				audio = element("audio");
				t0 = space();
				div4 = element("div");
				if (if_block0) if_block0.c();
				t1 = space();
				if (if_block1) if_block1.c();
				t2 = space();
				div3 = element("div");
				if (if_block2) if_block2.c();
				t3 = space();
				div1 = element("div");
				div0 = element("div");
				t4 = space();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t5 = space();
				div2 = element("div");
				t6 = text(/*counterText*/ ctx[11]);
				t7 = space();
				button = element("button");
				if_block3.c();
				t8 = space();
				if (if_block4) if_block4.c();
				audio.loop = true;
				attr_dev(audio, "preload", "auto");
				add_location(audio, file, 179, 4, 5612);
				attr_dev(div0, "class", "progress");
				set_style(div0, "width", /*progress*/ ctx[12] + "%");
				add_location(div0, file, 246, 10, 8240);
				attr_dev(div1, "class", "progress-bar");
				add_location(div1, file, 245, 8, 8203);
				attr_dev(div2, "class", "progress-counter");
				add_location(div2, file, 258, 8, 8733);
				attr_dev(div3, "class", "progress-container");
				add_location(div3, file, 239, 6, 7916);
				attr_dev(button, "class", "mute-button");
				attr_dev(button, "aria-label", button_aria_label_value = /*isMuted*/ ctx[0] ? 'Unmute Music' : 'Mute Music');
				add_location(button, file, 264, 6, 8857);
				attr_dev(div4, "class", "screen");
				set_style(div4, "background-image", "url('" + /*$backgroundImage*/ ctx[13] + "')");
				add_location(div4, file, 192, 4, 5936);
				attr_dev(div5, "class", "meeting-room");
				add_location(div5, file, 177, 2, 5543);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div5, anchor);
				append_dev(div5, audio);
				/*audio_binding*/ ctx[22](audio);
				append_dev(div5, t0);
				append_dev(div5, div4);
				if (if_block0) if_block0.m(div4, null);
				append_dev(div4, t1);
				if (if_block1) if_block1.m(div4, null);
				append_dev(div4, t2);
				append_dev(div4, div3);
				if (if_block2) if_block2.m(div3, null);
				append_dev(div3, t3);
				append_dev(div3, div1);
				append_dev(div1, div0);
				append_dev(div1, t4);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(div1, null);
					}
				}

				append_dev(div3, t5);
				append_dev(div3, div2);
				append_dev(div2, t6);
				append_dev(div4, t7);
				append_dev(div4, button);
				if_block3.m(button, null);
				append_dev(div4, t8);
				if (if_block4) if_block4.m(div4, null);
				current = true;

				if (!mounted) {
					dispose = [
						listen_dev(audio, "loadeddata", /*loadeddata_handler*/ ctx[23], false, false, false, false),
						listen_dev(button, "click", /*toggleMute*/ ctx[18], false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (/*$slides*/ ctx[14].length > 0) {
					if (if_block0) {
						if_block0.p(ctx, dirty);

						if (dirty & /*$slides*/ 16384) {
							transition_in(if_block0, 1);
						}
					} else {
						if_block0 = create_if_block_7(ctx);
						if_block0.c();
						transition_in(if_block0, 1);
						if_block0.m(div4, t1);
					}
				} else if (if_block0) {
					group_outros();

					transition_out(if_block0, 1, 1, () => {
						if_block0 = null;
					});

					check_outros();
				}

				if (/*$history*/ ctx[15].length > 0) {
					if (if_block1) ; else {
						if_block1 = create_if_block_6(ctx);
						if_block1.c();
						if_block1.m(div4, t2);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (/*$currentStage*/ ctx[8] === (/*slideCounts*/ ctx[2][/*$currentChapter*/ ctx[7]] || 0) - 1) {
					if (if_block2) ; else {
						if_block2 = create_if_block_5(ctx);
						if_block2.c();
						if_block2.m(div3, t3);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (!current || dirty & /*progress*/ 4096) {
					set_style(div0, "width", /*progress*/ ctx[12] + "%");
				}

				if (dirty & /*cumulativeSlideCounts, totalSlides, totalChapters*/ 66568) {
					each_value = ensure_array_like_dev(/*cumulativeSlideCounts*/ ctx[10]);
					let i;

					for (i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div1, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value.length;
				}

				if (!current || dirty & /*counterText*/ 2048) set_data_dev(t6, /*counterText*/ ctx[11]);

				if (current_block_type !== (current_block_type = select_block_type_2(ctx))) {
					if_block3.d(1);
					if_block3 = current_block_type(ctx);

					if (if_block3) {
						if_block3.c();
						if_block3.m(button, null);
					}
				}

				if (!current || dirty & /*isMuted*/ 1 && button_aria_label_value !== (button_aria_label_value = /*isMuted*/ ctx[0] ? 'Unmute Music' : 'Mute Music')) {
					attr_dev(button, "aria-label", button_aria_label_value);
				}

				if (/*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.reference) {
					if (if_block4) {
						if_block4.p(ctx, dirty);
					} else {
						if_block4 = create_if_block_2(ctx);
						if_block4.c();
						if_block4.m(div4, null);
					}
				} else if (if_block4) {
					if_block4.d(1);
					if_block4 = null;
				}

				if (!current || dirty & /*$backgroundImage*/ 8192) {
					set_style(div4, "background-image", "url('" + /*$backgroundImage*/ ctx[13] + "')");
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block0);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block0);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div5);
				}

				/*audio_binding*/ ctx[22](null);
				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				destroy_each(each_blocks, detaching);
				if_block3.d();
				if (if_block4) if_block4.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(176:0) {:else}",
			ctx
		});

		return block;
	}

	// (173:42) 
	function create_if_block_1(ctx) {
		let flashscreen;
		let current;

		flashscreen = new FlashScreen({
				props: {
					screenType: "end",
					onProceed: /*restartGame*/ ctx[20]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(flashscreen.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(flashscreen, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(flashscreen.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(flashscreen.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(flashscreen, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(173:42) ",
			ctx
		});

		return block;
	}

	// (170:0) {#if !gameStarted}
	function create_if_block(ctx) {
		let flashscreen;
		let current;

		flashscreen = new FlashScreen({
				props: {
					screenType: "start",
					onProceed: /*startGame*/ ctx[17]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(flashscreen.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(flashscreen, target, anchor);
				current = true;
			},
			p: noop,
			i: function intro(local) {
				if (current) return;
				transition_in(flashscreen.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(flashscreen.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(flashscreen, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(170:0) {#if !gameStarted}",
			ctx
		});

		return block;
	}

	// (194:6) {#if $slides.length > 0}
	function create_if_block_7(ctx) {
		let previous_key = /*$currentStage*/ ctx[8];
		let key_block_anchor;
		let current;
		let key_block = create_key_block(ctx);

		const block = {
			c: function create() {
				key_block.c();
				key_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				key_block.m(target, anchor);
				insert_dev(target, key_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$currentStage*/ 256 && safe_not_equal(previous_key, previous_key = /*$currentStage*/ ctx[8])) {
					group_outros();
					transition_out(key_block, 1, 1, noop);
					check_outros();
					key_block = create_key_block(ctx);
					key_block.c();
					transition_in(key_block, 1);
					key_block.m(key_block_anchor.parentNode, key_block_anchor);
				} else {
					key_block.p(ctx, dirty);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(key_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(key_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(key_block_anchor);
				}

				key_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_7.name,
			type: "if",
			source: "(194:6) {#if $slides.length > 0}",
			ctx
		});

		return block;
	}

	// (217:62) 
	function create_if_block_10(ctx) {
		let infoslide;
		let current;

		infoslide = new InfoSlide({
				props: {
					text: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.text,
					reference: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.reference,
					updateSlide: /*handleDialogueEnd*/ ctx[19],
					soundEffect: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.soundEffect,
					isMuted: /*isMuted*/ ctx[0],
					clickToAdvance: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.clickToAdvance,
					background: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(infoslide.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(infoslide, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const infoslide_changes = {};
				if (dirty & /*$slides, $currentStage*/ 16640) infoslide_changes.text = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.text;
				if (dirty & /*$slides, $currentStage*/ 16640) infoslide_changes.reference = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.reference;
				if (dirty & /*$slides, $currentStage*/ 16640) infoslide_changes.soundEffect = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.soundEffect;
				if (dirty & /*isMuted*/ 1) infoslide_changes.isMuted = /*isMuted*/ ctx[0];
				if (dirty & /*$slides, $currentStage*/ 16640) infoslide_changes.clickToAdvance = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.clickToAdvance;
				if (dirty & /*$slides, $currentStage*/ 16640) infoslide_changes.background = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background;
				infoslide.$set(infoslide_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(infoslide.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(infoslide.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(infoslide, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_10.name,
			type: "if",
			source: "(217:62) ",
			ctx
		});

		return block;
	}

	// (208:65) 
	function create_if_block_9(ctx) {
		let choicesslide;
		let current;

		choicesslide = new ChoicesSlide({
				props: {
					choices: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].choices,
					background: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background,
					soundEffect: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].soundEffect,
					isMuted: /*isMuted*/ ctx[0],
					updateSlide: /*handleDialogueEnd*/ ctx[19],
					assetPaths: /*$assetPaths*/ ctx[5]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(choicesslide.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(choicesslide, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const choicesslide_changes = {};
				if (dirty & /*$slides, $currentStage*/ 16640) choicesslide_changes.choices = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].choices;
				if (dirty & /*$slides, $currentStage*/ 16640) choicesslide_changes.background = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background;
				if (dirty & /*$slides, $currentStage*/ 16640) choicesslide_changes.soundEffect = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].soundEffect;
				if (dirty & /*isMuted*/ 1) choicesslide_changes.isMuted = /*isMuted*/ ctx[0];
				if (dirty & /*$assetPaths*/ 32) choicesslide_changes.assetPaths = /*$assetPaths*/ ctx[5];
				choicesslide.$set(choicesslide_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(choicesslide.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(choicesslide.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(choicesslide, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_9.name,
			type: "if",
			source: "(208:65) ",
			ctx
		});

		return block;
	}

	// (198:12) {#if $slides[$currentStage]?.type === 'dialogue'}
	function create_if_block_8(ctx) {
		let dialogueslide;
		let current;

		dialogueslide = new DialogueSlide({
				props: {
					characters: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].characters,
					dialogueText: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].dialogueText,
					background: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background,
					soundEffect: /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].soundEffect,
					isMuted: /*isMuted*/ ctx[0],
					updateSlide: /*handleDialogueEnd*/ ctx[19],
					assetPaths: /*$assetPaths*/ ctx[5]
				},
				$$inline: true
			});

		const block = {
			c: function create() {
				create_component(dialogueslide.$$.fragment);
			},
			m: function mount(target, anchor) {
				mount_component(dialogueslide, target, anchor);
				current = true;
			},
			p: function update(ctx, dirty) {
				const dialogueslide_changes = {};
				if (dirty & /*$slides, $currentStage*/ 16640) dialogueslide_changes.characters = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].characters;
				if (dirty & /*$slides, $currentStage*/ 16640) dialogueslide_changes.dialogueText = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].dialogueText;
				if (dirty & /*$slides, $currentStage*/ 16640) dialogueslide_changes.background = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].background;
				if (dirty & /*$slides, $currentStage*/ 16640) dialogueslide_changes.soundEffect = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].soundEffect;
				if (dirty & /*isMuted*/ 1) dialogueslide_changes.isMuted = /*isMuted*/ ctx[0];
				if (dirty & /*$assetPaths*/ 32) dialogueslide_changes.assetPaths = /*$assetPaths*/ ctx[5];
				dialogueslide.$set(dialogueslide_changes);
			},
			i: function intro(local) {
				if (current) return;
				transition_in(dialogueslide.$$.fragment, local);
				current = true;
			},
			o: function outro(local) {
				transition_out(dialogueslide.$$.fragment, local);
				current = false;
			},
			d: function destroy(detaching) {
				destroy_component(dialogueslide, detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_8.name,
			type: "if",
			source: "(198:12) {#if $slides[$currentStage]?.type === 'dialogue'}",
			ctx
		});

		return block;
	}

	// (196:8) {#key $currentStage}
	function create_key_block(ctx) {
		let div;
		let current_block_type_index;
		let if_block;
		let div_intro;
		let current;
		const if_block_creators = [create_if_block_8, create_if_block_9, create_if_block_10];
		const if_blocks = [];

		function select_block_type_1(ctx, dirty) {
			if (/*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.type === 'dialogue') return 0;
			if (/*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.type === 'choices') return 1;
			if (/*$slides*/ ctx[14][/*$currentStage*/ ctx[8]]?.type === 'info') return 2;
			return -1;
		}

		if (~(current_block_type_index = select_block_type_1(ctx))) {
			if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
		}

		const block = {
			c: function create() {
				div = element("div");
				if (if_block) if_block.c();
				attr_dev(div, "class", "slide-content");
				add_location(div, file, 196, 10, 6122);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].m(div, null);
				}

				current = true;
			},
			p: function update(ctx, dirty) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type_1(ctx);

				if (current_block_type_index === previous_block_index) {
					if (~current_block_type_index) {
						if_blocks[current_block_type_index].p(ctx, dirty);
					}
				} else {
					if (if_block) {
						group_outros();

						transition_out(if_blocks[previous_block_index], 1, 1, () => {
							if_blocks[previous_block_index] = null;
						});

						check_outros();
					}

					if (~current_block_type_index) {
						if_block = if_blocks[current_block_type_index];

						if (!if_block) {
							if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
							if_block.c();
						} else {
							if_block.p(ctx, dirty);
						}

						transition_in(if_block, 1);
						if_block.m(div, null);
					} else {
						if_block = null;
					}
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);

				if (local) {
					if (!div_intro) {
						add_render_callback(() => {
							div_intro = create_in_transition(div, fade, { duration: 500 });
							div_intro.start();
						});
					}
				}

				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}

				if (~current_block_type_index) {
					if_blocks[current_block_type_index].d();
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_key_block.name,
			type: "key",
			source: "(196:8) {#key $currentStage}",
			ctx
		});

		return block;
	}

	// (233:6) {#if $history.length > 0}
	function create_if_block_6(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Back";
				attr_dev(button, "class", "back-button");
				attr_dev(button, "aria-label", "Go Back");
				add_location(button, file, 233, 8, 7731);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", goBack, false, false, false, false);
					mounted = true;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_6.name,
			type: "if",
			source: "(233:6) {#if $history.length > 0}",
			ctx
		});

		return block;
	}

	// (241:8) {#if $currentStage === (slideCounts[$currentChapter] || 0) - 1}
	function create_if_block_5(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Next Chapter";
				attr_dev(button, "class", "next-chapter-button");
				attr_dev(button, "aria-label", "Proceed to the Next Chapter");
				add_location(button, file, 241, 10, 8031);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", loadNextChapter, false, false, false, false);
					mounted = true;
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5.name,
			type: "if",
			source: "(241:8) {#if $currentStage === (slideCounts[$currentChapter] || 0) - 1}",
			ctx
		});

		return block;
	}

	// (250:12) {#if index < totalChapters - 1}
	function create_if_block_4(ctx) {
		let div;

		const block = {
			c: function create() {
				div = element("div");
				attr_dev(div, "class", "marker");
				set_style(div, "left", /*cumulativeCount*/ ctx[25] / /*totalSlides*/ ctx[3] * 100 + "%");
				attr_dev(div, "title", `Chapter ${/*index*/ ctx[27] + 1}`);
				add_location(div, file, 250, 14, 8495);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*cumulativeSlideCounts, totalSlides*/ 1032) {
					set_style(div, "left", /*cumulativeCount*/ ctx[25] / /*totalSlides*/ ctx[3] * 100 + "%");
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(250:12) {#if index < totalChapters - 1}",
			ctx
		});

		return block;
	}

	// (249:10) {#each cumulativeSlideCounts as cumulativeCount, index}
	function create_each_block(ctx) {
		let if_block_anchor;
		let if_block = /*index*/ ctx[27] < /*totalChapters*/ ctx[16] - 1 && create_if_block_4(ctx);

		const block = {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},
			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
			},
			p: function update(ctx, dirty) {
				if (/*index*/ ctx[27] < /*totalChapters*/ ctx[16] - 1) if_block.p(ctx, dirty);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if (if_block) if_block.d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(249:10) {#each cumulativeSlideCounts as cumulativeCount, index}",
			ctx
		});

		return block;
	}

	// (268:8) {:else}
	function create_else_block_1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Mute 🔇");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1.name,
			type: "else",
			source: "(268:8) {:else}",
			ctx
		});

		return block;
	}

	// (266:8) {#if isMuted}
	function create_if_block_3(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("Unmute 🔊");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(266:8) {#if isMuted}",
			ctx
		});

		return block;
	}

	// (274:6) {#if $slides[$currentStage]?.reference}
	function create_if_block_2(ctx) {
		let div;
		let span0;
		let t1;
		let span1;
		let t2_value = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].reference + "";
		let t2;

		const block = {
			c: function create() {
				div = element("div");
				span0 = element("span");
				span0.textContent = "Source:";
				t1 = space();
				span1 = element("span");
				t2 = text(t2_value);
				attr_dev(span0, "class", "source-label");
				add_location(span0, file, 275, 10, 9221);
				attr_dev(span1, "class", "source-text");
				add_location(span1, file, 276, 10, 9273);
				attr_dev(div, "class", "reference");
				add_location(div, file, 274, 8, 9187);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div, anchor);
				append_dev(div, span0);
				append_dev(div, t1);
				append_dev(div, span1);
				append_dev(span1, t2);
			},
			p: function update(ctx, dirty) {
				if (dirty & /*$slides, $currentStage*/ 16640 && t2_value !== (t2_value = /*$slides*/ ctx[14][/*$currentStage*/ ctx[8]].reference + "")) set_data_dev(t2, t2_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(274:6) {#if $slides[$currentStage]?.reference}",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let current_block_type_index;
		let if_block;
		let if_block_anchor;
		let current;
		const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
		const if_blocks = [];

		function select_block_type(ctx, dirty) {
			if (!/*gameStarted*/ ctx[9]) return 0;
			if (/*currentSlideIndex*/ ctx[4] > /*totalSlides*/ ctx[3]) return 1;
			return 2;
		}

		current_block_type_index = select_block_type(ctx);
		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

		const block = {
			c: function create() {
				if_block.c();
				if_block_anchor = empty();
			},
			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				if_blocks[current_block_type_index].m(target, anchor);
				insert_dev(target, if_block_anchor, anchor);
				current = true;
			},
			p: function update(ctx, [dirty]) {
				let previous_block_index = current_block_type_index;
				current_block_type_index = select_block_type(ctx);

				if (current_block_type_index === previous_block_index) {
					if_blocks[current_block_type_index].p(ctx, dirty);
				} else {
					group_outros();

					transition_out(if_blocks[previous_block_index], 1, 1, () => {
						if_blocks[previous_block_index] = null;
					});

					check_outros();
					if_block = if_blocks[current_block_type_index];

					if (!if_block) {
						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
						if_block.c();
					} else {
						if_block.p(ctx, dirty);
					}

					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			},
			i: function intro(local) {
				if (current) return;
				transition_in(if_block);
				current = true;
			},
			o: function outro(local) {
				transition_out(if_block);
				current = false;
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(if_block_anchor);
				}

				if_blocks[current_block_type_index].d(detaching);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_fragment.name,
			type: "component",
			source: "",
			ctx
		});

		return block;
	}

	function instance($$self, $$props, $$invalidate) {
		let currentSlideIndex;
		let progress;
		let counterText;
		let $backgroundVolume;
		let $assetPaths;
		let $backgroundMusic;
		let $currentChapter;
		let $currentStage;
		let $backgroundImage;
		let $slides;
		let $history;
		validate_store(backgroundVolume, 'backgroundVolume');
		component_subscribe($$self, backgroundVolume, $$value => $$invalidate(21, $backgroundVolume = $$value));
		validate_store(assetPaths, 'assetPaths');
		component_subscribe($$self, assetPaths, $$value => $$invalidate(5, $assetPaths = $$value));
		validate_store(backgroundMusic, 'backgroundMusic');
		component_subscribe($$self, backgroundMusic, $$value => $$invalidate(6, $backgroundMusic = $$value));
		validate_store(currentChapter, 'currentChapter');
		component_subscribe($$self, currentChapter, $$value => $$invalidate(7, $currentChapter = $$value));
		validate_store(currentStage, 'currentStage');
		component_subscribe($$self, currentStage, $$value => $$invalidate(8, $currentStage = $$value));
		validate_store(backgroundImage, 'backgroundImage');
		component_subscribe($$self, backgroundImage, $$value => $$invalidate(13, $backgroundImage = $$value));
		validate_store(slides, 'slides');
		component_subscribe($$self, slides, $$value => $$invalidate(14, $slides = $$value));
		validate_store(history, 'history');
		component_subscribe($$self, history, $$value => $$invalidate(15, $history = $$value));
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let gameStarted = false; // Variable to track game start
		let isMuted = false; // Variable to track mute state
		let backgroundAudio; // Reference to the background audio element

		// Progress-related variables
		let slideCounts = []; // Array to store the number of slides per chapter

		let cumulativeSlideCounts = []; // Array to store cumulative slides up to each chapter
		let totalSlides = 0; // Total number of slides across all chapters
		let totalChapters = 3; // Total number of chapters (chapter0.json to chapter7.json)

		// Function to fetch all chapters and count slides
		async function fetchAllChapters() {
			const counts = [];

			for (let i = 0; i < totalChapters; i++) {
				try {
					const response = await fetch(`/chapter${i}.json`);

					if (response.ok) {
						const chapterData = await response.json();
						const slides = chapterData.slides || [];
						counts.push(slides.length);
					} else {
						console.error(`chapter${i}.json not found.`);
						counts.push(0);
					}
				} catch(error) {
					console.error(`Error fetching chapter${i}.json:`, error);
					counts.push(0);
				}
			}

			$$invalidate(2, slideCounts = counts);
			$$invalidate(3, totalSlides = slideCounts.reduce((a, b) => a + b, 0));
		}

		onMount(() => {
			fetchAllChapters();
		});

		// Function to start the game
		function startGame() {
			$$invalidate(9, gameStarted = true);
			currentChapter.set(0); // Start with Chapter 0
			loadChapter(0); // Load Chapter 0
		}

		// Function to toggle mute state
		function toggleMute() {
			$$invalidate(0, isMuted = !isMuted);

			if (backgroundAudio) {
				$$invalidate(1, backgroundAudio.muted = isMuted, backgroundAudio);

				if (isMuted) {
					backgroundAudio.pause();
				} else {
					if ($backgroundMusic) {
						// Removed backgroundAudio.paused check
						backgroundAudio.play().catch(error => {
							console.error('Background music playback failed:', error);
						});
					}
				}
			}
		}

		// Function to advance to the next slide
		function handleDialogueEnd(nextId = null) {
			if (nextId !== null) {
				updateSlide(nextId); // Navigate to the specified nextId
			} else {
				updateSlide();
			}
		}

		// Function to restart the game
		function restartGame() {
			// Reset game state
			$$invalidate(9, gameStarted = false);

			$$invalidate(0, isMuted = false);
			currentChapter.set(0);
			currentStage.set(0);
			slides.set([]);
			history.set([]);
			backgroundImage.set('');
			backgroundMusic.set('');
			backgroundVolume.set(1);
			playerChoices.set([]);

			// Additional resets if necessary
			// Pause and reset background audio
			if (backgroundAudio) {
				backgroundAudio.pause();
				$$invalidate(1, backgroundAudio.currentTime = 0, backgroundAudio);
				$$invalidate(1, backgroundAudio.src = '', backgroundAudio);
			}
		}

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
		});

		function audio_binding($$value) {
			binding_callbacks[$$value ? 'unshift' : 'push'](() => {
				backgroundAudio = $$value;
				(((($$invalidate(1, backgroundAudio), $$invalidate(6, $backgroundMusic)), $$invalidate(5, $assetPaths)), $$invalidate(0, isMuted)), $$invalidate(21, $backgroundVolume));
			});
		}

		const loadeddata_handler = () => {
			if (!isMuted && $backgroundMusic) {
				backgroundAudio.play().catch(error => {
					console.error('Background music playback failed:', error);
				});
			}
		};

		$$self.$capture_state = () => ({
			onMount,
			fade,
			DialogueSlide,
			ChoicesSlide,
			InfoSlide,
			FlashScreen,
			currentStage,
			slides,
			history,
			backgroundImage,
			currentChapter,
			backgroundMusic,
			backgroundVolume,
			assetPaths,
			getAssetPath,
			loadChapter,
			updateSlide,
			goBack,
			loadNextChapter,
			playerChoices,
			gameStarted,
			isMuted,
			backgroundAudio,
			slideCounts,
			cumulativeSlideCounts,
			totalSlides,
			totalChapters,
			fetchAllChapters,
			startGame,
			toggleMute,
			handleDialogueEnd,
			restartGame,
			counterText,
			currentSlideIndex,
			progress,
			$backgroundVolume,
			$assetPaths,
			$backgroundMusic,
			$currentChapter,
			$currentStage,
			$backgroundImage,
			$slides,
			$history
		});

		$$self.$inject_state = $$props => {
			if ('gameStarted' in $$props) $$invalidate(9, gameStarted = $$props.gameStarted);
			if ('isMuted' in $$props) $$invalidate(0, isMuted = $$props.isMuted);
			if ('backgroundAudio' in $$props) $$invalidate(1, backgroundAudio = $$props.backgroundAudio);
			if ('slideCounts' in $$props) $$invalidate(2, slideCounts = $$props.slideCounts);
			if ('cumulativeSlideCounts' in $$props) $$invalidate(10, cumulativeSlideCounts = $$props.cumulativeSlideCounts);
			if ('totalSlides' in $$props) $$invalidate(3, totalSlides = $$props.totalSlides);
			if ('totalChapters' in $$props) $$invalidate(16, totalChapters = $$props.totalChapters);
			if ('counterText' in $$props) $$invalidate(11, counterText = $$props.counterText);
			if ('currentSlideIndex' in $$props) $$invalidate(4, currentSlideIndex = $$props.currentSlideIndex);
			if ('progress' in $$props) $$invalidate(12, progress = $$props.progress);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		$$self.$$.update = () => {
			if ($$self.$$.dirty & /*slideCounts, $currentChapter, $currentStage*/ 388) {
				// Current Slide Index (1-based)
				$$invalidate(4, currentSlideIndex = slideCounts.slice(0, $currentChapter).reduce((a, b) => a + b, 0) + ($currentStage || 0) + 1);
			}

			if ($$self.$$.dirty & /*totalSlides, currentSlideIndex*/ 24) {
				// Progress Percentage
				$$invalidate(12, progress = totalSlides ? currentSlideIndex / totalSlides * 100 : 0);
			}

			if ($$self.$$.dirty & /*$currentChapter, $currentStage, slideCounts*/ 388) {
				// Progress Counter Text
				$$invalidate(11, counterText = `Chapter ${$currentChapter + 1}/${totalChapters} - Slide ${$currentStage + 1}/${slideCounts[$currentChapter] || 1}`);
			}

			if ($$self.$$.dirty & /*slideCounts*/ 4) {
				// Compute Cumulative Slide Counts whenever slideCounts changes
				$$invalidate(10, cumulativeSlideCounts = slideCounts.reduce(
					(acc, count, index) => {
						acc.push((acc[index - 1] || 0) + count);
						return acc;
					},
					[]
				));
			}

			if ($$self.$$.dirty & /*backgroundAudio, $backgroundMusic, $assetPaths, isMuted, $backgroundVolume*/ 2097251) {
				// Reactive statement to update audio src and play music when backgroundMusic changes
				if (backgroundAudio && $backgroundMusic) {
					const fullMusicPath = getAssetPath('music', $backgroundMusic, $assetPaths);

					if (backgroundAudio.src !== fullMusicPath) {
						// Prevent resetting src if already correct
						$$invalidate(1, backgroundAudio.src = fullMusicPath, backgroundAudio);

						if (!isMuted) {
							$$invalidate(1, backgroundAudio.volume = $backgroundVolume, backgroundAudio); // Set the volume

							backgroundAudio.play().catch(error => {
								console.error('Background music playback failed:', error);
							});
						}
					}
				}
			}

			if ($$self.$$.dirty & /*backgroundAudio, $backgroundVolume*/ 2097154) {
				// Reactive statement to update audio volume when backgroundVolume changes
				if (backgroundAudio) {
					$$invalidate(1, backgroundAudio.volume = $backgroundVolume, backgroundAudio);
				}
			}
		};

		return [
			isMuted,
			backgroundAudio,
			slideCounts,
			totalSlides,
			currentSlideIndex,
			$assetPaths,
			$backgroundMusic,
			$currentChapter,
			$currentStage,
			gameStarted,
			cumulativeSlideCounts,
			counterText,
			progress,
			$backgroundImage,
			$slides,
			$history,
			totalChapters,
			startGame,
			toggleMute,
			handleDialogueEnd,
			restartGame,
			$backgroundVolume,
			audio_binding,
			loadeddata_handler
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {});

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
		target: document.body,
		props: {
			name: 'world'
		}
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
