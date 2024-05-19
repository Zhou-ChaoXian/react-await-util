import type {
  ReactElement,
  RefObject,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from "react";

export type Status = "pending" | "resolve" | "reject";

export interface ResolveData<T> {
  first: boolean;
  status: Status;
  value: T;
  error: any;
  placeholder?: RefObject<any>;
}

export interface AsyncResolveData {
  first?: boolean;
  status?: Status;
  element: ReactElement;
  error?: any;
  placeholder?: RefObject<any>;
  watchOptions?: WatchOptions;
}

export type UseAsyncValue<T> = Omit<ResolveData<T>, "placeholder"> & { watchOptions: WatchOptions; };

export interface AwaitProps<T> {
  resolve?: Promise<T>;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  placeholder?: RefObject<any>;
  children: (resolveData: ResolveData<T>) => ReactElement;
}

export interface AwaitListProps {
  order?: "forwards" | "backwards" | "together";
  tail?: "collapsed";
  gap?: number;
  children: ReactElement | ReactElement[];
}

export interface AwaitViewProps {
  root?: RefObject<Element | Document | null>;
  rootIsParent?: boolean;
  rootMargin?: string;
  threshold?: number;
  onIntersection?: (entry: IntersectionObserverEntry) => boolean;
  children: ReactElement;
}

export type AsyncViewProps = AwaitViewProps;

export interface AsyncProps {
  element: ReactElement;
  init?: ReactElement;
  compare?: (newProps: Record<string, any>, oldProps: Record<string, any>) => boolean;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  placeholder?: RefObject<any>;
  children: (asyncResolveData: AsyncResolveData) => ReactElement;
}

export interface WatchOptions {
  update: () => void;
  unWatch: () => void;
  reWatch: () => void;
}

export interface AsyncComponentOptions<T, P> {
  name?: string;
  init?: (props: P) => T;
  compare?: (newProps: P, oldProps: P) => boolean;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  loader: (props: P, watchOptions: WatchOptions) => Promise<T>;
  Component: (props: P) => ReactElement;
}

export interface ActionProps<S, O> {
  useAction: (options?: O) => S;
  options?: O;
  children: ((state: S) => ReactElement) | ReactElement;
}

export type AwaitWatchResolve<T> = Omit<ResolveData<T>, "placeholder"> & { watchOptions: WatchOptions; };

export interface AwaitWatchProps<T, Dep> {
  dep: Dep;
  handle: (newDep?: Dep, oldDep?: Dep) => Promise<T>;
  compare?: (newDep: Dep, oldDep: Dep) => boolean;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  children: (resolveData: AwaitWatchResolve<T>) => ReactElement;
}

export type AwaitWatchArrayProps<T> = Omit<AwaitWatchProps<T, any[]>, "compare">;

export type AwaitWatchObjectProps<T> = Omit<AwaitWatchProps<T, Record<string, any>>, "compare">;

export declare function Await<T>(props: AwaitProps<T>): ReactElement;

export declare function AwaitList(props: AwaitListProps): ReactElement;

export declare function AwaitView(props: AwaitViewProps): ReactElement;

export declare function Async(props: AsyncProps): ReactElement;

export declare function AsyncView(props: AsyncViewProps): ReactElement;

export declare function isPending(status: Status): boolean;

export declare function isResolve(status: Status): boolean;

export declare function isReject(status: Status): boolean;

export declare function defineAsyncComponent<T = any, Props = Record<string, any>>(options: AsyncComponentOptions<T, Props>): ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<WatchOptions>>;

export declare function useAsyncValue<T>(): UseAsyncValue<T>;

export declare function Action<S, O = any>(props: ActionProps<S, O>): ReactElement;

export declare function useActionValue<S>(): S;

export declare function AwaitWatch<T, Deps = any>(props: AwaitWatchProps<T, Deps>): ReactElement;

export declare function AwaitWatchArray<T>(props: AwaitWatchArrayProps<T>): ReactElement;

export declare function AwaitWatchObject<T>(props: AwaitWatchObjectProps<T>): ReactElement;