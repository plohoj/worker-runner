export interface IDestroyTarget {
    addDestroyHandler: (handler: () => void) => void;
    removeDestroyHandler: (handler: () => void) => void;
}
