
import { resolver } from "../common";
import { ExampleRunner } from "../common/example-runner";
import { PerfectRunner } from "../common/perfect-runner";
async function main(): Promise<void> {
    await resolver.run();
    const exampleRunner = await resolver.resolve(ExampleRunner);
    exampleRunner.sayHello();
    const perfectRunner = await resolver.resolve(PerfectRunner);
    console.log(await perfectRunner.run());
    console.log(await perfectRunner.promiseMessage());
}

main();