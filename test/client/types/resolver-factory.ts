import { RunnerIdentifierConfigList, RunnerResolverClientBase } from "@worker-runner/core";

export type ResolverFactory<
    RunnerList extends RunnerIdentifierConfigList = RunnerIdentifierConfigList,
    Resolver extends RunnerResolverClientBase<RunnerList> = RunnerResolverClientBase<RunnerList>
> = (runners?: RunnerList) => Resolver;
