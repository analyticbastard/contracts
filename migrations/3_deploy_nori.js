/* globals artifacts web3 */
const ENS = require('ethereum-ens');
const {
  upgradeToContract,
  adminUpgradeToContract,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');
const assert = require('assert');

const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const NoriV0_1_0 = artifacts.require('NoriV0_1_0');
const ParticipantRegistryV0_1_0 = artifacts.require(
  'ParticipantRegistryV0_1_0'
);
const CRCV0_1_0 = artifacts.require('CRCV0_1_0');
const ParticipantV0_1_0 = artifacts.require('ParticipantV0_1_0');
const SupplierV0_1_0 = artifacts.require('SupplierV0_1_0');
const VerifierV0_1_0 = artifacts.require('VerifierV0_1_0');
const FifoCrcMarketV0_1_0 = artifacts.require('FifoCrcMarketV0_1_0');
const MultiAdmin = artifacts.require('MultiAdmin');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let registry, adminAccountAddress, multiAdmin, multiAdminAddr, rootRegistry;
    if (network === 'ropstenGeth') {
      adminAccountAddress = accounts[0];
      console.log('Looking up existing registry at nori.test ENS on ropsten');
      const ens = new ENS(web3.currentProvider);
      const rootRegistryAddress = await ens.resolver('nori.test').addr();
      rootRegistry = await RootRegistryV0_1_0.at(rootRegistryAddress);
      registry = await ContractRegistryV0_1_0.at(
        await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
      );
      multiAdminAddr = await rootRegistry.getLatestProxyAddr('MultiAdmin');
      multiAdmin = await MultiAdmin.at(multiAdminAddr);
    } else {
      adminAccountAddress = getNamedAccounts(web3).admin0;
      rootRegistry = await RootRegistryV0_1_0.new();
      multiAdmin = await MultiAdmin.new(
        [getNamedAccounts(web3).admin0, getNamedAccounts(web3).admin1],
        1,
        rootRegistry.address
      );
      multiAdminAddr = multiAdmin.address;
      registry = await adminUpgradeToContract(
        artifacts,
        'ContractRegistry',
        rootRegistry,
        ['address'],
        [getNamedAccounts(web3).admin1],
        {
          from: adminAccountAddress,
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
          from: adminAccountAddress,
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
