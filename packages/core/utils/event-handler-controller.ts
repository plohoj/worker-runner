/** Same as event listener, but does not use the native event class */
export type EventHandler<T> = (event: T) => void;

// TODO Reuse
/**
 * Controller that implements the event life cycle:
 * * Adding handlers;
 * * Removing handlers;
 * * Dispatching an event;
 * * Clearing the list of handlers;
 */
export class EventHandlerController<T = never> {

    protected handlers = new Set<EventHandler<T>>();

    public addHandler(handler: EventHandler<T>): void {
        this.handlers.add(handler);
    }

    public removeHandler(handler: EventHandler<T>): void {
        this.handlers.delete(handler);
    }

    public dispatch(event: T): void {
        for (const handler of this.handlers) {
            (handler as EventHandler<unknown>)(event);
        }
    }

    public clear(): void {
        this.handlers.clear();
    }
}
