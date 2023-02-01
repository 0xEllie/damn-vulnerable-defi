const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const FlashLoanReceiver = contract.fromArtifact("FlashLoanReceiver");
const NaiveReceiverLenderPool = contract.fromArtifact(
  "NaiveReceiverLenderPool"
);
const NaiveReceiverAttacker = contract.fromArtifact("NaiveReceiverAttacker");

const { expect } = require("chai");

describe("naive receiver challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const FLASHLOANER_POOL_BALANCE = ether("1000");
  const NAIVE_RECEIVER_BALANCE = ether("10");

  before(async function () {
    this.pool = await NaiveReceiverLenderPool.new({
      from: deployer,
    });

    await web3.eth.sendTransaction({
      from: deployer,
      to: this.pool.address,
      value: FLASHLOANER_POOL_BALANCE,
    });

    expect(await balance.current(this.pool.address)).to.be.bignumber.eq(
      FLASHLOANER_POOL_BALANCE
    );

    this.receiver = await FlashLoanReceiver.new(this.pool.address, {
      from: deployer,
    });

    await web3.eth.sendTransaction({
      from: deployer,
      to: this.receiver.address,
      value: NAIVE_RECEIVER_BALANCE,
    });

    expect(await balance.current(this.receiver.address)).to.be.bignumber.eq(
      NAIVE_RECEIVER_BALANCE
    );

    this.receiverAttacker = await NaiveReceiverAttacker.new({
      from: attacker,
    });

    expect(
      await balance.current(this.receiverAttacker.address)
    ).to.be.bignumber.eq("0");
  });

  it("Exploit Naive Receiver", async function () {
    await this.receiverAttacker.attack(
      this.pool.address,
      this.receiver.address,
      {
        from: attacker,
      }
    );
  });

  after(async function () {
    expect(await balance.current(this.receiver.address)).to.be.bignumber.eq(
      "0"
    );

    expect(await balance.current(this.pool.address)).to.be.bignumber.gt(
      FLASHLOANER_POOL_BALANCE
    );

    expect(
      await balance.current(this.receiverAttacker.address)
    ).to.be.bignumber.eq("0");
  });
});
