import { JsonLike, ResolvedRunner } from '@worker-runner/core';
import { RunnerResolverLocal } from '@worker-runner/promise';
import { RxResolvedRunner } from '@worker-runner/rx';
import { from, Observable, of, Subject, throwError, timer, lastValueFrom } from 'rxjs';
import { concatAll, delay as delayPipe, mergeMap, takeUntil } from 'rxjs/operators';
import { ExecutableStubRunner } from './executable-stub.runner';

export class RxStubRunner {
    private localResolver?: RunnerResolverLocal;
    private destroy$ = new Subject<void>();

    public run(): void {
        this.localResolver = new RunnerResolverLocal();
        this.localResolver.run();
    }

    public emitMessages(messages: string[], delay?: number): Observable<string> {
        if (delay) {
            return timer(delay).pipe(
                mergeMap(() => of(...messages)),
                takeUntil(this.destroy$.pipe(delayPipe(0))),
            );
        }
        return of(...messages);
    }

    public resolveExecutableRunner<T extends JsonLike>(data: T): Observable<ResolvedRunner<ExecutableStubRunner<T>>> {
        if (!this.localResolver) {
            throw new Error('LocalResolver not exist');
        }
        return from(
            this.localResolver.resolve(ExecutableStubRunner, data).then(executableStubRunner =>
                executableStubRunner.markForTransfer() as ResolvedRunner<ExecutableStubRunner<T>>),
        );
    }

    public forwardObservableMessage(data: Observable<string>): Promise<string> {
        return lastValueFrom(data);
    }

    public getObservableFromOtherRxStub(
        runner: RxResolvedRunner<RxStubRunner>,
        messages: string[],
    ): Observable<string> {
        return from(runner.emitMessages(messages)).pipe(concatAll());
    }

    public emitError<T extends JsonLike>(error?: T): Observable<never> {
        return throwError(error);
    }

    public async destroy(): Promise<void> {
        this.destroy$.next();
        return this.localResolver?.destroy();
    }
}
