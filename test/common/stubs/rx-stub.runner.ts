import { JsonObject, ResolveRunner } from '@worker-runner/core';
import { LocalRunnerResolver } from '@worker-runner/promise';
import { from, Observable, of } from 'rxjs';
import { delay as rxDelay } from 'rxjs/operators';
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

    public resolveExecutableRunner<T extends JsonObject>(data: T): Observable<ResolveRunner<ExecutableStubRunner<T>>> {
        if (!this.localResolver) {
            throw new Error('LocalResolver not exist');
        }
        return from(
            this.localResolver.resolve(ExecutableStubRunner, data) as Promise<ResolveRunner<ExecutableStubRunner<T>>>,
        );
    }

    public async destroy(): Promise<void> {
        return this.localResolver?.destroy();
    }
}
