import hre, { artifacts, ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  ConstructEvent,
  TokenURIEvent,
  TransferEvent,
  ConstructorConfigStruct,
  HumeAngelbabyCommunityEP1,
  TransferToStruct
} from "../typechain/HumeAngelbabyCommunityEP1";
import { HumeAngelbabyCommunityEP1Factory } from "../typechain/HumeAngelbabyCommunityEP1Factory";
import { expect } from "chai";
import { fetchFile, getEventArgs } from "./utils";
import path from "path";

export let angelBaby: HumeAngelbabyCommunityEP1
export let angelBabyFactory: HumeAngelbabyCommunityEP1Factory

export let admin: SignerWithAddress,
  new_Admin: SignerWithAddress,
  owner: SignerWithAddress, 
  new_Owner: SignerWithAddress, 
  recipient: SignerWithAddress, 
  factoryOwner: SignerWithAddress, 
  newFactoryOwner: SignerWithAddress;

export let ConstructorConfig: ConstructorConfigStruct;

export let deployTransaction;
export let createChildTx;

before(async () => {
  const signers = await ethers.getSigners();
  admin = signers[0]
  owner = signers[1];
  recipient = signers[2];
  factoryOwner = signers[3];
  newFactoryOwner = signers[4];
  new_Owner = signers[5];
  new_Admin = signers[6];

  const AngelbabbyFactory = await ethers.getContractFactory("HumeAngelbabyCommunityEP1Factory");

  angelBabyFactory = await AngelbabbyFactory.connect(factoryOwner).deploy() as HumeAngelbabyCommunityEP1Factory;
})

describe("HumeAngelbabyCommunityEP1 test", () => {
  describe("HumeAngelbabyCommunityEP1Factory Owner test", () => {
    it("Should deploy HumeAngelbabyCommunityEP1Factory",async () => {
      expect(angelBabyFactory.address).to.be.not.null;
    });
  
    it("HumeAngelbabyCommunityEP1Factory should be owned by Admin",async () => {
      expect(await angelBabyFactory.owner()).to.equals(factoryOwner.address);
    });
  
    it("Should transfer the ownership to another address.", async () => {
      let ownershipTransferTx = await angelBabyFactory.connect(factoryOwner).transferOwnership(newFactoryOwner.address);

      const { previousOwner, newOwner } = await getEventArgs(ownershipTransferTx, "OwnershipTransferred", angelBabyFactory);

      expect(await angelBabyFactory.owner()).to.equals(newFactoryOwner.address);
      expect(previousOwner).to.equals(factoryOwner.address);
      expect(newOwner).to.equals(newFactoryOwner.address);
    });

    it("Should fail to transfer ownerShip by non-owner address", async () => {
      await expect(angelBabyFactory.connect(factoryOwner).transferOwnership(factoryOwner.address)).to.revertedWith("Ownable: caller is not the owner");
    });

    it("Should fail to create a child using createChild() by non owner address", async () => {
      await expect(angelBabyFactory.connect(factoryOwner).createChild(newFactoryOwner.address)).to.revertedWith("Ownable: caller is not the owner");
    });

    it("Owner shopuld be able to create child",async () => {
      let config: ConstructorConfigStruct= {
        name: "ANGELBABY",
        symbol: "AGBB",
        tokenURI: "OLD_TOKEN_URI",
        quantity: 100,
        admin: admin.address,
        owner: owner.address
      }

      let createChildTx = await angelBabyFactory.connect(newFactoryOwner).createChildTyped(config);

      const {sender, child} = await getEventArgs(createChildTx, "NewChild", angelBabyFactory);

      angelBaby = await ethers.getContractAt((await artifacts.readArtifact("HumeAngelbabyCommunityEP1")).abi, child) as HumeAngelbabyCommunityEP1;

      expect(await angelBabyFactory.isChild(child)).to.be.true;
      expect(sender).to.equals(angelBabyFactory.address);
      expect(angelBaby.address).to.equals(child);
      expect(await angelBaby.owner()).to.equals(owner.address, `Owner is ${angelBaby.owner()} not ${owner.address}`);
      expect(await angelBaby.admin()).to.equals(admin.address, `admin is ${angelBaby.admin()} not ${admin.address}`);
      expect(await angelBaby.name()).to.equals(config.name, `name is ${angelBaby.name()} not ${config.name}`);
      expect(await angelBaby.symbol()).to.equals(config.symbol, `symbol is ${angelBaby.symbol()} not ${config.symbol}`);
      expect(await angelBaby.tokenURI(1)).to.equals(config.tokenURI, `tokenURI is ${angelBaby.tokenURI(2)} not ${config.tokenURI}`);
      expect(await angelBaby.totalSupply()).to.equals(config.quantity, `totalSupply is ${angelBaby.totalSupply()} not ${config.quantity}`);

      expect(await angelBaby.ownerOf(1)).to.equals(admin.address);
      expect(await angelBaby.ownerOf(config.quantity)).to.equals(admin.address);
    });
  });

  describe("HumeAngelbabyCommunityEP1 Owner test", () => {
    it("Owner should not be able to change TokenURI", async () => {
      await expect(angelBaby.connect(owner).adminSetTokenURI("NEW_TOKEN_URI")).to.revertedWith("Adminable: caller is not the admin")
    });

    it("Owner should not be able to change owner", async () => {
      await expect(angelBaby.connect(owner).adminSetOwner(new_Owner.address)).to.revertedWith("Adminable: caller is not the admin")
    });

    it("Owner should not be able to change Admin", async () => {
      await expect(angelBaby.connect(owner).transferAdmin(new_Admin.address)).to.revertedWith("Adminable: caller is not the admin")
    });
  });

  describe("HumeAngelbabyCommunityEP1 Admin test", () => {
    it("Admin should be able to change TokenURI", async () => {
      let newTokenURI = "NEW_TOKEN_URI";
      let tokenURITx = await angelBaby.connect(admin).adminSetTokenURI(newTokenURI);

      const {sender , tokenURI} = await getEventArgs(tokenURITx, "TokenURI", angelBaby);

      expect(sender).to.be.equals(admin.address);
      expect(tokenURI).to.be.equals(newTokenURI);
      expect(await angelBaby.tokenURI(1)).to.equals(newTokenURI, `tokenURI is ${angelBaby.tokenURI(2)} not ${newTokenURI}`);

    });

    it("Admin should be able to change owner", async () => {
      let ownerTx = await angelBaby.connect(admin).adminSetOwner(new_Owner.address);

      const {previousOwner , newOwner} = await getEventArgs(ownerTx, "OwnershipTransferred", angelBaby);

      expect(await angelBaby.owner()).to.be.equals(newOwner);
      expect(previousOwner).to.be.equals(owner.address);
      expect(newOwner).to.be.equals(new_Owner.address);
    });

    it("Admin should be able to transferAdminShip", async () => {
      let adminTx = await angelBaby.transferAdmin(new_Admin.address);

      const { previousAdmin, newAdmin } = await getEventArgs(adminTx, "AdminTransferred", angelBaby);

      expect(previousAdmin).to.be.equals(admin.address);
      expect(newAdmin).to.be.equals(new_Admin.address);
      expect(await angelBaby.admin()).to.be.equals(new_Admin.address);
    });
  });

  describe("multiTransferToEOA test", () => {
    let humeAngelBaby: HumeAngelbabyCommunityEP1
    let config: ConstructorConfigStruct

    before(async () => {
      config = {
        name: "ANGELBABY",
        symbol: "AGBB",
        tokenURI: "OLD_TOKEN_URI",
        quantity: 50,
        admin: admin.address,
        owner: owner.address
      }

      createChildTx = await angelBabyFactory.connect(newFactoryOwner).createChildTyped(config);

    });

    it("Should deploy Child angelbaby contract", async () => {
      const {sender, child} = await getEventArgs(createChildTx, "NewChild", angelBabyFactory);

      humeAngelBaby = await ethers.getContractAt((await artifacts.readArtifact("HumeAngelbabyCommunityEP1")).abi, child) as HumeAngelbabyCommunityEP1;

      expect(humeAngelBaby.address).to.be.not.null;
      expect(sender).to.equals(angelBabyFactory.address);
      expect(humeAngelBaby.address).to.equals(child);
      expect(await humeAngelBaby.owner()).to.equals(owner.address, `Owner is ${angelBaby.owner()} not ${owner.address}`);
      expect(await humeAngelBaby.admin()).to.equals(admin.address, `admin is ${angelBaby.admin()} not ${admin.address}`);
      expect(await humeAngelBaby.name()).to.equals(config.name, `name is ${angelBaby.name()} not ${config.name}`);
      expect(await humeAngelBaby.symbol()).to.equals(config.symbol, `symbol is ${angelBaby.symbol()} not ${config.symbol}`);
      expect(await humeAngelBaby.tokenURI(1)).to.equals(config.tokenURI, `tokenURI is ${angelBaby.tokenURI(1)} not ${config.tokenURI}`);
      expect(await humeAngelBaby.totalSupply()).to.equals(config.quantity, `totalSupply is ${angelBaby.totalSupply()} not ${config.quantity}`);

      expect(await humeAngelBaby.ownerOf(1)).to.equals(admin.address);
      expect(await humeAngelBaby.ownerOf(config.quantity)).to.equals(admin.address);
    });

    it("Should transfer all tokens",async () => {
      const pathAddresses = path.resolve(__dirname, `../config/addresses.json`);
      const addresses = JSON.parse(fetchFile(pathAddresses));

      let quantity = parseInt(await (await humeAngelBaby.totalSupply())._hex);
      let transferTo: TransferToStruct[] = []
      for (let i = 1; i <= quantity; i++) {
        transferTo.push({
          id: i,
          to: addresses[i-1]
        });
      }

      let transferTx = await humeAngelBaby.connect(admin).multiTransferToEOA(transferTo);

      for (let i = 0; i < quantity; i++) {
        expect(await humeAngelBaby.ownerOf(transferTo[i].id)).to.equals(transferTo[i].to);
      }
    });
  });
});