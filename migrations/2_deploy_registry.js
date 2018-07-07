/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const {
  deployUpgradeableContract,
  adminUpgradeToContract,
  upgradeToContract,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const MultiAdmin = artifacts.require('MultiAdmin');
const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress;
    if (network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      if (
        ![
          '0xf1bcd758cb3d46d15afe4faef942adad36380148',
          '0x2e4d8353d81b7e903c9e031dab3e9749e8ab69bc',
          '0x627306090abab3a6e1400e9345bc60c78a8bef57',
        ].includes(adminAccountAddress.toLowerCase())
      ) {
        throw new Error(
          `${adminAccountAddress} is not a whitelisted account for deploying to ropsten.`
        );
      }
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const rootRegistryAddress = await ens.resolver('nori.test').addr();
      const rootRegistry = await RootRegistryV0_1_0.at(rootRegistryAddress);
      const multiAdminAddr = await rootRegistry.getLatestProxyAddr(
        'MultiAdmin'
      );
      const multiAdmin = await MultiAdmin.at(multiAdminAddr);

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
      adminAccountAddress = getNamedAccounts(web3).admin0;

      let existingRegistry, rootRegistry;
      try {
        rootRegistry = await RootRegistryV0_1_0.deployed();
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
        rootRegistry = await deployer.deploy(RootRegistryV0_1_0);
        const multiAdmin = await MultiAdmin.new(
          [getNamedAccounts(web3).admin0, getNamedAccounts(web3).admin1],
          1,
          rootRegistry.address
        );

        registry = await adminUpgradeToContract(
          artifacts,
          'ContractRegistry',
          rootRegistry,
          ['address'],
          [adminAccountAddress],
          {
            from: adminAccountAddress,
          },
          multiAdmin
        );
        // console.log(registry);
      }
    }

    console.log('Deployed Contract Registry Address:', registry.address);
  });
};
