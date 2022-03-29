const { ethers } = require('hardhat');

// add xpress token address for needed network
const XPRESS_TOKEN_ADDRESS = '0xaA9826732f3A4973FF8B384B3f4e3c70c2984651';

async function main() {
   const [deployer] = await ethers.getSigners();

   console.log('Deploying contracts with the account:', deployer.address);

   console.log('Account balance:', (await deployer.getBalance()).toString());

   // ----- DEPLOYMENTS -----

   const CXRegistry = await ethers.getContractFactory('CX_Proxy_Registry');
   const registry = await CXRegistry.connect(deployer).deploy();
   console.log(`\nRegistry address -> ${registry.address}`);

   const FORWARDER = await ethers.getContractFactory('MinimalForwarder');
   const forwarder = await FORWARDER.connect(deployer).deploy();
   console.log(`\nForwarder address -> ${forwarder.address}`);

   const CX_MARKETPLACE = await ethers.getContractFactory('CX_Marketplace_V1');
   const cx_marketplace = await CX_MARKETPLACE.connect(deployer).deploy();
   console.log(`\nMarketplace address -> ${cx_marketplace.address}`);

   const CXFactoryERC1155 = await ethers.getContractFactory(
      'CX_Factory_ERC1155'
   );
   const factoryERC1155 = await CXFactoryERC1155.connect(deployer).deploy();
   console.log(`\nFactory (ERC1155) address -> ${factoryERC1155.address}`);

   const CXFactoryERC721 = await ethers.getContractFactory('CX_Factory_ERC721');
   const factoryERC721 = await CXFactoryERC721.connect(deployer).deploy();
   console.log(`\nFactory (ERC721) address -> ${factoryERC721.address}\n`);

   // ----- END OF DEPLOYMENTS -----

   // ----- INITIALIZATIONS -----

   await cx_marketplace
      .connect(deployer)
      .initialize('1.0', registry.address, forwarder.address);
   console.log('\nMarketplace Initialized');

   await registry
      .connect(deployer)
      .grantInitialAuthentication(cx_marketplace.address);
   console.log('\nMarketplace authenticated in Proxy Registry');

   await factoryERC1155
      .connect(deployer)
      .initialize('CX Factory SFT', registry.address, forwarder.address);
   console.log('\nERC1155 Factory Initialized');

   await factoryERC721
      .connect(deployer)
      .initialize('CX Factory NFT', registry.address, forwarder.address);
   console.log('\nERC721 Factory Initialized');

   if (XPRESS_TOKEN_ADDRESS) {
      await cx_marketplace
         .connect(deployer)
         .setPaymentTokenAllowed(XPRESS_TOKEN_ADDRESS, true); // approve xpress token
      console.log('\nApproved Xpress as Valid Payment Token for Marketplace');
   }

   // ----- END OF INITIALIZATIONS -----
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
