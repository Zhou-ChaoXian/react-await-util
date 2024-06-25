"use strict";

import {useState, useCallback, useRef, useEffect} from "react";
import {
  _data,
  _error,
  _tracked,
  defaultCompare,
  defaultCompareArray,
  defaultCompareObject,
  trackedResolve,
} from "./util";

export {
  isPending,
  isResolve,
  isReject,
  useAwait,
  useAwaitWatch,
  useAwaitWatchObject,
  useAwaitWatchArray,
  useForceUpdate,
  useWatchOptions,
  useView,
};

const pendingStatus = Symbol("pending");
const resolveStatus = Symbol("resolve");
const rejectStatus = Symbol("reject");

function isPending(status) {
  return status === pendingStatus;
}

function isResolve(status) {
  return status === resolveStatus;
}

function isReject(status) {
  return status === rejectStatus;
}

function useAwait(
  {
    resolve,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
  }
) {
  const forceUpdate = useForceUpdate();
  const first = useRef(true);
  const cancelMap = useRef(new Map()).current;
  const cacheResolve = useRef(null);
  const updateFlag = useRef(false);
  const status = useRef(pendingStatus);
  const resolveValue = useRef(init);
  const generateResolveData = () => ({
    first: first.current,
    status: status.current,
    value: resolveValue.current,
    error: (resolve instanceof Promise ? Reflect.get(resolve, _error) : undefined),
  });
  const [resolveData] = useState(() => ({current: generateResolveData()}));
  if (first.current && jumpFirst) {
    first.current = false;
    resolve = trackedResolve(init);
  }
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
    resolveData.current = generateResolveData();
  }
  return resolveData.current;
}

function useAwaitWatch(
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
  }
) {
  const cacheResolve = useRef(null);
  const cacheDeps = useRef(null);
  const first = useRef(true);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  if (first.current) {
    first.current = false;
    if (!jumpFirst)
      cacheResolve.current = handle(deps, cacheDeps.current);
  } else {
    if (isWatching.current && (isUpdate.current || (compare && compare(deps, cacheDeps.current)))) {
      isUpdate.current = false;
      cacheResolve.current = handle(deps, cacheDeps.current);
    }
  }
  cacheDeps.current = deps;
  const resolveData = useAwait({
    resolve: cacheResolve.current,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
  });
  return [resolveData, watchOptions];
}

function useAwaitWatchObject(
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
  }
) {
  return useAwaitWatch({
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
}

function useAwaitWatchArray(
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
  }
) {
  return useAwaitWatch({
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
}

function useForceUpdate() {
  const setUpdateFlag = useState(true)[1];
  return useCallback(() => {
    setUpdateFlag(updateFlag => !updateFlag);
  }, []);
}

function useWatchOptions() {
  const forceUpdate = useForceUpdate();
  const isUpdate = useRef(false);
  const isWatching = useRef(true);
  const [watchOptions] = useState(() => {
    const update = () => {
      isUpdate.current = true;
      forceUpdate();
    };
    return {
      update,
      unWatch: () => {
        if (!isWatching.current)
          return;
        isWatching.current = false;
        update();
      },
      reWatch: () => {
        if (isWatching.current)
          return;
        isWatching.current = true;
        update();
      },
      get isWatching() {
        return isWatching.current;
      },
    };
  });
  return [watchOptions, isUpdate, isWatching];
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
          placeholder.current = null;
          handle();
        }
      }, {root: rootIsParent ? placeholder.current.parentElement : root?.current, rootMargin, threshold});
      observer.observe(placeholder.current);
      return () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
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