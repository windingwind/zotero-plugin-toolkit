export declare type FunctionNamesOf<T> = keyof FunctionsOf<T>;

export declare type FunctionsOf<T> = {
  // eslint-disable-next-line ts/no-unsafe-function-type
  [K in keyof T as T[K] extends Function ? K : never]: T[K];
};
