const { expect } = require('chai');
const { ethers } = require('hardhat');

const { ZERO_ADDRESS } = require('./util');

describe('CX Factory', () => {
   let owner, addr1, addr2, addr3, addr4;

   let registry, forwarder, factoryERC721, factoryERC1155, testERC20;

   beforeEach(async () => {
      [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
   });

   before(async () => {
      const CXRegistry = await ethers.getContractFactory('CX_Proxy_Registry');
      registry = await CXRegistry.deploy();

      const CXFactoryERC1155 = await ethers.getContractFactory(
         'CX_Factory_ERC1155'
      );
      factoryERC1155 = await CXFactoryERC1155.deploy();

      const CXFactoryERC721 = await ethers.getContractFactory(
         'CX_Factory_ERC721'
      );
      factoryERC721 = await CXFactoryERC721.deploy();

      const TestERC20 = await ethers.getContractFactory('Xpress');
      testERC20 = await TestERC20.deploy();

      const FORWARDER = await ethers.getContractFactory('MinimalForwarder');
      forwarder = await FORWARDER.deploy();
   });

   describe('Initialization', async () => {
      it('Should initialize ERC1155 Factory Contract', async () => {
         const name = 'CX Factory SFT';
         await factoryERC1155
            .connect(owner)
            .initialize(name, ZERO_ADDRESS, ZERO_ADDRESS);

         expect(await factoryERC1155.name()).to.equal(name);
         expect(await factoryERC1155.owner()).to.equal(owner.address);
         expect(await factoryERC1155.proxyRegistryAddress()).to.equal(
            ZERO_ADDRESS
         );
         expect(await factoryERC1155.isTrustedForwarder(ZERO_ADDRESS)).to.be
            .true;
      });

      it('Should initialize ERC721 Factory Contract', async () => {
         const name = 'CX Factory NFT';
         await factoryERC721
            .connect(owner)
            .initialize(name, ZERO_ADDRESS, ZERO_ADDRESS);

         expect(await factoryERC721.name()).to.equal(name);
         expect(await factoryERC721.owner()).to.equal(owner.address);
         expect(await factoryERC721.proxyRegistryAddress()).to.equal(
            ZERO_ADDRESS
         );
         expect(await factoryERC721.isTrustedForwarder(ZERO_ADDRESS)).to.be
            .true;
      });
   });

   describe('Checks', async () => {
      it('Should allow owner to update proxy registry (ERC1155)', async () => {
         await expect(
            factoryERC1155
               .connect(addr2)
               .updateCXProxyRegistry(registry.address)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         await factoryERC1155
            .connect(owner)
            .updateCXProxyRegistry(registry.address);

         expect(await factoryERC1155.proxyRegistryAddress()).to.equal(
            registry.address
         );
      });

      it('Should allow owner to update trusted forwarder (ERC1155)', async () => {
         await expect(
            factoryERC1155
               .connect(addr2)
               .updateTrustedForwarder(forwarder.address)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         expect(await factoryERC1155.isTrustedForwarder(forwarder.address)).to
            .be.false;

         await factoryERC1155
            .connect(owner)
            .updateTrustedForwarder(forwarder.address);

         expect(await factoryERC1155.isTrustedForwarder(forwarder.address)).to
            .be.true;
      });

      it('Should allow owner to update proxy registry (ERC721)', async () => {
         await expect(
            factoryERC721.connect(addr2).updateCXProxyRegistry(registry.address)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         await factoryERC721
            .connect(owner)
            .updateCXProxyRegistry(registry.address);

         expect(await factoryERC721.proxyRegistryAddress()).to.equal(
            registry.address
         );
      });

      it('Should allow owner to update trusted forwarder (ERC721)', async () => {
         await expect(
            factoryERC721
               .connect(addr2)
               .updateTrustedForwarder(forwarder.address)
         ).to.be.revertedWith('Ownable: caller is not the owner');

         expect(await factoryERC721.isTrustedForwarder(forwarder.address)).to.be
            .false;

         await factoryERC721
            .connect(owner)
            .updateTrustedForwarder(forwarder.address);

         expect(await factoryERC721.isTrustedForwarder(forwarder.address)).to.be
            .true;
      });
   });

   describe('ERC1155 Collection Creation', async () => {
      it('Should create an ERC1155 Collection', async () => {
         const name = 'CypherCollection';

         const tx = await factoryERC1155
            .connect(addr1)
            .createCollection(name, '', addr1.address);
         const res = await tx.wait();

         expect(res.events[1].event).to.equal('ERC1155CollectionCreated');

         const collectionAddr = res.events[1].args.collection;

         const collection = await ethers.getContractAt(
            'CXASSET_ERC1155',
            collectionAddr
         );

         expect(await factoryERC1155.createdCollections(collectionAddr)).to.be
            .true;

         expect(await collection.name()).to.equal(name);
         expect(await collection.owner()).to.equal(addr1.address);
         expect(await collection.totalMinted()).to.equal(0);
      });

      it('Should create an ERC1155 Collection and mint an NFT', async () => {
         const name = 'CypherCollection #2';

         const token = {
            to: addr2.address,
            tokenId: 22,
            amount: 3,
            metadataUri: `ipfs://token-22`,
            royalty: 1500,
            data: '0x',
         };

         const tx = await factoryERC1155
            .connect(addr3)
            .createCollectionAndMint(
               name,
               'https://my-metadata.com',
               addr4.address,
               token
            );
         const res = await tx.wait();

         expect(res.events[1].event).to.equal('ERC1155CollectionCreated');

         const collectionAddr = res.events[1].args.collection;

         const collection = await ethers.getContractAt(
            'CXASSET_ERC1155',
            collectionAddr
         );

         expect(await collection.name()).to.equal(name);
         expect(await collection.owner()).to.equal(addr4.address);

         expect(await collection.exists(token.tokenId)).to.be.true;
         expect(await collection.totalSupply(token.tokenId)).to.equal(
            token.amount
         );
         expect(await collection.minterOf(token.tokenId)).to.equal(token.to);
         expect(await collection.uri(token.tokenId)).to.equal(
            token.metadataUri
         );
         expect(await collection.totalMinted()).to.equal(1);
      });
   });

   describe('ERC721 Collection Creation', async () => {
      it('Should create an ERC721 Collection', async () => {
         const name = 'CypherCollectionNFT';

         const tx = await factoryERC721
            .connect(addr1)
            .createCollection(name, '', addr1.address);
         const res = await tx.wait();

         expect(res.events[1].event).to.equal('ERC721CollectionCreated');

         const collectionAddr = res.events[1].args.collection;

         const collection = await ethers.getContractAt(
            'CXASSET_ERC721',
            collectionAddr
         );

         expect(await factoryERC721.createdCollections(collectionAddr)).to.be
            .true;

         expect(await collection.name()).to.equal(name);
         expect(await collection.owner()).to.equal(addr1.address);
         expect(await collection.totalMinted()).to.equal(0);
      });

      it('Should create an ERC721 Collection and mint an NFT', async () => {
         const name = 'CypherCollectionNFT #2';

         const token = {
            to: addr2.address,
            tokenId: 52,
            metadataUri: `ipfs://token-52`,
            royalty: 1200,
         };

         const tx = await factoryERC721
            .connect(addr3)
            .createCollectionAndMint(
               name,
               'https://my-metadata.com',
               addr4.address,
               token
            );
         const res = await tx.wait();

         expect(res.events[1].event).to.equal('ERC721CollectionCreated');

         const collectionAddr = res.events[1].args.collection;

         const collection = await ethers.getContractAt(
            'CXASSET_ERC721',
            collectionAddr
         );

         expect(await collection.name()).to.equal(name);
         expect(await collection.owner()).to.equal(addr4.address);

         expect(await collection.minterOf(token.tokenId)).to.equal(token.to);
         expect(await collection.ownerOf(token.tokenId)).to.equal(token.to);
         expect(await collection.tokenURI(token.tokenId)).to.equal(
            token.metadataUri
         );
         expect(await collection.totalMinted()).to.equal(1);
      });
   });

   describe('Error Checks', async () => {
      it('Should allow only owner to pause contract', async () => {
         expect(await factoryERC721.paused()).to.be.false;

         await expect(factoryERC721.connect(addr2).pause()).to.be.revertedWith(
            'Ownable: caller is not the owner'
         );

         await factoryERC721.connect(owner).pause();

         expect(await factoryERC721.paused()).to.be.true;
      });

      it('Should revert when paused #1', async () => {
         const name = 'CypherCollectionNFT #3';

         await expect(
            factoryERC721
               .connect(addr2)
               .createCollection(name, '', addr2.address)
         ).to.be.revertedWith('Pausable: paused');
      });

      it('Should revert when paused #2', async () => {
         const name = 'CypherCollectionNFT #4';

         const token = {
            to: addr2.address,
            tokenId: 99,
            metadataUri: `ipfs://token-99`,
            royalty: 900,
         };

         await expect(
            factoryERC721
               .connect(addr3)
               .createCollectionAndMint(
                  name,
                  'https://my-metadata.com',
                  addr4.address,
                  token
               )
         ).to.be.revertedWith('Pausable: paused');
      });
   });
});
