/* globals artifacts web3 */

const EIP820Registry = artifacts.require('EIP820Registry');
const MultiSigWallet = artifacts.require('MultiSigWallet');
const ContractRegistryV0_1_0 = artifacts.require('ContractRegistryV0_1_0');
const RootRegistryV0_1_0 = artifacts.require('RootRegistryV0_1_0');
const SelectableCrcMarketV0_1_0 = artifacts.require(
  'SelectableCrcMarketV0_1_0'
);

module.exports = function deploy(deployer, network, accounts) {
  deployer.then(async () => {
    // yeah we won't be using this...
    if (network !== 'test') {
      return;
    }
    const rootRegistry = await RootRegistryV0_1_0.deployed();
    const registry = ContractRegistryV0_1_0.at(
      await rootRegistry.getLatestProxyAddr.call('ContractRegistry')
    );
    await deployer.deploy(EIP820Registry);

    const crcMarket = await deployer.deploy(SelectableCrcMarketV0_1_0);
    await crcMarket.initialize(
      registry.address,
      [
        await registry.getLatestProxyAddr.call('CRC'),
        await registry.getLatestProxyAddr.call('Nori'),
      ],
      accounts[0]
    );
  });
};
