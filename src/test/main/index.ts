
import { resolver } from "../common";
import { ExampleRunner } from "../common/example-runner";

async function main(): Promise<void> {
    await resolver.run();
    const exampleRunner = await resolver.resolve(ExampleRunner);
    exampleRunner.sayHello();
}

main();