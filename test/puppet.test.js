const { ether, BN, balance } = require("@openzeppelin/test-helpers");
const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const DamnValuableToken = contract.fromArtifact("DamnValuableToken");
const PuppetPool = contract.fromArtifact("PuppetPool");
const PuppetAttacker = contract.fromArtifact("PuppetAttacker");

contract.artifactsDir = "build-uniswap-v1";
const UniswapExchange = contract.fromArtifact("UniswapV1Exchange");
const UniswapFactory = contract.fromArtifact("UniswapV1Factory");

const { expect } = require("chai");

describe("[Challenge] Puppet", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const UNISWAP_INITIAL_TOKEN_RESERVE = ether("10");
  const UNISWAP_INITIAL_ETH_RESERVE = ether("10");

  const POOL_INITIAL_TOKEN_BALANCE = ether("100000");
  const ATTACKER_INITAL_TOKEN_BALANCE = ether("1000");
  const ATTACKER_INITAL_ETH_BALANCE = ether("25");

  before(async function () {
    this.template = await UniswapExchange.new({ from: deployer });

    this.token = await DamnValuableToken.new({ from: deployer });

    this.factory = await UniswapFactory.new({ from: deployer });

    await this.factory.initializeFactory(this.template.address, {
      from: deployer,
    });

    const { logs } = await this.factory.createExchange(this.token.address, {
      from: deployer,
    });

    this.exchange = await UniswapExchange.at(logs[0].args.exchange);

    this.pool = await PuppetPool.new(
      this.token.address,
      this.exchange.address,
      { from: deployer }
    );

    this.puppetAttacker = await PuppetAttacker.new({ from: deployer });

    await this.token.approve(
      this.exchange.address,
      UNISWAP_INITIAL_TOKEN_RESERVE,
      { from: deployer }
    );

    const deadline = (await web3.eth.getBlock("latest")).timestamp * 2;

    await this.exchange.addLiquidity(
      0,
      UNISWAP_INITIAL_TOKEN_RESERVE,
      deadline,
      { from: deployer, value: UNISWAP_INITIAL_ETH_RESERVE }
    );

    expect(
      await this.token.balanceOf(this.exchange.address)
    ).to.be.bignumber.eq(UNISWAP_INITIAL_TOKEN_RESERVE);

    expect(await balance.current(this.exchange.address)).to.be.bignumber.eq(
      UNISWAP_INITIAL_ETH_RESERVE
    );

    expect(
      await this.pool.calculateDepositRequired(ether("1"))
    ).to.be.bignumber.eq(ether("2"));

    await this.token.transfer(this.pool.address, POOL_INITIAL_TOKEN_BALANCE, {
      from: deployer,
    });

    await this.token.transfer(
      this.puppetAttacker.address,
      ATTACKER_INITAL_TOKEN_BALANCE,
      {
        from: deployer,
      }
    );

    expect(
      await this.token.balanceOf(this.puppetAttacker.address)
    ).to.be.bignumber.eq(ATTACKER_INITAL_TOKEN_BALANCE);

    console.log(
      `intial Attacker contract token Balance : ${await this.token.balanceOf(
        this.puppetAttacker.address
      )}`
    );
  });

  it("Exploit", async function () {
    await this.puppetAttacker.attack(
      this.pool.address,
      this.exchange.address,
      this.token.address,
      { from: attacker, value: ATTACKER_INITAL_ETH_BALANCE }
    );
  });

  after(async function () {
    expect(await this.token.balanceOf(attacker)).to.be.bignumber.gte(
      POOL_INITIAL_TOKEN_BALANCE
    );

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      "0"
    );

    expect(
      await balance.current(this.puppetAttacker.address)
    ).to.be.bignumber.eq("0");
  });
});
