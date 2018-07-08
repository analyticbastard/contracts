const prepareMultiSigs = async (
  network,
  web3,
  artifacts,
  admin0,
  admin1,
  rootRegistry
) => {
  let multiAdmin, multiSigWallet;
  try {
    [multiAdmin, multiSigWallet] = await Promise.all([
      rootRegistry.getLatestProxyAddr('MultiAdmin'),
      rootRegistry.getLatestProxyAddr('MultiSigWallet'),
    ]);
  } catch (e) {
    console.log('MultiSigs havent been deployed');
  }
  if (network !== 'ropstenGeth') {
    [multiSigWallet, multiAdmin] = await Promise.all([
      artifacts
        .require('MultiSigWallet')
        .new([admin0, admin1], 1, rootRegistry.address),
      artifacts
        .require('MultiAdmin')
        .new([admin0, admin1], 1, rootRegistry.address),
    ]);

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
    return Promise.all([
      rootRegistry.getLatestProxyAddr('MultiAdmin'),
      rootRegistry.getLatestProxyAddr('MultiSigWallet'),
    ]);
  }
  return [multiAdmin, multiSigWallet];
};
module.exports = {
  prepareMultiSigs,
};
