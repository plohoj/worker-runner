import { allRunnerResolversFactories } from '../resolver-list';
import { FilterString } from '../types/filter-string';
import { ResolverFactory } from "../types/resolver-factory";
import { RunnerResolverNamePart } from '../types/runner-resolver-name';

type FilterPick<T extends object, U extends string[]> = {
    [P in Extract<keyof T, string> as FilterString<P, U, P>]: T[P];
};

type AllRunnerResolversAsPromiseFactories<T = typeof allRunnerResolversFactories> = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [P in keyof T]: P extends `Rx#${infer O}`
        ? never
        : T[P];
}

type FilteredResolverFactories<Filters extends string[]>
    = Filters extends (infer ArrayType)[]
        ? 'Rx' extends ArrayType
            ? FilterPick<typeof allRunnerResolversFactories, Filters>
            : FilterPick<AllRunnerResolversAsPromiseFactories, Filters>
        : never;

export function pickResolverFactories<T extends RunnerResolverNamePart[]>(
    ...filter: T
): FilteredResolverFactories<T> {
    const resolverFactories = {} as Record<RunnerResolverNamePart, ResolverFactory>;
    for (const [key, factory] of Object.entries(allRunnerResolversFactories)) {
        const isIncluded = filter.every(namePart => key.includes(namePart));
        if (isIncluded) {
            resolverFactories[key as RunnerResolverNamePart] = factory;
        }
    }
    return resolverFactories as unknown as FilteredResolverFactories<T>;
}
