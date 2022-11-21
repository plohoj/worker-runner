import { from, Observable, ObservableInput, ObservedValueOf, OperatorFunction, ReplaySubject, Subject, takeUntil } from 'rxjs';

export interface IMergeOrderMapConfig {
    /**
     * If the flag is true, then an error that occurred in a stream that has not yet been reached will wait for its turn
     * @default false
     */
    orderError?: boolean;
}

export function mergeOrderMap<T, O extends ObservableInput<unknown>>(
    project: (value: T, index: number) => O,
    config: IMergeOrderMapConfig = {}
): OperatorFunction<T, ObservedValueOf<O>> {
    const orderError = config.orderError;
    return (source) =>
        new Observable((subscriber) => {
            const destroySubject = new Subject<void>();
            let lastProjectIndex = 0;
            let isSourceCompleted = false;
            let listenInProcess = false;
            // TODO Clear the listened buffer
            const subjectBuffer: ReplaySubject<ObservedValueOf<O>>[] = [];

            function checkFinish(): void {
                if (!listenInProcess && isSourceCompleted && subjectBuffer.length === 0) {
                    subscriber.complete();
                }
            }

            function startListenNext(): void {
                listenInProcess = true;
                const subject = subjectBuffer.splice(0, 1)[0];
                subject.pipe(
                    takeUntil(destroySubject)
                ).subscribe({
                    next: (projectValue) => subscriber.next(projectValue),
                    error: (error) => subscriber.error(error),
                    complete: () => {
                        listenInProcess = false;
                        checkListenNext();
                    },
                });
            }

            function checkListenNext(): void {
                if (listenInProcess) {
                    return;
                }
                if (subjectBuffer.length === 0) {
                    checkFinish();
                    return;
                }
                startListenNext();
            }

            function addNewProject(sourceValue: T): void {
                const replaySubject = new ReplaySubject<ObservedValueOf<O>>();
                subjectBuffer.push(replaySubject);
                from(project(sourceValue, lastProjectIndex++)).pipe(
                    takeUntil(destroySubject)
                ).subscribe({
                    next: (projectValue) => replaySubject.next(projectValue),
                    error: orderError
                        ? error => replaySubject.error(error)
                        : error => subscriber.error(error),
                    complete: () => replaySubject.complete(),
                });
                checkListenNext();
            }

            source.pipe(
                takeUntil(destroySubject)
            ).subscribe({
                next: addNewProject,
                error: (error) => subscriber.error(error),
                complete: () => {
                    isSourceCompleted = true;
                    checkFinish();
                },
            });

            return () => destroySubject.next();
        });
}
