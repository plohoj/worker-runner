// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BanProperties<T, L extends Record<PropertyKey, any>> = {
    [P in keyof T]: P extends keyof L
        ? Exclude<T[P], L[P]>
        : T[P];
};
