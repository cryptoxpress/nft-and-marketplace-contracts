const increaseTime = async (newTimestampInSeconds) => {
   await ethers.provider.send('evm_increaseTime', [newTimestampInSeconds]);
   await ethers.provider.send('evm_mine');
};

const randomUint = () => {
   return Math.floor(Math.random() * 1e10);
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ZERO_BYTES32 =
   '0x0000000000000000000000000000000000000000000000000000000000000000';

const MAX_ALLOWANCE =
   '115792089237316195423570985008687907853269984665640564039457584007913129639935';

const NULL_SIG = { v: 27, r: ZERO_BYTES32, s: ZERO_BYTES32 };
const CHAIN_ID = 50;

const LISTING_TYPES = {
   NONE: 0,
   FIXED_PRICE: 1,
   AUCTION: 2,
};

module.exports = {
   increaseTime,
   randomUint,
   ZERO_ADDRESS,
   ZERO_BYTES32,
   MAX_ALLOWANCE,
   NULL_SIG,
   CHAIN_ID,
   LISTING_TYPES,
};
