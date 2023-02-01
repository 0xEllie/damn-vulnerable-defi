const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const DamnValuableToken = contract.fromArtifact("DamnValuableToken");
const AccountingToken = contract.fromArtifact("AccountingToken");
const RewardToken = contract.fromArtifact("RewardToken");
const FlashLoanerPool = contract.fromArtifact("FlashLoanerPool");
const TheRewarderPool = contract.fromArtifact("TheRewarderPool");
const TheRewarderAttacker = contract.fromArtifact("TheRewarderAttacker");

const { expect } = require("chai");

describe("The Rewarder challenge", function () {
  const [deployer, attacker, alice, bob, charlie, david, ...otherAccount] =
    accounts;

  const users = [alice, bob, charlie, david];

  const FLASHLOANER_POOL_TOKEN_BALANCE = ether("1000000");
  const USER_TOKEN = ether("100");

  before(async function () {
    this.liquidityToken = await DamnValuableToken.new({
      from: deployer,
    });

    this.rewarderPool = await TheRewarderPool.new(this.liquidityToken.address, {
      from: deployer,
    });

    this.rewardToken = await RewardToken.at(
      await this.rewarderPool.rewardToken(),
      {
        from: deployer,
      }
    );

    this.accToken = await AccountingToken.at(
      await this.rewarderPool.accToken(),
      {
        from: deployer,
      }
    );

    this.flashloaner = await FlashLoanerPool.new(this.liquidityToken.address, {
      from: deployer,
    });

    this.rewarderAttacker = await TheRewarderAttacker.new({
      from: attacker,
    });

    await this.liquidityToken.transfer(
      this.flashloaner.address,
      FLASHLOANER_POOL_TOKEN_BALANCE,
      {
        from: deployer,
      }
    );

    expect(
      await this.liquidityToken.balanceOf(this.flashloaner.address)
    ).to.be.bignumber.eq(FLASHLOANER_POOL_TOKEN_BALANCE);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      await this.liquidityToken.transfer(user, USER_TOKEN, {
        from: deployer,
      });

      await this.liquidityToken.approve(this.rewarderPool.address, USER_TOKEN, {
        from: user,
      });

      await this.rewarderPool.deposit(USER_TOKEN, { from: user });

      expect(await this.accToken.balanceOf(user)).to.be.bignumber.eq(
        USER_TOKEN
      );
    }

    expect(await this.accToken.totalSupply()).to.be.bignumber.eq(ether("400"));

    expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq("0");

    await time.increase(time.duration.days(5));

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      await this.rewarderPool.distributeRewards({ from: user });

      expect(await this.rewardToken.balanceOf(user)).to.be.bignumber.eq(
        ether("25")
      );
    }

    expect(await this.rewardToken.totalSupply()).to.be.bignumber.eq(
      ether("100")
    );
  });

  it("Exploit The Rewarder", async function () {
    await time.increase(time.duration.days(5));

    await this.rewarderAttacker.attack(
      this.flashloaner.address,
      this.rewarderPool.address,
      this.liquidityToken.address,
      this.rewardToken.address,
      { from: attacker }
    );
  });

  after(async function () {
    expect(await this.rewarderPool.roundNumber()).to.be.bignumber.eq("3");

    for (let i = 0; i < users.length; i++) {
      const user = users[i];

      await this.rewarderPool.distributeRewards({ from: user });

      expect(await this.rewardToken.balanceOf(user)).to.be.bignumber.gt(
        ether("25")
      );
    }

    expect(await this.rewardToken.totalSupply()).to.be.bignumber.gt(
      ether("100")
    );

    expect(await this.rewardToken.balanceOf(attacker)).to.be.bignumber.gt(
      ether("99")
    );
  });
});
