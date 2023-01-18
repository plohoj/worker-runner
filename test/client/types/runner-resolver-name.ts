export type RunnerResolverPackageName = 'Promise' | 'Rx';
export type RunnerResolverConnectionSideName = 'Worker' | 'Iframe' | 'Local';
export type RunnerResolverConnectionStrategyName = 'MessageChannel' | 'Repeat';

export type RunnerResolverNamePart =
    | RunnerResolverPackageName
    | RunnerResolverConnectionSideName
    | RunnerResolverConnectionStrategyName;

export type RunnerResolverName<
    PackageName extends RunnerResolverPackageName = RunnerResolverPackageName,
    ConnectionSideName extends RunnerResolverConnectionSideName = RunnerResolverConnectionSideName,
    ConnectionStrategyName extends RunnerResolverConnectionStrategyName = RunnerResolverConnectionStrategyName,
> = `${PackageName}#${ConnectionSideName}#${ConnectionStrategyName}`;

export type RunnerApartResolverName = `${RunnerResolverPackageName}#Apart`;
