const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const SideEntranceLenderPool = contract.fromArtifact("SideEntranceLenderPool");
const SideEntranceAttacker = contract.fromArtifact("SideEntranceAttacker");

const { expect } = require("chai");

describe("Side Entrance challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const FLASHLOANER_POOL_BALANCE = ether("1000");

  before(async function () {
    this.pool = await SideEntranceLenderPool.new({
      from: deployer,
    });

    this.pool.deposit({
      from: deployer,
      value: FLASHLOANER_POOL_BALANCE,
    });

    this.sideAttacker = await SideEntranceAttacker.new({
      from: attacker,
    });

    expect(await balance.current(this.pool.address)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );
    expect(await balance.current(this.sideAttacker.address)).to.be.bignumber.eq(
      "0"
    );
    this.attackerInitialBalance = await balance.current(attacker);
  });

  it("Exploit Side Entrance", async function () {
    await this.sideAttacker.attack(this.pool.address, attacker, {
      from: attacker,
    });
  });

  after(async function () {
    expect(await balance.current(this.pool.address)).to.be.bignumber.eq("0");

    expect(await balance.current(attacker)).to.be.bignumber.gt(
      this.attackerInitialBalance
    );
  });
});
