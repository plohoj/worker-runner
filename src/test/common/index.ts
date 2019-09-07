
import { WorkerResolver } from "../../main";
import { ExampleRunner } from "./example-runner";
import { SimpleRunner } from "./simple-runner";

export const resolver = new WorkerResolver({
    runners: [SimpleRunner, ExampleRunner],
    workerPath: 'worker-test.js'
})
