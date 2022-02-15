// SPDX-License-Identifier: MIT
// A modification on the OpenZeppelin Contracts v4.4.1 (access/Ownable.sol) to include collaborators

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract OwnableAndCollab is Initializable, ContextUpgradeable {
    address private _owner;
    mapping(address => bool) private _collaborators;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    event CollaboratorStatusChanged(address indexed account, bool isCollaborator);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    function __OwnableAndCollab_init(address newOwner) internal onlyInitializing {
        require(newOwner != address(0), "OwnableAndCollab: owner cannot be the zero address");
        __Context_init_unchained();
        __OwnableAndCollab_init_unchained(newOwner);
    }

    function __OwnableAndCollab_init_unchained(address account) internal onlyInitializing {
        _transferOwnership(account);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Returns if account is collaborator or not
     */
    function isAccountCollaborator(address account) public view virtual returns (bool) {
        return _collaborators[account];
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "OwnableAndCollab: caller is not the owner");
        _;
    }

    /**
     * @dev Throws if called by any account other than the owner or collaborator.
     */
    modifier onlyOwnerAndCollaborator() {
        require(owner() == _msgSender() || _collaborators[_msgSender()] == true, "OwnableAndCollab: caller is not the owner or a collaborator");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "OwnableAndCollab: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    /**
     * @dev sets collaborator status on or off for accounts 
     */
    function setCollaborator(address account, bool isCollaborator) public virtual onlyOwner {
        require(account != address(0), "OwnableAndCollab: account is zero address");
        _setCollaborator(account, isCollaborator);
        emit CollaboratorStatusChanged(account, isCollaborator);
    }

    function _setCollaborator(address account, bool isCollaborator) internal {
        _collaborators[account] = isCollaborator;
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    uint256[49] private __gap;
}