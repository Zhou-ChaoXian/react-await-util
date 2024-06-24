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

export interface BaseResolveData<T, E = any> {
  first: boolean;
  status: Status;
  value: T;
  error: E;
}

export type ResolveData<T, U = any, E = any> = BaseResolveData<T, E> & {
  computed: U;
  placeholder?: RefObject<any>;
};

interface BaseAwaitProps<T, U, E> {
  init?: T;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
  onComputed?: (resolveData: BaseResolveData<T, E>) => U;
}

export type AwaitProps<T, U = any, E = any> = BaseAwaitProps<T, U, E> & {
  resolve?: Promise<T>;
  children: (resolveData: ResolveData<T, U, E>) => ReactElement;
};

export type AwaitWatchProps<T, Deps, U = any, E = any> = BaseAwaitProps<T, U, E> & {
  deps?: Deps;
  handle: (newDeps?: Deps, oldDeps?: Deps) => Promise<T>;
  compare?: ((newDeps: Deps, oldDeps: Deps) => boolean) | false;
  children: (resolveData: Omit<ResolveData<T, U, E>, "placeholder"> & { watchOptions: WatchOptions; }) => ReactElement;
};

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

export type AsyncProps<P = Record<string, any>, U = any, E = any> = BaseAwaitProps<ReactElement, U, E> & {
  wrap: ReactElement;
  compare?: ((newProps: P, oldProps: P) => boolean) | false;
  children: (resolveData: ResolveData<ReactElement, U, E> & { watchOptions: WatchOptions; }) => ReactElement;
};

export interface WatchOptions {
  update: () => void;
  unWatch: () => void;
  reWatch: () => void;

  get isWatching(): boolean;
}

export interface AsyncComponentOptions<P = Record<string, any>, T = any, A = any, U = any, E = any> {
  name?: string;
  init?: (props: P, watchOptions: WatchOptions) => T;
  compare?: ((newProps: P, oldProps: P, newAction: A, oldAction: A) => boolean) | false;
  delay?: number;
  jumpFirst?: boolean;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: E) => void;
  onComputed?: (resolveData: BaseResolveData<T, E>) => U;
  useAction?: (props: P, watchOptions: WatchOptions) => A;
  loader: (props: P, options: { action: A; watchOptions: WatchOptions; }) => Promise<T>;
  Component: (props: P) => ReactElement;
}

export interface ActionProps<S, O> {
  useAction: (options?: O) => S;
  options?: O;
  children: (action: S) => ReactElement;
}

export interface HostProps {
  children: ReactElement | ReactElement[];
}

export interface TmplProps<P> {
  name?: string;
  children: ReactElement | ReactElement[] | ((props: P) => ReactElement);
}

export interface SlottedProps {
  name?: string;
  children?: ReactElement | ReactElement[];

  [key: string]: any;
}

export declare function Await<T = any, U = any, E = any>(props: AwaitProps<T, U, E>): ReactElement;

export declare function AwaitWatch<T = any, Deps = any, U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export declare function AwaitWatchArray<T = any, Deps = any[], U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export declare function AwaitWatchObject<T = any, Deps = Record<string, any>, U = any, E = any>(props: AwaitWatchProps<T, Deps, U, E>): ReactElement;

export declare function AwaitList(props: AwaitListProps): ReactElement;

export declare function AwaitView(props: AwaitViewProps): ReactElement;

export declare function Async<P = Record<string, any>, U = any, E = any>(props: AsyncProps<P, U, E>): ReactElement;

export declare function AsyncView(props: AwaitViewProps): ReactElement;

export declare function defineAsyncComponent<Props = Record<string, any>, T = any, A = any, U = any, E = any>(options: AsyncComponentOptions<Props, T, A, U, E>): ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<WatchOptions>>;

export declare function useAsyncValue<T = any, A = any, U = any, E = any>(): (Omit<ResolveData<T, U, E>, "placeholder"> & { action: A; watchOptions: WatchOptions; });

export declare function Action<S = any, O = any>(props: ActionProps<S, O>): ReactElement;

export declare function Host(props: HostProps): ReactElement;

export declare function Tmpl<P = Record<string, any>>(props: TmplProps<P>): ReactElement;

export declare function Slotted(props: SlottedProps): ReactElement;

export declare function isPending(status: Status): boolean;

export declare function isResolve(status: Status): boolean;

export declare function isReject(status: Status): boolean;