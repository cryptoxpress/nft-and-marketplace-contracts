const { expect } = require('chai');
const { ethers } = require('hardhat');

const { increaseTime, ZERO_ADDRESS } = require('./util');

describe('CXRegistry', () => {
   let owner, addr1, addr2, addr3, addr4;

   let CXRegistry, registry, TestAuthenticatedProxy, TestERC20;

   beforeEach(async () => {
      [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();

      CXRegistry = await ethers.getContractFactory('CX_Proxy_Registry');
      registry = await CXRegistry.deploy();

      TestAuthenticatedProxy = await ethers.getContractFactory(
         'TestAuthenticatedProxy'
      );
      TestERC20 = await ethers.getContractFactory('Xpress');
   });

   it('does not allow additional grant', async () => {
      registry.grantInitialAuthentication(registry.address);
      await expect(
         registry.grantInitialAuthentication(registry.address)
      ).to.be.revertedWith('CX Proxy Registry initial address already set');
   });

   it('has a delegateproxyimpl', async () => {
      let delegateproxyimpl = await registry.delegateProxyImplementation();
      expect(delegateproxyimpl.length).to.equal(42);
      expect(delegateproxyimpl).to.not.equal(ZERO_ADDRESS);
   });

   it('allows proxy registration', async () => {
      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);
      expect(proxy.length).to.equal(42);
      expect(proxy).to.not.equal(ZERO_ADDRESS);
   });

   it('allows proxy override', async () => {
      await registry.connect(addr2).registerProxyOverride();
      let proxy = await registry.proxies(addr2.address);
      expect(proxy.length).to.equal(42);
      expect(proxy).to.not.equal(ZERO_ADDRESS);
   });

   it('allows proxy upgrade', async () => {
      await registry.connect(addr4).registerProxy();
      let proxy = await registry.proxies(addr4.address);
      let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
      let implementation = await registry.delegateProxyImplementation();

      await expect(
         contract.connect(addr1).upgradeTo(implementation)
      ).to.be.revertedWith('Only the proxy owner can call this method');

      await contract.connect(addr4).upgradeTo(registry.address);
      let newImplementation = await contract.implementation();
      expect(newImplementation).to.equal(registry.address);

      await contract.connect(addr4).upgradeTo(implementation);
      newImplementation = await contract.implementation();
      expect(newImplementation).to.equal(implementation);
   });

   it('allows proxy to receive ether', async () => {
      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);
      const tx = await owner.sendTransaction({
         to: proxy,
         value: ethers.utils.parseUnits('1', 'ether').toHexString(),
      });
      await tx.wait();
   });

   it('allows proxy to receive tokens before approval', async () => {
      const amount = '1000';

      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);
      let erc20 = await TestERC20.connect(owner).deploy();
      await erc20.connect(owner).initialize();
      let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
      await expect(
         contract
            .connect(addr3)
            .receiveApproval(addr3.address, amount, erc20.address, '0x')
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      expect(await erc20.balanceOf(proxy)).to.equal(0);
   });

   it('allows proxy to receive tokens', async () => {
      const amount = '1000';

      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);
      let erc20 = await TestERC20.connect(owner).deploy();
      await erc20.connect(owner).initialize();
      await erc20.connect(owner).transfer(addr3.address, 100000000000);
      await erc20.connect(addr3).approve(proxy, amount);
      let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
      await contract
         .connect(addr3)
         .receiveApproval(addr3.address, amount, erc20.address, '0x');
      expect(await erc20.balanceOf(proxy)).to.equal(amount);
   });

   it('does not allow proxy upgrade to same implementation', async () => {
      await registry.connect(addr2).registerProxy();
      let proxy = await registry.proxies(addr2.address);
      let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
      let implementation = await registry.delegateProxyImplementation();

      await expect(
         contract.connect(addr2).upgradeTo(implementation)
      ).to.be.revertedWith('Proxy already uses this implementation');
   });

   it('returns proxy type', async () => {
      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);
      let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);
      expect(await contract.proxyType()).to.equal(2);
   });

   it('does not allow proxy update from another account', async () => {
      await registry.connect(addr2).registerProxy();
      let proxy = await registry.proxies(addr2.address);
      let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);

      await expect(
         contract.connect(addr1).upgradeTo(registry.address)
      ).to.be.revertedWith('Only the proxy owner can call this method');
   });

   it('allows proxy ownership transfer', async () => {
      await registry.connect(addr2).registerProxy();
      let proxy = await registry.proxies(addr2.address);
      let contract = await ethers.getContractAt('OwnableDelegateProxy', proxy);

      expect(await contract.upgradeabilityOwner()).to.equal(addr2.address);

      await contract.connect(addr2).transferProxyOwnership(addr4.address);
      expect(await contract.upgradeabilityOwner()).to.equal(addr4.address);

      await contract.connect(addr4).transferProxyOwnership(addr3.address);
      expect(await contract.upgradeabilityOwner()).to.equal(addr3.address);
   });

   it('allows start but not end of authentication process', async () => {
      await registry.startGrantAuthentication(owner.address);
      let timestamp = await registry.pending(owner.address);
      expect(timestamp.toNumber()).to.be.greaterThan(0);
      await expect(
         registry.endGrantAuthentication(owner.address)
      ).to.be.revertedWith(
         'Contract is no longer pending or has already been approved by registry'
      );
   });

   it('does not allow start twice', async () => {
      await registry.startGrantAuthentication(owner.address);
      await expect(
         registry.startGrantAuthentication(owner.address)
      ).to.be.revertedWith(
         'Contract is already allowed in registry, or pending'
      );
   });

   it('does not allow end without start', async () => {
      await expect(
         registry.endGrantAuthentication(addr1.address)
      ).to.be.revertedWith(
         'Contract is no longer pending or has already been approved by registry'
      );
   });

   it('allows end after time has passed', async () => {
      await registry.startGrantAuthentication(owner.address);
      await increaseTime(86400 * 7 * 3);

      await registry.endGrantAuthentication(owner.address);
      let result = await registry.contracts(owner.address);
      expect(result).to.be.true;

      await registry.revokeAuthentication(owner.address);
      result = await registry.contracts(owner.address);
      expect(result).to.be.false;
   });

   it('allows proxy registration for another user', async () => {
      await registry.connect(owner).registerProxyFor(addr1.address);
      let proxy = await registry.proxies(addr1.address);
      expect(proxy.length).to.equal(42);
      expect(proxy).to.not.equal(ZERO_ADDRESS);
   });

   it('does not allow proxy registration for another user if a proxy already exists', async () => {
      await registry.connect(owner).registerProxyFor(addr1.address);
      await registry.proxies(addr1.address);
      await expect(
         registry.connect(owner).registerProxyFor(addr1.address)
      ).to.be.revertedWith('User already has a proxy');
   });

   it('does not allow proxy transfer from another account', async () => {
      await registry.connect(addr2).registerProxy();
      let proxy = await registry.proxies(addr2.address);
      await expect(
         registry.connect(owner).transferAccessTo(proxy, addr2.address)
      ).to.be.revertedWith('Proxy transfer can only be called by the proxy');
   });

   it('allows proxy revocation', async () => {
      await registry.connect(addr1).registerProxy();
      let proxy = await registry.proxies(addr1.address);

      let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
      let user = await contract.user();
      expect(user).to.equal(addr1.address);

      await contract.connect(addr1).setRevoke(true);
      expect(await contract.revoked()).to.be.true;

      await contract.connect(addr1).setRevoke(false);
      expect(await contract.revoked()).to.be.false;
   });

   it('does not allow revoke from another account', async () => {
      await registry.connect(addr3).registerProxy();
      let proxy = await registry.proxies(addr3.address);

      let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
      let user = await contract.user();
      expect(user).to.equal(addr3.address);

      await expect(contract.connect(addr1).setRevoke(true)).to.be.revertedWith(
         'Authenticated proxy can only be revoked by its user'
      );
   });

   it('should not allow proxy reinitialization', async () => {
      await registry.connect(addr1).registerProxy();
      let proxy = await registry.proxies(addr1.address);

      let contract = await ethers.getContractAt('AuthenticatedProxy', proxy);
      let user = await contract.user();
      expect(user).to.equal(addr1.address);

      await expect(
         contract.connect(addr1).initialize(addr2.address, registry.address)
      ).to.be.revertedWith('Authenticated proxy already initialized');
   });

   it('allows delegateproxy owner change, but only from owner or authorized contract', async () => {
      let testProxy = await TestAuthenticatedProxy.deploy();
      await registry.grantInitialAuthentication(owner.address);
      await registry.connect(addr1).registerProxy();
      let proxy = await registry.proxies(addr1.address);

      let contract_at = await ethers.getContractAt('AuthenticatedProxy', proxy);
      let user = await contract_at.user();
      expect(user).to.equal(addr1.address);

      let contract = await ethers.getContractAt(
         'TestAuthenticatedProxy',
         testProxy.address
      );
      let call = contract.interface.encodeFunctionData('setUser', [
         addr4.address,
      ]);
      await expect(
         contract_at.connect(addr4).proxyAssert(testProxy.address, 1, call)
      ).to.be.revertedWith(
         'Authenticated proxy can only be called by its user, or by a contract authorized by the registry as long as the user has not revoked access'
      );

      await contract_at.connect(addr1).proxyAssert(testProxy.address, 1, call);
      user = await contract_at.user();
      expect(user).to.equal(addr4.address);

      call = contract.interface.encodeFunctionData('setUser', [addr3.address]);
      await contract_at.connect(owner).proxyAssert(testProxy.address, 1, call);
      user = await contract_at.user();
      expect(user).to.equal(addr3.address);
   });
});
