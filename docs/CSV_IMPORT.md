# CSV batch import

Admins can add many drug batches in one go from **Admin Dashboard → Import CSV**. Files are sent
on-chain in groups of up to 100 rows per transaction, so a 250-row file is 3 transactions (and 3
MetaMask confirmations). Each group is all-or-nothing.

## Format

Columns are matched by **header name**, so their order doesn't matter.

| Column               | Required | Notes                                              |
| -------------------- | -------- | -------------------------------------------------- |
| `name`               | yes      | Up to 100 bytes                                    |
| `batchNumber`        | yes      | Manufacturer lot / batch number, up to 64 bytes    |
| `registrationNumber` | no       | Regulator number (e.g. NAFDAC), up to 64 bytes     |
| `quantity`           | yes      | Positive whole number                              |
| `expiryDate`         | yes      | `YYYY-MM-DD`. The drug is valid **through** that day |

```csv
name,batchNumber,registrationNumber,quantity,expiryDate
Paracetamol 500mg,BN-001,04-1234,1000,2028-12-31
Aspirin 100mg,BN-002,,500,2028-06-15
"Ibuprofen 200mg, tablets",BN-003,04-5678,750,2028-03-20
```

Wrap a value in double quotes if it contains a comma. Use `""` for a literal quote.
`drug-import-sample.csv` in the repo root is a working example, and the modal has a
"Download sample" button.

## What gets rejected

Rows are validated in the browser before anything is sent. A row is rejected for: a missing name,
batch number, quantity or date; a non-numeric or zero quantity; an impossible date (e.g.
`2028-02-31`); an expiry in the past; or values over the length limits. Valid rows are listed
separately from invalid ones, and you choose whether to import the valid ones.

If the file has no `name`, `batchNumber`, `quantity` or `expiryDate` header, the whole file is
rejected with a message saying which column is missing.

## If an import fails midway

Because large files are split into groups, a failure on group 2 leaves group 1 on-chain. Check the
inventory before re-importing, otherwise you'll create duplicate batches.
