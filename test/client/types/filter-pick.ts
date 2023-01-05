import { FilterString } from './filter-string';

export type FilterPick<T extends object, U extends string[]> = {
    [P in Extract<keyof T, string> as FilterString<P, U, P>]: T[P];
};
