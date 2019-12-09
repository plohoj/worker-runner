
import { RunnerResolver } from "@modules/promise/runner.resolver";
import { CalcAmountRunner } from "./calc-amount.runner";
import { DelayRunner } from "./delay.runner";
import { RunnerWithConstructorError } from "./runner-width-constructor-error";
import { RunnerWidthException } from "./runner-with-exception";
import { StorageRunner } from "./storage.runner";
import { SumOfArrayRunner } from "./sum-of-array.runner";

export const resolver = new RunnerResolver({
    totalWorkers: 1,
    runners: [DelayRunner, CalcAmountRunner, SumOfArrayRunner, StorageRunner, RunnerWithConstructorError, RunnerWidthException],
    workerPath: 'base/test/worker.js'
})
