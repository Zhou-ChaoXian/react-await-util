"use strict";

import {
  cloneElement,
  createContext,
  createElement,
  forwardRef,
  isValidElement,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {Await} from "./await.js";
import {useWatchOptions, useView} from "./hook.js";
import {trackedPromise, defaultCompareObject, defaultIntersection, withResolvers} from "./util.js";

export {
  Async,
  AsyncView,
  defineAsyncComponent,
  useAsyncValue,
};

function defaultGenerateResolve(element, watchOptions) {
  return element.type(element.props, watchOptions);
}

const GenerateResolveContext = createContext(defaultGenerateResolve);

const Async = forwardRef(function Async(
  {
    wrap,
    init,
    children,
    compare = defaultCompareObject,
    delay = 300,
    jumpFirst = false,
    onStart,
    onEnd,
    onError,
    onComputed,
    placeholder,
  },
  ref
) {
  const cacheResolve = useRef(null);
  const cacheType = useRef(null);
  const cacheProps = useRef(null);
  const first = useRef(true);
  const generateResolve = useContext(GenerateResolveContext);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  useImperativeHandle(ref, () => watchOptions, []);
  if (!isValidElement(wrap) || typeof wrap.type !== "function")
    return;
  if (first.current) {
    first.current = false;
    if (!jumpFirst)
      cacheResolve.current = generateResolve(wrap, watchOptions);
  } else {
    if (
      isWatching.current &&
      (isUpdate.current || wrap.type !== cacheType.current || (compare && compare(wrap.props, cacheProps.current)))
    ) {
      isUpdate.current = false;
      cacheResolve.current = generateResolve(wrap, watchOptions);
    }
  }
  cacheType.current = wrap.type;
  cacheProps.current = wrap.props;
  return createElement(Await, {
    resolve: cacheResolve.current,
    init,
    delay,
    jumpFirst,
    onStart,
    onEnd,
    onError,
    onComputed,
    placeholder,
  }, ({first, status, value, error, computed, placeholder}) => {
    return children({first, status, value, error, computed, placeholder, watchOptions});
  });
});

function AsyncView({root, rootIsParent, rootMargin, threshold, children, onIntersection = defaultIntersection}) {
  const [valid] = useState(() => {
    return isValidElement(children) &&
      children.type === Async &&
      isValidElement(children.props.wrap) &&
      typeof children.props.wrap.type === "function";
  });
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
    return createElement(GenerateResolveContext.Provider, {value}, childrenEl);
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
    const [initValue] = useState(() => init(props, watchOptions));
    const action = useAction(props, watchOptions);
    const cacheAction = useRef(undefined);
    useImperativeHandle(ref, () => watchOptions, []);
    if (first.current) {
      first.current = false;
      if (!jumpFirst)
        cacheResolve.current = loader(props, {action, watchOptions});
    } else {
      if (
        isWatching.current &&
        (isUpdate.current || (compare && compare(props, cacheProps.current, action, cacheAction.current)))
      ) {
        isUpdate.current = false;
        cacheResolve.current = loader(props, {action, watchOptions});
      }
    }
    cacheProps.current = props;
    cacheAction.current = action;
    return createElement(Await, {
      resolve: cacheResolve.current,
      init: initValue,
      delay,
      jumpFirst,
      onStart,
      onEnd,
      onError,
      onComputed,
    }, ({first, status, value, error, computed}) => {
      return createElement(
        AsyncValueContext.Provider,
        {value: {first, status, value, error, computed, action, watchOptions}},
        createElement(Component, props)
      );
    });
  });

  return Object.defineProperty(AsyncComponent, "displayName", {value: name});
}