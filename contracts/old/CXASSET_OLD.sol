// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

contract CXASSET is ERC1155Upgradeable {
    address payable public _contractOwner;

    mapping (uint => uint) public price;
    mapping (uint => bool) public listedMap;
    mapping (uint256 => address) private _owners;
    mapping (uint256 => address) private _originalOwner;
    mapping (uint256 => uint) private _royaltyPercentage;

    uint256 totalMinted;

    event Purchase(address indexed previousOwner, address indexed newOwner, uint price, uint nftID, string uri);

    event Minted(address indexed minter, uint price, uint nftID, string uri);

    event PriceUpdate(address indexed owner, uint oldPrice, uint newPrice, uint nftID);

    event NftListStatus(address indexed owner, uint nftID, bool isListed);

    function initialize() public initializer {
        __ERC1155_init("https://nft.cryptoxpress.com/{id}.json");
                _contractOwner = payable(msg.sender);
                totalMinted=0;
    }

    function ownerOf(uint256 tokenId) public view virtual returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC1155: owner query for nonexistent token");
        return owner;
    }

    function _exists(uint256 tokenId) internal view virtual returns (bool) {
        return _owners[tokenId] != address(0);
    }
    
    function mint( uint256 _tokenId,address _toAddress,uint256 _amount, bytes memory _data,uint _price, uint  _royaltyPc) public returns (uint) {
        require(!_exists(_tokenId), "Error: tokenId already exists");
        totalMinted += 1;
        price[_tokenId] = _price;
        listedMap[_tokenId] = true;
        _originalOwner[_tokenId] = _toAddress;
        _royaltyPercentage[_tokenId] = _royaltyPc;
        _mint(_toAddress, _tokenId, _amount, _data);
        _owners[_tokenId] = _toAddress;
        emit Minted(_toAddress, _price, _tokenId, uri(_tokenId));
        return _tokenId;
    }

    function buy(uint _id) external payable {
        _validate(_id);
        address _previousOwner = ownerOf(_id);
        address _newOwner = msg.sender;
        _trade(_id);
         _owners[_id] = _newOwner;
        emit Purchase(_previousOwner, _newOwner, price[_id], _id, uri(_id));
    }

    function _validate(uint _id) internal {
        bool isItemListed = listedMap[_id];
        require(_exists(_id), "Error, wrong tokenId");
        require(isItemListed, "Item not listed currently");
        require(msg.value >= price[_id], "Error, the amount is lower");
        require(msg.sender != ownerOf(_id), "Cannot buy what you own");
    }

    function _trade(uint _id) internal {
        address payable _buyer = payable(msg.sender);
        address payable _owner = payable(ownerOf(_id));
        // tansfer only 1 at a time right now
        safeTransferFrom(_owner, _buyer, _id,1,"");

        // // 2.5% commission cut
        // uint _commissionValue = price[_id] / 40 ;
        // uint _sellerValue = price[_id] - _commissionValue;

        _owner.transfer(price[_id]);
        // _contractOwner.transfer(_commissionValue);

        // If buyer sent more than price, we send them back their rest of funds
        if (msg.value > price[_id]) {
            _buyer.transfer(msg.value - price[_id]);
        }

        listedMap[_id] = false;
    }

    function updatePrice(uint _tokenId, uint _price) public returns (bool) {
        uint oldPrice = price[_tokenId];
        require(msg.sender == ownerOf(_tokenId), "Error, you are not the owner");
        price[_tokenId] = _price;

        emit PriceUpdate(msg.sender, oldPrice, _price, _tokenId);
        return true;
    }

    function updateListingStatus(uint _tokenId, bool shouldBeListed) public returns (bool) {
        require(msg.sender == ownerOf(_tokenId), "Error, you are not the owner");

        listedMap[_tokenId] = shouldBeListed;

        emit NftListStatus(msg.sender, _tokenId, shouldBeListed);

        return true;
    }
}