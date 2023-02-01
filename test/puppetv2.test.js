const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const PuppetV2Pool = contract.fromArtifact("PuppetV2Pool");
const PuppetV2Attacker = contract.fromArtifact("PuppetV2Attacker");
const DamnValuableToken = contract.fromArtifact("DamnValuableToken");
const WETH9 = contract.fromArtifact("WETH9");

contract.artifactsDir = "build-uniswap-v2";
const UniswapV2Pair = contract.fromArtifact("UniswapV2Pair");
const UniswapV2Factory = contract.fromArtifact("UniswapV2Factory");
const UniswapV2Router02 = contract.fromArtifact("UniswapV2Router02");

describe("PuppetV2 challenge", function () {
  const [deployer, attacker, ...otherAccounts] = accounts;
  const UNISWAP_INITIAL_TOKEN_RESERVE = ether("100");
  const UNISWAP_INITIAL_WETH_RESERVE = ether("10");

  const ATTACKER_INITIAL_WETH_BALANCE = ether("20");
  const ATTACKER_INITIAL_TOKEN_BALANCE = ether("10000");
  const POOL_INITIAL_TOKEN_BALANCE = ether("1000000");

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

    this.pool = await PuppetV2Pool.new(
      this.weth.address,
      this.token.address,
      this.pair.address,
      this.factory.address,
      { from: deployer }
    );

    this.puppetv2Attacker = await PuppetV2Attacker.new(
      this.pool.address,
      this.router.address,
      this.token.address,
      this.weth.address,
      { from: deployer }
    );

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

    expect(await this.pair.balanceOf(deployer)).to.be.bignumber.gt("0");

    await this.token.transfer(
      this.puppetv2Attacker.address,
      ATTACKER_INITIAL_TOKEN_BALANCE,
      { from: deployer }
    );

    await web3.eth.sendTransaction({
      to: this.puppetv2Attacker.address,
      from: deployer,
      value: ATTACKER_INITIAL_WETH_BALANCE,
    });

    await this.token.transfer(this.pool.address, POOL_INITIAL_TOKEN_BALANCE, {
      from: deployer,
    });

    // Ensure correct setup of pool.
    expect(
      await this.pool.calculateDepositOfWETHRequired(ether("10"))
    ).to.be.bignumber.eq(ether("3"));
  });

  it("puppetV2 Exploit", async function () {
    await this.puppetv2Attacker.attack({ from: attacker });
  });

  after(async function () {
    expect(await this.token.balanceOf(attacker)).to.be.bignumber.gt(
      ATTACKER_INITIAL_TOKEN_BALANCE
    );

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      "0"
    );
  });
});
