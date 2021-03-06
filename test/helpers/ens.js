const ENS = require('ethereum-ens');
const namehash = require('eth-ens-namehash');

const getENSDetails = async ({ network, artifacts, web3 }) => {
  let ens, resolver;
  process.env.MIGRATION &&
    console.log(`Looking for existing registry at ENS on network: ${network}`);
  if (network === 'ropstenGeth' || network === 'ropsten') {
    ens = new ENS(web3.currentProvider);
    resolver = ens.resolver('nori.test').addr();
  } else if (
    network === 'develop' ||
    network === 'test' ||
    network === 'testrpc'
  ) {
    try {
      ens = await artifacts.require('./ENSRegistry.sol').deployed();
      resolver = ens.resolver(namehash.hash('nori.eth'));
    } catch (e) {
      process.env.MIGRATION &&
        console.log(
          `make sure ENS is deployed on the "${network}" network first`
        );
    }
  } else {
    throw new Error(`ENS hasn't been configured for network: ${network}`);
  }
  return artifacts.require(`./RootRegistryV0_2_0`).at(await resolver);
};
module.exports = {
  getENSDetails,
};
