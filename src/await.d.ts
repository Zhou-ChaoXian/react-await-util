import type {
  ReactElement,
  RefObject,
  ForwardRefExoticComponent,
  PropsWithoutRef,
  RefAttributes,
} from "react";

export type Status = "pending" | "resolve" | "reject";

export interface ResolveData<T> {
  first?: boolean;
  status?: Status;
  value: T;
  error?: any;
  placeholder?: RefObject<any>;
}

export interface AsyncResolveData<U> {
  first?: boolean;
  status?: Status;
  element: ReactElement;
  error?: any;
  placeholder?: RefObject<any>;
  watchOptions?: WatchOptions;
  useValue?: U;
}

export type UseAsyncValue<T, U> = Omit<Required<ResolveData<T> & { watchOptions: WatchOptions; useValue: U; }>, "placeholder">;

export interface AwaitProps<T> {
  resolve: Promise<T>;
  init?: T;
  delay?: number;
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
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  placeholder?: RefObject<any>;
  use?: (watchOptions: WatchOptions) => any;
  children: (asyncResolveData: AsyncResolveData<any>) => ReactElement;
}

export interface WatchOptions {
  update: () => void;
  unWatch: () => void;
  reWatch: () => void;
}

export interface AsyncComponentOptions<T, P, U> {
  name?: string;
  init?: (props: P) => T;
  compare?: (newProps: P, oldProps: P) => boolean;
  delay?: number;
  onStart?: (first: boolean) => void;
  onEnd?: (first: boolean) => void;
  onError?: (error: any) => void;
  loader: (props: P, watchOptions: WatchOptions, useValue: U) => Promise<T>;
  Component: (props: P) => ReactElement;
  use?: (props: P, watchOptions: WatchOptions) => U;
}

export declare function Await<T>(props: AwaitProps<T>): ReactElement;

export declare function AwaitList(props: AwaitListProps): ReactElement;

export declare function AwaitView(props: AwaitViewProps): ReactElement;

export declare const Async: ForwardRefExoticComponent<PropsWithoutRef<AsyncProps> & RefAttributes<WatchOptions>>;

export declare function AsyncView(props: AsyncViewProps): ReactElement;

export declare function isPending(status: Status): boolean;

export declare function isResolve(status: Status): boolean;

export declare function isReject(status: Status): boolean;

export declare function defineAsyncComponent<T = any, Props = Record<string, any>, U = undefined>(options: AsyncComponentOptions<T, Props, U>): ForwardRefExoticComponent<PropsWithoutRef<Props> & RefAttributes<WatchOptions>>;

export declare function useAsyncValue<T, U = undefined>(): UseAsyncValue<T, U>;