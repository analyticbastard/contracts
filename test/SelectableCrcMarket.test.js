const TonToken = artifacts.require('./TonToken.sol');
const Crc = artifacts.require('./CRC.sol');
const SelectableCrcMarket = artifacts.require('./SelectableCrcMarket.sol');

let tonToken;
let crcMarket;
let crc;
let tonBalanceAccount0;

before(async () => {
  tonToken = await TonToken.deployed();
  crcMarket = await SelectableCrcMarket.deployed();
  crc = await Crc.deployed();
});

contract('SelectableCrcMarket', accounts => {
  beforeEach(async () => {
    // temporaily using a toggle to allow contract calls from addresses not proxyed through particpant identy contract
    await crc.toggleParticpantCalling(false, { from: accounts[0] });
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
        assert.equal(crcBalanceAccount1.toNumber(), 1, 'Commodities mint fail');
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
