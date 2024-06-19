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
import {Await} from './await.js';
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
    element,
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
  const cacheType = useRef(null);
  const cacheProps = useRef(null);
  const first = useRef(true);
  const el = useRef(null);
  const generateResolve = useContext(GenerateResolveContext);
  const [watchOptions, isUpdate, isWatching] = useWatchOptions();
  useImperativeHandle(ref, () => watchOptions, []);
  if (!isValidElement(element) || typeof element.type !== "function")
    return;
  if (!first.current) {
    if (!isWatching.current)
      return el.current;
    if (isUpdate.current || element.type !== cacheType.current || compare(element.props, cacheProps.current)) {
      isUpdate.current = false;
    } else {
      return el.current;
    }
  }
  const resolve = (first.current && jumpFirst) ? null : generateResolve(element, watchOptions);
  first.current = false;
  cacheType.current = element.type;
  cacheProps.current = element.props;
  return el.current = createElement(Await, {
    resolve,
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
      isValidElement(children.props.element) &&
      typeof children.props.element.type === "function";
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
    loader,
    Component,
  }
) {
  const AsyncComponent = forwardRef(function AsyncComponent(props, ref) {
    const cacheProps = useRef(null);
    const first = useRef(true);
    const el = useRef(null);
    const [watchOptions, isUpdate, isWatching] = useWatchOptions();
    const [initValue] = useState(() => init(props, watchOptions));
    useImperativeHandle(ref, () => watchOptions, []);
    if (!first.current) {
      if (!isWatching.current)
        return el.current;
      if (isUpdate.current || compare(props, cacheProps.current)) {
        isUpdate.current = false;
      } else {
        return el.current;
      }
    }
    const resolve = (first.current && jumpFirst) ? null : loader(props, watchOptions);
    first.current = false;
    cacheProps.current = props;
    return el.current = createElement(Await, {
      resolve,
      init: initValue,
      delay,
      jumpFirst,
      onStart,
      onEnd,
      onError
    }, ({first, status, value, error}) => {
      return createElement(
        AsyncValueContext.Provider,
        {value: {first, status, value, error, watchOptions}},
        createElement(Component, props)
      );
    });
  });

  return Object.defineProperty(AsyncComponent, "displayName", {value: name});
}