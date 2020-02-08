export type ClearNever<T> = {
    [P in keyof T]: T[P] extends never ? never : T[P];
};
