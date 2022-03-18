require('dotenv').config();
require('@nomiclabs/hardhat-waffle');
require('@openzeppelin/hardhat-upgrades');
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('@nomiclabs/hardhat-etherscan');

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
   const accounts = await ethers.getSigners();

   for (const account of accounts) {
      console.log(account.address);
   }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// You need a .env file with api keys and private keys

module.exports = {
   etherscan: {
      apiKey: process.env.ETHERSCAN_API_KEY,
   },
   solidity: {
      version: '0.8.2',
      settings: {
         optimizer: {
            enabled: true,
            runs: 200,
         },
      },
   },
   networks: {
      rinkeby: {
         url: `https://speedy-nodes-nyc.moralis.io/d26aff17bbec4491e9ed8cdf/eth/rinkeby`,
         accounts: process.env.RINKEBY ? [`0x${process.env.RINKEBY}`] : [],
      },
      ropsten: {
         url: `https://speedy-nodes-nyc.moralis.io/d26aff17bbec4491e9ed8cdf/eth/ropsten`,
         accounts: process.env.ROPSTEN ? [`0x${process.env.ROPSTEN}`] : [],
      },
      bscTestNet: {
         url: 'https://speedy-nodes-nyc.moralis.io/d26aff17bbec4491e9ed8cdf/bsc/testnet',
         chainId: 97,
         gasPrice: 20000000000,
         accounts: process.env.BSC_TESTNET
            ? [`0x${process.env.BSC_TESTNET}`]
            : [],
      },
      bscMainNet: {
         url: 'https://speedy-nodes-nyc.moralis.io/d26aff17bbec4491e9ed8cdf/bsc/mainnet',
         chainId: 56,
         gasPrice: 5000000000,
         accounts: process.env.BSC ? [`0x${process.env.BSC}`] : [],
      },
      hardhat: {
         allowUnlimitedContractSize: true,
      },
   },
   abiExporter: {
      path: './data/abi',
      clear: true,
      flat: true,
      // only: [':ERC20$'],
      spacing: 2,
   },
   settings: {
      optimizer: {
         enabled: true,
         runs: 10000,
      },
   },
};
