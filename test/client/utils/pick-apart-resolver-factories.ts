import { apartResolversFactories } from '../resolver-list';
import { ApartResolverFactory } from '../types/apart-resolver-factory';
import { FilterPick } from '../types/filter-pick';
import { RunnerApartResolverName, RunnerResolverPackageName } from '../types/runner-resolver-name';

type AllApartRunnerResolversAsPromiseFactories<T = typeof apartResolversFactories> = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    [P in keyof T]: P extends `Rx#${infer O}`
        ? never
        : T[P];
}

type FilteredApartResolverFactories<Filter extends RunnerResolverPackageName>
    = 'Rx' extends Filter
        ? FilterPick<typeof apartResolversFactories, [Filter]>
        : FilterPick<AllApartRunnerResolversAsPromiseFactories, [Filter]>
    ;

export function pickApartResolverFactories<T extends RunnerResolverPackageName = RunnerResolverPackageName>(
    filter?: T
): FilteredApartResolverFactories<T> {
    const resolverFactories = {} as Record<RunnerApartResolverName, ApartResolverFactory>;
    for (const [key, factory] of Object.entries(apartResolversFactories)) {
        const isIncluded = filter
            ? key.includes(filter)
            : true;
        if (isIncluded) {
            resolverFactories[key as RunnerApartResolverName] = factory;
        }
    }
    return resolverFactories satisfies Record<RunnerApartResolverName, ApartResolverFactory> as unknown as FilteredApartResolverFactories<T>;
}
