import { JsonObject, ResolvedRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { RxResolvedRunner } from '@worker-runner/rx';
import { from, Observable, of, throwError } from 'rxjs';
import { concatAll, delay as rxDelay } from 'rxjs/operators';
import { runners } from '../runner-list';
import { ExecutableStubRunner } from './executable-stub.runner';

export class RxStubRunner {
    private localResolver?: LocalRunnerResolver<typeof runners[0]>;

    public async run(): Promise<void> {
        this.localResolver = new LocalRunnerResolver({runners});
        await this.localResolver.run();
    }

    public emitMessages(messages: string[], delay?: number): Observable<string> {
        if (delay) {
            return of(...messages).pipe((rxDelay(delay)));
        }
        return of(...messages);
    }

    public resolveExecutableRunner<T extends JsonObject>(data: T): Observable<ResolvedRunner<ExecutableStubRunner<T>>> {
        if (!this.localResolver) {
            throw new Error('LocalResolver not exist');
        }
        return from(
            this.localResolver.resolve(ExecutableStubRunner, data).then(executableStubRunner =>
                executableStubRunner.markForTransfer() as ResolvedRunner<ExecutableStubRunner<T>>),
        );
    }

    public getObservableFromOtherRxStub(
        runner: RxResolvedRunner<RxStubRunner>,
        messages: string[],
    ): Observable<string> {
        return from(runner.emitMessages(messages)).pipe(concatAll());
    }

    public emitError<T extends JsonObject>(error: T): Observable<never> {
        return throwError(error);
    }

    public async destroy(): Promise<void> {
        return this.localResolver?.destroy();
    }
}
