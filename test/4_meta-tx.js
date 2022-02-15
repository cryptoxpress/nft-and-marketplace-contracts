const { expect } = require('chai');
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require('../src/signer');
const { ZERO_ADDRESS } = require('./util');

describe('Meta TX Tests', function () {
   let accounts, forwarder, cx_nft;

   beforeEach(async function () {
      accounts = await ethers.getSigners();
   });

   before(async () => {
      const FORWARDER = await ethers.getContractFactory('MinimalForwarder');
      forwarder = await FORWARDER.deploy();

      const CX_NFT = await ethers.getContractFactory('CXASSET_ERC1155');
      cx_nft = await CX_NFT.deploy();
   });

   it('deploys and initializes CX ERC1155 Contract', async () => {
      const contract_name = 'CryptoXpress ERC1155 NFTs';
      const contract_symbol = 'CX_NFTs';
      const metadataUri = 'https://xyz.com';
      await cx_nft
         .connect(accounts[0])
         .initialize(
            contract_name,
            contract_symbol,
            metadataUri,
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            accounts[1].address,
            forwarder.address
         );

      expect(await cx_nft.name()).to.equal(contract_name);
      expect(await cx_nft.symbol()).to.equal(contract_symbol);
      expect(await cx_nft.contractURI()).to.equal(metadataUri);
      expect(await cx_nft.owner()).to.equal(accounts[1].address);
      expect(await cx_nft.totalMinted()).to.equal(0);
   });

   it('mints a token via a meta-tx', async () => {
      const signer = accounts[1];
      const relayer = accounts[3];
      const _forwarder = forwarder.connect(relayer);

      const token1 = {
         to: accounts[2].address,
         id: 22,
         amount: 3,
         metadataUri: `ipfs://token-22`,
         royalty: 1200,
         data: '0x',
      };

      expect(await cx_nft.exists(token1.id)).to.be.false;

      const { request, signature } = await signMetaTxRequest(
         signer.provider,
         _forwarder,
         {
            from: signer.address,
            to: cx_nft.address,
            data: cx_nft.interface.encodeFunctionData('mint', [
               token1.to,
               token1.id,
               token1.amount,
               token1.metadataUri,
               token1.royalty,
               token1.data,
            ]),
         }
      );

      const tx = await _forwarder.execute(request, signature);
      await tx.wait();

      expect(await cx_nft.exists(token1.id)).to.be.true;
      expect(await cx_nft.totalSupply(token1.id)).to.equal(token1.amount);
      expect(await cx_nft.minterOf(token1.id)).to.equal(token1.to);
      expect(await cx_nft.uri(token1.id)).to.equal(token1.metadataUri);
      expect(await cx_nft.totalMinted()).to.equal(1);
      expect(await cx_nft.balanceOf(token1.to, token1.id)).to.equal(
         token1.amount
      );
   });

   it('transfers a token via a meta-tx', async () => {
      const signer = accounts[2];
      const relayer = accounts[4];
      const _forwarder = forwarder.connect(relayer);

      const transferToken = {
         from: accounts[2].address,
         to: accounts[3].address,
         id: 22,
         amount: 2,
         data: '0x',
      };

      const prevBalSender = await cx_nft.balanceOf(
         transferToken.from,
         transferToken.id
      );

      const { request, signature } = await signMetaTxRequest(
         signer.provider,
         _forwarder,
         {
            from: signer.address,
            to: cx_nft.address,
            data: cx_nft.interface.encodeFunctionData('safeTransferFrom', [
               transferToken.from,
               transferToken.to,
               transferToken.id,
               transferToken.amount,
               transferToken.data,
            ]),
         }
      );

      const tx = await _forwarder.execute(request, signature);
      await tx.wait();

      expect(
         await cx_nft.balanceOf(transferToken.from, transferToken.id)
      ).to.equal(prevBalSender - transferToken.amount);
      expect(
         await cx_nft.balanceOf(transferToken.to, transferToken.id)
      ).to.equal(transferToken.amount);
   });

   it('reverts if called via unregistered forwarder', async () => {
      const signer = accounts[1];
      const relayer = accounts[3];

      // deploy new forwarder
      const FORWARDER = await ethers.getContractFactory('MinimalForwarder');
      let _forwarder = await FORWARDER.deploy();
      _forwarder.connect(relayer);

      const token1 = {
         to: accounts[2].address,
         id: 2509,
         amount: 5,
         metadataUri: `ipfs://token-22`,
         royalty: 1200,
         data: '0x',
      };

      expect(await cx_nft.exists(token1.id)).to.be.false;

      const { request, signature } = await signMetaTxRequest(
         signer.provider,
         _forwarder,
         {
            from: signer.address,
            to: cx_nft.address,
            data: cx_nft.interface.encodeFunctionData('mint', [
               token1.to,
               token1.id,
               token1.amount,
               token1.metadataUri,
               token1.royalty,
               token1.data,
            ]),
         }
      );

      const tx = await _forwarder.execute(request, signature);
      await tx.wait();

      expect(await cx_nft.exists(token1.id)).to.be.false;
      expect(await cx_nft.totalMinted()).to.equal(1);
      expect(await cx_nft.balanceOf(token1.to, token1.id)).to.equal(0);
   });
});
