import { Constructor } from '@worker-runner/core';

type ExpectedRecursive<T> = T | jasmine.AsymmetricMatcher<T> | {
    [P in keyof T]?: ExpectedRecursive<T[P]>
};

type Expected<T> = {
    [P in keyof T]?: ExpectedRecursive<T[P]>
};

export function errorContaining<T extends {}>(
    errorConstructor: Constructor<T>,
    sample: Expected<T>,
): jasmine.AsymmetricMatcher<Expected<T>> {
    return {
        asymmetricMatch(compareTo, customTesters) {
            const check = compareTo instanceof errorConstructor
                && jasmine.objectContaining(sample as any).asymmetricMatch(compareTo, customTesters);
            if (!check) {
                console.error(compareTo);
            }
            return check;
        },
        jasmineToString() {
            return `<${errorContaining.name}(${errorConstructor.name}, ${jasmine.pp(sample)})>`;
        },
    };
}
