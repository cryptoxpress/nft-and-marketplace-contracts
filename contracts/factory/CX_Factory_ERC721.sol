// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./CX_Factory.sol";
import "../CXASSET_ERC721.sol";

/* 
    Contributors: Nitish Devadiga,  CX
*/

contract CX_Factory_ERC721 is Initializable, CX_Factory {

    string public erc721CollectionSymbol;

    event ERC721CollectionCreated(address indexed collection, address indexed owner, string name, string metadataUri);

    struct Erc721MintData {
        address to;
        uint256 tokenId;
        string metadataUri;
        uint96 royalty;
    }

    struct Erc721MintBatchData {
        address to;
        uint256[] tokenIds;
        string[] metadataUris;
        uint96[] royalties;
    }

    function initialize(string memory _name, address _proxyRegistryAddress, address _forwarder) initializer public {
        __Factory_init(_name, _proxyRegistryAddress, _forwarder);
        erc721CollectionSymbol = "CryptoXpress_NFT";
    }

    // ----- x -----
    function createCollection(string memory _name, string memory _collectionMedataUri, address _owner) public override whenNotPaused returns (address) {
        CXASSET_ERC721 _erc721 = new CXASSET_ERC721();
        _erc721.initialize(_name, erc721CollectionSymbol, _collectionMedataUri, address(this), proxyRegistryAddress, _owner, _trustedForwarder);
        createdCollections[address(_erc721)] = true;
        emit ERC721CollectionCreated(address(_erc721), _owner, _name, _collectionMedataUri);
        return address(_erc721);
    }

    function createCollectionAndMint(string calldata _name, string calldata _collectionMedataUri, address _owner, Erc721MintData calldata _mintData) external returns (address) {
        address _erc721 = createCollection(_name, _collectionMedataUri, _owner);
        CXASSET_ERC721(_erc721).safeMint(_mintData.to, _mintData.tokenId, _mintData.metadataUri, _mintData.royalty);
        return _erc721;
    }

    function createCollectionAndMintBatch(string calldata _name, string memory _collectionMedataUri, address _owner, Erc721MintBatchData calldata _mintData) external returns (address) {
        address _erc721 = createCollection(_name, _collectionMedataUri, _owner);
        CXASSET_ERC721(_erc721).safeMintBatch(_mintData.to, _mintData.tokenIds, _mintData.metadataUris, _mintData.royalties);
        return _erc721;
    }

    function updateERC721CollectionSymbol(string calldata _symbol) external onlyOwner {
        erc721CollectionSymbol = _symbol;
    }
    // ----- x -----

}