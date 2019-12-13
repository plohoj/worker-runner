import { CalcAmountRunner } from './calc-amount.runner';

export class SumOfArrayRunner extends CalcAmountRunner {
    calcArray(values: number[]): number {
        return values.reduce((prev, current) => this.calc(prev, current), 0);
    }
}
