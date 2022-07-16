import { RunnerResolverHost } from "@worker-runner/promise";
import { apartHostClientResolvers } from "../client/resolver-list";
import { createApartClientHostResolvers } from "../utils/apart-client-host-resolvers";
import { each } from "../utils/each";

each(apartHostClientResolvers, (mode, resolvers) => 
    describe(mode, () => {
        it('delayed connection', async () => {
            const apartConfiguredRunnerResolvers = createApartClientHostResolvers({
                hostConfig: { runners: [] },
                runnerResolverClientConstructor: resolvers.client,
                runnerResolverHostConstructor: resolvers.host,
            });
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const originalRunMethod = resolvers.host.prototype.run;
            spyOn(resolvers.host.prototype, 'run').and.callFake(function(this: typeof RunnerResolverHost) {
                setTimeout(originalRunMethod.bind(this), 100);
            });

            await expectAsync(apartConfiguredRunnerResolvers.run()).toBeResolved();

            await apartConfiguredRunnerResolvers.destroy();
        });
    }),
);
