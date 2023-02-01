const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const TrusterLenderPool = contract.fromArtifact("TrusterLenderPool");
const TrusterAttacker = contract.fromArtifact("TrusterAttacker");
const DamnValuableToken = contract.fromArtifact("DamnValuableToken");

const { expect } = require("chai");

describe("Truster challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const FLASHLOANER_POOL_BALANCE = ether("1000000");

  before(async function () {
    this.token = await DamnValuableToken.new({
      from: deployer,
    });

    this.pool = await TrusterLenderPool.new(this.token.address, {
      from: deployer,
    });

    await this.token.transfer(this.pool.address, FLASHLOANER_POOL_BALANCE, {
      from: deployer,
    });

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );

    this.trusterAttacker = await TrusterAttacker.new({
      from: attacker,
    });

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );
    expect(
      await this.token.balanceOf(this.trusterAttacker.address)
    ).to.be.bignumber.eq("0");

    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq("0");
  });

  it("Truster Entrance", async function () {
    await this.trusterAttacker.attack(
      this.pool.address,
      this.token.address,
      attacker,
      {
        from: attacker,
      }
    );
  });

  after(async function () {
    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      "0"
    );

    expect(
      await this.token.balanceOf(this.trusterAttacker.address)
    ).to.be.bignumber.eq("0");

    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );
  });
});
