"use strict";

import {createContext, createElement, useContext} from "react";

export {
  Action,
  Host,
  Provision,
  Slotted,
};

function Action({useAction, options, children}) {
  const action = useAction(options);
  return children(action);
}

const ProvisionContext = createContext(undefined);

function Host({children}) {
  children = [children].flat();
  const value = children.slice(1).reduce((container, child) => {
    if (child?.type === Provision) {
      const {name = "default", children} = child.props;
      container[name] ??= children;
    }
    return container;
  }, {});
  return createElement(ProvisionContext.Provider, {value}, children[0]);
}

function Provision() {
}

function Slotted({name = "default", children, ...props}) {
  const provisionSlots = useContext(ProvisionContext);
  const slot = provisionSlots?.[name];
  let element;
  if (slot) {
    element = typeof slot === "function" ? slot(props) : slot;
  } else {
    element = children;
  }
  return createElement(ProvisionContext.Provider, {value: undefined}, element);
}