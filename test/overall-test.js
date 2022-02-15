// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const { ZERO_ADDRESS, MAX_ALLOWANCE, LISTING_TYPES } = require('./util');

// describe('Marketplace Test', () => {
//    let owner, addr1, addr2, addr3, addr4;
//    let cx_nft, cx_marketplace, xpress, testERC1155Token, testERC721Token;
//    let token1, token2; // minted token objects
//    let listedToken1Details = {}; // listing details of token

//    // ------------------------------------------

//    beforeEach(async () => {
//       [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
//    });

//    before(async () => {
//       const CX_MARKETPLACE = await ethers.getContractFactory('CX_Marketplace');
//       cx_marketplace = await CX_MARKETPLACE.deploy();
//       console.log(
//          `\n${cx_marketplace.address} -> Marketplace Contract address\n`
//       );

//       const CX_NFT = await ethers.getContractFactory('CXASSET_ERC1155');
//       cx_nft = await CX_NFT.deploy();
//       console.log(`${cx_nft.address} -> NFT Contract address\n`);

//       const XPRESS_TOKEN = await ethers.getContractFactory('Xpress');
//       xpress = await XPRESS_TOKEN.deploy();
//       console.log(`${xpress.address} -> Xpress Token address\n`);

//       const GENERIC_ERC1155_CONTRACT = await ethers.getContractFactory(
//          'TestERC1155Token'
//       );
//       testERC1155Token = await GENERIC_ERC1155_CONTRACT.deploy();
//       console.log(
//          `${testERC1155Token.address} -> Generic ERC1155 Token Contract address\n`
//       );

//       const GENERIC_ERC721_CONTRACT = await ethers.getContractFactory(
//          'TestERC721Token'
//       );
//       testERC721Token = await GENERIC_ERC721_CONTRACT.deploy();
//       console.log(
//          `${testERC721Token.address} -> Generic ERC721 Token Contract address\n\n`
//       );
//    });

//    // ------------------------------------------

//    describe('Xpress Test Token Init', () => {
//       it('Should initialize and assign the total supply of tokens to the owner', async () => {
//          await xpress.connect(owner).initialize();
//          const totalSupply = await xpress.totalSupply();
//          expect(await xpress.balanceOf(owner.address)).to.equal(totalSupply);
//       });

//       it('Should be able to transfer tokens', async () => {
//          const amountToSend1 = '5000000000000000000000';
//          const amountToSend2 = '6900000000000000000000';
//          await xpress.connect(owner).transfer(addr2.address, amountToSend1);
//          await xpress.connect(owner).transfer(addr3.address, amountToSend2);

//          expect(await xpress.balanceOf(addr2.address)).to.equal(amountToSend1);
//          expect(await xpress.balanceOf(addr3.address)).to.equal(amountToSend2);
//       });

//       it('Should be able give approvals/allowances', async () => {
//          await xpress
//             .connect(addr2)
//             .approve(cx_marketplace.address, MAX_ALLOWANCE);
//          await xpress
//             .connect(addr3)
//             .approve(cx_marketplace.address, MAX_ALLOWANCE);

//          expect(
//             await xpress.allowance(addr2.address, cx_marketplace.address)
//          ).to.equal(MAX_ALLOWANCE);
//          expect(
//             await xpress.allowance(addr3.address, cx_marketplace.address)
//          ).to.equal(MAX_ALLOWANCE);
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Contract Init', () => {
//       it('Should initialize with correct details', async () => {
//          const contract_name = 'CryptoXpress Marketplace';
//          const contract_symbol = 'CX_MARKET';
//          await cx_marketplace
//             .connect(owner)
//             .initialize(contract_name, contract_symbol);

//          expect(await cx_marketplace.name()).to.equal(contract_name);
//          expect(await cx_marketplace.symbol()).to.equal(contract_symbol);
//          expect(await cx_marketplace.owner()).to.equal(owner.address);
//       });

//       it('Should not allow xpress as payment token by default', async () => {
//          expect(await cx_marketplace.allowedPaymentTokens(xpress.address)).to.be
//             .false;
//       });

//       it('Should allow native token for payments by default', async () => {
//          expect(await cx_marketplace.allowedPaymentTokens(ZERO_ADDRESS)).to.be
//             .true;
//       });

//       it('Should allow owner to add/remove approved payment tokens', async () => {
//          await expect(
//             cx_marketplace
//                .connect(addr1)
//                .setPaymentTokenAllowed(xpress.address, true)
//          ).to.be.revertedWith('Ownable: caller is not the owner');
//          await cx_marketplace
//             .connect(owner)
//             .setPaymentTokenAllowed(xpress.address, true);
//          expect(await cx_marketplace.allowedPaymentTokens(xpress.address)).to.be
//             .true;
//       });
//    });

//    // ------------------------------------------

//    describe('NFT Contract Init', () => {
//       it('Should initialize with correct details', async () => {
//          const contract_name = 'CryptoXpress ERC1155 NFTs';
//          const contract_symbol = 'CX_NFTs';
//          const metadataUri = 'https://xyz.com';
//          await cx_nft
//             .connect(owner)
//             .initialize(
//                contract_name,
//                contract_symbol,
//                metadataUri,
//                ZERO_ADDRESS,
//                cx_marketplace.address,
//                addr1.address
//             );

//          expect(await cx_nft.name()).to.equal(contract_name);
//          expect(await cx_nft.symbol()).to.equal(contract_symbol);
//          expect(await cx_nft.contractURI()).to.equal(metadataUri);
//          expect(await cx_nft.owner()).to.equal(addr1.address);
//          expect(await cx_nft.totalMinted()).to.equal(0);
//       });

//       // it('Should correctly set Marketplace Contract Address for default approval only by Owner', async () => {
//       //    await expect(
//       //       cx_nft
//       //          .connect(owner)
//       //          .updateMarketplaceContract(cx_marketplace.address)
//       //    ).to.be.revertedWith('Ownable: caller is not the owner');

//       //    await cx_nft
//       //       .connect(addr1)
//       //       .updateMarketplaceContract(cx_marketplace.address);
//       //    expect(await cx_nft.marketplaceContract()).to.equal(
//       //       cx_marketplace.address
//       //    );
//       // });
//    });

//    // ------------------------------------------

//    describe('NFT Minting', () => {
//       token1 = {
//          to: '',
//          id: 22,
//          amount: 3,
//          metadataUri: `ipfs://token-22`,
//          royalty: 1900,
//          data: '0x',
//       };

//       it('Should mint token with id 22', async () => {
//          token1.to = addr1.address;
//          expect(await cx_nft.exists(token1.id)).to.be.false;
//          await cx_nft
//             .connect(addr1)
//             .mint(
//                token1.to,
//                token1.id,
//                token1.amount,
//                token1.metadataUri,
//                token1.royalty,
//                token1.data
//             );

//          expect(await cx_nft.exists(token1.id)).to.be.true;
//          expect(await cx_nft.totalSupply(token1.id)).to.equal(token1.amount);
//          expect(await cx_nft.minterOf(token1.id)).to.equal(token1.to);
//          expect(await cx_nft.uri(token1.id)).to.equal(token1.metadataUri);
//          expect(await cx_nft.totalMinted()).to.equal(1);
//       });

//       it('Minted token should return royalty info correctly for given sale price', async () => {
//          const salePrice = ethers.BigNumber.from('245540000000000000000');
//          const royalty = salePrice
//             .mul(ethers.BigNumber.from(token1.royalty))
//             .div(10000);

//          const [_receiver, _royalty] = await cx_nft.royaltyInfo(
//             token1.id,
//             salePrice
//          );
//          expect(_royalty).to.equal(royalty);
//          expect(_receiver).to.equal(token1.to);
//       });

//       it('Minting a token should give default approval to marketplace contract', async () => {
//          expect(
//             await cx_nft.isApprovedForAll(token1.to, cx_marketplace.address)
//          ).to.be.true;
//       });

//       it('Should allow collaborator to mint token', async () => {
//          token2 = { ...token1 };
//          token2.id = 52;
//          token2.metadataUri = `ipfs://token-52`;
//          token2.amount = 5;
//          token2.to = addr2.address;

//          expect(await cx_nft.exists(token2.id)).to.be.false;
//          await expect(
//             cx_nft
//                .connect(addr2)
//                .mint(
//                   token2.to,
//                   token2.id,
//                   token2.amount,
//                   token2.metadataUri,
//                   token2.royalty,
//                   token2.data
//                )
//          ).to.be.revertedWith(
//             'OwnableAndCollab: caller is not the owner or a collaborator'
//          );
//          expect(await cx_nft.exists(token2.id)).to.be.false;

//          expect(
//             cx_nft.connect(addr2).setCollaborator(addr2.address, true)
//          ).to.be.revertedWith('OwnableAndCollab: caller is not the owner');

//          await cx_nft.connect(addr1).setCollaborator(addr2.address, true);
//          await cx_nft
//             .connect(addr2)
//             .mint(
//                token2.to,
//                token2.id,
//                token2.amount,
//                token2.metadataUri,
//                token2.royalty,
//                token2.data
//             );

//          expect(await cx_nft.totalSupply(token2.id)).to.equal(token2.amount);
//          expect(await cx_nft.minterOf(token2.id)).to.equal(token2.to);
//          expect(await cx_nft.uri(token2.id)).to.equal(token2.metadataUri);
//          expect(await cx_nft.totalMinted()).to.equal(2);
//       });
//    });

//    // ------------------------------------------

//    describe('NFT Batching', () => {
//       const tokenStartId = 100;
//       const tokenEndId = 300;
//       const tokenTemplate = {
//          to: '',
//          id: tokenStartId,
//          amount: '3',
//          metadataUri: `ipfs://token-${tokenStartId}`,
//          royalty: 1500,
//          data: '0x',
//       };

//       const deployCXNFT = async () => {
//          const CX_NFT = await ethers.getContractFactory('CXASSET_ERC1155');
//          const contract = await CX_NFT.connect(owner).deploy();
//          await contract
//             .connect(owner)
//             .initialize(
//                'CX_NFT',
//                'CX_NFT',
//                '',
//                ZERO_ADDRESS,
//                cx_marketplace.address,
//                addr1.address
//             );
//          return contract;
//       };

//       it('Should batch mint generic ERC1155 tokens', async () => {
//          const GENERIC_ERC1155_CONTRACT = await ethers.getContractFactory(
//             'TestERC1155Token'
//          );
//          const _testERC1155Token = await GENERIC_ERC1155_CONTRACT.deploy();

//          const tokenIds = [],
//             tokenAmounts = [];
//          tokenTemplate.to = addr1.address;
//          for (let i = tokenStartId; i <= tokenEndId; i++) {
//             tokenIds.push(i);
//             tokenAmounts.push(tokenTemplate.amount);
//          }
//          const tx = await _testERC1155Token
//             .connect(owner)
//             .mintBatch(
//                tokenTemplate.to,
//                tokenIds,
//                tokenAmounts,
//                tokenTemplate.data
//             );
//          const receipt = await tx.wait();
//          console.log(receipt.gasUsed, 'gasUsed (Generic)');

//          expect(await _testERC1155Token.totalMinted()).to.equal(
//             tokenEndId - tokenStartId + 1
//          );
//       });

//       it(`Should batch mint tokens (Minting ${
//          tokenEndId - tokenStartId + 1
//       } tokens)`, async () => {
//          const nftContract = await deployCXNFT();
//          const tokenIds = [],
//             tokenAmounts = [],
//             tokenUris = [],
//             tokenRoyalties = [];
//          tokenTemplate.to = addr1.address;
//          for (let i = tokenStartId; i <= tokenEndId; i++) {
//             tokenIds.push(i);
//             tokenAmounts.push(tokenTemplate.amount);
//             tokenUris.push(`ipfs://token-${i}`);
//             tokenRoyalties.push(tokenTemplate.royalty);
//          }

//          const tx = await nftContract
//             .connect(addr1)
//             .mintBatch(
//                tokenTemplate.to,
//                tokenIds,
//                tokenAmounts,
//                tokenUris,
//                tokenRoyalties,
//                tokenTemplate.data,
//                { gasLimit: 30000000 }
//             );
//          const receipt = await tx.wait();
//          console.log(receipt.gasUsed, 'gasUsed');
//          expect(await nftContract.totalMinted()).to.equal(
//             tokenEndId - tokenStartId + 1
//          );
//       });

//       it(`Should revert state when batch minting fails`, async () => {
//          const nftContract = await deployCXNFT();
//          const tokenIds = [],
//             tokenAmounts = [],
//             tokenUris = [],
//             tokenRoyalties = [];
//          tokenTemplate.to = addr1.address;
//          for (let i = 1; i <= 100; i++) {
//             tokenIds.push(i);
//             tokenAmounts.push(tokenTemplate.amount);
//             tokenUris.push(`ipfs://token-${i}`);
//             tokenRoyalties.push(tokenTemplate.royalty);
//          }

//          // mint a random token with id 10
//          await nftContract
//             .connect(addr1)
//             .mint(tokenTemplate.to, 10, 5, '', 1200, '0x');

//          await expect(
//             nftContract
//                .connect(addr1)
//                .mintBatch(
//                   tokenTemplate.to,
//                   tokenIds,
//                   tokenAmounts,
//                   tokenUris,
//                   tokenRoyalties,
//                   tokenTemplate.data,
//                   { gasLimit: 30000000 }
//                )
//          ).to.be.revertedWith('A token with id already exists');
//          expect(await nftContract.exists(1)).to.be.false;
//          expect(await nftContract.totalMinted()).to.equal(1);
//       });
//    });

//    // ------------------------------------------

//    describe('NFT Error Checks', () => {
//       it('Should not mint token with same id', async () => {
//          await expect(
//             cx_nft
//                .connect(addr1)
//                .mint(
//                   token1.to,
//                   token1.id,
//                   token1.amount,
//                   token1.metadataUri,
//                   token1.royalty,
//                   token1.data
//                )
//          ).to.be.revertedWith('Token already exists');
//       });

//       it('Should only allow owners/operators to burn token', async () => {
//          const burnAmount = 1;
//          token1.amount -= burnAmount;

//          await expect(
//             cx_nft.connect(addr2).burn(token1.to, token1.id, burnAmount)
//          ).to.be.revertedWith('ERC1155: caller is not owner nor approved');

//          await cx_nft.connect(addr1).setApprovalForAll(addr2.address, true);
//          await cx_nft.connect(addr2).burn(token1.to, token1.id, burnAmount);
//          await cx_nft.connect(addr1).setApprovalForAll(addr2.address, false);

//          expect(await cx_nft.totalSupply(token1.id)).to.equal(token1.amount);
//       });

//       it('Should only allow minter to change royalty info', async () => {
//          const newReceiver = addr1.address;
//          const newRoyalty = 1500;
//          await expect(
//             cx_nft
//                .connect(addr2)
//                .modifyTokenRoyalty(token1.id, newReceiver, newRoyalty)
//          ).to.be.revertedWith('Caller is not minter');

//          await cx_nft
//             .connect(addr1)
//             .modifyTokenRoyalty(token1.id, newReceiver, newRoyalty);

//          const salePrice = ethers.BigNumber.from('694200000000000000000');
//          const royalty = salePrice
//             .mul(ethers.BigNumber.from(newRoyalty))
//             .div(10000);

//          const [_receiver, _royalty] = await cx_nft.royaltyInfo(
//             token1.id,
//             salePrice
//          );
//          expect(_royalty).to.equal(royalty);
//          expect(_receiver).to.equal(newReceiver);

//          token1.royalty = 1500;
//       });

//       it('Should only allow minter to modify metadata uri when it is unfrozen', async () => {
//          const newUri = 'ipfs://zeroX';

//          await expect(
//             cx_nft.connect(addr2).setTokenUri(token1.id, newUri)
//          ).to.be.revertedWith('Caller is not minter');

//          await cx_nft.connect(addr1).setTokenUri(token1.id, newUri);

//          expect(await cx_nft.uri(token1.id)).to.equal(newUri);

//          await cx_nft.connect(addr1).freezeTokenUri(token1.id);

//          await expect(
//             cx_nft.connect(addr1).setTokenUri(token1.id, newUri)
//          ).to.be.revertedWith('Cannot change frozen metadata');
//       });

//       it('Should not allow minter to increase royalty', async () => {
//          await expect(
//             cx_nft
//                .connect(addr1)
//                .modifyTokenRoyalty(
//                   token1.id,
//                   addr1.address,
//                   token1.royalty + 100
//                )
//          ).to.be.revertedWith('Royalty cannot be increased');
//       });

//       it('Should not allow minting token with royalty greater than max royalty', async () => {
//          const maxRoyalty = await cx_nft.maxRoyalty();

//          await expect(
//             cx_nft
//                .connect(addr1)
//                .mint(addr2.address, 25, 1, 'ipfs://25', maxRoyalty + 100, '0x')
//          ).to.be.revertedWith('Royalty exceeds limit');
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Listing', () => {
//       it('Should list if account has sufficient token balance', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '25430000000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };
//          await cx_marketplace.connect(addr1).list(payload);

//          listedToken1Details = await cx_marketplace.getListingDetails(
//             payload.nftContract,
//             addr1.address,
//             payload.tokenId
//          );

//          expect(listedToken1Details.initialized).to.be.true;
//          expect(listedToken1Details.nftContract).to.equal(payload.nftContract);
//          expect(listedToken1Details.owner).to.equal(addr1.address);
//          expect(listedToken1Details.tokenId).to.equal(payload.tokenId);
//          expect(listedToken1Details.listingType).to.equal(payload.listingType);
//          expect(listedToken1Details.listedQuantity).to.equal(
//             payload.listQuantity
//          );
//          expect(listedToken1Details.price).to.equal(payload.price);
//          expect(listedToken1Details.paymentToken).to.equal(
//             payload.paymentToken
//          );
//          expect(listedToken1Details.endTime).to.equal(payload.endTime);
//          expect(listedToken1Details.cxUser).to.equal(payload.cxUser);
//          expect(listedToken1Details.isReserved).to.equal(payload.isReserved);
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Delisting and Updating', () => {
//       const list = async () => {
//          const newPrice = '420690000000000000000';
//          const newPaymentToken = xpress.address;
//          const newListQuantity = 2;

//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: newPrice,
//             paymentToken: newPaymentToken,
//             listQuantity: newListQuantity,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };
//          await cx_marketplace.connect(addr1).list(payload);

//          listedToken1Details = await cx_marketplace.getListingDetails(
//             listedToken1Details.nftContract,
//             addr1.address,
//             listedToken1Details.tokenId
//          );

//          expect(listedToken1Details.price).to.equal(newPrice);
//          expect(listedToken1Details.listedQuantity).to.equal(newListQuantity);
//          expect(listedToken1Details.paymentToken).to.equal(newPaymentToken);
//       };

//       it('Should allow listing owner to relist', async () => {
//          await list();
//       });

//       it('Should transfer NFT back to lister when delisted', async () => {
//          const prevNFTBal = await cx_nft.balanceOf(
//             addr1.address,
//             listedToken1Details.tokenId
//          );

//          listedToken1Details = await cx_marketplace.getListingDetails(
//             listedToken1Details.nftContract,
//             addr1.address,
//             listedToken1Details.tokenId
//          );

//          // delisting first listing of token 1
//          await cx_marketplace
//             .connect(addr1)
//             .delist(
//                listedToken1Details.nftContract,
//                listedToken1Details.tokenId,
//                62
//             );
//          const newNFTBal = await cx_nft.balanceOf(
//             addr1.address,
//             listedToken1Details.tokenId
//          );

//          expect(newNFTBal - prevNFTBal).to.equal(
//             listedToken1Details.listedQuantity
//          );
//       });

//       it('Should allow listing owner to relist after a delist', async () => {
//          await list();
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Buying', () => {
//       let prevOwnerBal,
//          newOwnerBal,
//          prevBuyerBal,
//          newBuyerBal,
//          prevSellerBal,
//          newSellerBal;

//       it('Should allow anyone other than listing owner to buy NFT', async () => {
//          prevOwnerBal = await xpress.balanceOf(owner.address);
//          prevBuyerBal = await xpress.balanceOf(addr2.address);
//          prevSellerBal = await xpress.balanceOf(listedToken1Details.owner);

//          const buyAmount = 1;
//          const payload = {
//             tokenId: listedToken1Details.tokenId,
//             quantity: buyAmount,
//             nftContract: listedToken1Details.nftContract,
//             fromAddress: listedToken1Details.owner,
//             cxUser: '90',
//          };

//          await cx_marketplace.connect(addr2).buy(payload);

//          expect(
//             await cx_nft.balanceOf(addr2.address, listedToken1Details.tokenId)
//          ).equal(buyAmount);
//       });

//       it('Should distribute commission and payments correctly', async () => {
//          newOwnerBal = await xpress.balanceOf(owner.address);
//          newBuyerBal = await xpress.balanceOf(addr2.address);
//          newSellerBal = await xpress.balanceOf(listedToken1Details.owner);
//          const commissionFraction = await cx_marketplace.commissionPercentage();
//          const commission = listedToken1Details.price
//             .mul(commissionFraction)
//             .div(10000);
//          // NOTE: Royalty not applied to primary sales

//          expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
//          expect(prevBuyerBal.sub(newBuyerBal)).to.equal(
//             listedToken1Details.price
//          );
//          expect(newSellerBal.sub(prevSellerBal)).to.equal(
//             listedToken1Details.price.sub(commission)
//          );
//       });

//       it('Should correctly distribute royalties on secondary sales', async () => {
//          // listing for native tokens
//          const newListingPayload = {
//             tokenId: listedToken1Details.tokenId,
//             nftContract: listedToken1Details.nftContract,
//             price: '55000000000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // Approve and List
//          await cx_nft
//             .connect(addr2)
//             .setApprovalForAll(cx_marketplace.address, true);
//          await cx_marketplace.connect(addr2).list(newListingPayload);

//          const newListingDetails = await cx_marketplace.getListingDetails(
//             newListingPayload.nftContract,
//             addr2.address,
//             newListingPayload.tokenId
//          );

//          prevOwnerBal = await ethers.provider.getBalance(owner.address);
//          prevSellerBal = await ethers.provider.getBalance(addr2.address);
//          const prevMinterBal = await ethers.provider.getBalance(
//             listedToken1Details.owner
//          );

//          const buyAmount = newListingDetails.listedQuantity;
//          const buyPayload = {
//             tokenId: newListingDetails.tokenId,
//             quantity: buyAmount,
//             nftContract: newListingDetails.nftContract,
//             fromAddress: newListingDetails.owner,
//             cxUser: '105',
//          };

//          // Buy
//          await cx_marketplace.connect(addr3).buy(buyPayload, {
//             value: newListingDetails.price.mul(buyAmount),
//          });

//          expect(
//             await cx_nft.balanceOf(addr3.address, newListingDetails.tokenId)
//          ).equal(buyAmount);

//          newOwnerBal = await ethers.provider.getBalance(owner.address);
//          newSellerBal = await ethers.provider.getBalance(
//             newListingDetails.owner
//          );
//          const newMinterBal = await ethers.provider.getBalance(token1.to);

//          const commissionFraction = await cx_marketplace.commissionPercentage();
//          const commission = newListingDetails.price
//             .mul(commissionFraction)
//             .div(10000);
//          const [_receiver, _royalty] = await cx_nft.royaltyInfo(
//             newListingDetails.tokenId,
//             newListingDetails.price
//          );
//          console.log(_royalty, 'royalty');

//          expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
//          // NOTE: Not checking buyer balance difference due to subtracted unknown gas fees
//          expect(newSellerBal.sub(prevSellerBal)).to.equal(
//             newListingDetails.price.sub(commission).sub(_royalty)
//          );
//          expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Batch Listing', () => {
//       const tokenStartId = 101;
//       const tokenEndId = 200;
//       const tokenTemplate = {
//          to: '',
//          id: tokenStartId,
//          amount: '3',
//          metadataUri: `ipfs://token-${tokenStartId}`,
//          royalty: 1500,
//          data: '0x',
//       };
//       const listingTemplate = {
//          tokenId: 0,
//          nftContract: null,
//          price: '12000000000000000000',
//          paymentToken: ZERO_ADDRESS,
//          listQuantity: 1,
//          listingType: LISTING_TYPES.FIXED_PRICE,
//          endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//          isReserved: false,
//          cxUser: 62,
//       };

//       const mintTokens = async () => {
//          const CX_NFT = await ethers.getContractFactory('CXASSET_ERC1155');
//          const contract = await CX_NFT.connect(owner).deploy();
//          await contract
//             .connect(owner)
//             .initialize(
//                'CX_NFT',
//                'CX_NFT',
//                '',
//                ZERO_ADDRESS,
//                cx_marketplace.address,
//                addr1.address
//             );
//          const tokenIds = [],
//             tokenAmounts = [],
//             tokenUris = [],
//             tokenRoyalties = [];
//          tokenTemplate.to = addr1.address;
//          for (let i = tokenStartId; i <= tokenEndId; i++) {
//             tokenIds.push(i);
//             tokenAmounts.push(tokenTemplate.amount);
//             tokenUris.push(`ipfs://token-${i}`);
//             tokenRoyalties.push(tokenTemplate.royalty);
//          }

//          const tx = await contract
//             .connect(addr1)
//             .mintBatch(
//                tokenTemplate.to,
//                tokenIds,
//                tokenAmounts,
//                tokenUris,
//                tokenRoyalties,
//                tokenTemplate.data,
//                { gasLimit: 30000000 }
//             );
//          const receipt = await tx.wait();
//          console.log(receipt.gasUsed, 'gasUsed (Mint)');

//          return contract;
//       };

//       it(`Should batch list tokens (Listing ${
//          tokenEndId - tokenStartId + 1
//       } tokens)`, async () => {
//          const contract = await mintTokens();
//          // const tokenIds = [],
//          //    tokenAmounts = [],
//          //    tokenUris = [],
//          //    tokenRoyalties = [];
//          tokenTemplate.to = addr1.address;
//          listingTemplate.nftContract = contract.address;
//          const listingPayload = [];
//          for (let i = tokenStartId; i <= tokenEndId; i++) {
//             listingPayload.push({ ...listingTemplate, tokenId: i });
//          }

//          const tx = await cx_marketplace
//             .connect(addr1)
//             .listBatch(listingPayload, { gasLimit: 30000000 });
//          const receipt = await tx.wait();
//          console.log(receipt.gasUsed, 'gasUsed  (List)');
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace External ERC1155 NFTs', () => {
//       let testToken;
//       let listingDetails1, listingDetails2;

//       it('Should allow any ERC1155 Token to be listed', async () => {
//          // Mint a Test Token as contract owner for address 1
//          testToken = {
//             to: addr1.address,
//             id: 42069,
//             amount: 5,
//             data: '0x',
//          };
//          await testERC1155Token
//             .connect(owner)
//             .mint(testToken.to, testToken.id, testToken.amount, testToken.data);

//          expect(
//             await testERC1155Token.balanceOf(testToken.to, testToken.id)
//          ).equal(testToken.amount);

//          const newListingPayload = {
//             tokenId: testToken.id,
//             nftContract: testERC1155Token.address,
//             price: '12000000000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 2,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // Approve and List
//          await testERC1155Token
//             .connect(addr1)
//             .setApprovalForAll(cx_marketplace.address, true);
//          await cx_marketplace.connect(addr1).list(newListingPayload);

//          listingDetails1 = await cx_marketplace.getListingDetails(
//             newListingPayload.nftContract,
//             addr1.address,
//             newListingPayload.tokenId
//          );
//       });

//       it('Should allow any listed ERC1155 Token to be bought', async () => {
//          const buyAmount = listingDetails1.listedQuantity;
//          const buyPayload = {
//             tokenId: listingDetails1.tokenId,
//             quantity: buyAmount,
//             nftContract: listingDetails1.nftContract,
//             fromAddress: listingDetails1.owner,
//             cxUser: '105',
//          };

//          // Buy
//          await cx_marketplace.connect(addr2).buy(buyPayload, {
//             value: listingDetails1.price.mul(buyAmount),
//          });

//          expect(
//             await testERC1155Token.balanceOf(
//                addr2.address,
//                listingDetails1.tokenId
//             )
//          ).equal(buyAmount);
//       });

//       it('Should not revert when handling royalties and commission if EIP2981 is not supported', async () => {
//          const newListingPayload = {
//             tokenId: listingDetails1.tokenId,
//             nftContract: listingDetails1.nftContract,
//             price: '20000000000000000000',
//             paymentToken: xpress.address,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.AUCTION,
//             endTime: (new Date('2022-02-02').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // Approve and List
//          await testERC1155Token
//             .connect(addr2)
//             .setApprovalForAll(cx_marketplace.address, true);
//          await cx_marketplace.connect(addr2).list(newListingPayload);

//          // Update Address#3 as approved bidder
//          const bid = '32000000000000000000';
//          await cx_marketplace
//             .connect(addr2)
//             .updateApprovedBidder(
//                newListingPayload.nftContract,
//                newListingPayload.tokenId,
//                addr3.address,
//                bid,
//                1,
//                1
//             );

//          listingDetails2 = await cx_marketplace.getListingDetails(
//             newListingPayload.nftContract,
//             addr2.address,
//             newListingPayload.tokenId
//          );

//          const prevOwnerBal = await xpress.balanceOf(owner.address);
//          const prevSellerBal = await xpress.balanceOf(listingDetails2.owner);
//          const prevBuyerBal = await xpress.balanceOf(addr3.address);
//          const prevMinterBal = await xpress.balanceOf(testToken.to);

//          const buyAmount = listingDetails2.listedQuantity;
//          const buyPayload = {
//             tokenId: listingDetails2.tokenId,
//             quantity: buyAmount,
//             nftContract: listingDetails2.nftContract,
//             fromAddress: listingDetails2.owner,
//             cxUser: '105',
//          };

//          // Buy
//          await cx_marketplace.connect(addr3).buy(buyPayload);

//          // check balances and token transfers
//          expect(
//             await testERC1155Token.balanceOf(
//                addr3.address,
//                listingDetails2.tokenId
//             )
//          ).equal(buyAmount);

//          const newOwnerBal = await xpress.balanceOf(owner.address);
//          const newSellerBal = await xpress.balanceOf(listingDetails2.owner);
//          const newBuyerBal = await xpress.balanceOf(addr3.address);
//          const newMinterBal = await xpress.balanceOf(testToken.to);

//          const commissionFraction = await cx_marketplace.commissionPercentage();
//          const commission = listingDetails2.price
//             .mul(commissionFraction)
//             .div(10000);
//          const _royalty = 0; // since royalties (EIP2981) are not supported in testERC1155Contract

//          expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
//          expect(prevBuyerBal.sub(newBuyerBal)).to.equal(listingDetails2.price);
//          expect(newSellerBal.sub(prevSellerBal)).to.equal(
//             listingDetails2.price.sub(commission).sub(_royalty)
//          );
//          expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace External ERC721 NFTs', () => {
//       let testToken;
//       let listingDetails1, listingDetails2;

//       it('Should allow any ERC721 Token to be listed', async () => {
//          // Mint a Test Token as contract owner for address 1
//          testToken = {
//             to: addr1.address,
//             id: 42069,
//          };
//          await testERC721Token
//             .connect(owner)
//             .safeMint(testToken.to, testToken.id);

//          expect(await testERC721Token.ownerOf(testToken.id)).equal(
//             testToken.to
//          );

//          const newListingPayload = {
//             tokenId: testToken.id,
//             nftContract: testERC721Token.address,
//             price: '12000000000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // Approve and List
//          await testERC721Token
//             .connect(addr1)
//             .setApprovalForAll(cx_marketplace.address, true);
//          await cx_marketplace.connect(addr1).list(newListingPayload);

//          listingDetails1 = await cx_marketplace.getListingDetails(
//             newListingPayload.nftContract,
//             addr1.address,
//             newListingPayload.tokenId
//          );
//       });

//       it('Should allow any listed ERC721 Token to be bought', async () => {
//          const buyAmount = listingDetails1.listedQuantity;
//          const buyPayload = {
//             tokenId: listingDetails1.tokenId,
//             quantity: buyAmount,
//             nftContract: listingDetails1.nftContract,
//             fromAddress: listingDetails1.owner,
//             cxUser: '105',
//          };

//          // Buy
//          await cx_marketplace.connect(addr2).buy(buyPayload, {
//             value: listingDetails1.price.mul(buyAmount),
//          });

//          expect(await testERC721Token.ownerOf(listingDetails1.tokenId)).equal(
//             addr2.address
//          );
//       });

//       it('Should not revert when handling royalties and commission if EIP2981 is not supported', async () => {
//          const newListingPayload = {
//             tokenId: listingDetails1.tokenId,
//             nftContract: listingDetails1.nftContract,
//             price: '20000000000000000000',
//             paymentToken: xpress.address,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.AUCTION,
//             endTime: (new Date('2022-02-02').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // Approve and List
//          await testERC721Token
//             .connect(addr2)
//             .setApprovalForAll(cx_marketplace.address, true);
//          await cx_marketplace.connect(addr2).list(newListingPayload);

//          // Update Address#3 as approved bidder
//          const bid = '32000000000000000000';
//          await cx_marketplace
//             .connect(addr2)
//             .updateApprovedBidder(
//                newListingPayload.nftContract,
//                newListingPayload.tokenId,
//                addr3.address,
//                bid,
//                1,
//                1
//             );

//          listingDetails2 = await cx_marketplace.getListingDetails(
//             newListingPayload.nftContract,
//             addr2.address,
//             newListingPayload.tokenId
//          );

//          const prevOwnerBal = await xpress.balanceOf(owner.address);
//          const prevSellerBal = await xpress.balanceOf(listingDetails2.owner);
//          const prevBuyerBal = await xpress.balanceOf(addr3.address);
//          const prevMinterBal = await xpress.balanceOf(testToken.to);

//          const buyAmount = listingDetails2.listedQuantity;
//          const buyPayload = {
//             tokenId: listingDetails2.tokenId,
//             quantity: buyAmount,
//             nftContract: listingDetails2.nftContract,
//             fromAddress: listingDetails2.owner,
//             cxUser: '105',
//          };

//          // Buy
//          await cx_marketplace.connect(addr3).buy(buyPayload);

//          // check balances and token transfers
//          expect(await testERC721Token.ownerOf(listingDetails2.tokenId)).equal(
//             addr3.address
//          );

//          const newOwnerBal = await xpress.balanceOf(owner.address);
//          const newSellerBal = await xpress.balanceOf(listingDetails2.owner);
//          const newBuyerBal = await xpress.balanceOf(addr3.address);
//          const newMinterBal = await xpress.balanceOf(testToken.to);

//          const commissionFraction = await cx_marketplace.commissionPercentage();
//          const commission = listingDetails2.price
//             .mul(commissionFraction)
//             .div(10000);
//          const _royalty = 0; // since royalties (EIP2981) are not supported in testERC1155Contract

//          expect(newOwnerBal.sub(prevOwnerBal)).to.equal(commission);
//          expect(prevBuyerBal.sub(newBuyerBal)).to.equal(listingDetails2.price);
//          expect(newSellerBal.sub(prevSellerBal)).to.equal(
//             listingDetails2.price.sub(commission).sub(_royalty)
//          );
//          expect(newMinterBal.sub(prevMinterBal)).to.equal(_royalty);
//       });
//    });

//    // ------------------------------------------

//    describe('Marketplace Error Checks', () => {
//       it('Should not allow to list with insufficient token balance', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '25690000000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 20,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };
//          await expect(
//             cx_marketplace.connect(addr2).list(payload)
//          ).to.be.revertedWith('Caller has insufficient ERC1155 Token Balance');
//       });

//       it('Should not allow to list with unapproved payment tokens', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '25690000000000000000',
//             paymentToken: addr3.address,
//             listQuantity: 2,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith('Invalid Payment Token');
//       });

//       it('Should not allow to list with price or quantity as 0', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '0',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 2,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith('Price and List Quantity must be greater than 0');
//          payload.price = '25690000000000000000';
//          payload.listQuantity = 0;
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith('Price and List Quantity must be greater than 0');
//       });

//       it('Should not allow to list when token/account/contract is banned', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '250000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          // ban token
//          await cx_marketplace
//             .connect(owner)
//             .setTokenBan(payload.nftContract, payload.tokenId, true);
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith(
//             'TokenId, Contract, or Account is banned from listing'
//          );

//          // unban token
//          await cx_marketplace
//             .connect(owner)
//             .setTokenBan(payload.nftContract, payload.tokenId, false);
//          // ban contract
//          await cx_marketplace
//             .connect(owner)
//             .setContractBan(payload.nftContract, true);
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith(
//             'TokenId, Contract, or Account is banned from listing'
//          );

//          // unban contract
//          await cx_marketplace
//             .connect(owner)
//             .setContractBan(payload.nftContract, false);
//          // ban account
//          await cx_marketplace.connect(owner).setAccountBan(addr1.address, true);
//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith(
//             'TokenId, Contract, or Account is banned from listing'
//          );

//          // unban account
//          await cx_marketplace
//             .connect(owner)
//             .setAccountBan(addr1.address, false);
//          await cx_marketplace.connect(addr1).list(payload);
//       });

//       it('Should not allow to list when Marketplace is paused', async () => {
//          const payload = {
//             tokenId: token1.id,
//             nftContract: cx_nft.address,
//             price: '250000000000000',
//             paymentToken: ZERO_ADDRESS,
//             listQuantity: 1,
//             listingType: LISTING_TYPES.FIXED_PRICE,
//             endTime: (new Date('2077-12-10').getTime() / 1000).toFixed(0),
//             isReserved: false,
//             cxUser: 62,
//          };

//          cx_marketplace.connect(owner).pause();

//          await expect(
//             cx_marketplace.connect(addr1).list(payload)
//          ).to.be.revertedWith('Pausable: paused');
//       });

//       it('Should allow to delist when Marketplace is paused', async () => {
//          expect(await cx_marketplace.paused(), 'Pausable: paused');

//          await cx_marketplace
//             .connect(addr1)
//             .delist(cx_nft.address, token1.id, '62');
//       });
//    });

//    // ------------------------------------------
// });
