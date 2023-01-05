import { IPlugin, IRunnerResolverClientBaseConfig, RunnerDefinitionCollection, RunnerIdentifierConfigList, RunnerResolverClientBase, RunnerResolverHostBase } from "@worker-runner/core";

export interface IApartRunnerResolversManager<
    C extends RunnerResolverClientBase<RunnerIdentifierConfigList>,
    H extends RunnerResolverHostBase<RunnerIdentifierConfigList>,
> {
    client: C;
    host: H;
    run(): Promise<void>;
    destroy(): Promise<void>;
}

export interface IApartResolverFactoryConfig<
    CL extends RunnerIdentifierConfigList,
    HL extends RunnerIdentifierConfigList,
> {
    clientConfig?: Omit<IRunnerResolverClientBaseConfig<CL>, 'connection'>,
    hostConfig: {
        plugins?: IPlugin[];
    } & ({
        runners: HL
    } | {
        runnerDefinitionCollection: RunnerDefinitionCollection<HL>
    }),
}

export type ApartResolverFactory<
    CL extends RunnerIdentifierConfigList = RunnerIdentifierConfigList,
    HL extends RunnerIdentifierConfigList = RunnerIdentifierConfigList,
    C extends RunnerResolverClientBase<CL> = RunnerResolverClientBase<CL>,
    H extends RunnerResolverHostBase<HL> = RunnerResolverHostBase<HL>,
> = (config: IApartResolverFactoryConfig<CL, HL>) => IApartRunnerResolversManager<C, H>;
