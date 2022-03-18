const { ethers } = require('hardhat');

// Change these addresses accordingly
const REGISTRY_ADDRESS = '0x1511434049c919B749F886e882286A581E1E968f';
const FORWARDER_ADDRESS = '0x0Be6CA0eCBC45DEd5c2822BB8Ddc632b78575415';
const XPRESS_ADDRESS = '0x0Be6CA0eCBC45DEd5c2822BB8Ddc632b78575415';

async function main() {
   const [deployer] = await ethers.getSigners();

   console.log('Deploying contracts with the account:', deployer.address);

   console.log('Account balance:', (await deployer.getBalance()).toString());

   // ----- DEPLOYMENTS -----

   const CXRegistry = await ethers.getContractFactory('CX_Proxy_Registry');
   const registry = await CXRegistry.connect(deployer).deploy();
   console.log(`\nRegistry address -> ${registry.address}`);

   const CX_MARKETPLACE = await ethers.getContractFactory('CX_Marketplace_V1');
   const cx_marketplace = await CX_MARKETPLACE.connect(deployer).deploy();
   console.log(`\nMarketplace address -> ${cx_marketplace.address}`);

   // ----- END OF DEPLOYMENTS -----

   // ----- INITIALIZATIONS -----

   await cx_marketplace
      .connect(deployer)
      .initialize('1.0', registry.address, FORWARDER_ADDRESS);
   console.log('\nMarketplace Initialized');

   await registry
      .connect(deployer)
      .grantInitialAuthentication(cx_marketplace.address);
   console.log('\nMarketplace authenticated in Proxy Registry');

   await cx_marketplace
      .connect(deployer)
      .setPaymentTokenAllowed(XPRESS_ADDRESS, true); // approve test xpress token
   console.log('\nApproved Xpress as Valid Payment Token for Marketplace');

   // ----- END OF INITIALIZATIONS -----
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
