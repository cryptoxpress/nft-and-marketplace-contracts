// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";

import "@openzeppelin/contracts/interfaces/IERC1155.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/* 
    Contributors: Nitish Devadiga,  CX
*/

contract CX_Marketplace is Initializable, OwnableUpgradeable, PausableUpgradeable, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    // Contract name
    string public name;
    // Contract symbol
    string public symbol;

    // enum for different types of listings possible. none = not listed
    enum LISTING_TYPE {
        NONE,
        FIXED_PRICE, 
        AUCTION // bids are processed off-chain
    }

    struct Listing {
        bool initialized; // just a check field
        address nftContract; // address of ERC1155/ERC721 contract
        address owner; // address of owner of token
        uint tokenId; // id of token in the given ERC1155/ERC721 contract
        LISTING_TYPE listingType;
        uint listedQuantity; // max quantity that others can purchase (0 <= listedQuantity <= tokenBalance)
        uint price; // price per asset
        address paymentToken; // payment token address; 0 address for native token
        uint cxUser; // cryptoxpress user id; used to index user actions server side 
        bool isReserved; // specific to auction. do not return price of asset if reserved and listed as auction
        uint endTime; // auction endtime
        address approvedBidder; // approved address who could buy the token in an auction listing
    }

    // used as params for Trade function
    struct BuyData {
        uint tokenId;
        uint quantity;
        address nftContract;
        address fromAddress;
        uint cxUser;
    }

    // used as params for List function
    struct ListData {
        uint tokenId;
        address nftContract;
        uint price;
        address paymentToken;
        uint listQuantity;
        LISTING_TYPE listingType;
        uint endTime;
        bool isReserved;
        uint cxUser;
    }

    // Using the below struct to avoid Stack too deep error
    struct TradeInfo {
        address payable buyer;
        address payable owner;
        address payable royaltyReceiver;
        uint totalPrice;
        uint royalty;
        uint commission;
        uint pricePayable;
    }

    // CX's commission on every trade of NFT
    uint public commissionPercentage; // 100 = 1%; 10000 = 100%
    address payable public commissionPayoutAddress;

    // do not apply commission to excluded addresses
    mapping (address => bool) public commissionExclusionAccounts;
    // apply a specific commission on sales for these addresses; value if 0, apply global commission 
    mapping (address => uint) public customCommissionAccounts;

    mapping(bytes32 => Listing) private listings;

    // BEP20 tokens that are allowed to be used for sale transactions
    mapping (address => bool) public allowedPaymentTokens;

    // ERC165 interface IDs
    bytes4 private constant _INTERFACE_ID_ERC1155 = 0xd9b67a26;
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0x2a55205a;

    mapping(address => bool) private bannedContracts;
    mapping(address => bool) private bannedAccounts;
    mapping(address => mapping(uint256 => bool)) private bannedTokens;

    // All events will include cxUser id, which indicates the user (from cx server) who initiated the transaction
    event Purchase(address indexed nftContract, address indexed from, address indexed to, uint totalPrice, address paymentToken, uint royalty, uint commission, uint quantity, uint nftID, uint cxUser);

    // only emitted when updating FIXED_PRICE listing
    event PriceUpdate(address indexed nftContract, address indexed owner, uint oldPrice, uint newPrice, uint nftID, address paymentToken, uint cxUser);

    // only emitted when updating FIXED_PRICE listing
    event ListedQuantityUpdate(address indexed nftContract, address indexed owner, uint oldQuantity, uint newQuantity, uint nftID, uint cxUser);

    // only emitted when updating/removing bidder and bid in AUCTION listing. When bidder updated, type will be 'ADDED', when removed type will be 'REMOVED'
    event BidderUpdate(address indexed nftContract, address indexed owner, uint bidId, address indexed bidder, uint bid, uint nftID, string updateType, uint cxUser);

    event NftListStatus(address indexed nftContract, address indexed owner, uint nftID, LISTING_TYPE listingType, uint listedQuantity, uint price, address paymentToken, uint endTime, bool isReserved, uint cxUser);

    event TokenBanSet(address indexed nftContract, uint nftID, bool banned);
    event ContractBanSet(address indexed nftContract, bool banned);
    event AccountBanSet(address indexed account, bool banned);

    event PaymentTokensModification(address indexed token, bool allowed);

    function initialize(string memory _name, string memory _symbol) initializer public {
        __ERC1155Holder_init();
        __ERC721Holder_init();
        __Pausable_init();
        __Ownable_init();
        commissionPercentage = 200; // = 2%
        commissionPayoutAddress = payable(_msgSender());
        name = _name;
        symbol = _symbol;
        allowedPaymentTokens[address(0)] = true; // allow native tokens by default
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function updateCommission(uint newCommission) public onlyOwner {
        commissionPercentage = newCommission;
    }

    function updateCommissionPayoutAddress(address newAddress) public onlyOwner {
        commissionPayoutAddress = payable(newAddress);
    }

    function setCommissionExclusion(address _address, bool _excluded) public onlyOwner {
        commissionExclusionAccounts[_address] = _excluded;
    }

    function setCustomCommission(address _address, uint256 _commission) public onlyOwner {
        customCommissionAccounts[_address] = _commission;
    }

    function setPaymentTokenAllowed(address token, bool allowed) public onlyOwner {
        allowedPaymentTokens[token] = allowed;
        emit PaymentTokensModification(token, allowed);
    }

    function setTokenBan(address nftContract, uint256 tokenId, bool banned) public onlyOwner {
        bannedTokens[nftContract][tokenId] = banned;
        emit TokenBanSet(nftContract, tokenId, banned);
    }
    function setContractBan(address nftContract, bool banned) public onlyOwner {
        bannedContracts[nftContract] = banned;
        emit ContractBanSet(nftContract, banned);
    }
    function setAccountBan(address account, bool banned) public onlyOwner {
        bannedAccounts[account] = banned;
        emit AccountBanSet(account, banned);
    }

    function isTokenBanned(address nftContract, uint256 tokenId) public view returns (bool) {
        return bannedTokens[nftContract][tokenId];
    }
    function isContractBanned(address nftContract) public view returns (bool) {
        return bannedContracts[nftContract];
    }
    function isAccountBanned(address account) public view returns (bool) {
        return bannedAccounts[account];
    }

    function _checkAllBans(address account, address nftContract, uint256 tokenId) internal view returns (bool) {
        return isTokenBanned(nftContract, tokenId) || isContractBanned(nftContract) || isAccountBanned(account); 
    }

    function getListingDetails(address nftContract, address owner, uint256 tokenId) public view returns (Listing memory) {
        if (_checkAllBans(owner, nftContract, tokenId)) {
            revert('TokenId, Contract, or Account is banned');
        }
        bytes32 _listingId = computeListingIdForAddressAndToken(nftContract, owner, tokenId);
        return listings[_listingId];
    }

    /**
    * @dev returns false if listing type is none, else true
    */
    function addresssHasTokenListed(bytes32 _listingId) public view returns (bool) {
        if (listings[_listingId].initialized != true) {
            return false;
        }
        return listings[_listingId].listingType != LISTING_TYPE.NONE;
    }

    function getTokenPrice(address nftContract, address owner, uint tokenId) public whenNotPaused view returns (uint) {
        bytes32 _listingId = computeListingIdForAddressAndToken(nftContract, owner, tokenId);
        _isForSale(_listingId);
        return listings[_listingId].price;
    }

    /**
    * @dev create a listing for the given token and its holder of given ERC1155/ERC721 contract
    */
    function list(ListData memory _data) public whenNotPaused {
        // --- Validations ---
        if (_checkAllBans(_msgSender(), _data.nftContract, _data.tokenId)) {
            revert('TokenId, Contract, or Account is banned from listing');
        }
        bool isERC1155 = _checkContractIsERC1155(_data.nftContract);
        bool isERC721 = _checkContractIsERC721(_data.nftContract);
        require((isERC1155 == true || isERC721 == true) && (isERC1155 != isERC721), "Provided contract address is not a valid ERC1155 or ERC721 contract!");

        require(_data.listingType == LISTING_TYPE.FIXED_PRICE || _data.listingType  == LISTING_TYPE.AUCTION, "Invalid Listing Type");
        require(_data.price > 0 && _data.listQuantity > 0, "Price and List Quantity must be greater than 0");
        if (isERC721) {
            require(_data.listQuantity == 1, "List Quantity must be only 1 for ERC721 Tokens");
        }
        require(allowedPaymentTokens[_data.paymentToken] == true, "Invalid Payment Token");

        bytes32 _listingId = computeListingIdForAddressAndToken(_data.nftContract, _msgSender(), _data.tokenId);
        Listing storage _listing = listings[_listingId];

        if (_listing.initialized == true && _listing.listedQuantity > 0) {
            // transfer tokens with contract back to owner before relisting
            if (_transferTokens(_listing.nftContract, _listing.owner, _listing.tokenId, _listing.listedQuantity) != true) {
                revert("Transfer of Existing Tokens Failed");
            }
            delete _listing.listedQuantity;
        }

        if (isERC1155) {
            // balance must be >= than amount to be listed
            require(_balanceOfERC1155(_data.nftContract, _msgSender(), _data.tokenId) >= _data.listQuantity, "Caller has insufficient ERC1155 Token Balance");
        }
        if (isERC721) {
            require(_isOwnerOfERC721(_data.nftContract, _msgSender(), _data.tokenId) == true, "Caller is not owner of ERC721 Token");
        }
        require(_isTokensApproved(_data.nftContract, _msgSender()) == true, "Contract was not approved as operator by caller");
        
        // --- End of Validations ---
        
        // pull tokens from address
        if (!_pullTokensFromAddress(_data.nftContract, _msgSender(), _data.tokenId, _data.listQuantity)) {
            revert("Couldn't pull NFT tokens from given address");
        }

        // Make token of given contract and owner exist if was not already
        if (_listing.initialized != true) {
            _listing.initialized = true;
            _listing.nftContract = _data.nftContract;
            _listing.tokenId = _data.tokenId;
            _listing.owner = _msgSender();
        }

        // Modify listing properties
        _listing.listingType = _data.listingType;
        _listing.listedQuantity = _data.listQuantity;
        _listing.price = _data.price;
        _listing.paymentToken = _data.paymentToken;
        _listing.endTime = _data.endTime;
        _listing.isReserved = _data.isReserved;
        _listing.cxUser = _data.cxUser;
        delete _listing.approvedBidder; // clear any previously approved bidders
        emit NftListStatus(_data.nftContract, _msgSender(), _data.tokenId, _data.listingType, _data.listQuantity, _data.price, _data.paymentToken, _data.endTime, _data.isReserved, _data.cxUser);
    }

    function listBatch(ListData[] memory _data) public whenNotPaused {
        for (uint i =0; i < _data.length; i++) {
            list(_data[i]);
        }
    }

    function delist(address nftContract, uint tokenId, uint cxUser) public returns (bool) {
        bytes32 _listingId = computeListingIdForAddressAndToken(nftContract, _msgSender(), tokenId);
        _isForSale(_listingId);
        // transfer tokens back to listing owner
        if (_transferTokens(listings[_listingId].nftContract, listings[_listingId].owner, listings[_listingId].tokenId, listings[_listingId].listedQuantity) != true) {
            revert("Transfer of Tokens Failed");
        }
        return _clearListing(_listingId, cxUser);
    }

    function buy(BuyData memory _data) external whenNotPaused payable {
        // --- Validations ---
        if (_checkAllBans(_msgSender(), _data.nftContract, _data.tokenId)) {
            revert('Not available for purchase');
        }
        require(_msgSender() != _data.fromAddress, "Cannot Purchase From Self");
        bytes32 _listingId = computeListingIdForAddressAndToken(_data.nftContract, _data.fromAddress, _data.tokenId);
        _isForSale(_listingId);
        bool isERC1155 = _checkContractIsERC1155(_data.nftContract);
        bool isERC721 = _checkContractIsERC721(_data.nftContract);
        if (isERC1155) {
            uint contractTokenBalance = _balanceOfERC1155(_data.nftContract, address(this), _data.tokenId);
            // double check contract's ERC1155 token balance
            require(contractTokenBalance >= _data.quantity, "Contract has insufficient ERC1155 Tokens");
        }
        if (isERC721) {
            // double check contract's ERC721 token ownership
            require(_isOwnerOfERC721(_data.nftContract, address(this), _data.tokenId) == true, "Contract is not owner of ERC721 Token");
        }
        if (listings[_listingId].listingType == LISTING_TYPE.AUCTION) {
            // check approval
            require(listings[_listingId].approvedBidder == _msgSender(), "Caller not approved to buy");
            require(listings[_listingId].listedQuantity == _data.quantity, "Buy quantity must be equal to listed quantity in auction!");
        } else {
            require(listings[_listingId].listedQuantity >= _data.quantity, "Insufficient listed token quantity");
        }
        // --- End of Validations ---
        _trade(_listingId, _data.quantity, _data.cxUser);
    }

    // Approve a bidder and update price to match their bid
    // bid is price per asset and not on the entire listed quantity
    function updateApprovedBidder(address _nftContract, uint _tokenId, address _bidder, uint _bid, uint _bidId, uint _cxUser) public whenNotPaused {
        require(_msgSender() != _bidder, "CANNOT APPROVE SELF");
        bytes32 _listingId = computeListingIdForAddressAndToken(_nftContract, _msgSender(), _tokenId);
        _isAuction(_listingId);
        if (listings[_listingId].approvedBidder == _bidder && listings[_listingId].price == _bid) { 
            revert("BID ALREADY APPROVED");
        }
        Listing storage _listing = listings[_listingId];
        _listing.approvedBidder = _bidder;
        _listing.price = _bid;
        emit BidderUpdate(_nftContract, _msgSender(), _bidId, _bidder, _bid, _tokenId, "ADDED", _cxUser);
    }

    function removeApprovedBidder(address _nftContract, uint _tokenId, uint _bidId, uint _cxUser) public whenNotPaused {
        bytes32 _listingId = computeListingIdForAddressAndToken(_nftContract, _msgSender(), _tokenId);
        _isAuction(_listingId);
        Listing storage _listing = listings[_listingId];
        address _bidder = _listing.approvedBidder;
        delete _listing.approvedBidder;
        emit BidderUpdate(_nftContract, _msgSender(), _bidId, _bidder, _listing.price, _tokenId, "REMOVED", _cxUser);
    }

    /**
    * @dev Computes Listing Id for the give Contract, Owner Address, and Token Id
    */
    function computeListingIdForAddressAndToken(address nftContract, address owner, uint256 tokenId)
        public
        pure
        returns(bytes32){
        return keccak256(abi.encodePacked(nftContract, owner, tokenId));
    }

    function _trade(bytes32 _listingId, uint _quantity, uint _cxUser) internal {
        Listing storage _sellerListing = listings[_listingId];
        TradeInfo memory tradeInfo;
        // get total price from listed price
        tradeInfo.totalPrice = _sellerListing.price * _quantity;
        tradeInfo.owner = payable(_sellerListing.owner);
        tradeInfo.buyer = payable(_msgSender());

        if (_sellerListing.paymentToken != address(0)) {
            // check if sufficient payment token balance exists with buyer
            uint paymentTokenBal = _getBalanceOfERC20Token(_sellerListing.paymentToken, _msgSender());
            if (paymentTokenBal < tradeInfo.totalPrice) {
                revert("Caller has insufficient balance of payment tokens.");
            }
             // check if sufficient payment tokens were approved for contract to spend
            uint paymentTokenAllowance = _getERC20TokenAllowance(_sellerListing.paymentToken, _msgSender());
            if (paymentTokenAllowance < tradeInfo.totalPrice) {
                revert("Contract has insufficient allowance of payment tokens.");
            }
        } else {
            // check if sufficient native funds were sent with the transaction
            if (msg.value < tradeInfo.totalPrice){
                revert("Insufficient funds sent with transaction.");
            }
        }

        tradeInfo.commission = 0;
        // get commission if buyer and seller not excluded
        if (commissionExclusionAccounts[_msgSender()] == false && commissionExclusionAccounts[_sellerListing.owner] == false) {
            // get custom commission of seller if available
            if (customCommissionAccounts[_sellerListing.owner] != 0) {
                tradeInfo.commission = (tradeInfo.totalPrice * customCommissionAccounts[_sellerListing.owner]) / 10000;    
            } else if (customCommissionAccounts[_msgSender()] != 0) {
                // get custom commission of buyer if available
                tradeInfo.commission = (tradeInfo.totalPrice * customCommissionAccounts[_msgSender()]) / 10000; 
            } else {
                tradeInfo.commission = (tradeInfo.totalPrice * commissionPercentage) / 10000;
            }
        }
        
        tradeInfo.royalty = 0;
        // get royalty if supported and neither buyer nor seller is the royalty receiver
        if (_checkContractRoyaltiesSupport(_sellerListing.nftContract) == true) {
            IERC2981 _royaltyContract = IERC2981(_sellerListing.nftContract);
            (address receiver, uint256 royaltyAmount) = _royaltyContract.royaltyInfo(_sellerListing.tokenId, _sellerListing.price);
            if (royaltyAmount > 0 && receiver != _sellerListing.owner && receiver != _msgSender()) {
                if (royaltyAmount > tradeInfo.totalPrice - tradeInfo.commission) {
                    revert("Token has invalid royalty information. Royalty exceeds sale price.");
                }
                tradeInfo.royalty = royaltyAmount;
                tradeInfo.royaltyReceiver =  payable(receiver);
            }
        }

        tradeInfo.pricePayable = tradeInfo.totalPrice - tradeInfo.royalty - tradeInfo.commission;

        // --- Payments ---
        if (_sellerListing.paymentToken != address(0)) { 
            _transferERC20Tokens(_sellerListing.paymentToken, tradeInfo.buyer, tradeInfo.owner, tradeInfo.pricePayable);
        } else {
             // Transfer funds to seller
            tradeInfo.owner.transfer(tradeInfo.pricePayable);
        }
        // --- End of Payments ---

        // Transfer the token
        if (_transferTokens(_sellerListing.nftContract, tradeInfo.buyer, _sellerListing.tokenId, _quantity) != true) {
            revert("Transfer of Tokens Failed");
        }

        // --- Royalties & Commission ---
        if (_sellerListing.paymentToken != address(0)) { 
            if (tradeInfo.royalty > 0) {
                // Transfer royalty to royalty receiver
                _transferERC20Tokens(_sellerListing.paymentToken, tradeInfo.buyer, tradeInfo.royaltyReceiver, tradeInfo.royalty);
            }
            if (tradeInfo.commission > 0) {
                // Transfer commission to CX
                _transferERC20Tokens(_sellerListing.paymentToken, tradeInfo.buyer, commissionPayoutAddress, tradeInfo.commission);
            }
        } else {
            if (tradeInfo.royalty > 0) {
                // Transfer royalty to royalty receiver
                tradeInfo.royaltyReceiver.transfer(tradeInfo.royalty);
            }
            if (tradeInfo.commission > 0) {
                // Transfer commission to CX
                commissionPayoutAddress.transfer(tradeInfo.commission);
            }
            if (msg.value > tradeInfo.totalPrice) {
                // Revert the extra amount sent in transaction back to buyer
                tradeInfo.buyer.transfer(msg.value - tradeInfo.totalPrice);
            }
        }
        // --- End of Royalties & Commission ---
        
        emit Purchase(_sellerListing.nftContract, _sellerListing.owner, _msgSender(), tradeInfo.totalPrice, _sellerListing.paymentToken, tradeInfo.royalty, tradeInfo.commission, _quantity, _sellerListing.tokenId, _cxUser);

        // --- Post Purchase Modifications ---
        // update seller listing
        if (_sellerListing.listingType == LISTING_TYPE.FIXED_PRICE) {
            uint remainingQuantity = _sellerListing.listedQuantity - _quantity;
            if (remainingQuantity > 0) {
                uint oldQuantity = _sellerListing.listedQuantity;
                _sellerListing.listedQuantity = remainingQuantity;
                emit ListedQuantityUpdate(_sellerListing.nftContract, _sellerListing.owner, oldQuantity, remainingQuantity, _sellerListing.tokenId, 0);
            } else {
                _clearListing(_listingId, 0);
            }
        } else {
            _clearListing(_listingId, 0);
        }
         // --- End of Post Purchase Modifications ---
    }

    /**
    * @dev returns allowance of this contract to spend owner's payment tokens
    */
    function _getERC20TokenAllowance(address tokenContract, address owner)
        internal
        view
        returns(uint256){
        IERC20 _token = IERC20(tokenContract);
        return _token.allowance(owner, address(this));
    }

    /**
    * @dev returns ERC20 token balance of queried account
    */
    function _getBalanceOfERC20Token(address tokenContract, address owner)
        internal
        view
        returns(uint256){
        IERC20 _token = IERC20(tokenContract);
        return _token.balanceOf(owner);
    }

    /**
    * @dev validate if listing exists and is made available for purchase
    */
    function _isForSale(bytes32 _listingId) internal view {
        require(listings[_listingId].initialized, "Listing does not exist");
        require(listings[_listingId].listingType != LISTING_TYPE.NONE, "NOT FOR SALE!");
    }

    /**
    * @dev validate if listing exists and is auction
    */
    function _isAuction(bytes32 _listingId) internal view {
        require(listings[_listingId].initialized, "Listing does not exist");
        require(listings[_listingId].listingType == LISTING_TYPE.AUCTION, "LISTING NOT AN AUCTION");
    }

    function _checkContractIsERC1155(address _contract) internal view returns (bool) {
        (bool success) = IERC165(_contract).supportsInterface(_INTERFACE_ID_ERC1155);
        return success;
    }

    function _checkContractIsERC721(address _contract) internal view returns (bool) {
        (bool success) = IERC165(_contract).supportsInterface(_INTERFACE_ID_ERC721);
        return success;
    }

    function _checkContractRoyaltiesSupport(address _contract) internal view returns (bool) {
        (bool success) = IERC165(_contract).supportsInterface(_INTERFACE_ID_ERC2981);
        return success;
    }

    /**
    * @dev checks if this contract is approved as operator for given address and ERC1155/ERC721 contract
    */
    function _isTokensApproved(address nftContract, address owner)
        internal
        view
        returns(bool){
        if (_checkContractIsERC1155(nftContract)) {
            IERC1155 _token = IERC1155(nftContract);
            return _token.isApprovedForAll(owner, address(this));
        }
        if (_checkContractIsERC721(nftContract)) {
            IERC721 _token = IERC721(nftContract);
            return _token.isApprovedForAll(owner, address(this));
        }
        return false;
    }

    /**
    * @dev tries to transfer tokens to this contract from given owner address 
    */
    function _pullTokensFromAddress(address nftContract, address owner, uint256 tokenId, uint256 amount)
        internal
        returns(bool){
        if (_checkContractIsERC1155(nftContract)) {
            IERC1155 _token = IERC1155(nftContract);
            _token.safeTransferFrom(owner, address(this), tokenId, amount, "0x");
            return true;
        }
        if (_checkContractIsERC721(nftContract)) {
            IERC721 _token = IERC721(nftContract);
            _token.safeTransferFrom(owner, address(this), tokenId, "0x");
            return true;
        }
        return false;
    }

    /**
    * @dev tries to transfer tokens from this contract to given address 
    */
    function _transferTokens(address nftContract, address to, uint256 tokenId, uint256 amount) internal returns(bool) {
        if (_checkContractIsERC1155(nftContract)) {
            IERC1155 _token = IERC1155(nftContract);
            _token.safeTransferFrom(address(this), to, tokenId, amount, "0x");
            return true;
        }
        if (_checkContractIsERC721(nftContract)) {
            IERC721 _token = IERC721(nftContract);
            _token.safeTransferFrom(address(this), to, tokenId, "0x");
            return true;
        }
        return false;
    }

    /**
    * @dev tries to transfer payment tokens from owner to given address
    */
    function _transferERC20Tokens(address tokenContract, address from, address to, uint256 amount) internal returns(bool) {
        IERC20 _token = IERC20(tokenContract);
        return _token.transferFrom(from, to, amount);
    }

    /**
    * @dev helper function to get ERC1155 token balance of an address
    */
    function _balanceOfERC1155(address nftContract, address owner, uint256 tokenId)
        internal
        view
        returns(uint){
        IERC1155 _token = IERC1155(nftContract);
        return _token.balanceOf(owner, tokenId);
    }

    /**
    * @dev helper function to check owner of ERC721
    */
    function _isOwnerOfERC721(address nftContract, address addr, uint256 tokenId)
        internal
        view
        returns(bool){
        IERC721 _token = IERC721(nftContract);
        address owner = _token.ownerOf(tokenId);
        if (addr == owner) {
            return true;
        }
        return false;
    }

    /**
    * @dev Delete listing properties, and set listing type to None for given listing id
    */
    function _clearListing(bytes32 _listingId, uint _cxUser) internal returns (bool) {
        Listing storage _listing = listings[_listingId];
        _listing.listingType = LISTING_TYPE.NONE;
        delete _listing.listedQuantity;
        delete _listing.price;
        delete _listing.isReserved;
        delete _listing.endTime;
        delete _listing.approvedBidder;
        emit NftListStatus(_listing.nftContract, _listing.owner, _listing.tokenId, LISTING_TYPE.NONE, 0, 0, address(0), 0, false, _cxUser);
        return true;
    }

    function _msgSender() internal view override returns (address) {
        return msg.sender;
    }

    function _msgData() internal view override returns (bytes calldata) {
        return msg.data;
    }
}