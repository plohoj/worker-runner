
import { RunnerResolver } from "../../main";
import { ExampleRunner } from "./example-runner";
import { SimpleRunner } from "./simple-runner";

export const resolver = new RunnerResolver({
    runners: [SimpleRunner, ExampleRunner],
    workerPath: 'worker-test.js'
})
