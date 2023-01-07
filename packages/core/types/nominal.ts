declare const nominal: unique symbol;
// TODO Replace with the better way to define a unique type
/**
 * A type that allows to define a unique unknown type that will not overlap with other unknown types
 * @see https://github.com/microsoft/TypeScript/issues/202
 */
export type Nominal<T> = {
    readonly [nominal]: T;
}
