import { Nominal } from '../types/nominal';

declare const halfPromisedIteratorDone: unique symbol;
type HalfPromisedIteratorDone = Nominal<typeof halfPromisedIteratorDone>
export const HALF_PROMISED_ITERATOR_DONE: HalfPromisedIteratorDone = Object.freeze({
    nominal: 'HALF_PROMISED_ITERATOR_DONE'
}) as unknown as HalfPromisedIteratorDone;

export type HalfPromisedIteratorResult<T> = T | Promise<T> | typeof HALF_PROMISED_ITERATOR_DONE | Promise<typeof HALF_PROMISED_ITERATOR_DONE>;

export type HalfPromisedIterator<T> = () => HalfPromisedIteratorResult<T>;
