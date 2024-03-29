/* eslint-disable @typescript-eslint/ban-ts-comment */
import { IRunnerIdentifierConfig, RunnerIdentifier } from "@worker-runner/core";
import { RunnerResolverClient, RunnerResolverLocal } from "@worker-runner/promise";

// Type check:
() => {
    class Runner1 { declare method1: () => void; declare method12: () => void }
    class Runner2 { declare method2: () => void; declare method12: () => void }
    class Runner3 { declare method3: () => void; }

    // simple token
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        ]}).resolve('Runner1');
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        ]}).resolve('Runner1');
        // @ts-expect-error
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2', runner: Runner2},
        ]}).resolve('Runner1');
        // @ts-expect-error
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            {token: 'Runner2', runner: Runner2},
        ]}).resolve('Runner1');
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
        ]}).resolve('Runner1');
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            Runner2,
        ]}).resolve('Runner1');
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2' as const, runner: Runner2}
        ]}).resolve('Runner1');
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            {token: 'Runner2' as const, runner: Runner2}
        ]}).resolve('Runner1');
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
        ]}).resolve('Runner3');
        // @ts-expect-error
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            Runner2,
        ]}).resolve('Runner3');
        // @ts-expect-error
        check1.method1();
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2' as const, runner: Runner2}
        ]}).resolve('Runner3');
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1' as const, runner: Runner1},
            {token: 'Runner2' as const, runner: Runner2}
        ]}).resolve('Runner3');
        // @ts-expect-error
        check3.method1();
        // @ts-expect-error
        check3.method2();
        // @ts-expect-error
        check3.method12();
    }

    // runner from list
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        ]}).resolve(Runner1);
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            Runner2,
        ]}).resolve(Runner1);
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverLocal({runners: [
            Runner1,
            {token: 'Runner2', runner: Runner2},
        ]}).resolve(Runner1);
        check2.method1();
        // @ts-expect-error
        check2.method2();
        check2.method12();

        const check3 = await new RunnerResolverLocal({runners: [
            {token: 'Runner1', runner: Runner1},
            {token: 'Runner2', runner: Runner2},
        ]}).resolve(Runner1);
        check3.method1();
        // @ts-expect-error
        check3.method2();
        check3.method12();
    }

    // not exist runner
    async () => {
        const check0 = await new RunnerResolverLocal({runners: [
            Runner1,
            Runner2,
        ]}).resolve(Runner3);
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
        ]}).resolve(Runner3);
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
        ]}).resolve(Runner3);
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
        ]}).resolve(Runner3);
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
            connection: self,
            runners: [
                {token: 'Runner1'} as IRunnerIdentifierConfig<typeof Runner1>,
                Runner2,
            ]}
        ).resolve(Runner1);
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverClient({
            connection: self,
            runners: [
                {token: 'Runner1'} as IRunnerIdentifierConfig<typeof Runner1, 'Runner1'>,
                Runner2,
            ]
        }).resolve('Runner1');
        check1.method1();
        // @ts-expect-error
        check1.method2();
        check1.method12();
    }

    // soft identifier
    async () => {
        const identifier = 'Runner1' as RunnerIdentifier<typeof Runner1>;
        const check0 = await new RunnerResolverClient({
            connection: self,
            runners: []
        }).resolve(identifier);
        check0.method1();
        // @ts-expect-error
        check0.method2();
        check0.method12();

        const check1 = await new RunnerResolverClient({
            connection: self,
            runners: [
                {token: 'Runner1'},
                Runner2,
            ]
        }).resolve('Runner3');
        // @ts-expect-error
        check1.method1();
        check1.method2();
        check1.method12();

        const check2 = await new RunnerResolverClient({
            connection: self,
            runners: [
                {token: 'Runner1' as const},
                Runner2,
            ]
        }).resolve('Runner1');
        // @ts-expect-error
        check2.method1();
        // @ts-expect-error
        check2.method2();
        // @ts-expect-error
        check2.method12();
    }
}
