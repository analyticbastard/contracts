/* globals artifacts web3 */
const {
  upgradeToContract,
  adminUpgradeToContract,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const ensUtils = require('../test/helpers/ens');
const utils = require('../test/helpers/utils');
const multiSigUtils = require('../test/helpers/multisig');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const MultiAdmin = artifacts.require('MultiAdmin');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress, multiAdmin, multiAdminAddr, rootRegistry;
    const prepareEns = () => ensUtils.getENSDetails(network, artifacts, web3);
    if (network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      rootRegistry = await utils.onlyWhitelisted(accounts[0], prepareEns);
      registry = await ContractRegistryV0_1_0.at(
        await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
      );
      [multiAdminAddr] = await multiSigUtils.prepareMultiSigs(
        network,
        web3,
        artifacts,
        accounts[0],
        accounts[1],
        rootRegistry
      );
    } else {
      rootRegistry = await prepareEns();
      if (rootRegistry) {
        console.log('Found existing root registry at', rootRegistry.address);
      } else {
        rootRegistry = await RootRegistryV0_1_0.new();
      }
      [multiAdminAddr] = await multiSigUtils.prepareMultiSigs(
        network,
        web3,
        artifacts,
        getNamedAccounts(web3).admin0,
        getNamedAccounts(web3).admin1,
        rootRegistry
      );
      console.log('hi', multiAdminAddr);
      multiAdmin = await MultiAdmin.at(multiAdminAddr);

      registry = await adminUpgradeToContract(
        artifacts,
        'ContractRegistry',
        rootRegistry,
        ['address'],
        [getNamedAccounts(web3).admin1],
        {
          from: accounts[0],
        },
        multiAdmin
      );
    }

    const upgrade = (contract, argTypes, args) =>
      adminUpgradeToContract(
        artifacts,
        contract,
        registry,
        argTypes,
        args,
        {
          from: accounts[0],
        },
        multiAdmin
      );

    const nori = await upgrade(
      'Nori',
      ['string', 'string', 'uint', 'uint', 'address', 'address'],
      ['Upgradeable NORI Token', 'NORI', 1, 0, registry.address, multiAdminAddr]
    );

    const participantRegistry = await upgrade(
      'ParticipantRegistry',
      ['address', 'address'],
      [registry.address, multiAdminAddr]
    );

    const crc = await upgrade(
      'CRC',
      ['string', 'string', 'address', 'address', 'address'],
      [
        'Carbon Removal Certificate',
        'CRC',
        registry.address,
        participantRegistry.address,
        multiAdminAddr,
      ]
    );

    await upgrade(
      'Participant',
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, multiAdminAddr]
    );

    await upgrade(
      'Supplier',
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, multiAdminAddr]
    );

    await upgrade(
      'Verifier',
      ['address', 'address', 'address'],
      [registry.address, participantRegistry.address, multiAdminAddr]
    );

    await upgrade(
      'FifoCrcMarket',
      ['address', 'address[]', 'address'],
      [registry.address, [crc.address, nori.address], multiAdminAddr]
    );
  });
};
