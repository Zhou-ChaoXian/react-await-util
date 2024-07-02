"use strict";

import {isValidElement} from "react";

export {
  _data,
  _error,
  _tracked,
  trackedPromise,
  trackedResolve,
  defaultCompare,
  defaultCompareObject,
  defaultCompareArray,
  defaultIntersection,
  withResolvers,
  viewElementValidate,
};

const _data = Symbol(), _error = Symbol(), _tracked = Symbol();

function trackedPromise(promise) {
  return promise.then(
    v => Object.defineProperty(promise, _data, {value: v}),
    e => Object.defineProperty(promise, _error, {value: e})
  ).finally(
    () => Object.defineProperty(promise, _tracked, {value: true})
  );
}

function trackedResolve(value) {
  return Object.defineProperties(Promise.resolve(value), {
    [_tracked]: {value: true},
    [_data]: {value},
  });
}

function defaultCompare(newValue, oldValue) {
  return newValue !== oldValue;
}

function defaultCompareObject(newValue, oldValue) {
  return Object.entries(newValue).some(([key, value]) => value !== oldValue[key]);
}

function defaultCompareArray(newValue, oldValue) {
  return newValue.some((value, index) => value !== oldValue[index]);
}

function defaultIntersection(entry) {
  return entry.isIntersecting;
}

function withResolvers() {
  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {promise, resolve, reject};
}

function viewElementValidate(element, typeValidate) {
  return isValidElement(element) && typeValidate() && !element.props.jumpFirst;
}