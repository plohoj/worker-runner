/** Same as event listener, but does not use the native event class */
export type EventHandler<T> = (event: T) => void;

/**
 * Controller that implements the event life cycle:
 * * Adding handlers;
 * * Removing handlers;
 * * Dispatching an event;
 * * Clearing the list of handlers;
 */
export class EventHandlerController<T = never> {

    protected handlers = new Set<EventHandler<T>>();

    public addHandler<E extends T = T>(handler: EventHandler<E>): void {
        this.handlers.add(handler as EventHandler<T>);
    }

    public removeHandler<E extends T = T>(handler: EventHandler<E>): void {
        this.handlers.delete(handler as EventHandler<T>);
    }

    public dispatch<E extends T = T>(event: E | T): void {
        for (const handler of this.handlers) {
            handler(event);
        }
    }

    public clear(): void {
        this.handlers.clear();
    }
}
