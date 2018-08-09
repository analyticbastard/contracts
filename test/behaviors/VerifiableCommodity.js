/* globals network */
import { setupEnvForTests, encodeCall, assertRevert } from '../helpers/utils';

const {
  crcConfig,
  participantRegistryConfig,
  contractRegistryConfig,
  supplierConfig,
  noriConfig,
  verifierConfig,
} = require('../helpers/contractConfigs');
const getNamedAccounts = require('../helpers/getNamedAccounts');

let participantRegistry, crc, supplier, verifier;

const mint = (to, value) =>
  encodeCall(
    'mint',
    ['address', 'bytes', 'uint256', 'bytes'],
    [to, '0x0', value, '0x0']
  );

const verify = (tokenId, verificationScore) =>
  encodeCall(
    'verify',
    ['uint256', 'bytes', 'uint64'],
    [tokenId, '0x0', verificationScore]
  );

const testVerifiableCommodityFunctions = () => {
  contract(`VerifiableCommodity`, accounts => {
    beforeEach(async () => {
      ({
        deployedContracts: [
          ,
          // contract registry
          { upgradeableContractAtProxy: participantRegistry }, // participant registry
          { upgradeableContractAtProxy: supplier }, // supplier
          { upgradeableContractAtProxy: crc }, // crc //nori
          ,
          { upgradeableContractAtProxy: verifier }, // verifier
        ],
      } = await setupEnvForTests(
        [
          contractRegistryConfig,
          participantRegistryConfig,
          supplierConfig,
          crcConfig,
          noriConfig,
          verifierConfig,
        ],
        getNamedAccounts(web3).admin0,
        { network, artifacts, accounts, web3 }
      ));
      await participantRegistry.toggleParticipantType(
        'Supplier',
        supplier.address,
        true
      );
      await participantRegistry.toggleParticipantType(
        'Verifier',
        verifier.address,
        true
      );
      await supplier.toggleSupplier(getNamedAccounts(web3).supplier0, true);
      await supplier.toggleInterface('IMintableCommodity', crc.address, true);
      await supplier.forward(
        crc.address,
        0,
        mint(getNamedAccounts(web3).supplier0, 100),
        'IMintableCommodity',
        {
          from: getNamedAccounts(web3).supplier0,
        }
      );
      await verifier.toggleVerifier(getNamedAccounts(web3).verifier, true);
      await verifier.toggleInterface('IVerifiableCommodity', crc.address, true);
    });

    context('Test CRC verification', () => {
      describe('verify', () => {
        it('should allow a CRC verification of 50', async () => {
          await verifier.forward(
            crc.address,
            0,
            verify(0, 50),
            'IVerifiableCommodity',
            {
              from: getNamedAccounts(web3).verifier,
            }
          );
          const [category] = await crc.commodities.call(0);

          assert.equal(category, 50);
        });
        it('should not allow a CRC verification of 101', async () => {
          await assertRevert(
            verifier.forward(
              crc.address,
              0,
              verify(0, 101),
              'IVerifiableCommodity',
              {
                from: getNamedAccounts(web3).verifier,
              }
            )
          );
        });

        it('should not allow a CRC verification of 0', async () => {
          await assertRevert(
            verifier.forward(
              crc.address,
              0,
              verify(0, 0),
              'IVerifiableCommodity',
              {
                from: getNamedAccounts(web3).verifier,
              }
            )
          );
        });
      });
    });
  });
};

module.exports = {
  testVerifiableCommodityFunctions,
};
