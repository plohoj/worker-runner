
import { resolver } from "../common";
import { ExampleRunner } from "../common/example-runner";

resolver.run().then(() => resolver.resolve(ExampleRunner));
