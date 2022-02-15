const { expect } = require('chai');
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require('../src/signer');
const { ZERO_ADDRESS, MAX_ALLOWANCE, LISTING_TYPES } = require('./util');

/*
   Test cases for CX Marketplace and CX ERC1155 & ERC721 Contracts 
   Note: Modify with care; Tests are dependent on each other
*/
describe('Marketplace and NFTs/SFTs Test', () => {
   let owner, addr1, addr2, addr3, addr4;
   let registry,
      cx_sft, // cx erc1155
      cx_nft, // cx erc721
      cx_marketplace,
      xpress,
      forwarder,
      testERC1155Token,
      testERC721Token;
   let token1, token2; // minted sft objects
   let nft1, nft2;
   let listedToken1Details = {}; // listing details of sft
   let listedNft1Details = {}; // listing details of nft

   // ------------------------------------------

   beforeEach(async () => {
      [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
   });

   before(async () => {
      const CXRegistry = await ethers.getContractFactory('CX_Proxy_Registry');
      registry = await CXRegistry.deploy();

      const CX_MARKETPLACE = await ethers.getContractFactory(
         'CX_Marketplace_V1'
      );
      cx_marketplace = await CX_MARKETPLACE.deploy();

      const CX_SFT = await ethers.getContractFactory('CXASSET_ERC1155');
      cx_sft = await CX_SFT.deploy();

      const CX_NFT = await ethers.getContractFactory('CXASSET_ERC721');
      cx_nft = await CX_NFT.deploy();

      const XPRESS_TOKEN = await ethers.getContractFactory('Xpress');
      xpress = await XPRESS_TOKEN.deploy();

      const GENERIC_ERC1155_CONTRACT = await ethers.getContractFactory(
         'TestERC1155Token'
      );
      testERC1155Token = await GENERIC_ERC1155_CONTRACT.deploy();

      const GENERIC_ERC721_CONTRACT = await ethers.getContractFactory(
         'TestERC721Token'
      );
      testERC721Token = await GENERIC_ERC721_CONTRACT.deploy();

      const FORWARDER = await ethers.getContractFactory('MinimalForwarder');
      forwarder = await FORWARDER.deploy();
   });

   // ------------------------------------------

   describe('Xpress Test Token Init', () => {
      it('Should initialize and assign the total supply of tokens to the owner', async () => {
         await xpress.connect(owner).initialize();
         const totalSupply = await xpress.totalSupply();
         expect(await xpress.balanceOf(owner.address)).to.equal(totalSupply);
      });

      it('Should be able to transfer tokens', async () => {
         const amountToSend1 = '5000000000000000000000';
         const amountToSend2 = '6900000000000000000000';
         await xpress.connect(owner).transfer(addr2.address, amountToSend1);
         await xpress.connect(owner).transfer(addr3.address, amountToSend2);

         expect(await xpress.balanceOf(addr2.address)).to.equal(amountToSend1);
         expect(await xpress.balanceOf(addr3.address)).to.equal(amountToSend2);
      });
   });

   // ------------------------------------------

   describe('Marketplace Contract Init', () => {
      it('Should initialize with correct details', async () => {
         const version = '1.0';
         await cx_marketplace
            .connect(owner)
            .initialize(version, registry.address, forwarder.address);

         expect(await cx_marketplace.name()).to.equal(
            'CryptoXpress NFT Marketplace'
         );
         expect(await cx_marketplace.symbol()).to.equal('CX_NFT_MARKET');
         expect(await cx_marketplace.owner()).to.equal(owner.address);
         expect(await cx_marketplace.version()).to.equal(version);
         expect(await cx_marketplace.registry()).to.equal(registry.address);
      });

      it('Should not allow xpress as payment token by default', async () => {
         expect(await cx_marketplace.allowedPaymentTokens(xpress.address)).to.be
            .false;
      });

      it('Should allow native token for payments by default', async () => {
         expect(await cx_marketplace.allowedPaymentTokens(ZERO_ADDRESS)).to.be
            .true;
      });

      it('Should allow owner to add/remove approved payment tokens', async () => {
         await expect(
            cx_marketplace
               .connect(addr1)
               .setPaymentTokenAllowed(xpress.address, true)
         ).to.be.revertedWith('Ownable: caller is not the owner');
         await cx_marketplace
            .connect(owner)
            .setPaymentTokenAllowed(xpress.address, true);
         expect(await cx_marketplace.allowedPaymentTokens(xpress.address)).to.be
            .true;
      });
   });

   // ------------------------------------------

   describe('Proxy Registry Contract Init', () => {
      let ownerProxy, addr1Proxy, addr2Proxy, addr3Proxy, addr4Proxy;
      it('Should give initial grant to Marketplace Contract', async () => {
         expect(await registry.contracts(cx_marketplace.address)).to.be.false;
         await registry
            .connect(owner)
            .grantInitialAuthentication(cx_marketplace.address);
         expect(await registry.contracts(cx_marketplace.address)).to.be.true;
      });

      it('Should register proxies for accounts', async () => {
         expect(await registry.proxies(owner.address)).to.equal(ZERO_ADDRESS);
         await registry.connect(owner).registerProxy();
         ownerProxy = await registry.proxies(owner.address);
         expect(ownerProxy).to.not.equal(ZERO_ADDRESS);

         await registry.connect(addr1).registerProxy();
         addr1Proxy = await registry.proxies(addr1.address);
         expect(addr1Proxy).to.not.equal(ZERO_ADDRESS);

         await registry.connect(addr2).registerProxy();
         addr2Proxy = await registry.proxies(addr2.address);
         expect(addr2Proxy).to.not.equal(ZERO_ADDRESS);

         await registry.connect(addr3).registerProxy();
         addr3Proxy = await registry.proxies(addr3.address);
         expect(addr3Proxy).to.not.equal(ZERO_ADDRESS);

         await registry.connect(addr4).registerProxy();
         addr4Proxy = await registry.proxies(addr4.address);
         expect(addr4Proxy).to.not.equal(ZERO_ADDRESS);
      });

      it('Should be able to hold users approvals', async () => {
         await xpress.connect(owner).approve(ownerProxy, MAX_ALLOWANCE);
         expect(await xpress.allowance(owner.address, ownerProxy)).to.equal(
            MAX_ALLOWANCE
         );

         await xpress.connect(addr1).approve(addr1Proxy, MAX_ALLOWANCE);
         expect(await xpress.allowance(addr1.address, addr1Proxy)).to.equal(
            MAX_ALLOWANCE
         );

         await xpress.connect(addr2).approve(addr2Proxy, MAX_ALLOWANCE);
         expect(await xpress.allowance(addr2.address, addr2Proxy)).to.equal(
            MAX_ALLOWANCE
         );

         await xpress.connect(addr3).approve(addr3Proxy, MAX_ALLOWANCE);
         expect(await xpress.allowance(addr3.address, addr3Proxy)).to.equal(
            MAX_ALLOWANCE
         );
      });
   });

   // ------------------------------------------

   describe('SFT/ERC1155 Contract Init', () => {
      it('Should initialize with correct details', async () => {
         const contract_name = 'CryptoXpress ERC1155 SFTs';
         const contract_symbol = 'CX_SFTs';
         const metadataUri = 'https://xyz.com';
         await cx_sft
            .connect(owner)
            .initialize(
               contract_name,
               contract_symbol,
               metadataUri,
               ZERO_ADDRESS,
               registry.address,
               addr1.address,
               forwarder.address
            );

         expect(await cx_sft.name()).to.equal(contract_name);
         expect(await cx_sft.symbol()).to.equal(contract_symbol);
         expect(await cx_sft.contractURI()).to.equal(metadataUri);
         expect(await cx_sft.owner()).to.equal(addr1.address);
         expect(await cx_sft.totalMinted()).to.equal(0);
      });
   });

   // ------------------------------------------

   describe('NFT/ERC721 Contract Init', () => {
      it('Should initialize with correct details', async () => {
         const contract_name = 'CryptoXpress ERC721 NFTs';
         const contract_symbol = 'CX_NFTs';
         const metadataUri = 'https://xyz.com';
         await cx_nft
            .connect(owner)
            .initialize(
               contract_name,
               contract_symbol,
               metadataUri,
               ZERO_ADDRESS,
               registry.address,
               addr1.address,
               forwarder.address
            );

         expect(await cx_nft.name()).to.equal(contract_name);
         expect(await cx_nft.symbol()).to.equal(contract_symbol);
         expect(await cx_nft.contractURI()).to.equal(metadataUri);
         expect(await cx_nft.owner()).to.equal(addr1.address);
         expect(await cx_nft.totalMinted()).to.equal(0);
      });
   });

   // ------------------------------------------

   describe('SFT/ERC1155 Minting', () => {
      token1 = {
         to: '',
         id: 22,
         amount: 3,
         metadataUri: `ipfs://token-22`,
         royalty: 1900,
         data: '0x',
      };

      it('Should mint token with id 22', async () => {
         token1.to = addr1.address;
         expect(await cx_sft.exists(token1.id)).to.be.false;
         await cx_sft
            .connect(addr1)
            .mint(
               token1.to,
               token1.id,
               token1.amount,
               token1.metadataUri,
               token1.royalty,
               token1.data
            );

         expect(await cx_sft.exists(token1.id)).to.be.true;
         expect(await cx_sft.totalSupply(token1.id)).to.equal(token1.amount);
         expect(await cx_sft.minterOf(token1.id)).to.equal(token1.to);
         expect(await cx_sft.uri(token1.id)).to.equal(token1.metadataUri);
         expect(await cx_sft.totalMinted()).to.equal(1);
      });

      it('Minted token should return royalty info correctly for given sale price', async () => {
         const salePrice = ethers.BigNumber.from('245540000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(token1.royalty))
            .div(10000);

         const [_receiver, _royalty] = await cx_sft.royaltyInfo(
            token1.id,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(token1.to);
      });

      it("Should give default approvals to only owner's proxy contract", async () => {
         const userProxy = await registry.proxies(token1.to);
         expect(await cx_sft.isApprovedForAll(token1.to, userProxy)).to.be.true;

         const randomUserProxy = await registry.proxies(addr2.address);
         expect(await cx_sft.isApprovedForAll(token1.to, randomUserProxy)).to.be
            .false;
      });

      it('Should allow collaborator to mint token', async () => {
         token2 = { ...token1 };
         token2.id = 52;
         token2.metadataUri = `ipfs://token-52`;
         token2.amount = 5;
         token2.to = addr2.address;

         expect(await cx_sft.exists(token2.id)).to.be.false;
         await expect(
            cx_sft
               .connect(addr2)
               .mint(
                  token2.to,
                  token2.id,
                  token2.amount,
                  token2.metadataUri,
                  token2.royalty,
                  token2.data
               )
         ).to.be.revertedWith(
            'OwnableAndCollab: caller is not the owner or a collaborator'
         );
         expect(await cx_sft.exists(token2.id)).to.be.false;

         expect(
            cx_sft.connect(addr2).setCollaborator(addr2.address, true)
         ).to.be.revertedWith('OwnableAndCollab: caller is not the owner');

         await cx_sft.connect(addr1).setCollaborator(addr2.address, true);
         await cx_sft
            .connect(addr2)
            .mint(
               token2.to,
               token2.id,
               token2.amount,
               token2.metadataUri,
               token2.royalty,
               token2.data
            );

         expect(await cx_sft.totalSupply(token2.id)).to.equal(token2.amount);
         expect(await cx_sft.minterOf(token2.id)).to.equal(token2.to);
         expect(await cx_sft.uri(token2.id)).to.equal(token2.metadataUri);
         expect(await cx_sft.totalMinted()).to.equal(2);

         const userProxy = await registry.proxies(token2.to);
         expect(await cx_sft.isApprovedForAll(token2.to, userProxy)).to.be.true;
      });
   });

   // ------------------------------------------

   describe('SFT/ERC1155 Batching', () => {
      const tokenStartId = 100;
      const tokenEndId = 300;
      const tokenTemplate = {
         to: '',
         id: tokenStartId,
         amount: '3',
         metadataUri: `ipfs://token-${tokenStartId}`,
         royalty: 1500,
         data: '0x',
      };
      let nftContract;

      const deployCXNFT = async () => {
         const CX_SFT = await ethers.getContractFactory('CXASSET_ERC1155');
         const _contract = await CX_SFT.connect(owner).deploy();
         await _contract
            .connect(owner)
            .initialize(
               'CX_SFT',
               'CX_SFT',
               '',
               ZERO_ADDRESS,
               cx_marketplace.address,
               addr1.address,
               forwarder.address
            );
         return _contract;
      };

      it('Should batch mint generic ERC1155 tokens', async () => {
         const GENERIC_ERC1155_CONTRACT = await ethers.getContractFactory(
            'TestERC1155Token'
         );
         const _testERC1155Token = await GENERIC_ERC1155_CONTRACT.deploy();

         const tokenIds = [],
            tokenAmounts = [];
         tokenTemplate.to = addr1.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            tokenAmounts.push(tokenTemplate.amount);
         }
         const tx = await _testERC1155Token
            .connect(owner)
            .mintBatch(
               tokenTemplate.to,
               tokenIds,
               tokenAmounts,
               tokenTemplate.data
            );
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed (Generic)');

         expect(await _testERC1155Token.totalMinted()).to.equal(
            tokenEndId - tokenStartId + 1
         );
      });

      it(`Should batch mint tokens (Minting ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         nftContract = await deployCXNFT();
         const tokenIds = [],
            tokenAmounts = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            tokenAmounts.push(tokenTemplate.amount);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         const tx = await nftContract
            .connect(addr1)
            .mintBatch(
               tokenTemplate.to,
               tokenIds,
               tokenAmounts,
               tokenUris,
               tokenRoyalties,
               tokenTemplate.data,
               { gasLimit: 30000000 }
            );
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed');
         expect(await nftContract.totalMinted()).to.equal(
            tokenEndId - tokenStartId + 1
         );
      });

      it(`Should batch change royalties (Changing for ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         const tokenIds = [],
            receivers = [],
            royalties = [];
         const newRoyalty = 900;
         const newReceiver = addr4.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            receivers.push(newReceiver);
            royalties.push(newRoyalty);
         }

         const tx = await nftContract
            .connect(addr1)
            .modifyTokenRoyaltyBatch(tokenIds, receivers, royalties, {
               gasLimit: 30000000,
            });
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed (Royalty Modifications)');

         const salePrice = ethers.BigNumber.from('694200000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(newRoyalty))
            .div(10000);
         // check royalty info for a changed token royalty
         const [_receiver, _royalty] = await nftContract.royaltyInfo(
            (tokenEndId - tokenStartId) / 2,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(newReceiver);
      });

      it(`Should revert state when batch minting fails`, async () => {
         const _nftContract = await deployCXNFT();
         const tokenIds = [],
            tokenAmounts = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = 1; i <= 100; i++) {
            tokenIds.push(i);
            tokenAmounts.push(tokenTemplate.amount);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         // mint a random token with id 10
         await _nftContract
            .connect(addr1)
            .mint(tokenTemplate.to, 10, 5, '', 1200, '0x');

         await expect(
            _nftContract
               .connect(addr1)
               .mintBatch(
                  tokenTemplate.to,
                  tokenIds,
                  tokenAmounts,
                  tokenUris,
                  tokenRoyalties,
                  tokenTemplate.data,
                  { gasLimit: 30000000 }
               )
         ).to.be.revertedWith('A token with id already exists');
         expect(await _nftContract.exists(1)).to.be.false;
         expect(await _nftContract.totalMinted()).to.equal(1);
      });
   });

   // ------------------------------------------

   describe('SFT/ERC1155 Error Checks', () => {
      it('Should not mint token with same id', async () => {
         await expect(
            cx_sft
               .connect(addr1)
               .mint(
                  token1.to,
                  token1.id,
                  token1.amount,
                  token1.metadataUri,
                  token1.royalty,
                  token1.data
               )
         ).to.be.revertedWith('Token already exists');
      });

      it('Should only allow owners/operators to burn token', async () => {
         const burnAmount = 1;
         token1.amount -= burnAmount;

         await expect(
            cx_sft.connect(addr2).burn(token1.to, token1.id, burnAmount)
         ).to.be.revertedWith('ERC1155: caller is not owner nor approved');

         await cx_sft.connect(addr1).setApprovalForAll(addr2.address, true);
         await cx_sft.connect(addr2).burn(token1.to, token1.id, burnAmount);
         await cx_sft.connect(addr1).setApprovalForAll(addr2.address, false);

         expect(await cx_sft.totalSupply(token1.id)).to.equal(token1.amount);
      });

      it('Should only allow minter to change royalty info', async () => {
         const newReceiver = addr1.address;
         const newRoyalty = 1500;
         await expect(
            cx_sft
               .connect(addr2)
               .modifyTokenRoyalty(token1.id, newReceiver, newRoyalty)
         ).to.be.revertedWith('Caller is not minter');

         await cx_sft
            .connect(addr1)
            .modifyTokenRoyalty(token1.id, newReceiver, newRoyalty);

         const salePrice = ethers.BigNumber.from('694200000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(newRoyalty))
            .div(10000);

         const [_receiver, _royalty] = await cx_sft.royaltyInfo(
            token1.id,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(newReceiver);

         token1.royalty = 1500;
      });

      it('Should only allow minter to modify metadata uri when it is unfrozen', async () => {
         const newUri = 'ipfs://zeroX';

         await expect(
            cx_sft.connect(addr2).setTokenUri(token1.id, newUri, false)
         ).to.be.revertedWith('Caller is not minter');

         await cx_sft.connect(addr1).setTokenUri(token1.id, newUri, false);

         expect(await cx_sft.uri(token1.id)).to.equal(newUri);

         await cx_sft.connect(addr1).freezeTokenUri(token1.id);

         await expect(
            cx_sft.connect(addr1).setTokenUri(token1.id, newUri, false)
         ).to.be.revertedWith('Cannot change frozen metadata');
      });

      it('Should not allow minter to increase royalty', async () => {
         await expect(
            cx_sft
               .connect(addr1)
               .modifyTokenRoyalty(
                  token1.id,
                  addr1.address,
                  token1.royalty + 100
               )
         ).to.be.revertedWith('Royalty cannot be increased');
      });

      it('Should not allow minting token with royalty greater than max royalty', async () => {
         const maxRoyalty = await cx_sft.maxRoyalty();

         await expect(
            cx_sft
               .connect(addr1)
               .mint(
                  addr2.address,
                  25,
                  1,
                  'ipfs://25',
                  maxRoyalty.add(100),
                  '0x'
               )
         ).to.be.revertedWith('Royalty exceeds limit');
      });
   });

   // ------------------------------------------

   describe('NFT/ERC721 Minting', () => {
      nft1 = {
         to: '',
         id: 22,
         metadataUri: `ipfs://token-22`,
         royalty: 1900,
         data: '0x',
      };

      it('Should mint token with id 22', async () => {
         nft1.to = addr1.address;
         await cx_nft
            .connect(addr1)
            .safeMint(nft1.to, nft1.id, nft1.metadataUri, nft1.royalty);

         expect(await cx_nft.ownerOf(nft1.id)).to.equal(nft1.to);
         expect(await cx_nft.minterOf(nft1.id)).to.equal(nft1.to);
         expect(await cx_nft.tokenURI(nft1.id)).to.equal(nft1.metadataUri);
         expect(await cx_nft.totalMinted()).to.equal(1);
      });

      it('Minted token should return royalty info correctly for given sale price', async () => {
         const salePrice = ethers.BigNumber.from('245540000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(nft1.royalty))
            .div(10000);

         const [_receiver, _royalty] = await cx_nft.royaltyInfo(
            nft1.id,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(nft1.to);
      });

      it("Should give default approvals to only owner's proxy contract", async () => {
         const userProxy = await registry.proxies(nft1.to);
         expect(await cx_nft.isApprovedForAll(nft1.to, userProxy)).to.be.true;

         const randomUserProxy = await registry.proxies(addr2.address);
         expect(await cx_nft.isApprovedForAll(nft1.to, randomUserProxy)).to.be
            .false;
      });

      it('Should allow collaborator to mint token', async () => {
         nft2 = { ...nft1 };
         nft2.id = 52;
         nft2.metadataUri = `ipfs://token-52`;
         nft2.amount = 5;
         nft2.to = addr2.address;

         await expect(
            cx_nft
               .connect(addr2)
               .safeMint(nft2.to, nft2.id, nft2.metadataUri, nft2.royalty)
         ).to.be.revertedWith(
            'OwnableAndCollab: caller is not the owner or a collaborator'
         );

         expect(
            cx_nft.connect(addr2).setCollaborator(addr2.address, true)
         ).to.be.revertedWith('OwnableAndCollab: caller is not the owner');

         await cx_nft.connect(addr1).setCollaborator(addr2.address, true);
         await cx_nft
            .connect(addr2)
            .safeMint(nft2.to, nft2.id, nft2.metadataUri, nft2.royalty);

         expect(await cx_nft.ownerOf(nft2.id)).to.equal(nft2.to);
         expect(await cx_nft.minterOf(nft2.id)).to.equal(nft2.to);
         expect(await cx_nft.tokenURI(nft2.id)).to.equal(nft2.metadataUri);
         expect(await cx_nft.totalMinted()).to.equal(2);

         const userProxy = await registry.proxies(nft2.to);
         expect(await cx_nft.isApprovedForAll(nft2.to, userProxy)).to.be.true;
      });
   });

   // ------------------------------------------

   describe('NFT/ERC721 Batching', () => {
      const tokenStartId = 100;
      const tokenEndId = 300;
      const tokenTemplate = {
         to: '',
         id: tokenStartId,
         metadataUri: `ipfs://token-${tokenStartId}`,
         royalty: 1500,
         data: '0x',
      };
      let nftContract;

      const deployCXNFT = async () => {
         const CX_NFT = await ethers.getContractFactory('CXASSET_ERC721');
         const _contract = await CX_NFT.connect(owner).deploy();
         await _contract
            .connect(owner)
            .initialize(
               'CX_NFT',
               'CX_NFT',
               '',
               ZERO_ADDRESS,
               cx_marketplace.address,
               addr1.address,
               forwarder.address
            );
         return _contract;
      };

      it(`Should batch mint tokens (Minting ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         nftContract = await deployCXNFT();
         const tokenIds = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         const tx = await nftContract
            .connect(addr1)
            .safeMintBatch(
               tokenTemplate.to,
               tokenIds,
               tokenUris,
               tokenRoyalties,
               {
                  gasLimit: 30000000,
               }
            );
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed');
         expect(await nftContract.totalMinted()).to.equal(
            tokenEndId - tokenStartId + 1
         );
      });

      it(`Should batch change royalties (Changing for ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         const tokenIds = [],
            receivers = [],
            royalties = [];
         const newRoyalty = 900;
         const newReceiver = addr4.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            receivers.push(newReceiver);
            royalties.push(newRoyalty);
         }

         const tx = await nftContract
            .connect(addr1)
            .modifyTokenRoyaltyBatch(tokenIds, receivers, royalties, {
               gasLimit: 30000000,
            });
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed (Royalty Modifications)');

         const salePrice = ethers.BigNumber.from('694200000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(newRoyalty))
            .div(10000);
         // check royalty info for a changed token royalty
         const [_receiver, _royalty] = await nftContract.royaltyInfo(
            (tokenEndId - tokenStartId) / 2,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(newReceiver);
      });

      it(`Should revert state when batch minting fails`, async () => {
         const _nftContract = await deployCXNFT();
         const tokenIds = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = 1; i <= 100; i++) {
            tokenIds.push(i);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         // mint a random token with id 10
         await _nftContract
            .connect(addr1)
            .safeMint(tokenTemplate.to, 10, '', 1200);

         await expect(
            _nftContract
               .connect(addr1)
               .safeMintBatch(
                  tokenTemplate.to,
                  tokenIds,
                  tokenUris,
                  tokenRoyalties,
                  { gasLimit: 30000000 }
               )
         ).to.be.revertedWith('ERC721: token already minted');

         expect(await _nftContract.totalMinted()).to.equal(1);
      });
   });

   // ------------------------------------------

   describe('NFT/ERC721 Error Checks', () => {
      it('Should not mint token with same id', async () => {
         await expect(
            cx_nft
               .connect(addr1)
               .safeMint(nft1.to, nft1.id, nft1.metadataUri, nft1.royalty)
         ).to.be.revertedWith('ERC721: token already minted');
      });

      it('Should only allow owners/operators to burn token', async () => {
         await expect(cx_nft.connect(addr2).burn(nft1.id)).to.be.revertedWith(
            'ERC721Burnable: caller is not owner nor approved'
         );

         await cx_nft.connect(addr1).setApprovalForAll(addr2.address, true);
         await cx_nft.connect(addr2).burn(nft1.id);
         await cx_nft.connect(addr1).setApprovalForAll(addr2.address, false);

         await expect(cx_nft.ownerOf(nft1.id)).to.be.revertedWith(
            'ERC721: owner query for nonexistent token'
         );
      });

      it('Should allow to remint burnt token (same id)', async () => {
         await expect(cx_nft.minterOf(nft1.id)).to.be.revertedWith(
            'Token does not exist'
         );

         await cx_nft
            .connect(addr1)
            .safeMint(nft1.to, nft1.id, nft1.metadataUri, nft1.royalty);

         expect(await cx_nft.ownerOf(nft1.id)).to.equal(nft1.to);
         expect(await cx_nft.minterOf(nft1.id)).to.equal(nft1.to);
         expect(await cx_nft.tokenURI(nft1.id)).to.equal(nft1.metadataUri);
      });

      it('Should only allow minter to change royalty info', async () => {
         const newReceiver = addr1.address;
         const newRoyalty = 1500;
         await expect(
            cx_nft
               .connect(addr2)
               .modifyTokenRoyalty(nft1.id, newReceiver, newRoyalty)
         ).to.be.revertedWith('Caller is not minter');

         await cx_nft
            .connect(addr1)
            .modifyTokenRoyalty(nft1.id, newReceiver, newRoyalty);

         const salePrice = ethers.BigNumber.from('694200000000000000000');
         const royalty = salePrice
            .mul(ethers.BigNumber.from(newRoyalty))
            .div(10000);

         const [_receiver, _royalty] = await cx_nft.royaltyInfo(
            nft1.id,
            salePrice
         );
         expect(_royalty).to.equal(royalty);
         expect(_receiver).to.equal(newReceiver);

         nft1.royalty = 1500;
      });

      it('Should only allow minter to modify metadata uri when it is unfrozen', async () => {
         const newUri = 'ipfs://zeroX';

         await expect(
            cx_nft.connect(addr2).setTokenUri(nft1.id, newUri, false)
         ).to.be.revertedWith('Caller is not minter');

         await cx_nft.connect(addr1).setTokenUri(nft1.id, newUri, false);

         expect(await cx_nft.tokenURI(nft1.id)).to.equal(newUri);

         await cx_nft.connect(addr1).freezeTokenUri(nft1.id);

         await expect(
            cx_nft.connect(addr1).setTokenUri(nft1.id, newUri, false)
         ).to.be.revertedWith('Cannot change frozen metadata');
      });

      it('Should not allow minter to increase royalty', async () => {
         await expect(
            cx_nft
               .connect(addr1)
               .modifyTokenRoyalty(nft1.id, addr1.address, nft1.royalty + 100)
         ).to.be.revertedWith('Royalty cannot be increased');
      });

      it('Should not allow minting token with royalty greater than max royalty', async () => {
         const maxRoyalty = await cx_nft.maxRoyalty();

         console.log(maxRoyalty, 'maxRoyalty');

         await expect(
            cx_nft
               .connect(addr1)
               .safeMint(addr2.address, 25, 'ipfs://25', maxRoyalty.add(100))
         ).to.be.revertedWith('Royalty exceeds limit');
      });
   });

   // ------------------------------------------

   describe('Marketplace Listing (SFT/ERC1155)', () => {
      it('Should list if account has sufficient token balance', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '25430000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };
         await cx_marketplace.connect(addr1).list(payload);

         listedToken1Details = await cx_marketplace.getListingDetails(
            payload.nftContract,
            addr1.address,
            payload.tokenId
         );

         expect(listedToken1Details.initialized).to.be.true;
         expect(listedToken1Details.nftContract).to.equal(payload.nftContract);
         expect(listedToken1Details.owner).to.equal(addr1.address);
         expect(listedToken1Details.tokenId).to.equal(payload.tokenId);
         expect(listedToken1Details.listingType).to.equal(payload.listingType);
         expect(listedToken1Details.listedQuantity).to.equal(
            payload.listQuantity
         );
         expect(listedToken1Details.price).to.equal(payload.price);
         expect(listedToken1Details.paymentToken).to.equal(
            payload.paymentToken
         );
         expect(listedToken1Details.endTime).to.equal(payload.endTime);
      });
   });

   // ------------------------------------------

   describe('Marketplace Delisting and Updating (SFT/ERC1155)', () => {
      const list = async () => {
         const newPrice = '420690000000000000000';
         const newPaymentToken = xpress.address;
         const newListQuantity = 2;

         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: newPrice,
            paymentToken: newPaymentToken,
            listQuantity: newListQuantity,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };
         await cx_marketplace.connect(addr1).list(payload);

         listedToken1Details = await cx_marketplace.getListingDetails(
            listedToken1Details.nftContract,
            addr1.address,
            listedToken1Details.tokenId
         );

         expect(listedToken1Details.price).to.equal(newPrice);
         expect(listedToken1Details.listedQuantity).to.equal(newListQuantity);
         expect(listedToken1Details.paymentToken).to.equal(newPaymentToken);
      };

      it('Should allow listing owner to relist', async () => {
         await list();
      });

      it('Should clear listing details when delisted', async () => {
         // delisting first listing of token 1
         await cx_marketplace
            .connect(addr1)
            .delist(
               listedToken1Details.nftContract,
               listedToken1Details.tokenId
            );

         listedToken1Details = await cx_marketplace.getListingDetails(
            listedToken1Details.nftContract,
            addr1.address,
            listedToken1Details.tokenId
         );

         expect(listedToken1Details.price).to.equal(0);
         expect(listedToken1Details.listedQuantity).to.equal(0);
         expect(listedToken1Details.listingType).to.equal(LISTING_TYPES.NONE);
      });

      it('Should allow listing owner to relist after a delist', async () => {
         await list();
      });
   });

   // ------------------------------------------

   describe('Marketplace Buying (SFT/ERC1155)', () => {
      let prevOwnerBal,
         newOwnerBal,
         prevBuyerBal,
         newBuyerBal,
         prevSellerBal,
         newSellerBal;

      it('Should allow anyone other than listing owner to buy NFT', async () => {
         prevOwnerBal = await xpress.balanceOf(owner.address);
         prevBuyerBal = await xpress.balanceOf(addr2.address);
         prevSellerBal = await xpress.balanceOf(listedToken1Details.owner);

         const buyAmount = 1;
         const payload = {
            tokenId: listedToken1Details.tokenId,
            quantity: buyAmount,
            nftContract: listedToken1Details.nftContract,
            fromAddress: listedToken1Details.owner,
         };

         await cx_marketplace.connect(addr2).buy(payload);

         expect(
            await cx_sft.balanceOf(addr2.address, listedToken1Details.tokenId)
         ).equal(buyAmount);
      });

      it('Should distribute commission and payments correctly', async () => {
         newOwnerBal = await xpress.balanceOf(owner.address);
         newBuyerBal = await xpress.balanceOf(addr2.address);
         newSellerBal = await xpress.balanceOf(listedToken1Details.owner);
         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = listedToken1Details.price
            .mul(commissionFraction)
            .div(10000);
         // NOTE: Royalty not applied to primary sales

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(prevBuyerBal.sub(newBuyerBal)).to.equal(
            listedToken1Details.price
         );
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            listedToken1Details.price.sub(commission)
         );
      });

      it('Should correctly distribute royalties on secondary sales', async () => {
         // listing for native tokens
         const newListingPayload = {
            tokenId: listedToken1Details.tokenId,
            nftContract: listedToken1Details.nftContract,
            price: '55000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await cx_sft
            .connect(addr2)
            .setApprovalForAll(cx_marketplace.address, true);
         await cx_marketplace.connect(addr2).list(newListingPayload);

         const newListingDetails = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr2.address,
            newListingPayload.tokenId
         );

         prevOwnerBal = await ethers.provider.getBalance(owner.address);
         prevSellerBal = await ethers.provider.getBalance(addr2.address);
         const prevMinterBal = await ethers.provider.getBalance(
            listedToken1Details.owner
         );

         const buyAmount = newListingDetails.listedQuantity;
         const buyPayload = {
            tokenId: newListingDetails.tokenId,
            quantity: buyAmount,
            nftContract: newListingDetails.nftContract,
            fromAddress: newListingDetails.owner,
         };

         // Buy
         await cx_marketplace.connect(addr3).buy(buyPayload, {
            // sending extra value
            value: newListingDetails.price
               .mul(buyAmount)
               .add('20000000000000000000'),
         });

         expect(
            await cx_sft.balanceOf(addr3.address, newListingDetails.tokenId)
         ).equal(buyAmount);

         newOwnerBal = await ethers.provider.getBalance(owner.address);
         newSellerBal = await ethers.provider.getBalance(
            newListingDetails.owner
         );
         const newMinterBal = await ethers.provider.getBalance(token1.to);

         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = newListingDetails.price
            .mul(commissionFraction)
            .div(10000);
         const [_receiver, _royalty] = await cx_sft.royaltyInfo(
            newListingDetails.tokenId,
            newListingDetails.price
         );

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            newListingDetails.price.sub(commission).sub(_royalty)
         );
         expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
      });
   });

   // ------------------------------------------

   describe('Marketplace Listing (NFT/ERC721)', () => {
      it('Should list if account is owner of token', async () => {
         const payload = {
            tokenId: nft1.id,
            nftContract: cx_nft.address,
            price: '25430000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };
         await cx_marketplace.connect(addr1).list(payload);

         listedNft1Details = await cx_marketplace.getListingDetails(
            payload.nftContract,
            addr1.address,
            payload.tokenId
         );

         expect(listedNft1Details.initialized).to.be.true;
         expect(listedNft1Details.nftContract).to.equal(payload.nftContract);
         expect(listedNft1Details.owner).to.equal(addr1.address);
         expect(listedNft1Details.tokenId).to.equal(payload.tokenId);
         expect(listedNft1Details.listingType).to.equal(payload.listingType);
         expect(listedNft1Details.listedQuantity).to.equal(
            payload.listQuantity
         );
         expect(listedNft1Details.price).to.equal(payload.price);
         expect(listedNft1Details.paymentToken).to.equal(payload.paymentToken);
         expect(listedNft1Details.endTime).to.equal(payload.endTime);
      });
   });

   // ------------------------------------------

   describe('Marketplace Delisting and Updating (NFT/ERC721)', () => {
      const list = async () => {
         const newPrice = '420690000000000000000';
         const newPaymentToken = xpress.address;

         const payload = {
            tokenId: nft1.id,
            nftContract: cx_nft.address,
            price: newPrice,
            paymentToken: newPaymentToken,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };
         await cx_marketplace.connect(addr1).list(payload);

         listedNft1Details = await cx_marketplace.getListingDetails(
            listedNft1Details.nftContract,
            addr1.address,
            listedNft1Details.tokenId
         );

         expect(listedNft1Details.price).to.equal(newPrice);
         expect(listedNft1Details.listedQuantity).to.equal(1);
         expect(listedNft1Details.paymentToken).to.equal(newPaymentToken);
      };

      it('Should allow listing owner to relist', async () => {
         await list();
      });

      it('Should clear listing details when delisted', async () => {
         // delisting first listing of token 1
         await cx_marketplace
            .connect(addr1)
            .delist(listedNft1Details.nftContract, listedNft1Details.tokenId);

         listedNft1Details = await cx_marketplace.getListingDetails(
            listedNft1Details.nftContract,
            addr1.address,
            listedNft1Details.tokenId
         );

         expect(listedNft1Details.price).to.equal(0);
         expect(listedNft1Details.listedQuantity).to.equal(0);
         expect(listedNft1Details.listingType).to.equal(LISTING_TYPES.NONE);
      });

      it('Should allow listing owner to relist after a delist', async () => {
         await list();
      });
   });

   // ------------------------------------------

   describe('Marketplace Buying (NFT/ERC721)', () => {
      let prevOwnerBal,
         newOwnerBal,
         prevBuyerBal,
         newBuyerBal,
         prevSellerBal,
         newSellerBal;

      it('Should allow anyone other than listing owner to buy NFT', async () => {
         prevOwnerBal = await xpress.balanceOf(owner.address);
         prevBuyerBal = await xpress.balanceOf(addr2.address);
         prevSellerBal = await xpress.balanceOf(listedNft1Details.owner);

         const payload = {
            tokenId: listedNft1Details.tokenId,
            quantity: 1,
            nftContract: listedNft1Details.nftContract,
            fromAddress: listedNft1Details.owner,
         };

         await cx_marketplace.connect(addr2).buy(payload);

         expect(await cx_nft.ownerOf(listedNft1Details.tokenId)).equal(
            addr2.address
         );
      });

      it('Should distribute commission and payments correctly', async () => {
         newOwnerBal = await xpress.balanceOf(owner.address);
         newBuyerBal = await xpress.balanceOf(addr2.address);
         newSellerBal = await xpress.balanceOf(listedNft1Details.owner);
         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = listedNft1Details.price
            .mul(commissionFraction)
            .div(10000);
         // NOTE: Royalty not applied to primary sales

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(prevBuyerBal.sub(newBuyerBal)).to.equal(
            listedNft1Details.price
         );
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            listedNft1Details.price.sub(commission)
         );
      });

      it('Should correctly distribute royalties on secondary sales', async () => {
         // listing for native tokens
         const newListingPayload = {
            tokenId: listedNft1Details.tokenId,
            nftContract: listedNft1Details.nftContract,
            price: '55000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await cx_sft
            .connect(addr2)
            .setApprovalForAll(cx_marketplace.address, true);
         await cx_marketplace.connect(addr2).list(newListingPayload);

         const newListingDetails = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr2.address,
            newListingPayload.tokenId
         );

         prevOwnerBal = await ethers.provider.getBalance(owner.address);
         prevSellerBal = await ethers.provider.getBalance(addr2.address);
         const prevMinterBal = await ethers.provider.getBalance(
            listedNft1Details.owner
         );

         const buyPayload = {
            tokenId: newListingDetails.tokenId,
            quantity: 1,
            nftContract: newListingDetails.nftContract,
            fromAddress: newListingDetails.owner,
         };

         // Buy
         await cx_marketplace.connect(addr3).buy(buyPayload, {
            // sending extra value
            value: newListingDetails.price.add('20000000000000000000'),
         });

         expect(await cx_nft.ownerOf(newListingDetails.tokenId)).equal(
            addr3.address
         );

         newOwnerBal = await ethers.provider.getBalance(owner.address);
         newSellerBal = await ethers.provider.getBalance(
            newListingDetails.owner
         );
         const newMinterBal = await ethers.provider.getBalance(token1.to);

         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = newListingDetails.price
            .mul(commissionFraction)
            .div(10000);
         const [_receiver, _royalty] = await cx_nft.royaltyInfo(
            newListingDetails.tokenId,
            newListingDetails.price
         );

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            newListingDetails.price.sub(commission).sub(_royalty)
         );
         expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
      });
   });

   // ------------------------------------------

   describe('Marketplace Batch Listing (SFT/ERC1155)', () => {
      const tokenStartId = 101;
      const tokenEndId = 200;
      const tokenTemplate = {
         to: '',
         id: tokenStartId,
         amount: 3,
         metadataUri: `ipfs://token-${tokenStartId}`,
         royalty: 1500,
         data: '0x',
      };
      const listingTemplate = {
         tokenId: 0,
         nftContract: null,
         price: '12000000000000000000',
         paymentToken: ZERO_ADDRESS,
         listQuantity: tokenTemplate.amount,
         listingType: LISTING_TYPES.FIXED_PRICE,
         startTime: 0,
         endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
      };

      const mintTokens = async () => {
         const CX_SFT = await ethers.getContractFactory('CXASSET_ERC1155');
         const contract = await CX_SFT.connect(owner).deploy();
         await contract
            .connect(owner)
            .initialize(
               'CX_SFT',
               'CX_SFT',
               '',
               ZERO_ADDRESS,
               registry.address,
               addr1.address,
               forwarder.address
            );
         const tokenIds = [],
            tokenAmounts = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            tokenAmounts.push(tokenTemplate.amount);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         const tx = await contract
            .connect(addr1)
            .mintBatch(
               tokenTemplate.to,
               tokenIds,
               tokenAmounts,
               tokenUris,
               tokenRoyalties,
               tokenTemplate.data,
               { gasLimit: 30000000 }
            );
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed (Mint)');

         return contract;
      };

      it(`Should batch list tokens (Listing ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         const contract = await mintTokens();
         tokenTemplate.to = addr1.address;
         listingTemplate.nftContract = contract.address;
         const listingPayload = [];
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            listingPayload.push({ ...listingTemplate, tokenId: i });
         }

         const tx = await cx_marketplace
            .connect(addr1)
            .listBatch(listingPayload, { gasLimit: 30000000 });
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed  (List)');
      });
   });

   // ------------------------------------------

   describe('Marketplace Batch Listing (NFT/ERC721)', () => {
      const tokenStartId = 101;
      const tokenEndId = 200;
      const tokenTemplate = {
         to: '',
         id: tokenStartId,
         metadataUri: `ipfs://token-${tokenStartId}`,
         royalty: 1500,
         data: '0x',
      };
      const listingTemplate = {
         tokenId: 0,
         nftContract: null,
         price: '12000000000000000000',
         paymentToken: ZERO_ADDRESS,
         listQuantity: 1,
         listingType: LISTING_TYPES.FIXED_PRICE,
         startTime: 0,
         endTime: 0,
      };

      const mintTokens = async () => {
         const CX_NFT = await ethers.getContractFactory('CXASSET_ERC721');
         const contract = await CX_NFT.connect(owner).deploy();
         await contract
            .connect(owner)
            .initialize(
               'CX_NFT',
               'CX_NFT',
               '',
               ZERO_ADDRESS,
               registry.address,
               addr1.address,
               forwarder.address
            );
         const tokenIds = [],
            tokenUris = [],
            tokenRoyalties = [];
         tokenTemplate.to = addr1.address;
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            tokenIds.push(i);
            tokenUris.push(`ipfs://token-${i}`);
            tokenRoyalties.push(tokenTemplate.royalty);
         }

         const tx = await contract
            .connect(addr1)
            .safeMintBatch(
               tokenTemplate.to,
               tokenIds,
               tokenUris,
               tokenRoyalties,
               { gasLimit: 30000000 }
            );
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed (Mint)');

         return contract;
      };

      it(`Should batch list tokens (Listing ${
         tokenEndId - tokenStartId + 1
      } tokens)`, async () => {
         const contract = await mintTokens();
         tokenTemplate.to = addr1.address;
         listingTemplate.nftContract = contract.address;
         const listingPayload = [];
         for (let i = tokenStartId; i <= tokenEndId; i++) {
            listingPayload.push({ ...listingTemplate, tokenId: i });
         }

         const tx = await cx_marketplace
            .connect(addr1)
            .listBatch(listingPayload, { gasLimit: 30000000 });
         const receipt = await tx.wait();
         console.log(receipt.gasUsed, 'gasUsed  (List)');
      });
   });

   // ------------------------------------------

   describe('Marketplace External ERC1155 NFTs', () => {
      let testToken;
      let listingDetails1, listingDetails2;

      it('Should allow any ERC1155 Token to be listed', async () => {
         // Mint a Test Token as contract owner for address 1
         testToken = {
            to: addr1.address,
            id: 42069,
            amount: 5,
            data: '0x',
         };
         await testERC1155Token
            .connect(owner)
            .mint(testToken.to, testToken.id, testToken.amount, testToken.data);

         expect(
            await testERC1155Token.balanceOf(testToken.to, testToken.id)
         ).equal(testToken.amount);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: testERC1155Token.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await testERC1155Token
            .connect(addr1)
            .setApprovalForAll(await registry.proxies(testToken.to), true);
         await cx_marketplace.connect(addr1).list(newListingPayload);

         listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr1.address,
            newListingPayload.tokenId
         );
      });

      it('Should allow any listed ERC1155 Token to be bought', async () => {
         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await cx_marketplace.connect(addr2).buy(buyPayload, {
            value: listingDetails1.price.mul(buyAmount),
         });

         expect(
            await testERC1155Token.balanceOf(
               addr2.address,
               listingDetails1.tokenId
            )
         ).equal(buyAmount);
      });

      it('Should not revert when handling royalties and commission if EIP2981 is not supported', async () => {
         const newListingPayload = {
            tokenId: listingDetails1.tokenId,
            nftContract: listingDetails1.nftContract,
            price: '20000000000000000000',
            paymentToken: xpress.address,
            listQuantity: 1,
            listingType: LISTING_TYPES.AUCTION,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await testERC1155Token
            .connect(addr2)
            .setApprovalForAll(await registry.proxies(addr2.address), true);
         await cx_marketplace.connect(addr2).list(newListingPayload);

         // Update Address#3 as approved bidder
         const bid = '32000000000000000000';
         await cx_marketplace
            .connect(addr2)
            .updateApprovedBidder(
               newListingPayload.nftContract,
               newListingPayload.tokenId,
               addr3.address,
               bid,
               1
            );

         listingDetails2 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr2.address,
            newListingPayload.tokenId
         );

         const prevOwnerBal = await xpress.balanceOf(owner.address);
         const prevSellerBal = await xpress.balanceOf(listingDetails2.owner);
         const prevBuyerBal = await xpress.balanceOf(addr3.address);
         const prevMinterBal = await xpress.balanceOf(testToken.to);

         const buyAmount = listingDetails2.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails2.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails2.nftContract,
            fromAddress: listingDetails2.owner,
         };

         // Buy
         await cx_marketplace.connect(addr3).buy(buyPayload);

         // check balances and token transfers
         expect(
            await testERC1155Token.balanceOf(
               addr3.address,
               listingDetails2.tokenId
            )
         ).equal(buyAmount);

         const newOwnerBal = await xpress.balanceOf(owner.address);
         const newSellerBal = await xpress.balanceOf(listingDetails2.owner);
         const newBuyerBal = await xpress.balanceOf(addr3.address);
         const newMinterBal = await xpress.balanceOf(testToken.to);

         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = listingDetails2.price
            .mul(commissionFraction)
            .div(10000);
         const _royalty = 0; // since royalties (EIP2981) are not supported in testERC1155Contract

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(prevBuyerBal.sub(newBuyerBal)).to.equal(listingDetails2.price);
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            listingDetails2.price.sub(commission).sub(_royalty)
         );
         expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
      });
   });

   // ------------------------------------------

   describe('Marketplace External ERC721 NFTs', () => {
      let testToken;
      let listingDetails1, listingDetails2;

      it('Should allow any ERC721 Token to be listed', async () => {
         // Mint a Test Token as contract owner for address 1
         testToken = {
            to: addr1.address,
            id: 42069,
         };
         await testERC721Token
            .connect(owner)
            .safeMint(testToken.to, testToken.id);

         expect(await testERC721Token.ownerOf(testToken.id)).equal(
            testToken.to
         );

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: testERC721Token.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await testERC721Token
            .connect(addr1)
            .setApprovalForAll(await registry.proxies(testToken.to), true);
         await cx_marketplace.connect(addr1).list(newListingPayload);

         listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr1.address,
            newListingPayload.tokenId
         );
      });

      it('Should allow any listed ERC721 Token to be bought', async () => {
         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await cx_marketplace.connect(addr2).buy(buyPayload, {
            value: listingDetails1.price.mul(buyAmount),
         });

         expect(await testERC721Token.ownerOf(listingDetails1.tokenId)).equal(
            addr2.address
         );
      });

      it('Should not revert when handling royalties and commission if EIP2981 is not supported', async () => {
         const newListingPayload = {
            tokenId: listingDetails1.tokenId,
            nftContract: listingDetails1.nftContract,
            price: '20000000000000000000',
            paymentToken: xpress.address,
            listQuantity: 1,
            listingType: LISTING_TYPES.AUCTION,
            startTime: 0,
            endTime: 0,
         };

         // Approve and List
         await testERC721Token
            .connect(addr2)
            .setApprovalForAll(await registry.proxies(addr2.address), true);
         await cx_marketplace.connect(addr2).list(newListingPayload);

         // Update Address#3 as approved bidder
         const bid = '32000000000000000000';
         await cx_marketplace
            .connect(addr2)
            .updateApprovedBidder(
               newListingPayload.nftContract,
               newListingPayload.tokenId,
               addr3.address,
               bid,
               1
            );

         listingDetails2 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr2.address,
            newListingPayload.tokenId
         );

         const prevOwnerBal = await xpress.balanceOf(owner.address);
         const prevSellerBal = await xpress.balanceOf(listingDetails2.owner);
         const prevBuyerBal = await xpress.balanceOf(addr3.address);
         const prevMinterBal = await xpress.balanceOf(testToken.to);

         const buyAmount = listingDetails2.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails2.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails2.nftContract,
            fromAddress: listingDetails2.owner,
         };

         // Buy
         await cx_marketplace.connect(addr3).buy(buyPayload);

         // check balances and token transfers
         expect(await testERC721Token.ownerOf(listingDetails2.tokenId)).equal(
            addr3.address
         );

         const newOwnerBal = await xpress.balanceOf(owner.address);
         const newSellerBal = await xpress.balanceOf(listingDetails2.owner);
         const newBuyerBal = await xpress.balanceOf(addr3.address);
         const newMinterBal = await xpress.balanceOf(testToken.to);

         const commissionFraction = await cx_marketplace.commissionPercentage();
         const commission = listingDetails2.price
            .mul(commissionFraction)
            .div(10000);
         const _royalty = 0; // since royalties (EIP2981) are not supported in testERC1155Contract

         expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
         expect(prevBuyerBal.sub(newBuyerBal)).to.equal(listingDetails2.price);
         expect(newSellerBal.sub(prevSellerBal)).to.equal(
            listingDetails2.price.sub(commission).sub(_royalty)
         );
         expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
      });
   });

   // ------------------------------------------

   describe('Marketplace Error Checks', () => {
      const mint = async (token) => {
         // mints cx erc1155 token
         expect(await cx_sft.exists(token.id)).to.be.false;
         await cx_sft
            .connect(addr1)
            .mint(
               token.to,
               token.id,
               token.amount,
               token.metadataUri,
               token.royalty,
               token.data
            );
         expect(await cx_sft.balanceOf(token.to, token.id)).to.equal(
            token.amount
         );
      };

      it('Should not allow to list with insufficient token balance', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '25690000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 20,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };
         await expect(
            cx_marketplace.connect(addr2).list(payload)
         ).to.be.revertedWith('Caller has insufficient ERC1155 Token Balance');
      });

      it('Should not allow to list with unapproved payment tokens', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '25690000000000000000',
            paymentToken: addr3.address,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith('Invalid Payment Token');
      });

      it('Should not allow to list with price or quantity as 0', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '0',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith('Price and List Quantity must be greater than 0');
         payload.price = '25690000000000000000';
         payload.listQuantity = 0;
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith('Price and List Quantity must be greater than 0');
      });

      it('Should revert when listed token owner has insufficient balance of the token', async () => {
         const mintAmount = 4;
         const burnAmount = 3;
         const testToken = {
            to: addr3.address,
            id: 30072015,
            amount: mintAmount,
            data: '0x',
         };
         await testERC1155Token
            .connect(owner)
            .mint(testToken.to, testToken.id, testToken.amount, testToken.data);

         expect(
            await testERC1155Token.balanceOf(testToken.to, testToken.id)
         ).equal(testToken.amount);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: testERC1155Token.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };

         // Approve and List
         await testERC1155Token
            .connect(addr3)
            .setApprovalForAll(await registry.proxies(testToken.to), true);
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         // burn tokens before buying
         await testERC1155Token
            .connect(addr3)
            .burn(testToken.to, testToken.id, burnAmount);

         expect(
            await testERC1155Token.balanceOf(testToken.to, testToken.id)
         ).equal(testToken.amount - burnAmount);

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount),
            })
         ).to.be.revertedWith('Seller has insufficient ERC1155 Tokens');

         expect(
            await testERC1155Token.balanceOf(
               addr4.address,
               listingDetails1.tokenId
            )
         ).equal(0);
      });

      it('Should revert if buyer has insufficient payment tokens', async () => {
         const testToken = {
            to: addr3.address,
            id: 420,
            amount: 3,
            metadataUri: `ipfs://token-420`,
            royalty: 1900,
            data: '0x',
         };
         // mint
         await mint(testToken);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_sft.address,
            price: '12000000000000000000',
            paymentToken: xpress.address,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // List
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount),
            })
         ).to.be.revertedWith(
            'Caller has insufficient balance of payment tokens'
         );

         expect(
            await cx_sft.balanceOf(addr3.address, listingDetails1.tokenId)
         ).equal(testToken.amount);
         expect(
            await cx_sft.balanceOf(addr4.address, listingDetails1.tokenId)
         ).equal(0);
      });

      it('Should revert if buyer has sent insufficient value with transaction', async () => {
         const testToken = {
            to: addr3.address,
            id: 420,
            amount: 3,
            metadataUri: `ipfs://token-420`,
            royalty: 1900,
            data: '0x',
         };

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_sft.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // List
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount).sub(1),
            })
         ).to.be.revertedWith('Insufficient funds sent with transaction');

         expect(
            await cx_sft.balanceOf(addr3.address, listingDetails1.tokenId)
         ).equal(testToken.amount);
         expect(
            await cx_sft.balanceOf(addr4.address, listingDetails1.tokenId)
         ).equal(0);
      });

      it('Should revert buy if listing time has expired', async () => {
         const testToken = {
            to: addr3.address,
            id: 421,
            amount: 3,
            metadataUri: `ipfs://token-421`,
            royalty: 1900,
            data: '0x',
         };
         // mint
         await mint(testToken);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_sft.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2021-01-01').getTime() / 1000).toFixed(0),
         };

         // List
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount),
            })
         ).to.be.revertedWith('Listing has expired');

         expect(
            await cx_sft.balanceOf(addr3.address, listingDetails1.tokenId)
         ).equal(testToken.amount);
         expect(
            await cx_sft.balanceOf(addr4.address, listingDetails1.tokenId)
         ).equal(0);
      });

      it('Should revert buy if listing has not started', async () => {
         const testToken = {
            to: addr3.address,
            id: 422,
            amount: 3,
            metadataUri: `ipfs://token-422`,
            royalty: 1900,
            data: '0x',
         };
         // mint
         await mint(testToken);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_sft.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: (new Date().getTime() / 1000).toFixed(0) + 2629746,
            endTime: 0,
         };

         // List
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount),
            })
         ).to.be.revertedWith('Listing not started');

         expect(
            await cx_sft.balanceOf(addr3.address, listingDetails1.tokenId)
         ).equal(testToken.amount);
         expect(
            await cx_sft.balanceOf(addr4.address, listingDetails1.tokenId)
         ).equal(0);
      });

      it('CX NFTs: Should allow buyer to buy even after seller changes proxy after listing', async () => {
         const testToken = {
            to: addr3.address,
            id: 5092000,
            amount: 3,
            metadataUri: `ipfs://token-22`,
            royalty: 1900,
            data: '0x',
         };
         // mint
         await mint(testToken);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_sft.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };

         // List
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         // changing seller's proxy before buying
         const prevProxy = await registry.proxies(addr3.address);
         await registry.connect(addr3).registerProxyOverride();
         const newProxy = await registry.proxies(addr3.address);
         expect(prevProxy).to.not.equal(newProxy);

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await cx_marketplace.connect(addr4).buy(buyPayload, {
            value: listingDetails1.price.mul(buyAmount),
         });

         expect(
            await cx_sft.balanceOf(addr3.address, listingDetails1.tokenId)
         ).equal(testToken.amount - buyAmount);
         expect(
            await cx_sft.balanceOf(addr4.address, listingDetails1.tokenId)
         ).equal(buyAmount);
      });

      it('External NFTs: Should revert when buyer buys after seller changes proxy after listing', async () => {
         const testToken = {
            to: addr3.address,
            id: 19072021,
            amount: 5,
            data: '0x',
         };
         await testERC1155Token
            .connect(owner)
            .mint(testToken.to, testToken.id, testToken.amount, testToken.data);

         expect(
            await testERC1155Token.balanceOf(testToken.to, testToken.id)
         ).equal(testToken.amount);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: testERC1155Token.address,
            price: '12000000000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 2,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };

         // Approve and List
         await testERC1155Token
            .connect(addr3)
            .setApprovalForAll(await registry.proxies(testToken.to), true);
         await cx_marketplace.connect(addr3).list(newListingPayload);

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            addr3.address,
            newListingPayload.tokenId
         );

         // changing seller's proxy before buying
         const prevProxy = await registry.proxies(addr3.address);
         await registry.connect(addr3).registerProxyOverride();
         const newProxy = await registry.proxies(addr3.address);
         expect(prevProxy).to.not.equal(newProxy);

         const buyAmount = listingDetails1.listedQuantity;
         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: buyAmount,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         // Buy
         await expect(
            cx_marketplace.connect(addr4).buy(buyPayload, {
               value: listingDetails1.price.mul(buyAmount),
            })
         ).to.be.revertedWith('Transfer of Tokens Failed');

         expect(
            await testERC1155Token.balanceOf(
               addr4.address,
               listingDetails1.tokenId
            )
         ).equal(0);
      });

      it('Should not allow to list when token/account/contract is banned', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '250000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };

         // ban token
         await cx_marketplace
            .connect(owner)
            .setTokenBan(payload.nftContract, payload.tokenId, true);
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith(
            'TokenId, Contract, or Account is banned from listing'
         );

         // unban token
         await cx_marketplace
            .connect(owner)
            .setTokenBan(payload.nftContract, payload.tokenId, false);
         // ban contract
         await cx_marketplace
            .connect(owner)
            .setContractBan(payload.nftContract, true);
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith(
            'TokenId, Contract, or Account is banned from listing'
         );

         // unban contract
         await cx_marketplace
            .connect(owner)
            .setContractBan(payload.nftContract, false);
         // ban account
         await cx_marketplace.connect(owner).setAccountBan(addr1.address, true);
         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith(
            'TokenId, Contract, or Account is banned from listing'
         );

         // unban account
         await cx_marketplace
            .connect(owner)
            .setAccountBan(addr1.address, false);
         await cx_marketplace.connect(addr1).list(payload);
      });

      it('Should not allow to list when Marketplace is paused', async () => {
         const payload = {
            tokenId: token1.id,
            nftContract: cx_sft.address,
            price: '250000000000000',
            paymentToken: ZERO_ADDRESS,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
         };

         cx_marketplace.connect(owner).pause();

         await expect(
            cx_marketplace.connect(addr1).list(payload)
         ).to.be.revertedWith('Pausable: paused');

         cx_marketplace.connect(owner).unpause();
      });

      it('Should allow to delist when Marketplace is paused', async () => {
         cx_marketplace.connect(owner).pause();
         expect(await cx_marketplace.paused(), 'Pausable: paused');

         await cx_marketplace.connect(addr1).delist(cx_sft.address, token1.id);

         cx_marketplace.connect(owner).unpause();
      });

      it('Should allow only owner to update proxy registry', async () => {
         await expect(
            cx_marketplace.connect(addr2).updateProxyRegistry(ZERO_ADDRESS)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         await cx_marketplace.connect(owner).updateProxyRegistry(ZERO_ADDRESS);

         expect(await cx_marketplace.registry()).to.equal(ZERO_ADDRESS);

         await cx_marketplace
            .connect(owner)
            .updateProxyRegistry(registry.address);
      });

      it('Should allow only owner to update trusted forwarder', async () => {
         await expect(
            cx_marketplace.connect(addr2).updateTrustedForwarder(ZERO_ADDRESS)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         expect(await cx_marketplace.isTrustedForwarder(ZERO_ADDRESS)).to.be
            .false;

         await cx_marketplace
            .connect(owner)
            .updateTrustedForwarder(ZERO_ADDRESS);

         expect(await cx_marketplace.isTrustedForwarder(ZERO_ADDRESS)).to.be
            .true;

         await cx_marketplace
            .connect(owner)
            .updateTrustedForwarder(forwarder.address);
      });
   });

   // ------------------------------------------

   describe('Meta Transaction', () => {
      const mint = async (token) => {
         // mints cx erc1155 token
         await expect(cx_nft.ownerOf(token.id)).to.be.revertedWith(
            'ERC721: owner query for nonexistent token'
         );
         await cx_nft
            .connect(addr1)
            .safeMint(token.to, token.id, token.metadataUri, token.royalty);
         expect(await cx_nft.ownerOf(token.id)).to.equal(token.to);
      };

      it('Should allow listing and buying through relayed transactions', async () => {
         const seller = addr3;
         const relayer = addr2;
         const _forwarder = forwarder.connect(relayer);

         const testToken = {
            to: seller.address,
            id: 420,
            metadataUri: `ipfs://token-420`,
            royalty: 1900,
            data: '0x',
         };

         await mint(testToken);

         const newListingPayload = {
            tokenId: testToken.id,
            nftContract: cx_nft.address,
            price: '5000000000000000000',
            paymentToken: xpress.address,
            listQuantity: 1,
            listingType: LISTING_TYPES.FIXED_PRICE,
            startTime: 0,
            endTime: 0,
         };

         // List
         const signedReq1 = await signMetaTxRequest(
            seller.provider,
            _forwarder,
            {
               from: seller.address,
               to: cx_marketplace.address,
               data: cx_marketplace.interface.encodeFunctionData('list', [
                  newListingPayload,
               ]),
            }
         );
         const tx1 = await _forwarder.execute(
            signedReq1.request,
            signedReq1.signature
         );
         await tx1.wait();

         const listingDetails1 = await cx_marketplace.getListingDetails(
            newListingPayload.nftContract,
            seller.address,
            newListingPayload.tokenId
         );

         // Check successful listing
         expect(listingDetails1.listedQuantity).to.equal(
            newListingPayload.listQuantity
         );
         expect(listingDetails1.listingType).to.equal(
            newListingPayload.listingType
         );
         expect(listingDetails1.owner).to.equal(seller.address);

         const buyPayload = {
            tokenId: listingDetails1.tokenId,
            quantity: 1,
            nftContract: listingDetails1.nftContract,
            fromAddress: listingDetails1.owner,
         };

         const buyer = addr4;

         // send some xpress to buyer
         await xpress
            .connect(owner)
            .transfer(buyer.address, '6900000000000000000000');
         // approve proxy to spend xpress
         const buyerProxy = await registry.proxies(buyer.address);
         await xpress.connect(buyer).approve(buyerProxy, MAX_ALLOWANCE);

         // Buy
         const signedReq2 = await signMetaTxRequest(
            buyer.provider,
            _forwarder,
            {
               from: buyer.address,
               to: cx_marketplace.address,
               data: cx_marketplace.interface.encodeFunctionData('buy', [
                  buyPayload,
               ]),
            }
         );
         const tx2 = await _forwarder.execute(
            signedReq2.request,
            signedReq2.signature
         );
         await tx2.wait();

         expect(await cx_nft.ownerOf(listingDetails1.tokenId)).to.equal(
            buyer.address
         );
      });
   });
});
