import type {
  ReactElement,
  RefObject,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from "react";

declare const pendingStatus: unique symbol;
declare const resolveStatus: unique symbol;
declare const rejectStatus: unique symbol;

export type Status = typeof pendingStatus | typeof resolveStatus | typeof rejectStatus;

export declare function isPending(status: Status): boolean;

export declare function isResolve(status: Status): boolean;

export declare function isReject(status: Status): boolean;

export interface ResolveData<T, E = any> {
  first: boolean;
  status: Status;
  value: T;
  error: E;
}

export interface WatchOptions {
  update: () => void;
  unWatch: () => void;
  reWatch: () => void;

  get isWatching(): boolean;
}

export interface AwaitOptions<T, E = any> {
  resolve?: Promise<T>;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
}

export declare function useAwait<T = any, E = any>(options: AwaitOptions<T, E>): ResolveData<T, E>;

export interface AwaitStatusOptions<T, Deps = any, Arg = any, E = any> {
  deps?: Deps;
  handle: (deps: Deps, arg?: Arg) => Promise<T>;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
}

export declare function useAwaitState<T = any, Deps = any, Arg = any, E = any>(options: AwaitStatusOptions<T, Deps, E>): [ResolveData<T, E>, (resolve?: Promise<T> | Arg) => void];

export type AwaitProps<T, U = any, E = any> = AwaitOptions<T, E> & {
  onComputed?: (resolveData: ResolveData<T, E>) => U;
  children: (data: ResolveData<T, E> & { computed: U; placeholder?: RefObject<any>; }) => ReactElement;
};

export declare function Await<T = any, U = any, E = any>(props: AwaitProps<T, U, E>): ReactElement;

export interface AwaitWatchOptions<T, Deps, E = any> {
  deps?: Deps;
  handle: (deps: Deps) => Promise<T>;
  compare?: ((newDeps: Deps, oldDeps: Deps) => boolean) | false;
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
}

export declare function useAwaitWatch<T = any, Deps = any, E = any>(options: AwaitWatchOptions<T, Deps, E>): [ResolveData<T, E>, WatchOptions];

export declare function useAwaitWatchObject<T = any, Deps extends Record<string, any> = Record<string, any>, E = any>(options: AwaitWatchOptions<T, Deps, E>): [ResolveData<T, E>, WatchOptions];

export declare function useAwaitWatchArray<T = any, Deps extends any[] = any[], E = any>(options: AwaitWatchOptions<T, Deps, E>): [ResolveData<T, E>, WatchOptions];

export type AwaitWatchProps<T, Deps, U = any, E = any> = AwaitWatchOptions<T, Deps, E> & {
  onComputed?: (resolveData: ResolveData<T, E>) => U;
  children: (data: ResolveData<T, E> & { computed: U; watchOptions: WatchOptions; }) => ReactElement;
};

export declare function AwaitWatch<T = any, Deps = any, U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export declare function AwaitWatchObject<T = any, Deps extends Record<string, any> = Record<string, any>, U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export declare function AwaitWatchArray<T = any, Deps extends any[] = any[], U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export interface AwaitListProps {
  order?: "forwards" | "backwards" | "together";
  tail?: "collapsed";
  gap?: number;
  children: ReactElement[];
}

export declare function AwaitList(props: AwaitListProps): ReactElement;

export interface AwaitViewProps {
  root?: RefObject<Element | Document | null>;
  rootIsParent?: boolean;
  rootMargin?: string;
  threshold?: number;
  onIntersection?: (entry: IntersectionObserverEntry) => boolean;
  children: ReactElement<AwaitProps<any>, typeof Await>;
}

export declare function AwaitView(props: AwaitViewProps): ReactElement;

export interface AsyncProps<P = Record<string, any>, U = any, E = any> {
  wrap: ReactElement;
  compare?: ((newProps: P, oldProps: P) => boolean) | false;
  init?: ReactElement;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
  onComputed?: (resolveData: ResolveData<ReactElement, E>) => U;
  children: (data: ResolveData<ReactElement, E> & { computed: U; watchOptions: WatchOptions; placeholder?: RefObject<any>; }) => ReactElement;
}

export declare function Async<P = Record<string, any>, U = any, E = any>(props: AsyncProps<P, U, E>): ReactElement;

export interface AsyncViewProps {
  root?: RefObject<Element | Document | null>;
  rootIsParent?: boolean;
  rootMargin?: string;
  threshold?: number;
  onIntersection?: (entry: IntersectionObserverEntry) => boolean;
  children: ReactElement<AsyncProps, typeof Async>;
}

export declare function AsyncView(props: AsyncViewProps): ReactElement;

export interface AsyncComponentOptions<P = Record<string, any>, T = any, A = any, U = any, E = any> {
  name?: string;
  init?: (props: P) => T;
  compare?: ((newProps: P, oldProps: P, newAction: A, oldAction: A) => boolean) | false;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
  onComputed?: (resolveData: ResolveData<T, E>) => U;
  useAction?: (props: P, watchOptions: WatchOptions) => A;
  loader: (props: P, action: A) => Promise<T>;
  Component: (props: P) => ReactElement;
}

export declare function defineAsyncComponent<Props = Record<string, any>, T = any, A = any, U = any, E = any>(options: AsyncComponentOptions<Props, T, A, U, E>): ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<WatchOptions>>;

export declare function useAsyncValue<T = any, A = any, U = any, E = any>(): (ResolveData<T, E> & { action: A; computed: U; watchOptions: WatchOptions; });

export interface ActionProps<A, O> {
  useAction: (options?: O) => A;
  options?: O;
  children: (action: A) => ReactElement;
}

export declare function Action<A = any, O = any>(props: ActionProps<A, O>): ReactElement;

export interface HostProps {
  children: ReactElement | ReactElement[];
}

export declare function Host(props: HostProps): ReactElement;

export interface TmplProps<P> {
  name?: string;
  children: ReactElement | ReactElement[] | ((props: P) => ReactElement);
}

export declare function Tmpl<P = Omit<Record<string, any>, "name" | "children">>(props: TmplProps<P>): ReactElement;

export interface SlottedProps {
  name?: string;
  children?: ReactElement | ReactElement[];

  [key: string]: any;
}

export declare function Slotted(props: SlottedProps): ReactElement;