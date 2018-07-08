/* globals artifacts web3 */
const ensUtils = require('../test/helpers/ens');
const utils = require('../test/helpers/utils');
const multiSigUtils = require('../test/helpers/multisig');

const {
  deployUpgradeableContract,
  adminUpgradeToContract,
  upgradeToContract,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
let rootRegistry;

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    const prepareEns = () => ensUtils.getENSDetails(network, artifacts, web3);

    if (network === 'ropstenGeth') {
      rootRegistry = await utils.onlyWhitelisted(accounts[0], prepareEns);
    } else {
      rootRegistry = await prepareEns();
      if (rootRegistry) {
        console.log(
          'Found existing registry registry at',
          rootRegistry.address
        );
      } else {
        rootRegistry = await RootRegistryV0_1_0.new();
      }
    }
    const [multiAdminAddr, multiSigAddr] = await multiSigUtils.prepareMultiSigs(
      network,
      web3,
      artifacts,
      accounts[0],
      accounts[1],
      rootRegistry
    );

    if (
      network !== 'develop' &&
      (await rootRegistry.owner()) !== multiAdminAddr
    ) {
      throw new Error(
        'Root registry owner should be the multisig admin account'
      );
    }
    console.log('RootRegistry', rootRegistry.address); // 0x21dbe117c36acac1b3bc08a18169d8059fbce1c7
    console.log('MultiSigWallet:', multiSigAddr); // 0x22c2a0758986817695d9d1a1866aacb775dc3f85
    console.log('MultiAdmin:', multiAdminAddr); // 0x853a954591da9db7d6bb774bc8feaf7646aa5010
  });
};
