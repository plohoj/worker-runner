// TODO Replace with EventHandlerControl
/** @deprecated */
export interface IDestroyHandlersTarget {
    /** @deprecated */
    addDestroyHandler: (handler: () => void) => void;
    /** @deprecated */
    removeDestroyHandler: (handler: () => void) => void;
}

export interface IDestroyTarget {
    destroy(): void;
}
