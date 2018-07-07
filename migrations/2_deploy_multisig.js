/* globals artifacts web3 */
const testENS = require('../test/helpers/ens');
const namehash = require('eth-ens-namehash');
const ensUtils = require('../test/helpers/ens');
const utils = require('../test/helpers/utils');

const ENS = require('ethereum-ens');
const {
  deployUpgradeableContract,
  adminUpgradeToContract,
  upgradeToContract,
} = require('../test/helpers/contracts');
const getNamedAccounts = require('../test/helpers/getNamedAccounts');

const MultiAdmin = artifacts.require('MultiAdmin');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const MockENS = artifacts.require('./ENSRegistry.sol');

module.exports = (deployer, network, accounts) => {
  deployer.then(async () => {
    let adminAccountAddress, rootRegistry, multiAdminAddr, multiSigAddr;
    const prepareEns = () => ensUtils.getENSDetails(network, artifacts, web3);
    if (network === 'ropstenGeth') {
      rootRegistry = await utils.onlyWhitelisted(accounts[0], prepareEns);
      // todo: fix network name
      // adminAccountAddress = accounts[0];
      // if (
      //   ![
      //     '0xf1bcd758cb3d46d15afe4faef942adad36380148',
      //     '0x2e4d8353d81b7e903c9e031dab3e9749e8ab69bc',
      //   ].includes(adminAccountAddress.toLowerCase())
      // ) {
      //   throw new Error(
      //     `${adminAccountAddress} is not a whitelisted account for deploying to ropsten.`
      //   );
      // }

      // console.log('Looking up existing registry at nori.test ENS on ropsten');
      // const ens = new ENS(web3.currentProvider);
      // const rootRegistryAddress = await ens.resolver('nori.test').addr();
      // rootRegistry = await RootRegistryV0_1_0.at(rootRegistryAddress);

      multiAdminAddr = await rootRegistry.getLatestProxyAddr('MultiAdmin');
      multiSigAddr = await rootRegistry.getLatestProxyAddr('MultiSigWallet');

      if ((await rootRegistry.owner()) !== multiAdminAddr) {
        throw new Error(
          'Root registry owner should be the multisig admin account'
        );
      }
    } else {
      try {
        rootRegistry = await ensUtils.getENSDetails(network, artifacts);
      } catch (e) {
        // this is OK. It just means a registry hasn't been deployed yet
      }
      if (rootRegistry) {
        console.log(
          'Found existing registry registry at',
          rootRegistry.address
        );
      } else {
        rootRegistry = await RootRegistryV0_1_0.new();
      }

      const multiSigWallet = await MultiSigWallet.new(
        [getNamedAccounts(web3).admin0, getNamedAccounts(web3).admin1],
        1,
        rootRegistry.address
      );
      const multiAdmin = await MultiAdmin.new(
        [getNamedAccounts(web3).admin0, getNamedAccounts(web3).admin1],
        1,
        rootRegistry.address
      );
      await rootRegistry.setVersion(
        'MultiAdmin',
        multiAdmin.address,
        '0_1_0',
        multiAdmin.address
      );
      await rootRegistry.setVersion(
        'MultiSigWallet',
        multiSigWallet.address,
        '0_1_0',
        multiSigWallet.address
      );
      multiSigAddr = await rootRegistry.getLatestProxyAddr('MultiSigWallet');
      multiAdminAddr = await rootRegistry.getLatestProxyAddr('MultiAdmin');
    }

    console.log('RootRegistry', rootRegistry.address); // 0x21dbe117c36acac1b3bc08a18169d8059fbce1c7
    console.log('MultiSigWallet:', multiSigAddr); // 0x22c2a0758986817695d9d1a1866aacb775dc3f85
    console.log('MultiAdmin:', multiAdminAddr); // 0x853a954591da9db7d6bb774bc8feaf7646aa5010
  });
};
