import { RunnerResolverHost } from "@worker-runner/promise";
import { each } from "../client/utils/each";
import { pickApartResolverFactories } from '../client/utils/pick-apart-resolver-factories';

each(pickApartResolverFactories(), (mode, resolverFactory) => 
    describe(mode, () => {
        it('delayed connection:', async () => {
            const apartResolversManager = resolverFactory({
                hostConfig: { runners: [] },
            });
            // eslint-disable-next-line @typescript-eslint/unbound-method
            const originalRunMethod = apartResolversManager.host.run;
            spyOn(apartResolversManager.host, 'run').and.callFake(function(this: typeof RunnerResolverHost) {
                setTimeout(originalRunMethod.bind(this), 9);
            });

            await expectAsync(apartResolversManager.run()).toBeResolved();

            await apartResolversManager.destroy();
        });
    }),
);
