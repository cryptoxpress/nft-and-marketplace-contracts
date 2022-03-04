// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "./CX_Factory.sol";
import "../CXASSET_ERC1155.sol";

/* 
    Contributors: Nitish Devadiga,  CX
*/

contract CX_Factory_ERC1155 is Initializable, CX_Factory {

    string public erc1155CollectionSymbol;

    event ERC1155CollectionCreated(address indexed collection, address indexed owner, string name, string metadataUri);

    struct Erc1155MintData {
        address to;
        uint256 tokenId;
        uint256 amount;
        string metadataUri;
        uint96 royalty;
        bytes data;
    }

    struct Erc1155MintBatchData {
        address to;
        uint256[] tokenIds;
        uint256[] amounts;
        string[] metadataUris;
        uint96[] royalties;
        bytes data;
    }

    function initialize(string memory _name, address _proxyRegistryAddress, address _forwarder) initializer public {
       __Factory_init(_name, _proxyRegistryAddress, _forwarder);
        erc1155CollectionSymbol = "CryptoXpress_SFT";
    }

    // ----- x -----
    function createCollection(string memory _name, string memory _collectionMedataUri, address _owner) public override whenNotPaused returns (address) {
        CXASSET_ERC1155 _erc1155 = new CXASSET_ERC1155();
        _erc1155.initialize(_name, erc1155CollectionSymbol, _collectionMedataUri, address(this), proxyRegistryAddress, _owner, _trustedForwarder);
        createdCollections[address(_erc1155)] = true;
        emit ERC1155CollectionCreated(address(_erc1155), _owner, _name, _collectionMedataUri);
        return address(_erc1155);
    }

    function createCollectionAndMint(string calldata _name, string calldata _collectionMedataUri, address _owner, Erc1155MintData calldata _mintData) external returns (address) {
        address _erc1155 = createCollection(_name, _collectionMedataUri, _owner);
        CXASSET_ERC1155(_erc1155).mint(_mintData.to, _mintData.tokenId, _mintData.amount, _mintData.metadataUri, _mintData.royalty, _mintData.data);
        return _erc1155;
    }

    function createCollectionAndMintBatch(string calldata _name, string memory _collectionMedataUri, address _owner, Erc1155MintBatchData calldata _mintData) external returns (address) {
        address _erc1155 = createCollection(_name, _collectionMedataUri, _owner);
        CXASSET_ERC1155(_erc1155).mintBatch(_mintData.to, _mintData.tokenIds, _mintData.amounts, _mintData.metadataUris, _mintData.royalties, _mintData.data);
        return _erc1155;
    }

    function updateERC1155CollectionSymbol(string calldata _symbol) external onlyOwner {
        erc1155CollectionSymbol = _symbol;
    }
    // ----- x -----
    
}