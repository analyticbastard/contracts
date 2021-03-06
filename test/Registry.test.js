import { testContractAtRegistry, testEvents } from './behaviors/Registry';
import { ContractRegistryV0_2_0 } from './helpers/Artifacts';
import UnstructuredOwnedUpgradeabilityProxyTests from './UnstructuredOwnedUpgradeabilityProxy.test';
import { testVersionRegistryFunctions } from './behaviors/VersionRegistry';
import {
  shouldBehaveLikeRootRegistry,
  testRegistryUpgradeAndHistoryPreservation,
} from './behaviors/RootRegistry';
import { getLatestVersionFromFs } from './helpers/contracts';

const ContractRegistryTests = (admin0, admin1, nonAdmin) => {
  contract('ContractRegistry', () => {
    context('Test Registry upgradeability', async () => {
      UnstructuredOwnedUpgradeabilityProxyTests(
        admin0,
        nonAdmin,
        [['address'], [admin0]],
        await artifacts.require(
          `./ContractRegistryV${await getLatestVersionFromFs(
            'ContractRegistry'
          )}`
        )
      );
    });
    testContractAtRegistry(admin0, [['address'], [admin0]]);

    // todo EIP820 Registry tests

    testVersionRegistryFunctions(admin0, nonAdmin);
    testEvents(admin0);
  });
};

const RootRegistryTests = () => {
  contract('RootRegistry', () => {
    context('Test Contract Registry upgradeability', () => {
      // upgradeability tests
      shouldBehaveLikeRootRegistry();
      // history preservation integration/behavior tests
      testRegistryUpgradeAndHistoryPreservation();
    });
  });
};
module.exports = {
  ContractRegistryTests,
  RootRegistryTests,
};
