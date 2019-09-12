
import { RunnerResolver } from "../../main";
import { ExampleRunner } from "./example-runner";
import { PerfectRunner } from "./perfect-runner";
import { SimpleRunner } from "./simple-runner";

export const resolver = new RunnerResolver({
    totalWorkers: 1,
    runners: [SimpleRunner, ExampleRunner, PerfectRunner],
    workerPath: 'worker-test.js'
})
