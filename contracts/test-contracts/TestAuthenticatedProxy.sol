/**

  << TestAuthenticatedProxy >>

  Just for DelegateCall testing.

**/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "../registry/AuthenticatedProxy.sol";

contract TestAuthenticatedProxy is AuthenticatedProxy {

    function setUser(address newUser)
        public
    {
        registry.transferAccessTo(user, newUser);
        user = newUser;
    }

}
