
import { CalcAmountRunner } from './calc-amount.runner';
import { DelayRunner } from './delay.runner';
import { RunnerWithConstructorError } from './runner-width-constructor-error';
import { RunnerWidthException } from './runner-with-exception';
import { RxMessageRunner } from './rx-message-runner';
import { StorageRunner } from './storage.runner';
import { SumOfArrayRunner } from './sum-of-array.runner';

export const runners = [
    DelayRunner,
    CalcAmountRunner,
    SumOfArrayRunner,
    StorageRunner,
    RunnerWithConstructorError,
    RunnerWidthException,
    RxMessageRunner,
];
