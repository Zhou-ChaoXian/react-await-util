"use strict";

import {
  cloneElement,
  createElement,
  forwardRef,
  Fragment,
  isValidElement,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {useForceUpdate, useWatchOptions, useView} from "./hook.js";
import {
  _data,
  _error,
  _tracked,
  trackedPromise,
  trackedResolve,
  defaultCompare,
  defaultCompareObject,
  defaultCompareArray,
  defaultIntersection,
  withResolvers,
} from "./util.js";

export {
  Await,
  AwaitWatch,
  AwaitWatchObject,
  AwaitWatchArray,
  AwaitList,
  AwaitView,
  isPending,
  isResolve,
  isReject,
};

const pendingStatus = Symbol("pending");
const resolveStatus = Symbol("resolve");
const rejectStatus = Symbol("reject");

function Await(
  {
    resolve,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onComputed,
    placeholder,
    children,
  }
) {
  const forceUpdate = useForceUpdate();
  const first = useRef(true);
  const cancelMap = useRef(new Map()).current;
  const cacheResolve = useRef(null);
  const updateFlag = useRef(false);
  const status = useRef(pendingStatus);
  const resolveValue = useRef(init);
  const computed = useRef(null);
  if (first.current && jumpFirst) {
    first.current = false;
    resolve = trackedResolve(init);
  }
  if (resolve === noRender)
    return;
  if (resolve instanceof Promise && (cacheResolve.current !== resolve || updateFlag.current)) {
    updateFlag.current = false;
    if (!Reflect.has(resolve, _tracked)) {
      resolve = Object.defineProperty(resolve, _tracked, {value: true});
      cancelMap.get(cacheResolve.current)?.();
      cacheResolve.current = resolve;
      let flag = true;
      cancelMap.set(resolve, () => {
        flag = false;
        cancelMap.delete(resolve);
      });
      status.current = pendingStatus;
      onStart?.(first.current);
      resolve.then(
        v => Object.defineProperty(resolve, _data, {value: v}),
        e => Object.defineProperty(resolve, _error, {value: e})
      ).finally(() => {
        setTimeout(() => {
          if (flag) {
            cancelMap.delete(resolve);
            onEnd?.(first.current);
            first.current = false;
            updateFlag.current = true;
            forceUpdate();
          }
        }, delay);
      });
    } else {
      cacheResolve.current = resolve;
      if (Reflect.has(resolve, _data)) {
        status.current = resolveStatus;
        resolveValue.current = Reflect.get(resolve, _data);
      } else {
        status.current = rejectStatus;
        onError?.(Reflect.get(resolve, _error));
      }
    }
    computed.current = onComputed?.({
      first: first.current,
      status: status.current,
      value: resolveValue.current,
      error: Reflect.get(resolve, _error),
    });
  }
  return children({
    first: first.current,
    status: status.current,
    value: resolveValue.current,
    error: resolve && Reflect.get(resolve, _error),
    computed: computed.current,
    placeholder,
  });
}

const AwaitWatch = forwardRef(function AwaitWatch(
  {
    deps,
    compare = defaultCompare,
    handle,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onComputed,
    children,
  },
  ref
) {
  const cacheResolve = useRef(null);
  const cacheDeps = useRef(null);
  const first = useRef(true);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  useImperativeHandle(ref, () => watchOptions, []);
  if (first.current) {
    first.current = false;
    if (!jumpFirst)
      cacheResolve.current = handle(deps, cacheDeps.current);
  } else {
    if (isWatching.current && (isUpdate.current || compare(deps, cacheDeps.current))) {
      isUpdate.current = false;
      cacheResolve.current = handle(deps, cacheDeps.current);
    }
  }
  cacheDeps.current = deps;
  return createElement(Await, {
    resolve: cacheResolve.current,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onComputed,
  }, ({first, status, value, error, computed}) => {
    return children({first, status, value, error, computed, watchOptions});
  });
});

const AwaitWatchObject = forwardRef(function AwaitWatchObject(
  {
    deps = {},
    compare = defaultCompareObject,
    handle,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onComputed,
    children,
  },
  ref
) {
  return createElement(AwaitWatch, {
    deps,
    compare,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onComputed,
    children,
    ref,
  });
});

const AwaitWatchArray = forwardRef(function AwaitWatchArray(
  {
    deps = [],
    compare = defaultCompareArray,
    handle,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onComputed,
    children,
  },
  ref
) {
  return createElement(AwaitWatch, {
    deps,
    compare,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onComputed,
    children,
    ref,
  });
});

const orders = new Set(["forwards", "backwards", "together"]);
const nop = Symbol(), noRender = Symbol();

function forEachLeft(container, handle) {
  container.forEach(handle);
}

function forEachRight(container, handle) {
  const len = container.length - 1;
  for (let i = len; i >= 0; --i) {
    handle(container[i], i);
  }
}

function sleep(delay, value) {
  return new Promise(resolve => setTimeout(resolve, delay, value));
}

function AwaitList({order, tail, gap = 300, children}) {
  const forceUpdate = useForceUpdate();
  if (!orders.has(order))
    return children;
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

function AwaitView(
  {
    root,
    rootIsParent = false,
    rootMargin,
    threshold,
    children,
    onIntersection = defaultIntersection
  }
) {
  const [valid] = useState(() => {
    return isValidElement(children) &&
      children.type === Await &&
      children.props.resolve instanceof Promise;
  });
  const [[resolve, handle]] = useState(() => {
    const {promise, resolve} = withResolvers();
    const value = trackedPromise(children.props.resolve);
    return [promise, () => valid && resolve(value)];
  });
  const {placeholder, flag} = useView(handle, root, rootIsParent, rootMargin, threshold, onIntersection);
  if (valid)
    return flag.current ?
      children :
      cloneElement(children, {resolve, placeholder});
}

function isPending(status) {
  return status === pendingStatus;
}

function isResolve(status) {
  return status === resolveStatus;
}

function isReject(status) {
  return status === rejectStatus;
}