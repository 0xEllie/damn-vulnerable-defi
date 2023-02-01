const {
  ether,
  constants,
  balance,
  time,
} = require("@openzeppelin/test-helpers");
const { web3, contract, accounts } = require("@openzeppelin/test-environment");

contract.artifactsDir = "build-uniswap-v2";
const UniswapV2Pair = contract.fromArtifact("UniswapV2Pair");
const UniswapV2Factory = contract.fromArtifact("UniswapV2Factory");
const UniswapV2Router02 = contract.fromArtifact("UniswapV2Router02");

contract.artifactsDir = "build/contracts";
const DamnValuableToken = contract.fromArtifact("DamnValuableToken");
const DamnValuableNFT = contract.fromArtifact("DamnValuableNFT");
const WETH9 = contract.fromArtifact("WETH9");
const FreeRiderBuyer = contract.fromArtifact("FreeRiderBuyer");
const FreeRiderNFTMarketplace = contract.fromArtifact(
  "FreeRiderNFTMarketplace"
);
const FreeRiderAttacker = contract.fromArtifact("FreeRiderAttacker");

// const { ethers } = require('hardhat');
const { expect } = require("chai");

describe("Free Rider  challenge", function () {
  const [deployer, attacker, ...otherAccounts] = accounts;

  // The NFT marketplace will have 6 tokens, at 15 ETH each
  const NFT_PRICE = ether("15");

  const AMOUNT_OF_NFTS = 6;

  const MARKETPLACE_INITIAL_ETH_BALANCE = ether("90");

  const PLAYER_INITIAL_ETH_BALANCE = ether("0.1");

  const BOUNTY = ether("45");

  // Initial reserves for the Uniswap v2 pool
  const UNISWAP_INITIAL_TOKEN_RESERVE = ether("15000");

  const UNISWAP_INITIAL_WETH_RESERVE = ether("9000");

  before(async function () {
    this.token = await DamnValuableToken.new({ from: deployer });

    this.weth = await WETH9.new({ from: deployer });

    this.factory = await UniswapV2Factory.new(constants.ZERO_ADDRESS, {
      from: deployer,
    });

    await this.factory.createPair(this.token.address, this.weth.address);

    this.pair = await UniswapV2Pair.at(
      await this.factory.getPair(this.token.address, this.weth.address),
      {
        from: deployer,
      }
    );
    console.log(`pair address : ${this.pair.address}`);

    this.router = await UniswapV2Router02.new(
      this.factory.address,
      this.weth.address,
      { from: deployer }
    );

    this.marketplace = await FreeRiderNFTMarketplace.new(AMOUNT_OF_NFTS, {
      from: deployer,
      value: MARKETPLACE_INITIAL_ETH_BALANCE,
    });

    this.nft = await DamnValuableNFT.at(await this.marketplace.token(), {
      from: deployer,
    });

    this.buyer = await FreeRiderBuyer.new(attacker, this.nft.address, {
      from: deployer,
      value: BOUNTY,
    });

    this.freeRiderAttacker = await FreeRiderAttacker.new(
      this.weth.address,
      this.nft.address,
      this.pair.address,
      this.marketplace.address,
      this.buyer.address,
      { from: attacker }
    );

    await web3.eth.sendTransaction({
      to: this.freeRiderAttacker.address,
      from: deployer,
      value: PLAYER_INITIAL_ETH_BALANCE,
    });

    expect(
      await balance.current(this.freeRiderAttacker.address)
    ).to.be.bignumber.eq(PLAYER_INITIAL_ETH_BALANCE);

    await this.token.approve(
      this.router.address,
      UNISWAP_INITIAL_TOKEN_RESERVE,
      { from: deployer }
    );

    const deadline = (await web3.eth.getBlock("latest")).timestamp * 2;

    await this.router.addLiquidityETH(
      this.token.address, // token to be traded against WETH
      UNISWAP_INITIAL_TOKEN_RESERVE, // amountTokenDesired
      0, // amountTokenMin
      0, // amountETHMin
      deployer, // to
      deadline, // deadline
      { from: deployer, value: UNISWAP_INITIAL_WETH_RESERVE }
    );

    expect(await this.token.balanceOf(this.pair.address)).to.be.bignumber.eq(
      UNISWAP_INITIAL_TOKEN_RESERVE
    );
    expect(await this.weth.balanceOf(this.pair.address)).to.be.bignumber.eq(
      UNISWAP_INITIAL_WETH_RESERVE
    );

    // expect(await this.pair.token0()).to.eq(this.weth.address);

    // expect(await this.pair.token1()).to.eq(this.token.address);

    expect(await this.pair.balanceOf(deployer)).to.be.bignumber.gt(ether("0"));

    console.log(`this.nft address : ${this.nft.address}`);

    // Ensure deployer owns all minted NFTs. Then approve the marketplace to trade them.
    for (let id = 0; id < AMOUNT_OF_NFTS; id++) {
      expect(await this.nft.ownerOf(id)).to.be.eq(deployer);
    }
    await this.nft.setApprovalForAll(this.marketplace.address, true, {
      from: deployer,
    });

    // Open offers in the marketplace
    await this.marketplace.offerMany(
      [0, 1, 2, 3, 4, 5],
      [NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE, NFT_PRICE],
      {
        from: deployer,
      }
    );

    expect(await this.marketplace.amountOfOffers()).to.be.bignumber.eq("6");
  });

  it("Free Rider Exploit", async function () {
    await this.freeRiderAttacker.attack(NFT_PRICE, {
      from: attacker,
    });
  });

  after(async function () {
    expect(await balance.current(attacker)).to.be.bignumber.gt(BOUNTY);
    expect(await balance.current(this.buyer.address)).to.be.bignumber.eq("0");

    for (let tokenId = 0; tokenId < AMOUNT_OF_NFTS; tokenId++) {
      expect(await this.nft.ownerOf(tokenId)).to.be.eq(this.buyer.address);
    }

    expect(await this.marketplace.amountOfOffers()).to.be.bignumber.eq("0");
    expect(await balance.current(this.marketplace.address)).to.be.bignumber.lt(
      MARKETPLACE_INITIAL_ETH_BALANCE
    );
  });
});
