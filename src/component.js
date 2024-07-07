"use strict";

import {createContext, createElement, Suspense, useContext, useLayoutEffect, useRef, useState} from "react";

export {
  Action,
  If,
  Show,
  For,
  Host,
  Tmpl,
  Slotted,
  Gen,
  Yield,
  Next,
};

function Action({useAction, options, children}) {
  const action = useAction(options);
  return children(action);
}

function If({condition, not = false, children, fallback}) {
  const valid = (typeof condition === "function" ? condition() : condition) ^ not;
  return valid ? children : fallback;
}

function Show({condition, not = false, children}) {
  const valid = (typeof condition === "function" ? condition() : condition) ^ !not;
  return createElement(Suspense, null, createElement(Wrap, {valid, children}));
}

function Wrap({valid, children}) {
  const promise = useRef(null);
  const [first, setFirst] = useState(true);
  useLayoutEffect(() => {
    if (first && valid) {
      setFirst(false);
    }
  }, []);
  if (!first && valid) {
    if (promise.current === null) {
      promise.current = generatePromise();
    }
    throw promise.current;
  } else {
    promise.current = null;
  }
  return children;
}

function generatePromise() {
  return new Promise(_ => _);
}

function For({items, keyPath, children}) {
  keyPath = [keyPath].flat();
  return items.map((item, index) => children({
    item,
    index,
    key: keyPath.reduce((item, key) => item[key], item),
  }));
}

const HostContext = createContext(undefined);

function Host({children}) {
  children = [children].flat();
  const value = {
    parent: useContext(HostContext),
    tmplChildren: children.slice(1).reduce((container, child) => {
      if (child?.type === Tmpl) {
        const {name = "default", children} = child.props;
        container[name] ??= children;
      }
      return container;
    }, {})
  };
  return createElement(HostContext.Provider, {value}, children[0]);
}

function Tmpl() {
}

function Slotted({name = "default", children, ...props}) {
  const {parent, tmplChildren} = useContext(HostContext) ?? {};
  const child = tmplChildren?.[name];
  const element = child ?
    (typeof child === "function" ? child(props) : child) :
    children;
  return createElement(HostContext.Provider, {value: parent}, element);
}

const GenContext = createContext(undefined);

function Gen({children}) {
  children = [children].flat();
  const value = {
    index: 0,
    array: children.slice(1).reduce((arr, child) => {
      if (child?.type === Yield) {
        arr.push(child.props.children);
      }
      return arr;
    }, []),
    state: {},
  };
  return createElement(GenContext.Provider, {value}, children[0]);
}

function Yield() {
}

function Next({children, ...props}) {
  const value = useContext(GenContext);
  if (value) {
    const {index, array, state} = value;
    if (state[index]) {
      return;
    }
    state[index] = true;
    const child = array[index];
    const el = typeof child === "function" ? child(props) : child;
    const newValue = {index: index + 1, array, state};
    return createElement(GenContext.Provider, {value: newValue}, el);
  }
}