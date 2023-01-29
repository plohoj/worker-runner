export const halfPromisedIteratorDone: unique symbol = {
    symbol: 'HALF_PROMISED_ITERATOR_DONE'
} as never;

export type HalfPromisedIteratorResult<T> = T | Promise<T> | typeof halfPromisedIteratorDone | Promise<typeof halfPromisedIteratorDone>;

export type HalfPromisedIterator<T> = () => HalfPromisedIteratorResult<T>;
