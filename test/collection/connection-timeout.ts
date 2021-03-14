import { HostRunnerResolver, LocalRunnerResolver } from "@worker-runner/promise";
import { runners } from "../common/runner-list";

describe(`Connection timeout`, () => {
    it (`for ${LocalRunnerResolver.name}`, async () => {
        const initialRunMethod = HostRunnerResolver.prototype.run;
        spyOn(HostRunnerResolver.prototype, 'run').and.callFake(function(this: typeof HostRunnerResolver) {
            setTimeout(initialRunMethod.bind(this), 100);
        })
        const localResolver = new LocalRunnerResolver({runners});
        await localResolver.run();
        await localResolver.destroy();
    });
});
