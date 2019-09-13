
import { RunnerResolver } from "../../src";
import { CalcAmountRunner } from "./calc-amount-runner";
import { DelayRunner } from "./delay-runner";
import { SumOfArrayRunner } from "./sum-of-array-runner";

export const resolver = new RunnerResolver({
    totalWorkers: 1,
    runners: [DelayRunner, CalcAmountRunner, SumOfArrayRunner],
    workerPath: 'base/test/worker.js'
})
