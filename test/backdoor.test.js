/**   Challenge #11 - Backdoor
 
To incentivize the creation of more secure wallets in their team, someone has deployed a registry of Gnosis Safe wallets. When someone in the team deploys and registers a wallet, they will earn 10 DVT tokens.

To make sure everything is safe and sound, the registry tightly integrates with the legitimate Gnosis Safe Proxy Factory, and has some additional safety checks.

Currently there are four people registered as beneficiaries: Alice, Bob, Charlie and David. The registry has 40 DVT tokens in balance to be distributed among them.

Your goal is to take all funds from the registry. In a single transaction.

*/

const {
  ether,
  BN,
  constants,
  balance,
  time,
} = require("@openzeppelin/test-helpers");
const { contract, accounts, web3 } = require("@openzeppelin/test-environment");

const DamnValuableToken = contract.fromArtifact("DamnValuableToken");
const WalletRegistry = contract.fromArtifact("WalletRegistry");
const GnosisSafe = contract.fromArtifact("GnosisSafe");
const GnosisSafeProxyFactory = contract.fromArtifact("GnosisSafeProxyFactory");
const BackdoorAttacker = contract.fromArtifact("BackdoorAttacker");

const { expect } = require("chai");

describe("Backdoor challenge", function () {
  const [deployer, attacker, Bob, Charlie, Alice, David, ...otherAccounts] =
    accounts;
  const users = [Bob, Charlie, Alice, David];

  const AMOUNT_TOKENS_DISTRIBUTED = ether("40");

  before(async function () {
    this.masterCopy = await GnosisSafe.new({
      from: deployer,
    });

    this.token = await DamnValuableToken.new({ from: deployer });

    this.factory = await GnosisSafeProxyFactory.new({ from: deployer });

    this.walletRegistry = await WalletRegistry.new(
      this.masterCopy.address,
      this.factory.address,
      this.token.address,
      users,
      { from: deployer }
    );

    for (let i = 0; i < users.length; i++) {
      expect(await this.walletRegistry.beneficiaries(users[i])).to.be.true;
    }

    this.backdoorAttacker = await BackdoorAttacker.new(
      this.factory.address,
      this.masterCopy.address,
      this.token.address,
      this.walletRegistry.address,
      { from: attacker }
    );

    // Transfer tokens to be distributed to the registry
    await this.token.transfer(
      this.walletRegistry.address,
      AMOUNT_TOKENS_DISTRIBUTED,
      { from: deployer }
    );
  });

  it("Explit Backdoor", async function () {
    await this.backdoorAttacker.attack(users, {
      from: attacker,
      gasLimit: 9e6,
    });
  });

  after(async function () {
    for (let i = 0; i < users.length; i++) {
      const wallet = await this.walletRegistry.wallets(users[i]);

      // User must have registered a wallet
      expect(wallet).to.not.eq(
        constants.ZERO_ADDRESS,
        "User did not register a wallet"
      );

      // User is no longer registered as a beneficiary
      expect(await this.walletRegistry.beneficiaries(users[i])).to.be.false;
    }

    // Attacker must have taken all tokens
    expect(await this.token.balanceOf(attacker)).to.be.bignumber.eq(
      AMOUNT_TOKENS_DISTRIBUTED
    );
  });
});
