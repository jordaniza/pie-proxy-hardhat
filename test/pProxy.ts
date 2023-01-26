import { ethers } from "hardhat";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { PProxy, TestImplementation } from "../typechain-types";

const { expect } = chai;

const PLACE_HOLDER_ADDRESS = "0x0000000000000000000000000000000000000001";

describe("PProxy", () => {
  let signers: Signer[];
  let proxy: PProxy;
  let implementationContract: TestImplementation;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const pproxyFactory = await ethers.getContractFactory("PProxy");
    const implementationFactory = await ethers.getContractFactory(
      "TestImplementation"
    );

    proxy = await pproxyFactory.deploy();
    implementationContract = await implementationFactory.deploy();
  });

  describe("Ownership", async () => {
    it("Owner should be msg.sender", async () => {
      const expected = await signers[0].getAddress();
      const owner = await proxy.getProxyOwner();
      expect(owner).to.eq(expected, "Owner is not deployer");
    });

    it("Calling setProxyOwner by a different address than the proxyOwner should fail", async () => {
      const newOwner = await signers[0].getAddress();
      const altSignerProxy = proxy.connect(signers[1]);
      await expect(altSignerProxy.setProxyOwner(newOwner)).to.be.reverted;
    });

    it("Setting the proxy owner should work", async () => {
      const newOwner = await signers[0].getAddress();
      await proxy.setProxyOwner(newOwner);
      const actualNewOwner = await proxy.getProxyOwner();
      expect(actualNewOwner).to.eq(newOwner);
    });
  });

  describe("Setting the implementation", async () => {
    it("Setting the implementation contract should work", async () => {
      await proxy.setImplementation(PLACE_HOLDER_ADDRESS);
      const implementation = await proxy.getImplementation();
      expect(implementation).to.eq(PLACE_HOLDER_ADDRESS);
    });

    it("Setting the implementation contract from a non owner should fail", async () => {
      const altSignerProxy = proxy.connect(signers[1]);
      await expect(altSignerProxy.setImplementation(PLACE_HOLDER_ADDRESS)).to.be
        .reverted;
    });
  });

  describe("Delegating calls to implementation contract", async () => {
    it("Calls should be delegated to implementation contract", async () => {
      const value = "TEST";
      await proxy.setImplementation(implementationContract.address);

      const proxiedImplementation = new ethers.Contract(
        proxy.address,
        implementationContract.interface,
        signers[0]
      ) as TestImplementation;
      await proxiedImplementation.setValue("TEST");
      const actualValue = await proxiedImplementation.getValue();
      expect(actualValue).to.eq(value, "");
      // Implementation storage should not be changed
      const implementationValue = await implementationContract.getValue();
      expect(implementationValue).to.eq("");
    });
  });
});
