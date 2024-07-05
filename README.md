## react-await-util

> 处理组件中的 `promise`

### 📦 install

```shell
npm install react-await-util
```

### ✨ 目录

1. [`useAwait`](#useawait)
2. [`Await`](#await)
3. [`useAwaitState`](#useawaitstate)
4. [`AwaitState`](#awaitstate)
5. [`useAwaitReducer`](#useawaitreducer)
6. [`AwaitReducer`](#awaitreducer)
7. [`useAwaitWatch`](#useawaitwatch)
8. [`AwaitWatch`](#awaitwatch)
9. [`AwaitList`](#awaitlist)
10. [`AwaitView`](#awaitview)
11. [`AwaitStateView`](#awaitstateview)
12. [`AwaitWatchView`](#awaitwatchview)
13. [`Async`](#async)
14. [`AsyncView`](#asyncview)
15. [`defineAsyncComponent`](#defineasynccomponent)
16. [`Action`](#action)
17. [`Host` `Tmpl` `Slotted`](#插槽组件)

### useAwait

***? 表示可选属性***

| `options`  |          `type`          | `description`                  |
|:-----------|:------------------------:|:-------------------------------|
| resolve?   |         Promise          | 要处理的 Promise                   |
| init?      |           any            | 初始值                            |
| delay?     |          number          | 延迟，默认 300 ms，Promise 完成快屏幕会闪烁  |
| jumpFirst? |         boolean          | 跳过首次请求，一般和 init 配合             |
| onStart?   | (first: boolean) => void | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?     |   (value: any) => void   | promise 正确结束时执行 then           |
| onError?   |   (error: any) => void   | promise 报错时执行 catch            |
| onFinal?   | (first: boolean) => void | promise 结束时执行 finally          |

```ts
declare const pendingStatus: unique symbol;
declare const resolveStatus: unique symbol;
declare const rejectStatus: unique symbol;

// 返回值
interface ResolveData {
  first: boolean;  // 是否是第一次执行，一般用于初始化判断，适用骨架屏
  status: typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;  // 当前状态，一般用于初始化后请求，判断状态，展示 loading 效果
  value: any;  // Promise 结果，会保留最后一次正确的结果，防止请求出错没有数据，页面空了
  error: any;  // Promise 出错
}
```

***示例***

```jsx
import {useState} from "react";
import {useAwait, isPending} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

async function request(count) {
  return "hello" + count;
}

function Foo() {
  const [count, setCount] = useState(0);
  const [resolve, setResolve] = useState(() => request(count));
  const add = () => {
    const c = count + 1;
    setCount(c);
    setResolve(request(c));
  };
  const {first, status, value} = useAwait({resolve});
  return (
    <Skeleton loading={first}>
      <Spin spinning={isPending(status)}>
        <Flex vertical justify="center" align="center" gap="middle">
          <h1>{count}</h1>
          <Button onClick={add}>add</Button>
          <h1>{value}</h1>
        </Flex>
      </Spin>
    </Skeleton>
  );
}
```

### Await

***? 表示可选属性***

| `props`     |   `type`   | `description`              |
|:------------|:----------:|:---------------------------|
| onComputed? | OnComputed | 对结果先处理                     |
| children    | ChildrenFn | 子元素是函数，给 Promise 提供一个抽象的结果 |

```ts
import type {ReactElement, RefObject} from "react";

type OnComputed = (resolveData: ResolveData) => any;  // ResolveData 同上，返回值

type Options = ResolveData & {
  computed: any;  // onComputed 处理结果
  placeholder?: RefObject<any>;  // 占位元素 ref，和 AwaitView 组件配合
};

type ChildrneFn = (options: Options) => ReactElement;
```

***示例***

```jsx
import {useState} from "react";
import {Await, isPending} from "react-await-util";
import {Skeleton, Spin, Button} from "antd";

function Foo() {
  const [resolve, setResolve] = useState(request);
  const update = () => {
    setResolve(request());
  };

  return (
    <Await resolve={resolve}>{({first, status, value}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <h1>{value}</h1>
          <Button onClick={update}>update</Button>
        </Spin>
      </Skeleton>
    }</Await>
  );
}

let count = 0;

async function request() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  count += 1;
  return "hello world" + count;
}
```

### useAwaitState

***? 表示可选属性***

| `options`  |              `type`               | `description`                  |
|:-----------|:---------------------------------:|:-------------------------------|
| deps?      |                any                | 依赖                             |
| handle     | (deps: any, arg?: any) => Promise | 生成 Promise                     |
| init?      |                any                | 初始值                            |
| delay?     |              number               | 延迟，默认 300 ms，Promise 完成快屏幕会闪烁  |
| jumpFirst? |              boolean              | 跳过首次请求，一般和 init 配合             |
| onStart?   |     (first: boolean) => void      | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?     |       (value: any) => void        | promise 正确结束时执行 then           |
| onError?   |       (error: any) => void        | promise 报错时执行 catch            |
| onFinal?   |     (first: boolean) => void      | promise 结束时执行 finally          |

***示例***

```jsx
import {useState} from "react";
import {useAwaitState, isPending} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

function Foo() {
  const [count, setCount] = useState(0);
  // setCountResolve 可以传任何值，调用 handle 生成新 Promise (如果传的是 Promise，会变成 Promise 完成的值)
  const [countResolve, setCountResolve] = useAwaitState({
    deps: count,
    // count 参数对应 deps 依赖，arg 是 setCountResolve 传递的值
    handle: async (count, arg) => {
      console.log(arg);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return "hello" + count;
    },
  });
  return (
    <Skeleton loading={countResolve.first}>
      <Spin spinning={isPending(countResolve.status)}>
        <Flex vertical align="center" gap="middle">
          <h1>{count}</h1>
          <h1>{countResolve.value}</h1>
          <Flex jusify="center" gap="middle">
            <Button onClick={() => setCount(count + 1)}>add</Button>
            <Button onClick={setCountResolve}>update</Button>
          </Flex>
        </Flex>
      </Spin>
    </Skeleton>
  );
}
```

### AwaitState

***? 表示可选属性***

| `props`     |   `type`   | `description`              |
|:------------|:----------:|:---------------------------|
| onComputed? | OnComputed | 对结果先处理                     |
| children    | ChildrenFn | 子元素是函数，给 Promise 提供一个抽象的结果 |

```ts
import type {ReactElement} from "react";

interface ResolveData {
  first: boolean;
  status: typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;
  value: any;
  error: any;
  computed: any;
  setResolve: (resolve?: any) => void;
}

type ChildrenFn = (resolveData: ResolveData) => ReactElement;
```

***示例***

```jsx
import {useState} from "react";
import {isPending, AwaitStatus} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

async function countHandle(count, arg) {
  console.log("arg =>", arg);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "hello" + count;
}

function Foo() {
  const [count, setCount] = useState(0);
  return (
    <AwaitStatus deps={count} handle={countHandle}>{({first, status, value, setResolve}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <Flex vertical align="center" gap="middle">
            <h1>count - {count}</h1>
            <h1>{value}</h1>
            <Button.Group>
              <Button onClick={() => setCount(count + 1)} disabled={isPending(status)}>add</Button>
              <Button onClick={() => setResolve("123")} disabled={isPending(status)}>setResolve</Button>
            </Button.Group>
          </Flex>
        </Spin>
      </Skeleton>
    }</AwaitStatus>
  );
}
```

### useAwaitReducer

***? 表示可选属性***

| `options`     |              `type`               | `description`                  |
|:--------------|:---------------------------------:|:-------------------------------|
| deps?         |                any                | 依赖                             |
| handle        | (deps: any, arg?: any) => Promise | 生成 Promise                     |
| reducersDeps? |        Record<string, any>        | reducers 依赖                    |
| reducers?     |             Reducers              | reducers                       |
| init?         |                any                | 初始值                            |
| delay?        |              number               | 延迟，默认 300 ms，Promise 完成快屏幕会闪烁  |
| jumpFirst?    |              boolean              | 跳过首次请求，一般和 init 配合             |
| onStart?      |     (first: boolean) => void      | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?        |       (value: any) => void        | promise 正确结束时执行 then           |
| onError?      |       (error: any) => void        | promise 报错时执行 catch            |
| onFinal?      |     (first: boolean) => void      | promise 结束时执行 finally          |

```ts
type Reducer = (action?: { type: string; payload: any; deps: any; }) => any;
type Reducers = Record<string, Reducer> | (() => Record<string, Reducer>);
```

***示例***

```jsx
import {useState} from "react";
import {useAwaitReducer, isPending} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

async function countHandle(count, arg) {
  console.log("arg =>", arg);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "hello" + count;
}

function countReducers() {
  return {
    test1: () => {
      return "test1";
    },
    test2: async ({type, payload, deps}) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(type, payload, deps);
      return "test2";
    }
  };
}

function Foo() {
  const [count, setCount] = useState(0);
  // 调用 dispatch 生成新 Promise，actions 用于生成 action
  const [{first, status, value}, dispatch, actions] = useAwaitReducer({
    deps: count,
    reducersDeps: {
      test1: count,
      test2: count,
    },
    handle: countHandle,
    reducers: countReducers,
  });

  return (
    <Skeleton loading={first}>
      <Spin spinning={isPending(status)}>
        <Flex vertical align="center" gap="middle">
          <h1>count - {count}</h1>
          <h1>{value}</h1>
          <Button.Group>
            <Button onClick={() => setCount(count + 1)} disabled={isPending(status)}>add</Button>
            <Button onClick={() => dispatch()} disabled={isPending(status)}>update</Button>
            <Button onClick={() => dispatch({type: "test1"})} disabled={isPending(status)}>test1</Button>
            <Button onClick={() => dispatch(actions.test2("!!!"))} disabled={isPending(status)}>test2</Button>
          </Button.Group>
        </Flex>
      </Spin>
    </Skeleton>
  );
}
```

### AwaitReducer

***? 表示可选属性***

| `props`     |   `type`   | `description`              |
|:------------|:----------:|:---------------------------|
| onComputed? | OnComputed | 对结果先处理                     |
| children    | ChildrenFn | 子元素是函数，给 Promise 提供一个抽象的结果 |

```ts
import type {ReactElement} from "react";

interface ResolveData {
  first: boolean;
  status: typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;
  value: any;
  error: any;
  computed: any;
  dispatch: (action?: { type: string; payload?: any; }) => void;
  actions: Record<string, (payload?: any) => void>;
}

type ChildrenFn = (resolveData: ResolveData) => ReactElement;
```

***示例***

```jsx
import {useState} from "react";
import {isPending, AwaitReducer} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

async function countHandle(count, arg) {
  console.log("arg =>", arg);
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "hello" + count;
}

function countReducers() {
  return {
    test1: () => {
      return "test1";
    },
    test2: async ({type, payload, deps}) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(type, payload, deps);
      return "test2";
    }
  };
}

function Foo() {
  const [count, setCount] = useState(0);
  return (
    <AwaitReducer
      handle={countHandle}
      reducers={countReducers}
      deps={count}
      reducersDeps={{test1: count, test2: count}}
    >{({first, status, value, dispatch, actions}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <Flex vertical align="center" gap="middle">
            <h1>count - {count}</h1>
            <h1>{value}</h1>
            <Button.Group>
              <Button onClick={() => setCount(count + 1)} disabled={isPending(status)}>add</Button>
              <Button onClick={() => dispatch()} disabled={isPending(status)}>update</Button>
              <Button onClick={() => dispatch({type: "test1"})} disabled={isPending(status)}>test1</Button>
              <Button onClick={() => dispatch(actions.test2("!!!"))} disabled={isPending(status)}>test2</Button>
            </Button.Group>
          </Flex>
        </Spin>
      </Skeleton>
    }</AwaitReducer>
  );
}
```

### useAwaitWatch

***? 表示可选属性***

| `options`  |                         `type`                         | `description`                  |
|:-----------|:------------------------------------------------------:|:-------------------------------|
| deps?      |                          any                           | 依赖                             |
| handle     |                 (deps: any) => Promise                 | 生成 Promise                     |
| compare?   | ((newDeps: any, oldDeps: any) => boolean) &#124; false | 对比函数，默认 === 对比                 |
| init?      |                          any                           | 初始值                            |
| delay?     |                         number                         | 延迟，默认 300 ms，Promise 完成快屏幕会闪烁  |
| jumpFirst? |                        boolean                         | 跳过首次请求，一般和 init 配合             |
| onStart?   |                (first: boolean) => void                | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?     |                  (value: any) => void                  | promise 正确结束时执行 then           |
| onError?   |                  (error: any) => void                  | promise 报错时执行 catch            |
| onFinal?   |                (first: boolean) => void                | promise 结束时执行 finally          |

```ts
interface WatchOptions {
  update: () => void;  // 强制更新
  unWatch: () => void;  // 取消观察，依赖发生变化，不重新请求
  reWatch: () => void;  // 恢复观察

  get isWatching(): boolean;  // 是否正在观察
}

type Return = [ResolveData, WatchOptions];  // 返回值是个元组
```

***示例***

```jsx
import {useState} from "react";
import {useAwaitWatch, isPending} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

function Foo() {
  const [count, setCount] = useState(0);
  const add = () => {
    setCount(count + 1);
  };
  const [{first, status, value}, watchOptions] = useAwaitWatch({
    deps: count,
    handle: async () => {
      return "hello" + count;
    },
  });
  return (
    <Skeleton loading={first}>
      <Spin spinning={isPending(status)}>
        <Flex vertical justify="center" align="center" gap="middle">
          <h1>{count}</h1>
          <Button onClick={add}>add</Button>
          <h1>{value}</h1>
          <Flex justify="center" gap="middle">
            <Button onClick={watchOptions.update}>update</Button>
            <Button onClick={watchOptions.unWatch} disabled={!watchOptions.isWatching}>unWatch</Button>
            <Button onClick={watchOptions.reWatch} disabled={watchOptions.isWatching}>reWatch</Button>
          </Flex>
        </Flex>
      </Spin>
    </Skeleton>
  );
}
```

### AwaitWatch

***? 表示可选属性***

| `props`     |     `type`      | `description`              |
|:------------|:---------------:|:---------------------------|
| onComputed? | OnComputed (同上) | 对结果先处理                     |
| children    |   ChildrenFn    | 子元素是函数，给 Promise 提供一个抽象的结果 |

```ts
import type {ReactElement} from "react";

interface ResolveData {
  first: boolean;
  status: typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;
  value: any;
  error: any;
  computed: any;
  watchOptions: WatchOptions;  // 同上
}

type ChildrenFn = (resolveData: ResolveData) => ReactElement;
```

***示例***

```jsx
import {useState} from "react";
import {AwaitWatch, isPending} from "react-await-util";
import {Skeleton, Spin, Button, Flex} from "antd";

function Foo() {
  const [count, setCount] = useState(0);
  const add = () => {
    setCount(count + 1);
  };

  return (
    <AwaitWatch deps={count} handle={request}>{({first, status, value, watchOptions}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <h1>{count}</h1>
          <h1>{value}</h1>
          <Flex gap="middle">
            <Button onClick={add}>add</Button>
            <Button onClick={watchOptions.update}>update</Button>
            <Button onClick={watchOptions.unWatch} disabled={!watchOptions.isWatching}>unWatch</Button>
            <Button onClick={watchOptions.reWatch} disabled={watchOptions.isWatching}>reWatch</Button>
          </Flex>
        </Spin>
      </Skeleton>
    }</AwaitWatch>
  );
}

async function request(count) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return "hello world" + count;
}
```

> ***特例***  
> `useAwaitWatchObject` 和 `AwaitWatchObject` ***依赖是对象***  
> `useAwaitWatchArray` 和 `AwaitWatchArray` ***依赖是数组***

### AwaitList

> 类似于 `SuspenseList` 效果，子元素有多个 `Awiat` 组件，控制展示

***? 表示可选属性***

| `props`  |                     `type`                      | `description`                                  |
|:---------|:-----------------------------------------------:|:-----------------------------------------------|
| order?   | "forwards" &#124; "backwards" &#124; "together" | 从前到后 &#124; 从后到前 &#124; 一起完成                   |
| tail?    |                   "collapsed"                   | order 为 forwards 或 backwards 时有效，同时只展示一个 Await |
| gap?     |                     number                      | 每个 Await 间隔                                    |
| children |                 ReactElement[]                  | 子元素                                            |

***示例***

```jsx
import {Await, AwaitList, isPending} from "react-await-util";
import {Skeleton, Spin, Flex} from "antd";

function Foo() {
  const resolve1 = new Promise(resolve => setTimeout(resolve, 3000, "hello"));
  const resolve2 = new Promise(resolve => setTimeout(resolve, 2000, "hi"));
  const resolve3 = new Promise(resolve => setTimeout(resolve, 1000, "你好"));

  return (
    <Flex vertical gap="middle">
      <AwaitList order="forwards" tail="collapsed">
        <Await resolve={resolve1}>{({first, status, value}) =>
          <Skeleton loading={first}>
            <Spin spinning={isPending(status)}>
              <h1>{value}</h1>
            </Spin>
          </Skeleton>
        }</Await>
        <hr/>
        <Await resolve={resolve2}>{({first, status, value}) =>
          <Skeleton loading={first}>
            <Spin spinning={isPending(status)}>
              <h1>{value}</h1>
            </Spin>
          </Skeleton>
        }</Await>
        <hr/>
        <Await resolve={resolve3}>{({first, status, value}) =>
          <Skeleton loading={first}>
            <Spin spinning={isPending(status)}>
              <h1>{value}</h1>
            </Spin>
          </Skeleton>
        }</Await>
      </AwaitList>
    </Flex>
  );
}
```

### AwaitView

> 使用 `IntersectionObserver` api 实现，占位元素出现在视口中，在渲染结果，可以用于首屏优化

> ***注意：*** `AwaitView` 子元素必须是 `Await`，并且 `jumpFirst` 不能为 `true`

***? 表示可选属性***

| `props`         |                     `type`                     | `description`       |
|:----------------|:----------------------------------------------:|:--------------------|
| root?           | RefObject<Element &#124; Document &#124; null> | root 元素             |
| rootIsParent?   |                    boolean                     | root 元素是否为父元素       |
| rootMargin?     |                     string                     | 和 root 元素距离         |
| threshold?      |                     number                     | 相交比例                |
| onIntersection? | (entry: IntersectionObserverEntry) => boolean  | 相交处理函数，返回 true 渲染结果 |
| children        |                  ReactElement                  | 子元素                 |

***示例***

```jsx
import {Await, AwaitView} from "react-await-util";
import {Skeleton, Flex} from "antd";

function Foo() {
  const resolve = Promise.resolve("hello world");

  return (
    <>
      <div style={{height: "120vh"}}></div>
      <AwaitView threshold={1}>
        <Await resolve={resolve}>{({first, value, placeholder}) =>
          <Flex ref={placeholder} justify="center" align="center" style={{height: 300, border: "1px solid"}}>
            <Skeleton loading={first}>
              <h1>{value}</h1>
            </Skeleton>
          </Flex>
        }</Await>
      </AwaitView>
    </>
  );
}
```

### AwaitStateView

> 同 `AwaitView` 组件

> ***注意：*** `AwaitStateView` 子元素必须是 `AwaitState` 或 `AwaitReducer`，并且 `jumpFirst` 不能为 `true`

***示例***

```jsx
import {useState} from "react";
import {isPending, Action, AwaitState, AwaitStateView} from "react-await-util";
import {Skeleton, Button, Flex, Spin} from "antd";

function Foo() {
  return (
    <>
      <div style={{height: "120vh"}}></div>
      <Action useAction={useCountAction}>{({count, add, handle}) =>
        <AwaitStateView threshold={1}>
          <AwaitState deps={count} handle={handle}>{({first, status, value, setResolve, placeholder}) =>
            <div ref={placeholder} style={{height: 300}}>
              <Skeleton loading={first}>
                <Spin spinning={isPending(status)}>
                  <Flex vertical justify="center" align="center" gap="middle">
                    <h1>{count} - {value}</h1>
                    <Button onClick={add}>add</Button>
                    <Button.Group>
                      <Button onClick={() => setResolve("update1")}>update1</Button>
                      <Button onClick={setResolve}>event</Button>
                    </Button.Group>
                  </Flex>
                </Spin>
              </Skeleton>
            </div>
          }</AwaitState>
        </AwaitStateView>
      }</Action>
    </>
  );
}

function useCountAction() {
  const [count, setCount] = useState(0);

  function add() {
    setCount(count + 1);
  }

  async function handle(count, arg) {
    console.log("handle", count, arg);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "hello" + count;
  }

  return {
    count,
    add,
    handle,
  };
}
```

### AwaitWatchView

> 同 `AwaitView` 组件

> ***注意：*** `AwaitWatchView` 子元素必须是 `AwaitWatch` 或 `AwaitWatchObject` 或 `AwaitWatchArray`，并且 `jumpFirst`
> 不能为 `true`

***示例***

```jsx
import {useState} from "react";
import {isPending, Action, AwaitWatchView, AwaitWatch} from "react-await-util";
import {Skeleton, Button, Flex, Spin} from "antd";

function Foo() {
  return (
    <>
      <div style={{height: "120vh"}}></div>
      <Action useAction={useCountAction}>{({count, add, handle}) =>
        <AwaitWatchView threshold={1}>
          <AwaitWatch deps={count} handle={handle}>{({first, status, value, watchOptions, placeholder}) =>
            <div ref={placeholder} style={{height: 300}}>
              <Skeleton loading={first}>
                <Spin spinning={isPending(status)}>
                  <Flex vertical justify="center" align="center" gap="middle">
                    <h1>{count} - {value}</h1>
                    <Button onClick={add}>add</Button>
                    <Button.Group>
                      <Button onClick={watchOptions.update}>update</Button>
                      <Button onClick={watchOptions.unWatch} disabled={!watchOptions.isWatching}>unWatch</Button>
                      <Button onClick={watchOptions.reWatch} disabled={watchOptions.isWatching}>reWatch</Button>
                    </Button.Group>
                  </Flex>
                </Spin>
              </Skeleton>
            </div>
          }</AwaitWatch>
        </AwaitWatchView>
      }</Action>
    </>
  );
}

function useCountAction() {
  const [count, setCount] = useState(0);

  function add() {
    setCount(count + 1);
  }

  async function handle(count) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "hello" + count;
  }

  return {
    count,
    add,
    handle,
  };
}
```

### Async

> 包装异步组件，被包装的组件可以写成 `async` 函数形式

***? 表示可选属性***

| `props`     |                          `type`                          | `description`                  |
|:------------|:--------------------------------------------------------:|:-------------------------------|
| wrap        |                       ReactElement                       | 要包装的组件元素                       |
| compare?    | ((newProps: any, oldProps: any) => boolean) &#124; false | 对比函数，默认 wrap 的 props           |
| init?       |                           any                            | 初始值                            |
| delay?      |                          number                          | 延迟，默认 300 ms，Promise 完成快屏幕会闪烁  |
| jumpFirst?  |                         boolean                          | 跳过首次请求，一般和 init 配合             |
| onStart?    |                 (first: boolean) => void                 | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?      |                   (value: any) => void                   | promise 正确结束时执行 then           |
| onError?    |                   (error: any) => void                   | promise 报错时执行 catch            |
| onFinal?    |                 (first: boolean) => void                 | promise 结束时执行 finally          |
| onComputed? |                        OnComputed                        | 对结果先处理                         |
| children    |                        ChildrenFn                        | 子元素是函数，给 Promise 提供一个抽象的结果     |

***示例***

```jsx
import {useState} from "react";
import {Async, isPending} from "react-await-util";
import {Skeleton, Flex, Spin, Button, Typography} from "antd";

function Foo() {
  const [count, setCount] = useState(0);
  const add = () => {
    setCount(count + 1);
  };

  return (
    <Async wrap={<Bar count={count}/>}>{({first, status, value}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <Flex justify="center" align="center" vertical gap="middle" style={{height: 200}}>
            <Button onClick={add}>add</Button>
            {value}
          </Flex>
        </Spin>
      </Skeleton>
    }</Async>
  );
}

async function Bar({count}) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return (
    <Typography.Text underline style={{fontSize: "2em"}}>{count}</Typography.Text>
  );
}
```

> `Async` 会对比 `wrap` 属性的 props，当 `wrap` 有子元素时，对比会失效，可以提供 `compare` 自定义对比  
> 推荐使用 插槽组件

***示例***

```jsx
import {useState} from "react";
import {Async, Host, Tmpl, Slotted, isPending} from "react-await-util";
import {Skeleton, Spin, Flex, Button} from "antd";

function Foo() {
  const [count, setCount] = useState(0);
  const add = () => {
    setCount(count + 1);
  };

  return (
    <Async wrap={<Bar count={count}/>}>{({first, status, value, watchOptions}) =>
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <Flex justify="center" align="center" vertical gap="middle">
            <Button onClick={add}>add</Button>
            <Host>
              {value}
              <Tmpl>
                <h1>count - {count}</h1>
              </Tmpl>
              <Tmpl name="item">
                <Flex justify="center" align="center" gap="middle">
                  <Button onClick={watchOptions.update} disabled={!watchOptions.isWatching}>update</Button>
                  <Button onClick={watchOptions.unWatch} disabled={!watchOptions.isWatching}>unWatch</Button>
                  <Button onClick={watchOptions.reWatch} disabled={watchOptions.isWatching}>reWatch</Button>
                </Flex>
              </Tmpl>
            </Host>
          </Flex>
        </Spin>
      </Skeleton>
    }</Async>
  );
}

async function Bar({count}) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return (
    <>
      <h1>hello - {count}</h1>
      <Slotted/>
      <Slotted name="item"/>
    </>
  );
}
```

### AsyncView

> 同 `AwaitView` 组件

> ***注意：*** `AsyncView` 子元素必须是 `Async`，并且 `jumpFirst` 不能为 `true`

***示例***

```jsx
import {Async, AsyncView} from "react-await-util";
import {Skeleton, Flex} from "antd";

function Foo() {
  return (
    <>
      <div style={{height: "120vh"}}></div>
      <AsyncView threshold={1}>
        <Async wrap={<Bar/>}>{({first, value, placeholder}) =>
          <Flex ref={placeholder} justify="center" align="center" style={{height: 300}}>
            <Skeleton loading={first}>
              {value}
            </Skeleton>
          </Flex>
        }</Async>
      </AsyncView>
    </>
  );
}

async function Bar() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  return (
    <h1>hello</h1>
  );
}
```

### defineAsyncComponent

> 定义异步组件

***? 表示可选属性***

| `options`   |                                          `type`                                          | `description`                  |
|:------------|:----------------------------------------------------------------------------------------:|:-------------------------------|
| name?       |                                          string                                          | 组件名                            |
| init?       |                                   (props: any) => any                                    | 初始化值                           |
| compare?    | ((newProps: any, oldProps: any, newAction: any, oldAction: any) => boolean) &#124; false | 对比函数，默认只对比 props               |
| delay?      |                                          number                                          | 延迟，防止闪烁                        |
| jumpFirst?  |                                         boolean                                          | 跳过首次请求                         |
| onStart?    |                                 (first: boolean) => void                                 | Promise 开始时执行，first 表示是否是第一次执行 |
| onEnd?      |                                   (value: any) => void                                   | promise 正确结束时执行 then           |
| onError?    |                                   (error: any) => void                                   | promise 报错时执行 catch            |
| onFinal?    |                                 (first: boolean) => void                                 | promise 结束时执行 finally          |
| onComputed? |                                        OnComputed                                        | 对结果先处理                         |
| useAction?  |                     (props: any, watchOptions: WatchOptions) => any                      | 组件的状态和行为 (hook)                |
| loader      |                           (props: any, action: any) => Promise                           | loader，生成 Promise              |
| Component   |                               (props: any) => ReactElement                               | 组件                             |

> 需要和 `useAsyncValue` 这个 `hook` 配合使用

```ts
interface UseAsyncValue {
  first: boolean;
  status: typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;
  value: any;
  error: any;
  computed: any;
  action: any;
  watchOptions: WatchOptions;
}
```

***示例***

```jsx
import {defineAsyncComponent, isPending, useAsyncValue} from "react-await-util";
import {Skeleton, Spin, Flex, Button} from "antd";
import {useState} from 'react'

function Foo() {
  const [count, setCount] = useState(0);
  const add = () => {
    setCount(count + 1);
  };

  return (
    <>
      <Flex justify="center" align="center">
        <Button onClick={add}>add</Button>
      </Flex>
      <Bar count={count}/>
    </>
  );
}

// Bar 组件依赖 count，count 发生变化，重新调用 loader 生成 promise
const Bar = defineAsyncComponent({
  name: "Bar",
  loader: async ({count}) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return "hello" + count;
  },
  Component: ({count}) => {
    const {first, status, value, watchOptions} = useAsyncValue();
    return (
      <Skeleton loading={first}>
        <Spin spinning={isPending(status)}>
          <Flex justify="center" align="center" vertical gap="middle" style={{height: 200}}>
            <h1>{value}</h1>
            <Flex justify="center" gap="middle">
              <Button onClick={watchOptions.update}>update</Button>
              <Button onClick={watchOptions.unWatch} disabled={!watchOptions.isWatching}>unWatch</Button>
              <Button onClick={watchOptions.reWatch} disabled={watchOptions.isWatching}>reWatch</Button>
            </Flex>
          </Flex>
        </Spin>
      </Skeleton>
    );
  },
});
```

### Action

> 将状态和操作封装，仅供子元素使用

***示例***

```jsx
import {useState, useMemo} from "react";
import {Action} from "react-await-util";
import {Flex, Button} from "antd";

function Foo() {
  return (
    <Action useAction={useCountAction}>{({count, add}) =>
      <Flex justify="center" align="center" vertical gap="middle">
        <h1>{count}</h1>
        <Button onClick={add}>add</Button>
        <Action options={{count}} useAction={useCalcCountAction}>{({calcCount}) =>
          <h1>{calcCount}</h1>
        }</Action>
      </Flex>
    }</Action>
  );
}

function useCountAction() {
  const [count, setCount] = useState(0);

  function add() {
    setCount(count + 1);
  }

  return {
    count,
    add,
  };
}

function useCalcCountAction({count}) {
  const calcCount = useMemo(() => count + 100, [count]);

  return {
    calcCount,
  };
}
```

### 插槽组件

> 提供类似于 `vue` 插槽思想的组件  
> `Host` 宿主  
> `Tmpl` 模板  
> `Slotted` 占位  
> ***`Host` 只渲染第一个子元素，第一个元素不能是 `Tmpl`，其他元素都是 `Tmpl` 组件***  
> `Tmpl` 和 `Slotted` 的 `name` 一一对应，默认是 `default`

***示例***

```jsx
import {Host, Tmpl, Slotted} from "react-await-util";

function Foo() {
  return (
    <Host>
      <div>
        <Slotted/>
        <Slotted name="item" value="hi"/>
      </div>
      <Tmpl>
        <h1>hello</h1>
      </Tmpl>
      <Tmpl name="item">{({value}) =>
        <h1>{value}</h1>
      }</Tmpl>
    </Host>
  );
}
```

> `Tmpl` 中的 `Slotted`，和***上一层*** `Host` 的 `Tmpl` 对应

***示例***

```jsx
import {Host, Tmpl, Slotted} from "react-await-util";

function Foo() {
  return (
    <Host>
      <Host>
        <Host>
          <div>
            <h1>start</h1>
            <Slotted/>
            <h1>end</h1>
          </div>
          <Tmpl>
            <Slotted/>
            <h1>3</h1>
          </Tmpl>
        </Host>
        <Tmpl>
          <Slotted/>
          <h1>2</h1>
        </Tmpl>
      </Host>
      <Tmpl>
        <h1>1</h1>
      </Tmpl>
    </Host>
  );
}
```

## EOF