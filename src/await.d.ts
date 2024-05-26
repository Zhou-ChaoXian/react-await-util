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
  placeholder?: RefObject<Element>;
}

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
  children: ReactElement[];
}

export interface AwaitViewProps {
  root?: RefObject<Element | Document | null>;
  rootIsParent?: boolean;
  rootMargin?: string;
  threshold?: number;
  onIntersection?: (entry: IntersectionObserverEntry) => boolean;
  children: ReactElement<AwaitProps<any>, typeof Await>;
}

export interface AwaitWatchProps<T, Dep> {
  dep?: Dep;
  handle: (newDep?: Dep, oldDep?: Dep) => Promise<T>;
  compare?: (newDep: Dep, oldDep: Dep) => boolean;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  children: (resolveData: Omit<ResolveData<T>, "placeholder"> & { watchOptions: WatchOptions; }) => ReactElement;
}

export type AwaitWatchArrayProps<T, Dep = any[]> = Omit<AwaitWatchProps<T, Dep>, "compare">;

export type AwaitWatchObjectProps<T, Dep = Record<string, any>> = Omit<AwaitWatchProps<T, Dep>, "compare">;

export interface AsyncResolveData<P> {
  first: boolean;
  status: Status;
  element: ReactElement<P>;
  error: any;
  placeholder?: RefObject<Element>;
  watchOptions: WatchOptions;
}

export interface AsyncProps<P = Record<string, any>> {
  element: ReactElement<P>;
  init?: ReactElement;
  compare?: (newProps: P, oldProps: P) => boolean;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  placeholder?: RefObject<any>;
  children: (resolveData: AsyncResolveData<P>) => ReactElement;
}

export interface WatchOptions {
  update: () => void;
  unWatch: () => void;
  reWatch: () => void;
}

export interface AsyncComponentOptions<T, P = Record<string, any>> {
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

export interface ActionProps<S, O = any> {
  useAction: (options?: O) => S;
  options?: O;
  children: (state: S) => ReactElement;
}

export declare function Await<T>(props: AwaitProps<T>): ReactElement;

export declare function AwaitList(props: AwaitListProps): ReactElement;

export declare function AwaitView(props: AwaitViewProps): ReactElement;

export declare function AwaitWatch<T, Dep = any>(props: AwaitWatchProps<T, Dep>): ReactElement;

export declare function AwaitWatchArray<T, Dep = any[]>(props: AwaitWatchArrayProps<T, Dep>): ReactElement;

export declare function AwaitWatchObject<T, Dep = Record<string, any>>(props: AwaitWatchObjectProps<T, Dep>): ReactElement;

export declare function Async<P = Record<string, any>>(props: AsyncProps<P>): ReactElement;

export declare function AsyncView(props: AwaitViewProps): ReactElement;

export declare function defineAsyncComponent<T = any, Props = Record<string, any>>(options: AsyncComponentOptions<T, Props>): ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<WatchOptions>>;

export declare function useAsyncValue<T>(): Omit<ResolveData<T>, "placeholder"> & { watchOptions: WatchOptions; };

export declare function Action<S, O = any>(props: ActionProps<S, O>): ReactElement;

export declare function isPending(status: Status): boolean;

export declare function isResolve(status: Status): boolean;

export declare function isReject(status: Status): boolean;