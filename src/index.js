"use strict";

export * from "./await.js";
export * from "./async.js";
export * from "./component.js";

export {
  isPending,
  isResolve,
  isReject,
};

function isPending(status) {
  return status === "pending";
}

function isResolve(status) {
  return status === "resolve";
}

function isReject(status) {
  return status === "reject";
}