import { EventHandlerController } from './event-handler-controller';
import { HalfPromisedIterator, halfPromisedIteratorDone, HalfPromisedIteratorResult } from './half-promised-iterator';

export type ConcurrentQueueCompleteFunction<T> = (event: T) => void;

export class ParallelQueueController<T> {
    public readonly eventHandlerController = new EventHandlerController<T>();
    
    private _amount = 0;
    /** The number of reserved task launch events that will be thrown in the future */
    public get amount(): number {
        return this._amount;
    }

    public reserve(): ConcurrentQueueCompleteFunction<T> {
        this._amount++;
        return (event: T) => {
            this._amount--;
            this.eventHandlerController.dispatch(event);
        }
    }

    public iterateUntilEmpty(): HalfPromisedIterator<T> {
        const events: T[] = [];
        let handleTrigger: (() => void) | undefined;
        this.eventHandlerController.addHandler((event: T) => {
            events.push(event);
            handleTrigger?.();
        });
        return (): HalfPromisedIteratorResult<T> => {
            if (events.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                return events.shift()!;
            }
            if (this.amount === 0) {
                return halfPromisedIteratorDone;
            }
            return new Promise<T>(resolve => {
                if (events.length > 0) { // If the event happened while the promise initialization was in the queue
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    resolve(events.shift()!);
                }
                handleTrigger = () => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    resolve(events.shift()!);
                }
            })
        }
    }
}
