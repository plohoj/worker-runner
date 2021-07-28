import { HostRunnerResolver } from "@worker-runner/promise";
import { apartHostClientResolvers } from "../client/resolver-list";
import { createApartClientHostResolvers } from "../utils/apart-client-host-resolvers";
import { each } from "../utils/each";

each(apartHostClientResolvers, (mode, resolvers) => 
    describe(mode, () => {
        it ('delayed connection', async () => {
            const apartConfiguredLocalRunnerResolvers = createApartClientHostResolvers({
                hostConfig: { runners: [] },
                clientResolverConstructor: resolvers.client,
                hostResolverConstructor: resolvers.host,
            });
            const originalRunMethod = resolvers.host.prototype.run;
            spyOn(resolvers.host.prototype, 'run').and.callFake(function(this: typeof HostRunnerResolver) {
                setTimeout(originalRunMethod.bind(this), 100);
            })

            await expectAsync(apartConfiguredLocalRunnerResolvers.run()).toBeResolved();

            await apartConfiguredLocalRunnerResolvers.destroy();
        });
    }),
);
