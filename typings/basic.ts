declare type FunctionNamesOf<T> = keyof FunctionsOf<T>;

declare type FunctionsOf<T> = {
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
