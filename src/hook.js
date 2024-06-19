"use strict";

import {useState, useCallback, useRef, useEffect} from "react";

export {
  useForceUpdate,
  useWatchOptions,
  useView,
};

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
  const [watchOptions] = useState(() => ({
    update: () => {
      isUpdate.current = true;
      forceUpdate();
    },
    unWatch: () => {
      isWatching.current = false;
    },
    reWatch: () => {
      if (isWatching.current)
        return;
      isWatching.current = true;
      isUpdate.current = true;
      forceUpdate();
    }
  }));
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