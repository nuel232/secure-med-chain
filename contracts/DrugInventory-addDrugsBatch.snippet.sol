// SPDX-License-Identifier: MIT
// Paste into your DrugInventory contract and redeploy (or upgrade) so CSV import can use one tx.
//
// Requirements:
// - Batch calls the same logic as addDrug. If addDrug is `external` only, change it to `public`
//   or extract shared logic into `function _addDrug(...) internal` and call that from both.
// - Replace `onlyAdmin` with your contract's admin check (modifier or require(isAdmin(msg.sender))).
//
// Example (adjust names to match your contract):
//
//   function addDrugsBatch(
//     string[] calldata names,
//     uint256[] calldata quantities,
//     uint256[] calldata expiryDates
//   ) external onlyAdmin {
//     require(
//       names.length == quantities.length && names.length == expiryDates.length,
//       "Length mismatch"
//     );
//     require(names.length > 0, "Empty batch");
//     for (uint256 i = 0; i < names.length; ) {
//       addDrug(names[i], quantities[i], expiryDates[i]);
//       unchecked { ++i; }
//     }
//   }
