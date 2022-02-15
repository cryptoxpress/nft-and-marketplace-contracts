// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC721Token is ERC721, ERC721Burnable, Ownable {
    constructor() ERC721("CypherToken", "CYPH3R") {}

    function _baseURI() internal pure override returns (string memory) {
        return "https://nft.cypher.com/";
    }

    function safeMint(address to, uint256 tokenId) public onlyOwner {
        _safeMint(to, tokenId);
    }
}