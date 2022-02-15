// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../CXERC2771ContextUpgradeable.sol";

/* 
    Contributors: Nitish Devadiga,  CX
*/

abstract contract CX_Factory is Initializable, OwnableUpgradeable, PausableUpgradeable, CXERC2771ContextUpgradeable {
    // Contract name
    string public name;

    mapping(address => bool) public createdCollections;

    // Current CryptoXpress Registry Contract
    address public proxyRegistryAddress;

    function __Factory_init(string memory name_, address proxyRegistryAddress_, address forwarder_) internal onlyInitializing {
        __Ownable_init();
        __Pausable_init();
        __ERC2771Context_init(forwarder_);
        __Factory_init_unchained(name_, proxyRegistryAddress_);
    }

     function __Factory_init_unchained(string memory name_, address proxyRegistryAddress_) internal onlyInitializing {
        name = name_;
        proxyRegistryAddress = proxyRegistryAddress_;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateCXProxyRegistry(address addr) external onlyOwner {
        proxyRegistryAddress = addr;
    }

    function updateTrustedForwarder(address addr) external onlyOwner {
        _trustedForwarder = addr;
    }

    function createCollection(string memory _name, string memory _collectionMedataUri, address _owner) public virtual returns (address);

    // The following functions are overrides required by Solidity.

    function _msgSender() internal view virtual override(ContextUpgradeable, CXERC2771ContextUpgradeable) returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view virtual override(ContextUpgradeable, CXERC2771ContextUpgradeable) returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }
}