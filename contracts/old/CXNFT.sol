// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";

/* 
    Contributors: Nitish Devadiga, CX
*/

contract CXNFT is ERC1155Upgradeable {
    address payable public contractOwner;

    modifier onlyContractOwner {
        require(address(contractOwner) == msg.sender, "UNAUTHORIZED");
        _;
    }

    // enum for different types of listings possible. none = not listed
    enum LISTING_TYPE {
        NONE,
        FIXED_PRICE, 
        AUCTION 
    }

    // CX's commission on every trade of NFT
    uint public commissionPercentage = 200; // = 2%; 100% = 10000

    // do not apply commission to excluded addresses
    mapping (address => bool) public commissionExclusionAddresses;

    // minter and royalty percentage only gets set when minted
    mapping (uint256 => uint) private _royaltyPercentage; // basis points (10000ths, instead of 100ths); 1% = 100; 100% = 10000
    mapping (uint256 => address) private _minter;

    struct Listing {
        bool exists; // just a check field
        LISTING_TYPE listingType;
        uint listedQuantity; // max quantity that others can purchase (0 <= listedQuantity <= tokenBalance)
        uint price; // price per asset
        uint cxUser; // cryptoxpress user id
        bool isReserved; // specific to auction. do not return price of asset if reserved and listed as auction
        uint endTime; // auction endtime
        address approvedBidder; // approved address who could buy the token in an auction listing
    }

    mapping (uint256 => mapping(address => Listing)) private _listings;
    
    // Using the below struct to avoid Stack too deep error in Mint Function (used as parameter)
    struct MintData {
        uint256 tokenId;
        address toAddress;
        uint quantity;
        bytes data;
        uint price;
        LISTING_TYPE listingType;
        uint listQuantity;
        uint royaltyPc;
        uint endTime;
        bool isReserved;
        uint cxUser;
    }
    
    struct BuyData {
        uint tokenId;
        uint quantity;
        address fromAddress;
        uint cxUser;
    }

    // Using the below struct to avoid Stack too deep error
    struct TradeInfo {
        address payable _buyer;
        address payable _owner;
        address payable _minterPayable;
        uint _amount;
        uint _totalPrice;
        uint _royalty;
        uint _commission;
        uint pricePayable;
    }

    uint256 totalMinted; // number of unique tokens minted

    // All events will include cxUser id, which indicates the user (from cx server) who initiated the transaction

    event Purchase(address indexed from, address indexed to, uint totalPrice, uint royalty, uint commission, uint quantity, uint nftId, string uri, uint cxUser);

    event Minted(address indexed minter, uint price, uint nftId, uint quantity, string uri, uint cxUser);

    // only emitted when updating FIXED_PRICE listing
    event PriceUpdate(address indexed owner, uint oldPrice, uint newPrice, uint nftId, uint cxUser);

    // only emitted when updating FIXED_PRICE listing
    event ListedQuantityUpdate(address indexed owner, uint oldQuantity, uint newQuantity, uint nftId, uint cxUser);

    // only emitted when updating/removing bidder and bid in AUCTION listing. When bidder updated, type will be 'ADDED', when removed type will be 'REMOVED'
    // contains event only bidId which is the Id of bid placed in client
    event BidderUpdate(address indexed owner, uint bidId, address indexed bidder, uint bid, uint nftId, string updateType, uint cxUser);

    event NftListStatus(address indexed owner, uint nftId, LISTING_TYPE listingType, uint listedQuantity, uint price, uint endTime, bool isReserved, uint cxUser);

    function initialize() public initializer {
        __ERC1155_init("https://nft.cryptoxpress.com/{id}");
        contractOwner = payable(msg.sender);
        totalMinted = 0;
    }
    
    /**
     * Overriding ERC1155Upgradable Function
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
       // create to listing
       _listings[id][to].exists = true;
       emit Purchase(from, to, 0, 0, 0, amount, id, uri(id), 0);
       // update from listing
        if (_listings[id][from].listingType == LISTING_TYPE.FIXED_PRICE) {
            uint remainingQuantity = _listings[id][from].listedQuantity - amount;
            if (remainingQuantity > 0) {
                uint oldQuantity = _listings[id][from].listedQuantity;
                _listings[id][from].listedQuantity = remainingQuantity;
                emit ListedQuantityUpdate(from, oldQuantity, remainingQuantity, id, 0);
            }else{
                clearListing(id, from, 0);
            }
        } else{
            clearListing(id, from, 0);
        }
    }

    /**
     * Overriding ERC1155Upgradable Function
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: transfer caller is not owner nor approved"
        );
        _safeBatchTransferFrom(from, to, ids, amounts, data);
        // clear listings for all assets
        uint arrayLength = ids.length;
        for (uint i=0; i<arrayLength; i++) {
          clearListing(ids[i], from, 0);
        }
    }

    function updateCommission(uint _commission) public onlyContractOwner returns (bool) {
        commissionPercentage = _commission;
        return true;
    }

    function addToCommissionExclusion(address _address) public onlyContractOwner returns (bool) {
        commissionExclusionAddresses[_address] = true;
        return true;
    }

    function removeFromCommissionExclusion(address _address) public onlyContractOwner returns (bool) {
        commissionExclusionAddresses[_address] = false;
        return true;
    }

    // return minter of the token
    function minterOf(uint256 _tokenId) public view returns (address) {
        address minter = _minter[_tokenId];
        require(minter != address(0), "NONEXISTENT TOKEN");
        return minter;
    }

    // returns false if listing type is none, else true
    function addresssHasTokenListed(address _owner, uint256 _tokenId) public view returns (bool) {
        require(_listings[_tokenId][_owner].exists, "NOT OWNER");
        return _listings[_tokenId][_owner].listingType != LISTING_TYPE.NONE;
    }

    // Check if tokenId exists
    function tokenExists(uint256 tokenId) public view virtual returns (bool) {
        return _minter[tokenId] != address(0);
    }

    function _validateExistingListing(uint _tokenId,address _address) internal view {
        require(_listings[_tokenId][_address].exists, "NOT OWNER");
        require(_listings[_tokenId][_address].listingType != LISTING_TYPE.NONE, "NOT FOR SALE");
    }

    function _validateBidder(uint _tokenId,address _address) internal view {
        require(_listings[_tokenId][_address].exists, "NOT OWNER");
        require(_listings[_tokenId][_address].listingType == LISTING_TYPE.AUCTION, "MUST BE AUCTION");
    }

    function list(uint _tokenId, uint _price, uint _listQuantity, LISTING_TYPE _listingType, uint _endTime, bool _isReserved, uint _cxUser) public returns (bool) {
        // check if user has token and make it exist in this contract if was not already
        if (balanceOf(msg.sender, _tokenId) > 0) {
            _listings[_tokenId][msg.sender].exists = true;
        }
        require(_listings[_tokenId][msg.sender].exists, "NOT OWNER");
        require(_listingType == LISTING_TYPE.FIXED_PRICE || _listingType  == LISTING_TYPE.AUCTION, "INVALID LISTING TYPE");
        require(_price > 0 && _listQuantity > 0, "Price and List Quantity must be greater than 0");
        // balance must be >= than amount to be listed
        require(balanceOf(msg.sender, _tokenId) >= _listQuantity, "INSUFFICIENT QTY");
        // Modify listing properties
        _listings[_tokenId][msg.sender].listingType = _listingType;
        _listings[_tokenId][msg.sender].listedQuantity = _listQuantity;
        _listings[_tokenId][msg.sender].price = _price;
        _listings[_tokenId][msg.sender].endTime = _endTime;
        _listings[_tokenId][msg.sender].isReserved = _isReserved;
        _listings[_tokenId][msg.sender].cxUser = _cxUser;
        delete _listings[_tokenId][msg.sender].approvedBidder;
        emit NftListStatus(msg.sender, _tokenId, _listingType, _listQuantity, _price, _endTime, _isReserved, _cxUser);
        return true;
    }

    function clearListing(uint _tokenId, address _address, uint _cxUser) internal returns (bool) {
        // Delete listing properties, and set listing type to None
        _listings[_tokenId][_address].listingType = LISTING_TYPE.NONE;
        delete _listings[_tokenId][_address].listedQuantity;
        delete _listings[_tokenId][_address].price;
        delete _listings[_tokenId][_address].isReserved;
        delete _listings[_tokenId][_address].endTime;
        delete _listings[_tokenId][_address].approvedBidder;
        emit NftListStatus(_address, _tokenId, LISTING_TYPE.NONE, 0, 0, 0, false, _cxUser);
        return true;
    }

    function delist(uint _tokenId, uint _cxUser) public returns (bool) {
        _validateExistingListing(_tokenId, msg.sender);
        require(balanceOf(msg.sender, _tokenId) > 0, "NONE LISTED");
        return clearListing(_tokenId, msg.sender, _cxUser);
    }
    
    function getListingDetails(uint _tokenId, address _address) public view returns (Listing memory) {
        return _listings[_tokenId][_address];
    }

    // Approve a bidder and update price to match their bid
    // bid is price per asset and not on the entire listed quantity
    function updateApprovedBidder(uint _tokenId, address _bidder, uint _bid, uint _bidId, uint _cxUser) public returns (bool) {
        _validateBidder(_tokenId, msg.sender);
        require(msg.sender != _bidder, "CANNOT SELF APPROVE");
        require(_listings[_tokenId][msg.sender].approvedBidder != _bidder, "ALREADY APPROVED");
        _listings[_tokenId][msg.sender].approvedBidder = _bidder;
        _listings[_tokenId][msg.sender].price = _bid;
        emit BidderUpdate(msg.sender, _bidId, _bidder, _bid, _tokenId, "ADDED", _cxUser);
        return true;
    }

    function removeApprovedBidder(uint _tokenId, uint _bidId, uint _cxUser) public returns (bool) {
        _validateBidder(_tokenId, msg.sender);
        address _bidder =  _listings[_tokenId][msg.sender].approvedBidder;
        uint _bid =  _listings[_tokenId][msg.sender].price;
        delete _listings[_tokenId][msg.sender].approvedBidder;
        emit BidderUpdate(msg.sender, _bidId, _bidder, _bid, _tokenId, "REMOVED", _cxUser);
        return true;
    }

    function getTokenPrice(address _owner, uint _tokenId) public view returns (uint) {
        return _listings[_tokenId][_owner].price;
    }

    // Mint token and create a listing
    function mint(MintData memory _data) public returns (uint) {
        require(!tokenExists(_data.tokenId), "TokenID already exists");
        _mint(_data.toAddress, _data.tokenId, _data.quantity, _data.data); // ERC1155 method
        totalMinted += 1;
        _minter[_data.tokenId] = _data.toAddress;
        _royaltyPercentage[_data.tokenId] = _data.royaltyPc;
        emit Minted(_data.toAddress, _data.price, _data.tokenId, _data.quantity, uri(_data.tokenId), _data.cxUser);
        // create listing
        _listings[_data.tokenId][_data.toAddress].exists = true;
        _listings[_data.tokenId][_data.toAddress].listingType = LISTING_TYPE.NONE;
        _listings[_data.tokenId][_data.toAddress].cxUser = _data.cxUser;
        if (_data.toAddress == msg.sender) {
            // update listing according to params if sender is the minter
            if (_data.listingType == LISTING_TYPE.FIXED_PRICE || _data.listingType == LISTING_TYPE.AUCTION) {
                list(_data.tokenId, _data.price, _data.listQuantity, _data.listingType, _data.endTime, _data.isReserved, _data.cxUser);
            }
        }
        return _data.tokenId;
    }

    function buy(BuyData memory _data) external payable {
        // --- Validations ---
        require(msg.sender != _data.fromAddress, "CANNOT PURCHASE FROM SELF");
        _validateExistingListing(_data.tokenId, _data.fromAddress);
        // double check owner's balance
        require(balanceOf(_data.fromAddress, _data.tokenId) >= _data.quantity, "SELLER HAS INSUFFICIENT TOKENS");
        if (_listings[_data.tokenId][_data.fromAddress].listingType == LISTING_TYPE.AUCTION) {
            // check approval
            require(_listings[_data.tokenId][_data.fromAddress].approvedBidder == msg.sender, "BUYER NOT APPROVED");
            require(_listings[_data.tokenId][_data.fromAddress].listedQuantity <= _data.quantity, "FRACTIONAL AUCTION NOT SUPPORTED");
        } else {
            require(_listings[_data.tokenId][_data.fromAddress].listedQuantity >= _data.quantity, "INSUFFICIENT QTY");
        }
        // --- End of Validations ---
        trade(_data.tokenId, _data.quantity, _data.fromAddress, _data.cxUser);
    }

    function trade(uint _tokenId, uint _quantity, address _from, uint _cxUser) internal {
        TradeInfo memory tradeInfo;
        tradeInfo._owner = payable(_from);
        tradeInfo._buyer = payable(msg.sender);
        tradeInfo._minterPayable = payable(_minter[_tokenId]);
        if (_listings[_tokenId][_from].listingType == LISTING_TYPE.AUCTION) {
            // all listed quantity should be sold
            require(_quantity == _listings[_tokenId][_from].listedQuantity, "INSUFFICIENT QTY");
        } 
        tradeInfo._amount = _quantity;
        // get total price from listed price
        tradeInfo._totalPrice = _listings[_tokenId][_from].price * tradeInfo._amount;
         // check if sufficient funds were sent with the transaction
        if (msg.value < tradeInfo._totalPrice){
            revert("INSUFFICIENT FUNDS");
        }
        // Transfer the token
        _safeTransferFrom(tradeInfo._owner, tradeInfo._buyer, _tokenId, tradeInfo._amount, "");
        tradeInfo._royalty = 0;
        // get royalty if neither buyer nor seller is the minter 
        if (_minter[_tokenId] != _from && _minter[_tokenId] != msg.sender) {
            tradeInfo._royalty = tradeInfo._totalPrice * _royaltyPercentage[_tokenId] / 10000;
        }
        tradeInfo._commission = 0;
        // get commission if buyer not excluded
        if (commissionExclusionAddresses[msg.sender] != true) {
            tradeInfo._commission = tradeInfo._totalPrice * commissionPercentage / 10000;
        }
        tradeInfo.pricePayable = tradeInfo._totalPrice - tradeInfo._royalty - tradeInfo._commission;
        // Transfer funds to seller
        tradeInfo._owner.transfer(tradeInfo.pricePayable);
        if (tradeInfo._royalty > 0) {
            // Transfer royalty to minter
            tradeInfo._minterPayable.transfer(tradeInfo._royalty);
        }
        if (tradeInfo._commission > 0) {
             // Transfer commission to CX
            contractOwner.transfer(tradeInfo._commission);
        }
        
        emit Purchase(_from, msg.sender, tradeInfo._totalPrice, tradeInfo._royalty, tradeInfo._commission, tradeInfo._amount, _tokenId, uri(_tokenId), _cxUser);
        if (msg.value > tradeInfo._totalPrice) {
             // Revert the extra amount sent in transaction back to buyer
            tradeInfo._buyer.transfer(msg.value - tradeInfo._totalPrice);
        }

        // --- Post Purchase Modifications ---
        // create a listing for buyer
        _listings[_tokenId][msg.sender].exists = true;
        _listings[_tokenId][msg.sender].cxUser = _cxUser;
        // update seller listing
        if (_listings[_tokenId][_from].listingType == LISTING_TYPE.FIXED_PRICE) {
            uint remainingQuantity = _listings[_tokenId][_from].listedQuantity - tradeInfo._amount;
            if (remainingQuantity > 0) {
                uint oldQuantity = _listings[_tokenId][_from].listedQuantity;
                _listings[_tokenId][_from].listedQuantity = remainingQuantity;
                emit ListedQuantityUpdate(_from, oldQuantity, remainingQuantity, _tokenId, 0);
            }else{
                clearListing(_tokenId, _from, 0);
            }
        }else{
            clearListing(_tokenId, _from, 0);
        }
         // --- End of Post Purchase Modifications ---
    }

    // Update Price per asset and/or Listed Quantity if listing is FIXED_PRICE
    function updateListing(uint _tokenId, uint _price, uint _listQuantity, uint _cxUser) public returns (bool) {
        require(balanceOf(msg.sender, _tokenId) > 0, "NO TOKENS OWNED");
        _validateExistingListing(_tokenId, msg.sender);
        require(_price > 0 && _listQuantity > 0, "Price and List Quantity must be greater than 0");
        // balance must be >= than amount to be listed
        require(balanceOf(msg.sender, _tokenId) >= _listQuantity, "INSUFFICIENT QTY");
        if (_listings[_tokenId][msg.sender].listingType == LISTING_TYPE.AUCTION) {
            revert("DELIST TO CHANGE PRICE");
        }
        if (_listings[_tokenId][msg.sender].listingType == LISTING_TYPE.FIXED_PRICE) {
            // Only allow price and list quantity update here
            uint oldPrice = _listings[_tokenId][msg.sender].price;
            uint oldQuantity = _listings[_tokenId][msg.sender].listedQuantity;
            _listings[_tokenId][msg.sender].price = _price;
            emit PriceUpdate(msg.sender, oldPrice, _price, _tokenId, _cxUser);
            _listings[_tokenId][msg.sender].listedQuantity = _listQuantity;
            emit ListedQuantityUpdate(msg.sender, oldQuantity, _listQuantity, _tokenId, _cxUser);
            return true;
        }
        return false;
    }
}
