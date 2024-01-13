// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "./OwnableAndCollab.sol";
import "./ERC2981Upgradeable.sol";
/**
 * Used to delegate ownership of tokens in contract to another address, to save on unneeded transactions to approve contract use for users
 */
import "./registry/ProxyRegistry.sol";


contract CXASSET_ERC1155 is Initializable, ERC1155Upgradeable, ERC2981Upgradeable, OwnableAndCollab, ERC1155BurnableUpgradeable, ERC1155SupplyUpgradeable, ERC2771ContextUpgradeable {
    // Contract name
    string public name;
    // Contract symbol
    string public symbol;
    // contract level metadata
    string private _contractUri;

    // Number of tokens minted (Also includes burned and reminted tokens)
    uint256 public totalMinted;

    // Maximum royalty that can be assigned to token
    uint96 public maxRoyalty;

    // Current CryptoXpress Registry Contract
    address proxyRegistryAddress;

    // Extra token details
    struct Token {
        address minter;
        string metadataUri;
        bool metadataFrozen;
    }
    mapping (uint256 => Token) private _tokens;

    event PermanentURI(string _value, uint256 indexed _id);

    function initialize(string memory _name, string memory _symbol, string memory _contractMedataUri,  address _factoryContract, address _proxyRegistryAddress, address _owner, address _forwarder) initializer public {
        __ERC1155_init("ipfs://");
        __ERC2981_init();
        __OwnableAndCollab_init(_owner);
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __ERC2771Context_init(_forwarder);
        if (_factoryContract != address(0)) {
            _setCollaborator(_factoryContract, true); // set factory contract as collaborator for minting access
        }
        totalMinted = 0;
        _contractUri = _contractMedataUri;
        proxyRegistryAddress = _proxyRegistryAddress;
        name = _name;
        symbol = _symbol;
        maxRoyalty = 2000; // in basis points; 2000 = 20%
        // set default royalty address of EIP2981 to point to this contract with 0 royalty
        _setDefaultRoyalty(address(this), 0);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, ERC2981Upgradeable) returns (bool) {
        return interfaceId == type(IERC1155Upgradeable).interfaceId || 
        interfaceId == type(IERC1155MetadataURIUpgradeable).interfaceId || 
        interfaceId == type(IERC2981Upgradeable).interfaceId || 
        super.supportsInterface(interfaceId);
    }

    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function updateContractURI(string calldata _uri) public onlyOwnerAndCollaborator {
        _contractUri = _uri;
    }

    function uri(uint256 tokenId) override public view returns (string memory) {
        require(exists(tokenId), "URI query for nonexistent token");
        return _tokens[tokenId].metadataUri;
    }

    /**
     * @dev Throws if called by any account other than the minter (for whom the token was minted)
     */
    modifier onlyMinter(uint tokenId) {
        require(exists(tokenId), "Token does not exist");
        require(_tokens[tokenId].minter == _msgSender(), "Caller is not minter");
        _;
    }

    /**
     * @dev return minter/original owner of the token
     */
    function minterOf(uint256 tokenId) public view returns (address) {
        require(exists(tokenId), "Token does not exist");
        return _tokens[tokenId].minter;
    }

    /**
     * @dev Creates `amount` tokens of token type `id`, and assigns them to `account`. 'royalty' is in basis points and will be set for 'account'.
     *
     * NOTE: 'account' is considered as minter and not _msgSender() / contract owner.
    */
    function mint(address account, uint256 id, uint256 amount, string memory metadataUri, uint96 royalty, bytes memory data) onlyOwnerAndCollaborator public
    {
        require(!exists(id), "Token already exists");
        require(royalty <= maxRoyalty, "Royalty exceeds limit");
        _mint(account, id, amount, data);
        _tokens[id].minter = account;
        if (_tokens[id].metadataFrozen) {
            // reset frozen status
            _tokens[id].metadataFrozen = false;
        }
        _tokens[id].metadataUri = metadataUri;
        _setTokenRoyalty(id, account, royalty);
        totalMinted += 1;
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, string[] memory metadataUris, uint96[] memory royalties, bytes memory data) public onlyOwnerAndCollaborator
    {
        uint arrayLength = ids.length;
        require(amounts.length == arrayLength && metadataUris.length == arrayLength && royalties.length == arrayLength, 'inputs length mismatch');
        for (uint i=0; i < arrayLength; i++) {
             // validate all ids
            require(!exists(ids[i]), "A token with id already exists");
            // validate royalties
            require(royalties[i] <= maxRoyalty, "A royalty exceeds limit");
            // set minters, royalties and metadata
            _tokens[ids[i]].minter = to;
            if (_tokens[ids[i]].metadataFrozen) {
                // reset frozen status
                _tokens[ids[i]].metadataFrozen = false;
            }
            _tokens[ids[i]].metadataUri = metadataUris[i];
            _setTokenRoyalty(ids[i], to, royalties[i]);
        }
        _mintBatch(to, ids, amounts, data);
        totalMinted += arrayLength;
    }

    /**
    * Override isApprovedForAll to whitelist user's CX proxy accounts
    */
    function isApprovedForAll(
        address _owner,
        address _operator
    ) override public view returns (bool isOperator) {
        // Whitelist CX proxy contract for easier trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(_owner)) == _operator) {
            return true;
        }

        return super.isApprovedForAll(_owner, _operator);
    }

    /**
     * @dev Changes metadata uri of specified token. Also Freezes Metadata if specified
    */
    function setTokenUri(uint256 tokenId, string memory metadataUri, bool freezeUri) public onlyMinter(tokenId)
    {
        require(_tokens[tokenId].metadataFrozen == false, "Cannot change frozen metadata");
        _tokens[tokenId].metadataUri = metadataUri;
        if (freezeUri) {
            _freezeTokenUri(tokenId);
        }
    }

    /**
     * @dev Freezes token meteadata uri
    */
    function freezeTokenUri(uint256 tokenId) public onlyMinter(tokenId)
    {
        require(_tokens[tokenId].metadataFrozen == false, "Metadata already frozen");
        _freezeTokenUri(tokenId);
    }

    function _freezeTokenUri(uint256 tokenId) internal {
        require(bytes(_tokens[tokenId].metadataUri).length > 0, "Metadata cannot be frozen when URI is empty");
        _tokens[tokenId].metadataFrozen = true;
        emit PermanentURI(_tokens[tokenId].metadataUri, tokenId);
    }

    /**
     * @dev Changes the royalty receiving address and percent for tokenId
    */
    function modifyTokenRoyalty(uint256 id, address receiver, uint96 royalty) public onlyMinter(id)
    {
        require(royalty <= maxRoyalty, "Royalty exceeds limit");
        RoyaltyInfo memory _royaltyInfo = _getRoyaltyInfo(id);
        require(royalty <= _royaltyInfo.royaltyFraction, "Royalty cannot be increased");
        _setTokenRoyalty(id, receiver, royalty);
    }

    /**
     * @dev Changes the royalty receiving addresses and percents for tokenIds
    */
    function modifyTokenRoyaltyBatch(uint256[] memory ids, address[] memory receivers, uint96[] memory royalties) public
    {
        for (uint i = 0; i < ids.length; i++) {
            modifyTokenRoyalty(ids[i], receivers
            [i], royalties[i]);
        }
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(address operator, address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        internal
        override(ERC1155Upgradeable, ERC1155SupplyUpgradeable)
    {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function _msgSender() internal view virtual override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code is more direct than the Solidity version using `abi.decode`.
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            return super._msgSender();
        }
    }

    function _msgData() internal view virtual override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return super._msgData();
        }
    }
}
