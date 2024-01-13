// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "./OwnableAndCollab.sol";
import "./ERC2981Upgradeable.sol";
/**
 * Used to delegate ownership of tokens in contract to another address, to save on unneeded transactions to approve contract use for users
 */
import "./registry/ProxyRegistry.sol";

contract CXASSET_ERC721 is Initializable, ERC721Upgradeable, ERC721BurnableUpgradeable, ERC2981Upgradeable, OwnableAndCollab, ERC2771ContextUpgradeable {
    // contract level metadata
    string private _contractUri;

    // Maximum royalty that can be assigned to token
    uint96 public maxRoyalty;

    // Current CryptoXpress Registry Contract
    address proxyRegistryAddress;

    // Number of tokens minted (Also includes burned and reminted tokens)
    uint256 public totalMinted;

    // Extra token details
    struct Token {
        address minter;
        string metadataUri;
        bool metadataFrozen;
    }
    mapping (uint256 => Token) private _tokens;

    event PermanentURI(string _value, uint256 indexed _id);

    function initialize(
        string memory _name,
        string memory _symbol,
        string memory _contractMedataUri,  
        address _factoryContract,
        address _proxyRegistryAddress,
        address _owner,
        address _forwarder
        ) initializer public {
        __ERC721_init(_name, _symbol);
        __ERC721Burnable_init();
        __ERC2981_init();
        __OwnableAndCollab_init(_owner);
        __ERC2771Context_init(_forwarder);
        if (_factoryContract != address(0)) {
            _setCollaborator(_factoryContract, true); // set factory contract as collaborator for minting access
        }
        _contractUri = _contractMedataUri;
        proxyRegistryAddress = _proxyRegistryAddress;
        maxRoyalty = 2000; // in basis points; 2000 = 20%
        totalMinted = 0;
        // set default royalty address of EIP2981 to point to this contract with 0 royalty
        _setDefaultRoyalty(address(this), 0);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, ERC2981Upgradeable) returns (bool) {
        return interfaceId == type(IERC721Upgradeable).interfaceId || 
        interfaceId == type(IERC721MetadataUpgradeable).interfaceId || 
        interfaceId == type(IERC2981Upgradeable).interfaceId || 
        super.supportsInterface(interfaceId);
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
    }

    function contractURI() public view returns (string memory) {
        return _contractUri;
    }

    function updateContractURI(string calldata _uri) public onlyOwnerAndCollaborator {
        _contractUri = _uri;
    }

     /**
     * @dev Throws if called by any account other than the minter (for whom the token was minted)
     */
    modifier onlyMinter(uint tokenId) {
        require(_exists(tokenId), "Token does not exist");
        require(_tokens[tokenId].minter == _msgSender(), "Caller is not minter");
        _;
    }

    /**
     * @dev return minter/original owner of the token
     */
    function minterOf(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return _tokens[tokenId].minter;
    }

    function safeMint(address to, uint256 tokenId, string memory uri, uint96 royalty)
        public
        onlyOwnerAndCollaborator
    {
        _mintTokenWithRoyalty(to, tokenId, uri, royalty);
        totalMinted += 1;
    }

    function safeMintBatch(address to, uint256[] memory tokenIds, string[] memory uris, uint96[] memory royalties)
        public
        onlyOwnerAndCollaborator
    {
        uint arrayLength = tokenIds.length;
        require(tokenIds.length == arrayLength && uris.length == arrayLength, 'inputs length mismatch');
        for (uint i=0; i < arrayLength; i++) {
            _mintTokenWithRoyalty(to, tokenIds[i], uris[i], royalties[i]);
        }
        totalMinted += arrayLength;
    }

    function _mintTokenWithRoyalty(address to, uint256 tokenId, string memory uri, uint96 royalty) internal {
        require(royalty <= maxRoyalty, "Royalty exceeds limit");
        _safeMint(to, tokenId);
        _tokens[tokenId].minter = to;
        if (_tokens[tokenId].metadataFrozen) {
             // reset frozen status
            _tokens[tokenId].metadataFrozen = false;
        }
        _tokens[tokenId].metadataUri = uri;
        _setTokenRoyalty(tokenId, to, royalty);
    }

    /**
     * Override isApprovedForAll to whitelist user's CX proxy accounts
     */
    function isApprovedForAll(address owner, address operator)
        override
        public
        view
        returns (bool)
    {
        // Whitelist OpenSea proxy contract for easy trading.
        ProxyRegistry proxyRegistry = ProxyRegistry(proxyRegistryAddress);
        if (address(proxyRegistry.proxies(owner)) == operator) {
            return true;
        }

        return super.isApprovedForAll(owner, operator);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable)
        returns (string memory)
    {
        require(_exists(tokenId), "URI query for nonexistent token");
        return _tokens[tokenId].metadataUri;
    }

    /**
     * @dev Changes metadata uri of specified token. Also Freezes Metadata if specified
    */
    function setTokenUri(uint256 tokenId, string memory _tokenURI, bool freezeUri) public onlyMinter(tokenId)
    {
        require(_tokens[tokenId].metadataFrozen == false, "Cannot change frozen metadata");
        _tokens[tokenId].metadataUri = _tokenURI;
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
     * @dev Changes the royalty receiving addresses and percents for all given tokenIds
    */
    function modifyTokenRoyaltyBatch(uint256[] memory ids, address[] memory receivers, uint96[] memory royalties) public
    {
        for (uint i = 0; i < ids.length; i++) {
            modifyTokenRoyalty(ids[i], receivers
            [i], royalties[i]);
        }
    }

    // The following functions are overrides required by Solidity.

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