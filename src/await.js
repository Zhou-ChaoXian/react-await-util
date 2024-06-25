"use strict";

import {
  cloneElement,
  createElement,
  forwardRef,
  Fragment,
  isValidElement,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import {
  useAwait,
  useAwaitWatch,
  useForceUpdate,
  useView,
} from "./hook.js";
import {
  _tracked,
  trackedPromise,
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
};

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
  const resolveData = useAwait({
    resolve,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
  });
  const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
  if (resolve === noRender)
    return;
  return children({...resolveData, computed, placeholder});
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
  const [resolveData, watchOptions] = useAwaitWatch({
    deps,
    compare,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
  });
  const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
  useImperativeHandle(ref, () => watchOptions, []);
  return children({...resolveData, computed, watchOptions});
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
  const [resolveData, watchOptions] = useAwaitWatch({
    deps,
    compare,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
  });
  const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
  useImperativeHandle(ref, () => watchOptions, []);
  return children({...resolveData, computed, watchOptions});
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
  const [resolveData, watchOptions] = useAwaitWatch({
    deps,
    compare,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
  });
  const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
  useImperativeHandle(ref, () => watchOptions, []);
  return children({...resolveData, computed, watchOptions});
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