type FilterFlags<T, C> = {
    [P in keyof T]: T[P] extends C ? P : never;
};

export type AllowedNames<T, C> = FilterFlags<T, C>[keyof T];
export type ClearNever<T> = Pick<T, Exclude<keyof T, AllowedNames<T, never>>>;
