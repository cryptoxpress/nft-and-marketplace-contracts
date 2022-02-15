// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const { ethers } = require('hardhat');
async function main() {
   // Hardhat always runs the compile task when running scripts with its command
   // line interface.
   //
   // If this script is run directly using `node` you may want to call compile
   // manually to make sure everything is compiled
   await hre.run('compile');

   // We get the contract to deploy
   // const [deployer] = await ethers.getSigners();
   const accounts = await ethers.provider.listAccounts();
   console.log(accounts[0]);
   const deployer = accounts[0];
   console.log('Deploying contracts with the account:', deployer);

   const CXNFT = await ethers.getContractFactory('CXNFT');
   const CXNFTDeployer = await CXNFT.deploy();
   await CXNFTDeployer.deployed();
   console.log('CXNFT DEPLOYED', CXNFTDeployer.address);
   await CXNFTDeployer.initialize();

   // const asset = CXNFT.attach(CXNFTDeployer.address);
   // asset.on("Minted", (minter, price, nftID, uri) => {
   //   console.log(minter, price, nftID, uri);
   //   resolve(true);
   // });
   // const p = new Promise((resolve) => {
   //   // This assumes that the events are mutually exclusive

   //   // zwave.on('driver ready', () => );
   //   // zwave.on('driver failed', () => resolve(false));
   // });
   // let x = await asset.mint(
   //   "0x4b4C03ab5cd0D6D0d8216615807C95286766E5b2",
   //   1,
   //   0,
   //   1
   // );
   // x.wait();
   // console.log("Minted", x);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
   .then(() => process.exit(0))
   .catch((error) => {
      console.error(error);
      process.exit(1);
   });
