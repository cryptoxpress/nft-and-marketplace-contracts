# CryptoXpress Marketplace and Registry Contracts

## Test

`npx hardhat test`

## Generate ABIs

`npx hardhat clear-abi && npx hardhat export-abi`

Current ABIs can be found [in ./data/abi](data/abi).

## Deploy Contracts

`npx hardhat run scripts/deployAndInitAll.js --network bscMainNet`

## Verify Contract

`npx hardhat verify <DEPLOYED_CONTRACT_ADDRESS> --network bscMainNet`

### **Current Deployed Contract - (_BSC Mainnet_)**

CX_NFT (Old Marketplace + ERC1155 Contract): `0x1dF12C7cE1c6E1598F2c9C663EcFaB0Fb7ECec17`

### **Current Deployed Contracts - (_Rinkeby_)**

Proxy:
[0x1511434049c919B749F886e882286A581E1E968f](https://rinkeby.etherscan.io/address/0x1511434049c919B749F886e882286A581E1E968f#code)

Forwarder:
[0x0Be6CA0eCBC45DEd5c2822BB8Ddc632b78575415](https://rinkeby.etherscan.io/address/0x0Be6CA0eCBC45DEd5c2822BB8Ddc632b78575415#code)

Marketplace:
[0xB9BE916d902689d8B3b1fFE373e272d206E2Ac94](https://rinkeby.etherscan.io/address/0xB9BE916d902689d8B3b1fFE373e272d206E2Ac94#code)

Xpress Test Token:
[0x14671973c4931C3BFf4A9C732cD8ba6447fe1253](https://rinkeby.etherscan.io/address/0x14671973c4931C3BFf4A9C732cD8ba6447fe1253#code)

ERC1155 Factory:
[0xc4f61C097f8420706a5fC0FF92F5787e5Ed1B194](https://rinkeby.etherscan.io/address/0xc4f61C097f8420706a5fC0FF92F5787e5Ed1B194#code)

ERC721 Factory:
[0x3ecc16D6C360A5D968ADC737933c38184A698603](https://rinkeby.etherscan.io/address/0x3ecc16D6C360A5D968ADC737933c38184A698603#code)
