"use strict";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  createContext,
  useContext,
  useImperativeHandle,
  forwardRef,
} from "react";

export {
  Await,
  AwaitList,
  AwaitView,
  Async,
  AsyncView,
  defineAsyncComponent,
  Action,
  useActionValue,
  useAsyncValue,
  isPending,
  isResolve,
  isReject,
};

const _data = Symbol(), _error = Symbol(), _tracked = Symbol();
const nop = Symbol(), noRender = Symbol();
const orders = new Set(["forwards", "backwards", "together"]);
const asyncViewContext = createContext(defaultGenerateResolve);
const asyncContext = createContext(null);
const actionContext = createContext(null);

/**
 * @typedef {"pending" | "resolve" | "reject"} Status
 */

/**
 * @template T
 * @param [resolve] {Promise<T>}
 * @param [init] {T}
 * @param [delay] {number}
 * @param [jumpFirst] {boolean}
 * @param children {(resolveData: {first?: boolean; status?: Status; value: T; error?: any; placeholder?: React.RefObject<any>;}) => React.ReactElement}
 * @param [onStart] {(first: boolean) => void}
 * @param [onEnd] {(first: boolean) => void}
 * @param [onError] {(error: any) => void}
 * @param [placeholder] {React.RefObject<any>}
 */
function Await({resolve, init, delay = 300, jumpFirst = false, children, onStart, onEnd, onError, placeholder}) {
  const forceUpdate = useForceUpdate();
  const first = useRef(true);
  const cancelMap = useRef(new Map()).current;
  const cacheResolve = useRef(null);
  const updateFlag = useRef(false);
  const element = useRef(null);
  const status = useRef("pending");
  const resolveValue = useRef(init);
  if (jumpFirst && first.current) {
    first.current = false;
    resolve = Object.defineProperties(Promise.resolve(init), {
      [_tracked]: {value: true},
      [_data]: {value: init},
    });
  }
  if (resolve instanceof Promise) {
    if (cacheResolve.current === resolve && !updateFlag.current)
      return element.current;
    updateFlag.current = false;
    if (!Reflect.has(resolve, _tracked)) {
      Object.defineProperty(resolve, _tracked, {value: true});
      cancelMap.get(cacheResolve.current)?.();
      cacheResolve.current = resolve;
      let flag = true;
      cancelMap.set(resolve, () => {
        flag = false;
        cancelMap.delete(resolve);
      });
      status.current = "pending";
      onStart?.(first.current);
      resolve.then(
        v => Object.defineProperty(resolve, _data, {value: v}),
        e => Object.defineProperty(resolve, _error, {value: e})
      ).finally(async () => {
        await sleep(delay);
        if (flag) {
          cancelMap.delete(resolve);
          onEnd?.(first.current);
          first.current = false;
          updateFlag.current = true;
          forceUpdate();
        }
      });
    } else {
      cacheResolve.current = resolve;
      if (Reflect.has(resolve, _data)) {
        status.current = "resolve";
        resolveValue.current = Reflect.get(resolve, _data);
      } else {
        status.current = "reject";
        onError?.(Reflect.get(resolve, _error));
      }
    }
    element.current = children({
      first: first.current,
      status: status.current,
      value: resolveValue.current,
      error: Reflect.get(resolve, _error),
      placeholder,
    });
    return element.current;
  }
}

/**
 * @param [order] {"forwards" | "backwards" | "together"}
 * @param [tail] {"collapsed"}
 * @param [gap] {number}
 * @param children {React.ReactElement | React.ReactElement[]}
 */
function AwaitList({order, tail, gap = 300, children}) {
  const forceUpdate = useForceUpdate();
  if (!orders.has(order)) return children;
  if (!Array.isArray(children))
    children = [children];
  const resolves = children.map(child => child?.type === Await ? child.props.resolve : nop);
  if (order === "together") {
    const promises = [], position = [];
    resolves.forEach((resolve, index) => {
      if (resolve instanceof Promise && !Reflect.has(resolve, _tracked)) {
        promises.push(trackedPromise(resolve));
        position.push(index);
      }
    });
    if (promises.length > 0) {
      const all = Promise.allSettled(promises);
      position.forEach((pos, index) => resolves[pos] = all.then(() => promises[index]));
    }
  } else {
    switch (tail) {
      case "collapsed": {
        let flag = false;
        const fn = order === "forwards" ? forEachLeft : forEachRight;
        fn(resolves, (resolve, index) => {
          if (resolve instanceof Promise && !Reflect.has(resolve, _tracked)) {
            if (flag) {
              resolves[index] = noRender;
            } else {
              flag = true;
              resolves[index] = trackedPromise(resolve).finally(() => setTimeout(forceUpdate, gap));
            }
          }
        });
        break;
      }
      default: {
        const fnName = order === "forwards" ? "reduce" : "reduceRight";
        resolves[fnName]((prev, current, index) => {
          if (current instanceof Promise && !Reflect.has(current, _tracked)) {
            const promise = trackedPromise(current), fn = () => sleep(gap, promise);
            return resolves[index] = prev.then(fn, fn);
          }
          return prev;
        }, Promise.resolve());
      }
    }
  }
  return createElement(Fragment, null, ...resolves.map((resolve, index) => {
    const child = children[index];
    return resolve === nop ? child : cloneElement(child, {resolve});
  }));
}

/**
 * @param [root] {React.RefObject<Element | Document | null>}
 * @param [rootIsParent] {boolean}
 * @param [rootMargin] {string}
 * @param [threshold] {number}
 * @param children {React.ReactElement}
 * @param [onIntersection] {(entry: IntersectionObserverEntry) => boolean}
 */
function AwaitView({root, rootIsParent, rootMargin, threshold, children, onIntersection = defaultIntersection}) {
  const valid =
    isValidElement(children) &&
    children.type === Await &&
    children.props.resolve instanceof Promise;
  const [[resolve, handle]] = useState(() => {
    const {promise, resolve} = withResolvers();
    return [promise, () => {
      valid && resolve(trackedPromise(children.props.resolve));
    }];
  });
  const {placeholder, flag} = useView(handle, root, rootIsParent, rootMargin, threshold, onIntersection);
  if (valid) {
    return flag.current ? children : cloneElement(children, {resolve, placeholder});
  }
}

/**
 * @typedef {{
 *   update: () => void;
 *   unWatch: () => void;
 *   reWatch: () => void;
 * }} WatchOptions
 */

/**
 * @template P
 * @typedef {{
 *   element: React.ReactElement;
 *   init?: React.ReactElement;
 *   children: (asyncResolveData: {first?: boolean; status?: Status; element: React.ReactElement; error?: any; placeholder?: React.RefObject<any>; watchOptions?: WatchOptions; }) => React.ReactElement;
 *   compare?: (newProps: P, oldProps: P) => boolean;
 *   delay?: number;
 *   onStart?: (first: boolean) => void;
 *   onEnd?: (first: boolean) => void;
 *   onError?: (error: any) => void;
 *   placeholder?: React.RefObject<any>;
 * }} AsyncProps
 */

/**
 * @template P
 * @type {React.ForwardRefExoticComponent<React.PropsWithoutRef<AsyncProps<P>> & React.RefAttributes<WatchOptions>>}
 */
const Async = forwardRef(function Async(
  {
    element,
    init,
    children,
    compare = defaultCompare,
    delay = 300,
    onStart,
    onEnd,
    onError,
    placeholder,
  },
  ref
) {
  const cacheType = useRef(null);
  const cacheProps = useRef(null);
  const first = useRef(true);
  const el = useRef(null);
  const generateResolve = useContext(asyncViewContext);
  const [watchOptions, forceUpdateFlag, isWatching] = useWatchOptions(first);
  useImperativeHandle(ref, () => watchOptions, []);
  if (!(isValidElement(element) && typeof element.type === "function")) return;
  if (first.current) {
    first.current = false;
    cacheType.current = element.type;
    cacheProps.current = element.props;
  } else {
    if (!isWatching.current) return el.current;
    if (forceUpdateFlag.current || element.type !== cacheType.current || compare(element.props, cacheProps.current)) {
      forceUpdateFlag.current = false;
      cacheType.current = element.type;
      cacheProps.current = element.props;
    } else {
      return el.current;
    }
  }
  return el.current = createElement(Await, {
    resolve: generateResolve(element, watchOptions),
    init,
    delay,
    onStart,
    onEnd,
    onError,
    placeholder,
  }, ({first, status, value, error, placeholder}) => {
    return children({first, status, element: value, error, placeholder, watchOptions});
  });
});

/**
 * @param [root] {React.RefObject<Element | Document | null>}
 * @param [rootIsParent] {boolean}
 * @param [rootMargin] {string}
 * @param [threshold] {number}
 * @param children {React.ReactElement}
 * @param [onIntersection] {(entry: IntersectionObserverEntry) => boolean}
 */
function AsyncView({root, rootIsParent, rootMargin, threshold, children, onIntersection = defaultIntersection}) {
  const valid =
    isValidElement(children) &&
    children.type === Async &&
    isValidElement(children.props.element) &&
    typeof children.props.element.type === "function";
  const [[generateResolve, handle]] = useState(() => {
    const {promise, resolve} = withResolvers();
    let realResolve;
    return [
      (element, watchOptions) => {
        realResolve = defaultGenerateResolve(element, watchOptions);
        return flag.current ? realResolve : promise;
      },
      () => {
        valid && resolve(trackedPromise(realResolve));
      }
    ];
  });
  const {placeholder, flag} = useView(handle, root, rootIsParent, rootMargin, threshold, onIntersection);
  if (valid) {
    let value, childrenEl;
    if (flag.current) {
      value = defaultGenerateResolve;
      childrenEl = children;
    } else {
      value = generateResolve;
      childrenEl = cloneElement(children, {placeholder});
    }
    return createElement(asyncViewContext.Provider, {value}, childrenEl);
  }
}

/**
 * @template T, P
 * @param [name] {string}
 * @param [init] {(props: P) => T}
 * @param [compare] {(newProps: P, oldProps: P) => boolean}
 * @param [delay] {number}
 * @param [onStart] {(first: boolean) => void}
 * @param [onEnd] {(first: boolean) => void}
 * @param [onError] {(error: any) => void}
 * @param loader {(props: P, watchOptions: WatchOptions) => Promise<T>}
 * @param Component {(props: P) => React.ReactElement}
 * @return {React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<WatchOptions>>}
 */
function defineAsyncComponent(
  {
    name = "AsyncComponent",
    init = defaultInit,
    compare = defaultCompare,
    delay = 300,
    onStart,
    onEnd,
    onError,
    loader,
    Component,
  }
) {
  const AsyncComponent = forwardRef(function AsyncComponent(props, ref) {
    const [initValue] = useState(() => init(props));
    const cacheProps = useRef(null);
    const first = useRef(true);
    const el = useRef(null);
    const [watchOptions, forceUpdateFlag, isWatching] = useWatchOptions(first);
    useImperativeHandle(ref, () => watchOptions, []);
    if (first.current) {
      first.current = false;
      cacheProps.current = props;
    } else {
      if (!isWatching.current) return el.current;
      if (forceUpdateFlag.current || compare(props, cacheProps.current)) {
        forceUpdateFlag.current = false;
        cacheProps.current = props;
      } else {
        return el.current;
      }
    }
    return el.current = createElement(Await, {
      resolve: loader(props, watchOptions),
      init: initValue,
      delay,
      onStart,
      onEnd,
      onError
    }, ({first, status, value, error}) => {
      return createElement(
        asyncContext.Provider,
        {value: {first, status, value, error, watchOptions}},
        createElement(Component, props)
      );
    });
  });

  return Object.defineProperty(AsyncComponent, "displayName", {value: name});
}

/**
 * @template S, O
 * @param useAction {(options?: O) => S}
 * @param [options] {O}
 * @param children {React.ReactElement | ((state: S) => React.ReactElement)}
 * @return {React.ReactElement}
 */
function Action({useAction, options, children}) {
  const state = useAction(options);
  const elements = typeof children === "function" ? children(state) : children;
  return createElement(actionContext.Provider, {value: state, children: elements});
}

/**
 * @template S
 * @return {S}
 */
function useActionValue() {
  return useContext(actionContext);
}

/**
 * @template T
 * @return {{first: boolean; status: Status; value: T; error: any; watchOptions: WatchOptions; } | null}
 */
function useAsyncValue() {
  return useContext(asyncContext);
}

function useForceUpdate() {
  const setFlag = useState(true)[1];
  return useCallback(() => {
    setFlag(flag => !flag);
  }, []);
}

function useView(handle, root, rootIsParent, rootMargin, threshold, onIntersection) {
  const placeholder = useRef(null);
  const flag = useRef(false);
  useEffect(() => {
    if (placeholder.current?.nodeType === Node.ELEMENT_NODE) {
      let observer = new IntersectionObserver(([entry]) => {
        if (onIntersection(entry)) {
          flag.current = true;
          observer.disconnect();
          observer = null;
          handle();
        }
      }, {root: rootIsParent ? placeholder.current.parentElement : root?.current, rootMargin, threshold});
      observer.observe(placeholder.current);
      return () => {
        observer?.disconnect();
        observer = null;
      };
    } else {
      flag.current = true;
      handle();
    }
  }, []);
  return {
    placeholder,
    flag,
  };
}

function useWatchOptions(first) {
  const forceUpdate = useForceUpdate();
  const forceUpdateFlag = useRef(false);
  const isWatching = useRef(true);
  const [watchOptions] = useState(() => ({
    update: () => {
      if (first.current) return;
      forceUpdateFlag.current = true;
      forceUpdate();
    },
    unWatch: () => {
      isWatching.current = false;
    },
    reWatch: () => {
      if (isWatching.current) return;
      isWatching.current = true;
      forceUpdateFlag.current = true;
      forceUpdate();
    }
  }));
  return [watchOptions, forceUpdateFlag, isWatching];
}

function trackedPromise(promise) {
  return promise.then(
    v => Object.defineProperty(promise, _data, {value: v}),
    e => Object.defineProperty(promise, _error, {value: e})
  ).finally(
    () => Object.defineProperty(promise, _tracked, {value: true})
  );
}

function sleep(delay, value) {
  return new Promise(resolve => setTimeout(resolve, delay, value));
}

function forEachLeft(container, handle) {
  container.forEach(handle);
}

function forEachRight(container, handle) {
  const len = container.length - 1;
  for (let i = len; i >= 0; --i) {
    handle(container[i], i);
  }
}

function defaultIntersection(entry) {
  return entry.isIntersecting;
}

function defaultCompare(newProps, oldProps) {
  return Object.entries(newProps).some(([key, value]) => value !== oldProps[key]);
}

function defaultGenerateResolve(element, watchOptions) {
  return element.type(element.props, watchOptions);
}

function defaultInit() {
}

function withResolvers() {
  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {promise, resolve, reject};
}

/**
 * @param status {Status}
 * @return {boolean}
 */
function isPending(status) {
  return status === "pending";
}

/**
 * @param status {Status}
 * @return {boolean}
 */
function isResolve(status) {
  return status === "resolve";
}

/**
 * @param status {Status}
 * @return {boolean}
 */
function isReject(status) {
  return status === "reject";
}