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
  useAwaitState,
  useAwaitReducer,
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
    onFinal,
  }
) {
  const forceUpdate = useForceUpdate();
  const first = useRef(true);
  const cancelMap = useRef(new Map()).current;
  const cacheResolve = useRef(null);
  const status = useRef(pendingStatus);
  const resolveValue = useRef(init);
  const resolveData = useRef(null);
  const generateResolveData = useCallback(() => {
    const resolve = cacheResolve.current;
    resolveData.current = {
      first: first.current,
      status: status.current,
      value: resolveValue.current,
      error: resolve instanceof Promise ? Reflect.get(resolve, _error) : undefined,
    };
  }, []);
  useState(() => {
    if (jumpFirst) {
      first.current = false;
      resolve = trackedResolve(init);
    } else {
      if (!(resolve instanceof Promise)) {
        first.current = false;
        status.current = resolveStatus;
        generateResolveData();
      }
    }
  });
  if (resolve instanceof Promise && cacheResolve.current !== resolve) {
    const setStatus = () => {
      const resolve = cacheResolve.current;
      if (Reflect.has(resolve, _data)) {
        status.current = resolveStatus;
        resolveValue.current = Reflect.get(resolve, _data);
        onEnd?.(resolveValue.current);
      } else {
        status.current = rejectStatus;
        onError?.(Reflect.get(resolve, _error));
      }
    };
    if (Reflect.has(resolve, _tracked)) {
      cacheResolve.current = resolve;
      setStatus();
    } else {
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
            setStatus();
            onFinal?.(first.current);
            first.current = false;
            generateResolveData();
            forceUpdate();
          }
        }, delay);
      });
    }
    generateResolveData();
  }
  return resolveData.current;
}

function useAwaitState(
  {
    deps,
    handle,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onFinal,
  }
) {
  const cacheDeps = useRef(undefined);
  cacheDeps.current = deps;
  const [resolve, set] = useState(() => jumpFirst ? undefined : handle(deps));
  const setResolve = useCallback((resolve) => {
    set(resolve instanceof Promise ?
      resolve.then(value => handle(cacheDeps.current, value)) :
      handle(cacheDeps.current, resolve)
    );
  }, []);
  const resolveData = useAwait({
    resolve,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onFinal,
  });
  return [resolveData, setResolve];
}

function useAwaitReducer(
  {
    deps,
    handle,
    reducersDeps,
    reducers: reducersOrFunction,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onFinal,
  }
) {
  const [resolveData, setResolve] = useAwaitState({
    deps,
    handle,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onFinal,
  });
  const cacheReducersDeps = useRef(undefined);
  cacheReducersDeps.current = reducersDeps;
  const [reducers] = useState(() =>
    typeof reducersOrFunction === "function" ?
      reducersOrFunction() :
      reducersOrFunction
  );
  const dispatch = useCallback((action) => {
    const {type, payload} = action;
    const reducer = reducers[type];
    if (typeof reducer === "function") {
      setResolve(reducer({type, payload, deps: cacheReducersDeps.current?.[type]}));
    }
  }, []);
  const [actions] = useState(() => {
    return Object.keys(reducers).reduce((obj, type) => {
      obj[type] = (payload) => dispatch({type, payload});
      return obj;
    }, {})
  });
  return [resolveData, dispatch, actions];
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
    onFinal,
  }
) {
  const cacheResolve = useRef(null);
  const cacheDeps = useRef(null);
  const first = useRef(true);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  if (first.current) {
    first.current = false;
    if (!jumpFirst)
      cacheResolve.current = handle(deps);
  } else {
    if (isWatching.current && (isUpdate.current || (compare && compare(deps, cacheDeps.current)))) {
      isUpdate.current = false;
      cacheResolve.current = handle(deps);
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
    onFinal,
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
    onFinal,
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
    onFinal,
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
    onFinal,
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
    onFinal,
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