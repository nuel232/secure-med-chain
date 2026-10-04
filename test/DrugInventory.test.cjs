const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

const DAY = 24 * 60 * 60;

async function deployFixture() {
  const [admin, staff, stranger, other] = await ethers.getSigners();
  const Inventory = await ethers.getContractFactory("DrugInventory");
  const inv = await Inventory.deploy();
  await inv.waitForDeployment();
  const now = await time.latest();
  return { inv, admin, staff, stranger, other, now };
}

async function withDrugFixture() {
  const base = await deployFixture();
  const expiry = base.now + 365 * DAY;
  await base.inv.addDrug("Paracetamol 500mg", "BN-001", "NAFDAC 04-1234", 100, expiry);
  await base.inv.grantStaff(base.staff.address);
  return { ...base, expiry };
}

describe("DrugInventory", () => {
  describe("deployment", () => {
    it("sets the deployer as admin and nobody as staff", async () => {
      const { inv, admin, staff, stranger } = await loadFixture(deployFixture);
      expect(await inv.admin()).to.equal(admin.address);
      expect(await inv.isAdmin(admin.address)).to.equal(true);
      expect(await inv.isAdmin(stranger.address)).to.equal(false);
      expect(await inv.isPharmacyStaff(staff.address)).to.equal(false);
      expect(await inv.isPharmacyStaff(stranger.address)).to.equal(false);
    });
  });

  describe("staff authorization", () => {
    it("only admin can grant and revoke", async () => {
      const { inv, staff, stranger } = await loadFixture(deployFixture);
      await expect(inv.connect(stranger).grantStaff(staff.address)).to.be.revertedWith(
        "Only admin can perform this action",
      );
      await inv.grantStaff(staff.address);
      await expect(inv.connect(stranger).revokeStaff(staff.address)).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });

    it("emits events and updates the whitelist", async () => {
      const { inv, admin, staff } = await loadFixture(deployFixture);
      await expect(inv.grantStaff(staff.address))
        .to.emit(inv, "StaffGranted")
        .withArgs(staff.address, admin.address);
      expect(await inv.isPharmacyStaff(staff.address)).to.equal(true);
      await expect(inv.revokeStaff(staff.address))
        .to.emit(inv, "StaffRevoked")
        .withArgs(staff.address, admin.address);
      expect(await inv.isPharmacyStaff(staff.address)).to.equal(false);
    });

    it("rejects zero address, duplicate grants and revoking non-staff", async () => {
      const { inv, staff } = await loadFixture(deployFixture);
      await expect(inv.grantStaff(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
      await inv.grantStaff(staff.address);
      await expect(inv.grantStaff(staff.address)).to.be.revertedWith("Already authorized");
      await inv.revokeStaff(staff.address);
      await expect(inv.revokeStaff(staff.address)).to.be.revertedWith("Not authorized");
    });
  });

  describe("adding drugs", () => {
    it("stores all fields and emits DrugAdded", async () => {
      const { inv, admin, now } = await loadFixture(deployFixture);
      const expiry = now + 100 * DAY;
      await expect(inv.addDrug("Amoxicillin 250mg", "BN-77", "NAFDAC 04-9", 50, expiry)).to.emit(
        inv,
        "DrugAdded",
      );
      const [drug, expired] = await inv.getDrug(1);
      expect(drug.name).to.equal("Amoxicillin 250mg");
      expect(drug.batchNumber).to.equal("BN-77");
      expect(drug.registrationNumber).to.equal("NAFDAC 04-9");
      expect(drug.quantity).to.equal(50n);
      expect(drug.expiryDate).to.equal(BigInt(expiry));
      expect(drug.addedBy).to.equal(admin.address);
      expect(expired).to.equal(false);
      expect(await inv.drugCount()).to.equal(1n);
    });

    it("allows an empty registration number but not an empty batch number", async () => {
      const { inv, now } = await loadFixture(deployFixture);
      await inv.addDrug("Ibuprofen", "BN-1", "", 10, now + DAY);
      await expect(inv.addDrug("Ibuprofen", "", "", 10, now + DAY)).to.be.revertedWith(
        "Batch number required",
      );
    });

    it("validates name, quantity, expiry and length limits", async () => {
      const { inv, now } = await loadFixture(deployFixture);
      await expect(inv.addDrug("", "B", "", 1, now + DAY)).to.be.revertedWith(
        "Drug name cannot be empty",
      );
      await expect(inv.addDrug("X", "B", "", 0, now + DAY)).to.be.revertedWith(
        "Quantity must be greater than 0",
      );
      await expect(inv.addDrug("X", "B", "", 1, now - DAY)).to.be.revertedWith(
        "Expiry date must be in the future",
      );
      await expect(inv.addDrug("N".repeat(101), "B", "", 1, now + DAY)).to.be.revertedWith(
        "Drug name too long",
      );
      await expect(inv.addDrug("X", "B".repeat(65), "", 1, now + DAY)).to.be.revertedWith(
        "Batch number too long",
      );
    });

    it("blocks non-admins, including authorized staff", async () => {
      const { inv, staff, stranger, now } = await loadFixture(withDrugFixture);
      for (const who of [staff, stranger]) {
        await expect(
          inv.connect(who).addDrug("X", "B", "", 1, now + DAY),
        ).to.be.revertedWith("Only admin can perform this action");
      }
    });

    it("batch-adds many drugs atomically", async () => {
      const { inv, now } = await loadFixture(deployFixture);
      const items = [
        { name: "A", batchNumber: "B1", registrationNumber: "R1", quantity: 5, expiryDate: now + DAY },
        { name: "B", batchNumber: "B2", registrationNumber: "", quantity: 6, expiryDate: now + 2 * DAY },
      ];
      await inv.addDrugsBatch(items);
      expect(await inv.drugCount()).to.equal(2n);

      // second item invalid -> whole batch reverts, count unchanged
      const bad = [items[0], { ...items[1], quantity: 0 }];
      await expect(inv.addDrugsBatch(bad)).to.be.revertedWith("Quantity must be greater than 0");
      expect(await inv.drugCount()).to.equal(2n);
    });

    it("rejects empty and oversized batches, and non-admin callers", async () => {
      const { inv, stranger, now } = await loadFixture(deployFixture);
      await expect(inv.addDrugsBatch([])).to.be.revertedWith("Empty batch");
      const item = { name: "A", batchNumber: "B", registrationNumber: "", quantity: 1, expiryDate: now + DAY };
      await expect(inv.addDrugsBatch(Array(101).fill(item))).to.be.revertedWith("Batch too large");
      await expect(inv.connect(stranger).addDrugsBatch([item])).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });
  });

  describe("dispensing", () => {
    it("lets a stranger NOT dispense (the original hole)", async () => {
      const { inv, stranger } = await loadFixture(withDrugFixture);
      await expect(inv.connect(stranger).dispenseDrug(1, 1, "Ward 3")).to.be.revertedWith(
        "Only authorized staff can perform this action",
      );
    });

    it("lets authorized staff and admin dispense, and emits the reason", async () => {
      const { inv, admin, staff } = await loadFixture(withDrugFixture);
      await expect(inv.connect(staff).dispenseDrug(1, 10, "Ward 3"))
        .to.emit(inv, "DrugDispensed")
        .withArgs(1, "Paracetamol 500mg", 10, "Ward 3", staff.address, anyValue);
      await inv.connect(admin).dispenseDrug(1, 5, "Outpatient");
      const [drug] = await inv.getDrug(1);
      expect(drug.quantity).to.equal(85n);
    });

    it("stops a revoked staff member", async () => {
      const { inv, staff } = await loadFixture(withDrugFixture);
      await inv.revokeStaff(staff.address);
      await expect(inv.connect(staff).dispenseDrug(1, 1, "Ward")).to.be.revertedWith(
        "Only authorized staff can perform this action",
      );
    });

    it("validates reason, quantity, stock and existence", async () => {
      const { inv, staff } = await loadFixture(withDrugFixture);
      const s = inv.connect(staff);
      await expect(s.dispenseDrug(1, 1, "")).to.be.revertedWith("Reason required");
      await expect(s.dispenseDrug(1, 1, "r".repeat(201))).to.be.revertedWith("Reason too long");
      await expect(s.dispenseDrug(1, 0, "Ward")).to.be.revertedWith("Quantity must be greater than 0");
      await expect(s.dispenseDrug(1, 101, "Ward")).to.be.revertedWith("Insufficient quantity");
      await expect(s.dispenseDrug(99, 1, "Ward")).to.be.revertedWith("Drug does not exist");
    });

    it("blocks dispensing once the drug has expired", async () => {
      const { inv, staff, expiry } = await loadFixture(withDrugFixture);
      await time.increaseTo(expiry + 1);
      await expect(inv.connect(staff).dispenseDrug(1, 1, "Ward")).to.be.revertedWith(
        "Cannot dispense expired drugs",
      );
      expect(await inv.isExpired(1)).to.equal(true);
    });
  });

  describe("stock correction and write-off", () => {
    it("admin can adjust quantity with a logged reason; others cannot", async () => {
      const { inv, staff, admin } = await loadFixture(withDrugFixture);
      await expect(inv.adjustQuantity(1, 90, "Stock-take correction"))
        .to.emit(inv, "QuantityAdjusted")
        .withArgs(1, "Paracetamol 500mg", 100, 90, "Stock-take correction", admin.address, anyValue);
      await expect(inv.adjustQuantity(1, 80, "")).to.be.revertedWith("Reason required");
      await expect(inv.connect(staff).adjustQuantity(1, 1, "x")).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });

    it("writes off only expired stock, once", async () => {
      const { inv, expiry } = await loadFixture(withDrugFixture);
      await expect(inv.writeOffExpired(1)).to.be.revertedWith("Drug has not expired");
      await time.increaseTo(expiry + 1);
      await expect(inv.writeOffExpired(1)).to.emit(inv, "DrugWrittenOff");
      const [drug] = await inv.getDrug(1);
      expect(drug.quantity).to.equal(0n);
      await expect(inv.writeOffExpired(1)).to.be.revertedWith("Nothing to write off");
    });

    it("only admin can write off", async () => {
      const { inv, staff, expiry } = await loadFixture(withDrugFixture);
      await time.increaseTo(expiry + 1);
      await expect(inv.connect(staff).writeOffExpired(1)).to.be.revertedWith(
        "Only admin can perform this action",
      );
    });
  });

  describe("admin transfer", () => {
    it("is two-step and the old admin loses power", async () => {
      const { inv, admin, other, now } = await loadFixture(deployFixture);
      await expect(inv.proposeAdmin(other.address))
        .to.emit(inv, "AdminTransferProposed")
        .withArgs(admin.address, other.address);
      // proposal alone changes nothing
      expect(await inv.admin()).to.equal(admin.address);
      await inv.connect(other).acceptAdmin();
      expect(await inv.admin()).to.equal(other.address);
      expect(await inv.pendingAdmin()).to.equal(ethers.ZeroAddress);

      await expect(inv.addDrug("X", "B", "", 1, now + DAY)).to.be.revertedWith(
        "Only admin can perform this action",
      );
      await inv.connect(other).addDrug("X", "B", "", 1, now + DAY);
    });

    it("rejects zero address, non-admin proposers and wrong acceptors", async () => {
      const { inv, stranger, other } = await loadFixture(deployFixture);
      await expect(inv.proposeAdmin(ethers.ZeroAddress)).to.be.revertedWith("Zero address");
      await expect(inv.connect(stranger).proposeAdmin(other.address)).to.be.revertedWith(
        "Only admin can perform this action",
      );
      await inv.proposeAdmin(other.address);
      await expect(inv.connect(stranger).acceptAdmin()).to.be.revertedWith("Not the pending admin");
    });
  });

  describe("pagination", () => {
    it("returns pages and handles out-of-range offsets", async () => {
      const { inv, now } = await loadFixture(deployFixture);
      for (let i = 1; i <= 5; i++) {
        await inv.addDrug(`Drug ${i}`, `B${i}`, "", i, now + DAY);
      }
      const p1 = await inv.getDrugs(0, 2);
      const p2 = await inv.getDrugs(2, 2);
      const p3 = await inv.getDrugs(4, 10);
      expect(p1.map((d) => d.name)).to.deep.equal(["Drug 1", "Drug 2"]);
      expect(p2.map((d) => d.name)).to.deep.equal(["Drug 3", "Drug 4"]);
      expect(p3.map((d) => d.name)).to.deep.equal(["Drug 5"]);
      expect((await inv.getDrugs(5, 10)).length).to.equal(0);
      expect((await inv.getDrugs(0, 0)).length).to.equal(0);
    });
  });
});
