// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./OwnableDelegateProxy.sol";

/**
 * @title ProxyRegistryInterface
 */
interface ProxyRegistryInterface {

    function delegateProxyImplementation() external returns (address);

    function proxies(address owner) external returns (OwnableDelegateProxy);

}
