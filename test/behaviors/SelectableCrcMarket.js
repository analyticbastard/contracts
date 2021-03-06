import { deployUpgradeableCrc } from './Crc';
import { upgradeToV0 } from './UnstructuredUpgrades';
import {
  deployUpgradeableContract,
  getLatestVersionFromFs,
} from '../helpers/contracts';
import { SelectableCrcMarketV0_1_0 } from '../helpers/Artifacts';

const getNamedAccounts = require('../helpers/getNamedAccounts');

const namedAccounts = getNamedAccounts(web3);

const selectableCrcMarketTests = () => {
  let tonToken;
  let crcMarket;
  let crc;
  let tonBalanceAccount0;
  let contractRegistry;

  before(async () => {
    [tonToken, , , contractRegistry] = await upgradeToV0(
      namedAccounts.admin0,
      await artifacts.require(`./NoriV${await getLatestVersionFromFs('Nori')}`),
      false
    );

    [, , crc] = await deployUpgradeableCrc(
      namedAccounts.admin0,
      contractRegistry
    );
    const initParams = [
      ['address', 'address[]', 'address'],
      [
        contractRegistry.address,
        [crc.address, tonToken.address],
        namedAccounts.admin0,
      ],
    ];
    [, crcMarket] = await deployUpgradeableContract(
      artifacts,
      null,
      SelectableCrcMarketV0_1_0,
      contractRegistry,
      initParams
    );
  });

  contract('SelectableCrcMarket', accounts => {
    beforeEach(async () => {
      // temporaily using a toggle to allow contract calls from addresses not proxyed through particpant identy contract
      await crc.toggleParticipantCalling(false, { from: accounts[0] });
    });
    describe('Create a sale, and buy the crc with tokens', () => {
      describe('Mint tokens and crcs', () => {
        it('should mint 1 tokens', async () => {
          await tonToken.mint(accounts[0], 1000000000000000000, '0x0');
          tonBalanceAccount0 = await tonToken.balanceOf(accounts[0]);
          assert.equal(
            tonBalanceAccount0.toNumber(),
            1000000000000000000,
            'Tokens mint fail'
          );
        });

        it('should mint a CRC', async () => {
          await crc.mint(accounts[1], '0x0', 1, '0x0');
          const crcBalanceAccount1 = await crc.balanceOf(accounts[1]);
          assert.equal(
            crcBalanceAccount1.toNumber(),
            1,
            'Commodities mint fail'
          );
        });
      });

      // jaycen todo fix selectable version so more than one with id 0 can be created
      describe('Create a CRC sales via authorizeOperator', () => {
        it('should create sale with CRC ID 0', async () => {
          await crc.authorizeOperator(crcMarket.address, 0, {
            from: accounts[1],
          });
          const isOperator = await crc.isOperatorForOne(crcMarket.address, 0);
          await assert.equal(
            isOperator,
            true,
            'Market is not an operator for crc'
          );
        });
        it('should transfer crc from supplier to buyer and transfer proceeds from buyer to supplier', async () => {
          await tonToken.authorizeOperator(
            crcMarket.address,
            1000000000000000000,
            {
              from: accounts[0],
            }
          );
          assert.equal(
            tonBalanceAccount0.toNumber(),
            1000000000000000000,
            'Tokens mint fail'
          );
          const newOwner = await crc.ownerOf(0);
          const firstAccNewBal = await tonToken.balanceOf(accounts[0]);
          const secondAccNewBal = await tonToken.balanceOf(accounts[1]);
          await assert.equal(
            accounts[0],
            newOwner,
            'First account doesnt own the crc'
          );
          await assert.equal(firstAccNewBal, 0, 'Buyer didnt spend tokens');
          await assert.equal(
            secondAccNewBal,
            1000000000000000000,
            'Seller didnt recieve payment'
          );
        });
      });
    });
  });
};

module.exports = {
  selectableCrcMarketTests,
};
