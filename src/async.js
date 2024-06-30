"use strict";

import {
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useContext,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {useAwait, useWatchOptions, useView} from "./hook.js";
import {trackedPromise, defaultCompareObject, defaultIntersection, withResolvers} from "./util.js";

export {
  Async,
  AsyncView,
  defineAsyncComponent,
  useAsyncValue,
};

function defaultGenerateResolve(element) {
  return element.type(element.props);
}

const GenerateResolveContext = createContext(defaultGenerateResolve);

const Async = forwardRef(function Async(
  {
    wrap,
    compare = defaultCompareObject,
    init,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onFinal,
    onComputed,
    placeholder,
    children,
  },
  ref
) {
  if (typeof wrap.type !== "function")
    throw new Error("wrap type must be a function component.");
  const cacheResolve = useRef(null);
  const cacheType = useRef(null);
  const cacheProps = useRef(null);
  const first = useRef(true);
  const generateResolve = useContext(GenerateResolveContext);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  useImperativeHandle(ref, () => watchOptions, []);
  if (first.current) {
    first.current = false;
    if (!jumpFirst)
      cacheResolve.current = generateResolve(wrap);
  } else {
    if (
      isWatching.current &&
      (isUpdate.current || wrap.type !== cacheType.current || (compare && compare(wrap.props, cacheProps.current)))
    ) {
      isUpdate.current = false;
      cacheResolve.current = generateResolve(wrap);
    }
  }
  cacheType.current = wrap.type;
  cacheProps.current = wrap.props;
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
  const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
  return children({...resolveData, computed, placeholder, watchOptions});
});

function AsyncView(
  {
    root,
    rootIsParent,
    rootMargin,
    threshold,
    children,
    onIntersection = defaultIntersection,
  }
) {
  const [valid] = useState(() => isValidElement(children) && children.type === Async);
  const [[generateResolve, handle]] = useState(() => {
    const {promise, resolve} = withResolvers();
    let realResolve;
    return [
      (element) => {
        realResolve = defaultGenerateResolve(element);
        return flag.current ? realResolve : promise;
      },
      () => {
        if (valid) {
          resolve(trackedPromise(realResolve));
        }
      }
    ];
  });
  const {placeholder, flag} = useView(handle, root, rootIsParent, rootMargin, threshold, onIntersection);
  if (valid) {
    const el = flag.current ? children : cloneElement(children, {placeholder});
    return createElement(GenerateResolveContext.Provider, {value: generateResolve}, el);
  }
}

const AsyncValueContext = createContext(undefined);

function useAsyncValue() {
  return useContext(AsyncValueContext);
}

function defaultInit() {
}

function defaultUseAction() {
}

function defineAsyncComponent(
  {
    name = "AsyncComponent",
    init = defaultInit,
    compare = defaultCompareObject,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onFinal,
    onComputed,
    useAction = defaultUseAction,
    loader,
    Component,
  }
) {
  const AsyncComponent = forwardRef(function AsyncComponent(props, ref) {
    const cacheResolve = useRef(null);
    const cacheProps = useRef(null);
    const first = useRef(true);
    const [watchOptions, isUpdate, isWatching] = useWatchOptions();
    const [initValue] = useState(() => init(props));
    const action = useAction(props, watchOptions);
    const cacheAction = useRef(undefined);
    useImperativeHandle(ref, () => watchOptions, []);
    if (first.current) {
      first.current = false;
      if (!jumpFirst)
        cacheResolve.current = loader(props, action);
    } else {
      if (
        isWatching.current &&
        (isUpdate.current || (compare && compare(props, cacheProps.current, action, cacheAction.current)))
      ) {
        isUpdate.current = false;
        cacheResolve.current = loader(props, action);
      }
    }
    cacheProps.current = props;
    cacheAction.current = action;
    const resolveData = useAwait({
      resolve: cacheResolve.current,
      init: initValue,
      delay,
      jumpFirst,
      onStart,
      onEnd,
      onError,
      onFinal,
    });
    const computed = useMemo(() => onComputed?.(resolveData), [resolveData]);
    return createElement(
      AsyncValueContext.Provider,
      {value: {...resolveData, computed, action, watchOptions}},
      createElement(Component, props)
    );
  });

  return Object.defineProperty(AsyncComponent, "displayName", {value: name});
}