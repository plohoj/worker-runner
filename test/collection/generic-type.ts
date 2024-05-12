/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { IRunnerIdentifierConfig, PortalConnectionClient, ResolvedRunner, RunnerIdentifier } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverLocal } from "@worker-runner/promise";

// Type check:
() => {
    const connectionStub = new PortalConnectionClient({
        connectionChannel: undefined as never,
        connectionStrategy: undefined as never,
    })
    class Runner1 { declare method1: () => void; declare method12: () => void }
    class Runner2 { declare method2: () => void; declare method12: () => void }
    class Runner3 { declare method3: () => void; }

    // simple token
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        // There is no Runner in the Runner list for which a token is specified.
        // No token matches were found.
        // Therefore, all Runners for which no token is specified, i.e. Runner1 or Runner2, will be returned.
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        // TypeScript converts the token "Runner1" to a string.
        // Searching by token is not possible with typing, but is possible for code.
        // Since typing will not find a Runner with the same token,
        // all Runners for which no token is specified, i.e. Runner1 or Runner2, will be returned.
        // But in reality, when the code is executed, Runner1 will be returned. 
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2', runner: Runner2},
        // There is no Runner with the token "Runner1" in the list of Runners.
        // No matches by token were found.
        // Therefore, all Runners for which no token is specified, i.e. Runner1 or Runner2, will be returned.
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            {token: 'Runner2', runner: Runner2},
        // TypeScript converts the token "Runner1" and "Runner2" to a string.
        // Searching by token is not possible with typing, but is possible for code.
        // Since typing will not find a Runner with the same token,
        // it will return all Runners for which no token is specified, i.e. Runner1 or Runner2.
        // But in reality, when the code is executed, Runner1 will be returned. 
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check3.method1();
        // @ts-expect-error
        check3.method2();
        check3.method12();
    }

    // literally token
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        // There is no Runner in the Runner list for which a token is specified.
        // No token matches were found.
        // Therefore, all Runners for which no token is specified, i.e. Runner1 or Runner2, will be returned.
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            Runner2,
        // For Runner1, the token "Runner1" is specified in the configuration.
        // Therefore Runner1 will be found and returned by the token
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1>;
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2' as const, runner: Runner2}
        // There is no Runner with the token "Runner1" in the Runner list.
        // No matches by token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // Since a token is specified for Runner2, it is excluded from the result and only Runner1 will be returned
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1>;
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            {token: 'Runner2' as const, runner: Runner2}
        // For Runner1, the token "Runner1" is specified in the configuration.
        // Therefore Runner1 will be found and returned by the token
        ]}).resolve('Runner1') satisfies ResolvedRunner<Runner1>;
        check3.method1();
        // @ts-expect-error
        check3.method2();
        check3.method12();
    }

    // not exist literally token
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        // There is no Runner in the Runner list for which a token is specified.
        // No token matches were found.
        // Therefore, all Runners for which no token is specified, i.e. Runner1 or Runner2, will be returned.
        ]}).resolve('Runner3') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        // There is no Runner with the token "Runner3" in the list of Runners.
        // No matches for the token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // TypeScript converts the token "Runner1" to a string.
        // Therefore, for typing purposes, Runner1 will be treated as a Runner for which no token is specified.
        // All Runners for which no token is specified will be returned, i.e. Runner1 or Runner2
        ]}).resolve('Runner3') satisfies ResolvedRunner<Runner1 | Runner2>;
        // @ts-expect-error
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            Runner2,
        // There is no Runner with the token "Runner3" in the list of Runners.
        // No matches for the token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // Since a token is specified for Runner1, it is excluded from the result and only Runner2 will be returned
        ]}).resolve('Runner3') satisfies ResolvedRunner<Runner2>;
        // @ts-expect-error
        check2.method1();
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2' as const, runner: Runner2}
        // There is no Runner with the token "Runner3" in the list of Runners.
        // No matches for the token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // Since a token is specified for Runner2, it is excluded from the result and only Runner1 will be returned
        ]}).resolve('Runner3') satisfies ResolvedRunner<Runner1>;
        check3.method1();
        // @ts-expect-error
        check3.method2();
        check3.method12();

        const check4 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            {token: 'Runner2' as const, runner: Runner2}
        // There is no Runner in the list of Runners for which the token is listed.
        // No matches by token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // Since Runner1 and Runner2 have a token, they are excluded from the result and unknown will be returned.
        // In addition the resolve method accepts any arguments to the Runner constructor
        ]}).resolve('Runner3', 'fake:param') satisfies ResolvedRunner<unknown>;
        // @ts-expect-error
        check4.method1();
        // @ts-expect-error
        check4.method2();
        // @ts-expect-error
        check4.method12();
    }

    // runner instance from list
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner1) satisfies ResolvedRunner<Runner1>;
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        // Searching for an instance of Runner will return that Runner as a result, ignoring the specified token
        ]}).resolve(Runner1) satisfies ResolvedRunner<Runner1>;
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2', runner: Runner2},
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner1) satisfies ResolvedRunner<Runner1>;
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            {token: 'Runner2', runner: Runner2},
        // Searching for an instance of Runner will return that Runner as a result, ignoring the specified token
        ]}).resolve(Runner1) satisfies ResolvedRunner<Runner1>;
        check3.method1();
        // @ts-expect-error
        check3.method2();
        check3.method12();
    }

    // not exist runner instance
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner3) satisfies ResolvedRunner<Runner3>;
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        // @ts-expect-error
        check0.method12();
        check0.method3();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner3) satisfies ResolvedRunner<Runner3>;
        // @ts-expect-error
        check1.method1();
        // @ts-expect-error
        check1.method2();
        // @ts-expect-error
        check1.method12();
        check1.method3();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2', runner: Runner2},
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner3) satisfies ResolvedRunner<Runner3>;
        // @ts-expect-error
        check2.method1();
        // @ts-expect-error
        check2.method2();
        // @ts-expect-error
        check2.method12();
        check2.method3();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            {token: 'Runner2', runner: Runner2},
        // Searching for an instance of Runner will return that Runner as a result
        ]}).resolve(Runner3) satisfies ResolvedRunner<Runner3>;
        // @ts-expect-error
        check3.method1();
        // @ts-expect-error
        check3.method2();
        // @ts-expect-error
        check3.method12();
        check3.method3();
    }

    // soft token
    async () => {
        const check0 = await new RunnerResolverClient({
            connection: connectionStub,
            runners: [
                {token: 'Runner1'} as IRunnerIdentifierConfig<typeof Runner1>,
                Runner2,
            ]}
        // The configuration is similar to {token: string, runner: typeof Runner1}.
        // Searching for an instance of Runner will return that Runner as a result, ignoring the specified token
        ).resolve(Runner1) satisfies ResolvedRunner<Runner1>;
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverClient({
            connection: connectionStub,
            runners: [
                {token: 'Runner1'} as IRunnerIdentifierConfig<typeof Runner1, 'Runner1'>,
                Runner2,
            ]
        // For Runner1, the token "Runner1" is specified in the configuration.
        // Therefore Runner1 will be found and returned by the token
        }).resolve('Runner1') satisfies ResolvedRunner<Runner1>;
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();
    }

    // soft identifier
    async () => {
        const identifier = 'Runner1' as RunnerIdentifier<typeof Runner1>;
        const check0 = await new RunnerResolverClient({
            connection: connectionStub,
            runners: []
        // No configuration is specified for RunnerResolverClient,
        // but the identifier will be used as a token, in addition the identifier has information about the return type
        }).resolve(identifier) satisfies ResolvedRunner<Runner1>;
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverClient({
            connection: connectionStub,
            runners: [
                {token: 'Runner1'},
                Runner2,
            ],
        // There is no Runner with the token "Runner3" in the list of Runners.
        // No matches for the token were found.
        // Therefore, all Runners for which no token is specified will be returned.
        // The {token: 'Runner1'} configuration will be excluded from the output,
        // because it does not have a Runner type specified
        // Only Runner2 will be returned
        }).resolve('Runner3') satisfies ResolvedRunner<Runner2>;
        // @ts-expect-error
        check1.method1();
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverClient({
            connection: connectionStub,
            runners: [
                {token: 'Runner1' as const},
                Runner2,
            ],
        // There is a configuration here with the token 'Runner1', but the configuration does not specify a Runner type.
        // Because it is not known what to return, type unknown will be returned.
        // In addition the resolve method accepts any arguments to the Runner constructor
        }).resolve('Runner1', 'fake: args') satisfies ResolvedRunner<unknown>;
        // @ts-expect-error
        check2.method1();
        // @ts-expect-error
        check2.method2();
        // @ts-expect-error
        check2.method12();
    }

    // TODO generic test for Rx
}
