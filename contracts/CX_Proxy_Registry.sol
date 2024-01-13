// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./registry/ProxyRegistry.sol";
import "./registry/AuthenticatedProxy.sol";

contract CX_Proxy_Registry is ProxyRegistry {

    string public constant name = "CryptoXpress Proxy Registry";

    /* Whether the initial auth address has been set. */
    bool public initialAddressSet = false;

    constructor () {
        delegateProxyImplementation = address(new AuthenticatedProxy());
    }

    /** 
     * Grant authentication to the initial Marketplace contract
     *
     * @dev No delay, can only be called once - after that the standard registry process with a delay must be used
     * @param authAddress Address of the contract to grant authentication
     */
    function grantInitialAuthentication (address authAddress)
        onlyOwner
        public
    {
        require(!initialAddressSet, "CX Proxy Registry initial address already set");
        initialAddressSet = true;
        contracts[authAddress] = true;
    }

}