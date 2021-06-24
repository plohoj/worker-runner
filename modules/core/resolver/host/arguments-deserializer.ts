import { RunnerController } from "../../runner/controller/runner.controller";
import { IRunnerSerializedParameter, RunnerConstructor } from "../../types/constructor";
import { IRunnerSerializedArgument, RunnerSerializedArgumentType } from "../../types/runner-serialized-argument";
import { RunnerToken } from "../../types/runner-token";

export type RunnerControllerPartFactory<R extends RunnerConstructor> = (config: {
    token: RunnerToken,
    port: MessagePort,
}) => RunnerController<R>;

export interface IArgumentsDeserializerConfig<R extends RunnerConstructor> {
    runnerControllerPartFactory: RunnerControllerPartFactory<R>;
}

export class ArgumentsDeserializer<R extends RunnerConstructor> {

    protected readonly runnerControllerPartFactory: RunnerControllerPartFactory<R>;

    constructor(config: Readonly<IArgumentsDeserializerConfig<R>>) {
        this.runnerControllerPartFactory = config.runnerControllerPartFactory;
    }

    public deserializeArguments(args: IRunnerSerializedArgument[]): {
        args: Array<IRunnerSerializedParameter>,
        controllers: Array<RunnerController<R>>,
    } {
        const result = {
            args: new Array<IRunnerSerializedParameter>(),
            controllers: new Array<RunnerController<R>>(),
        };
        for (const argument of args) {
            switch (argument.type) {
                case RunnerSerializedArgumentType.RUNNER_INSTANCE: {
                    const controller = this.runnerControllerPartFactory({
                        port: argument.port,
                        token: argument.token,
                    });
                    result.controllers.push(controller);
                    result.args.push(controller.resolvedRunner);
                    break;
                }
                default:
                    result.args.push(argument.data);
            }
        }
        return result;
    }
}
