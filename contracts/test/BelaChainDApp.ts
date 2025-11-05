import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  BGPToken,
  MockUSDT,
  BelaChainDApp,
} from "../typechain-types";

describe("BelaChainDApp", function () {
  let bgpToken: BGPToken;
  let usdtToken: MockUSDT;
  let dapp: BelaChainDApp;

  let owner: SignerWithAddress;
  let treasury: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const INTERACTION_COST = ethers.parseEther("0.00018");
  const DAILY_BGP_REWARD = ethers.parseEther("2000");
  const IP_HASH_1 = ethers.id("192.168.1.1");
  const IP_HASH_2 = ethers.id("192.168.1.2");

  beforeEach(async function () {
    [owner, treasury, user1, user2, user3] = await ethers.getSigners();

    // Deploy BGPToken
    const BGPTokenFactory = await ethers.getContractFactory("BGPToken");
    bgpToken = await BGPTokenFactory.deploy();
    await bgpToken.waitForDeployment();

    // Deploy MockUSDT
    const MockUSDTFactory = await ethers.getContractFactory("MockUSDT");
    usdtToken = await MockUSDTFactory.deploy();
    await usdtToken.waitForDeployment();

    // Deploy BelaChainDApp
    const BelaChainDAppFactory = await ethers.getContractFactory(
      "BelaChainDApp"
    );
    dapp = await BelaChainDAppFactory.deploy(
      await bgpToken.getAddress(),
      await usdtToken.getAddress(),
      await treasury.getAddress()
    );
    await dapp.waitForDeployment();

    // Set up permissions
    await bgpToken.setMinter(await dapp.getAddress(), true);
    await bgpToken.setBlacklistChecker(await dapp.getAddress());

    // Mint USDT to dapp
    await usdtToken.mint(
      await dapp.getAddress(),
      ethers.parseUnits("1000000", 6)
    );

    // Give test users ETH
    await owner.sendTransaction({
      to: user1.address,
      value: ethers.parseEther("100"),
    });
    await owner.sendTransaction({
      to: user2.address,
      value: ethers.parseEther("100"),
    });
    await owner.sendTransaction({
      to: user3.address,
      value: ethers.parseEther("100"),
    });
  });

  describe("Registration", function () {
    it("Should allow user to register with referrer", async function () {
      await dapp.connect(user2).register(user1.address);

      const userInfo = await dapp.getUserInfo(user2.address);
      expect(userInfo[0]).to.equal(user1.address);
    });

    it("Should not allow registering twice", async function () {
      await dapp.connect(user2).register(user1.address);

      await expect(
        dapp.connect(user2).register(user1.address)
      ).to.be.revertedWith("Already registered");
    });
  });

  describe("Interaction", function () {
    it("Should reward user for interaction", async function () {
      await dapp
        .connect(user1)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      const balance = await bgpToken.balanceOf(user1.address);
      expect(balance).to.equal(DAILY_BGP_REWARD);
    });

    it("Should allow two interactions per day", async function () {
      await dapp
        .connect(user1)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      // Warp time 12 hours
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);

      await dapp
        .connect(user1)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      const count = await dapp.getTodayInteractionCount(user1.address);
      expect(count).to.equal(2);
    });

    it("Should not allow three interactions per day", async function () {
      // First interaction
      await dapp
        .connect(user1)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      // Second interaction
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await dapp
        .connect(user1)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      // Third interaction
      await ethers.provider.send("evm_increaseTime", [12 * 3600]);
      await expect(
        dapp
          .connect(user1)
          .interact(IP_HASH_1, { value: INTERACTION_COST })
      ).to.be.revertedWith("Exceeded daily interaction limit");
    });
  });

  describe("Referral Rewards", function () {
    it("Should reward referrer on user interaction", async function () {
      // User2 registers with User1 as referrer
      await dapp.connect(user2).register(user1.address);

      // User2 interacts
      await dapp
        .connect(user2)
        .interact(IP_HASH_1, { value: INTERACTION_COST });

      // Check User1 balance for referral reward
      const user1Balance = await bgpToken.balanceOf(user1.address);
      expect(user1Balance).to.be.gt(0);
    });
  });

  describe("Level System", function () {
    it("Should upgrade level on reaching threshold", async function () {
      // Perform multiple interactions to reach level up
      for (let i = 0; i < 10; i++) {
        await ethers.provider.send("evm_increaseTime", [24 * 3600]);
        await dapp
          .connect(user1)
          .interact(IP_HASH_1, { value: INTERACTION_COST });
      }

      const userInfo = await dapp.getUserInfo(user1.address);
      expect(userInfo[1]).to.be.gt(1); // level should be > 1
    });
  });
});
