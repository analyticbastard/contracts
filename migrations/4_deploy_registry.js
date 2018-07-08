/* globals artifacts web3 */
const { adminUpgradeToContract } = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const ensUtils = require('../test/helpers/ens');
const utils = require('../test/helpers/utils');
const multiSigUtils = require('../test/helpers/multisig');

const MultiAdmin = artifacts.require('MultiAdmin');
const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, rootRegistry, adminAccountAddress, multiAdmin;
    const prepareEns = () => ensUtils.getENSDetails(network, artifacts, web3);

    if (network === 'ropstenGeth') {
      rootRegistry = await utils.onlyWhitelisted(accounts[0], prepareEns);
      const [multiAdminAddr] = await multiSigUtils.prepareMultiSigs(
        network,
        web3,
        artifacts,
        accounts[0],
        accounts[1],
        rootRegistry
      );
      if ((await rootRegistry.owner()) !== multiAdminAddr) {
        throw new Error(
          'Root registry owner should be the multisig admin account'
        );
      }
      multiAdmin = await MultiAdmin.at(multiAdminAddr);

      const upgrade = (contract, argTypes, args) =>
        adminUpgradeToContract(
          artifacts,
          contract,
          rootRegistry,
          argTypes,
          args,
          {
            from: adminAccountAddress,
          },
          multiAdmin
        );

      registry = await upgrade(
        'ContractRegistry',
        ['address'],
        [multiAdminAddr]
      );
    } else {
      rootRegistry = await prepareEns();
      if (rootRegistry) {
        console.log('Found existing root registry at', rootRegistry.address);
      } else {
        rootRegistry = await RootRegistryV0_1_0.new();
      }
      adminAccountAddress = getNamedAccounts(web3).admin0;

      let existingRegistry;
      try {
        existingRegistry = ContractRegistryV0_1_0.at(
          await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
        );
      } catch (e) {
        // this is OK. It just means a registry hasn't been deployed yet
      }

      if (existingRegistry) {
        console.log(
          'Found existing registry registry at',
          existingRegistry.address
        );
        registry = existingRegistry;
      } else {
        registry = await adminUpgradeToContract(
          artifacts,
          'ContractRegistry',
          rootRegistry,
          ['address'],
          [adminAccountAddress], // change to multisig
          {
            from: adminAccountAddress,
          },
          multiAdmin
        );
      }
    }
    console.log('Deployed Contract Registry Address:', registry.address);
  });
};
