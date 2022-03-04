const { ethers } = require('hardhat');

// Change these addresses accordingly
const REGISTRY_ADDRESS = '0x40E9aceebd6FD1Da3a60b3F7DCf19011446DC3d3';
const FORWARDER_ADDRESS = '0x0Be6CA0eCBC45DEd5c2822BB8Ddc632b78575415';

async function main() {
   const [deployer] = await ethers.getSigners();

   console.log('Deploying contracts with the account:', deployer.address);

   console.log('Account balance:', (await deployer.getBalance()).toString());

   // ----- DEPLOYMENTS -----

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

   await factoryERC1155
      .connect(deployer)
      .initialize('CX Factory SFT', REGISTRY_ADDRESS, FORWARDER_ADDRESS);
   console.log('\nERC1155 Factory Initialized');

   await factoryERC721
      .connect(deployer)
      .initialize('CX Factory NFT', REGISTRY_ADDRESS, FORWARDER_ADDRESS);
   console.log('\nERC721 Factory Initialized');

   // ----- END OF INITIALIZATIONS -----
}

main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
