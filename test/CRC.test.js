import { shouldBehaveLikeCrc } from './behaviors/Crc';
import { testBasicCommodityFunctions } from './behaviors/BasicCommodity';
import { testVerifiableCommodityFunctions } from './behaviors/VerifiableCommodity';

const CRCTests = admin => {
  // shouldBehaveLikeCrc(admin);
  // testBasicCommodityFunctions();
  testVerifiableCommodityFunctions();
};
export default CRCTests;
