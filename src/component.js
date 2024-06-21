"use strict";

import {createContext, createElement, useContext} from "react";

export {
  Action,
  Host,
  Tmpl,
  Slotted,
};

function Action({useAction, options, children}) {
  const action = useAction(options);
  return children(action);
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