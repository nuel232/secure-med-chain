// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DrugInventory
 * @notice Blockchain-based drug inventory management for hospitals / pharmacies.
 * @dev Final Year Academic Project.
 *
 * Roles
 *  - Admin: manages stock (add, adjust, write off) and manages the staff whitelist.
 *    Admin can hand over the role with a two-step transfer (proposeAdmin -> acceptAdmin).
 *  - Authorized staff: wallets explicitly granted by the admin. They can dispense stock.
 *  - Everyone else: read-only. A random wallet can NOT dispense.
 *
 * Privacy
 *  - Everything on a public chain is permanent and readable. Never put patient
 *    identifiers in `reason` strings. Use a ward / department / prescription-batch
 *    style reference instead.
 */
contract DrugInventory {
    // ============ Types ============

    struct Drug {
        uint256 id;
        string name;
        string batchNumber;          // manufacturer lot / batch number
        string registrationNumber;   // regulator reg. number (e.g. NAFDAC), may be empty
        uint256 quantity;
        uint256 expiryDate;          // Unix timestamp (seconds)
        address addedBy;
        uint256 addedAt;             // Unix timestamp (seconds)
        bool exists;
    }

    struct DrugInput {
        string name;
        string batchNumber;
        string registrationNumber;
        uint256 quantity;
        uint256 expiryDate;
    }

    // ============ Limits ============

    uint256 public constant MAX_NAME_LENGTH = 100;
    uint256 public constant MAX_REF_LENGTH = 64;      // batch / registration number
    uint256 public constant MAX_REASON_LENGTH = 200;
    uint256 public constant MAX_BATCH_SIZE = 100;

    // ============ State ============

    address public admin;
    address public pendingAdmin;
    mapping(address => bool) public authorizedStaff;

    mapping(uint256 => Drug) public drugs;
    uint256 public drugCount; // ids run 1..drugCount

    // ============ Events ============

    event DrugAdded(
        uint256 indexed id,
        string name,
        string batchNumber,
        string registrationNumber,
        uint256 quantity,
        uint256 expiryDate,
        address indexed addedBy,
        uint256 timestamp
    );

    event DrugDispensed(
        uint256 indexed drugId,
        string drugName,
        uint256 quantity,
        string reason,
        address indexed dispensedBy,
        uint256 timestamp
    );

    event QuantityAdjusted(
        uint256 indexed drugId,
        string drugName,
        uint256 oldQuantity,
        uint256 newQuantity,
        string reason,
        address indexed adjustedBy,
        uint256 timestamp
    );

    event DrugWrittenOff(
        uint256 indexed drugId,
        string drugName,
        uint256 quantity,
        address indexed writtenOffBy,
        uint256 timestamp
    );

    event StaffGranted(address indexed staff, address indexed by);
    event StaffRevoked(address indexed staff, address indexed by);
    event AdminTransferProposed(address indexed currentAdmin, address indexed proposedAdmin);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyStaffOrAdmin() {
        require(
            msg.sender == admin || authorizedStaff[msg.sender],
            "Only authorized staff can perform this action"
        );
        _;
    }

    modifier drugExists(uint256 _drugId) {
        require(drugs[_drugId].exists, "Drug does not exist");
        _;
    }

    // ============ Constructor ============

    constructor() {
        admin = msg.sender;
        emit AdminTransferred(address(0), msg.sender);
    }

    // ============ Access management (admin) ============

    function grantStaff(address _staff) external onlyAdmin {
        require(_staff != address(0), "Zero address");
        require(!authorizedStaff[_staff], "Already authorized");
        authorizedStaff[_staff] = true;
        emit StaffGranted(_staff, msg.sender);
    }

    function revokeStaff(address _staff) external onlyAdmin {
        require(authorizedStaff[_staff], "Not authorized");
        authorizedStaff[_staff] = false;
        emit StaffRevoked(_staff, msg.sender);
    }

    /// @notice Step 1 of a two-step admin hand-over (prevents transferring to a typo'd address).
    function proposeAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Zero address");
        pendingAdmin = _newAdmin;
        emit AdminTransferProposed(msg.sender, _newAdmin);
    }

    /// @notice Step 2: the proposed address accepts and becomes admin.
    function acceptAdmin() external {
        require(msg.sender == pendingAdmin, "Not the pending admin");
        address previous = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit AdminTransferred(previous, admin);
    }

    // ============ Admin: stock management ============

    function addDrug(
        string calldata _name,
        string calldata _batchNumber,
        string calldata _registrationNumber,
        uint256 _quantity,
        uint256 _expiryDate
    ) external onlyAdmin {
        _addDrug(DrugInput(_name, _batchNumber, _registrationNumber, _quantity, _expiryDate));
    }

    /// @notice Add many drug batches in one transaction.
    function addDrugsBatch(DrugInput[] calldata items) external onlyAdmin {
        require(items.length > 0, "Empty batch");
        require(items.length <= MAX_BATCH_SIZE, "Batch too large");
        for (uint256 i = 0; i < items.length; ) {
            _addDrug(items[i]);
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Correct a stock count (stock-take, data-entry mistake). Always logged with a reason.
    function adjustQuantity(
        uint256 _drugId,
        uint256 _newQuantity,
        string calldata _reason
    ) external onlyAdmin drugExists(_drugId) {
        _checkReason(_reason);
        Drug storage drug = drugs[_drugId];
        uint256 old = drug.quantity;
        drug.quantity = _newQuantity;
        emit QuantityAdjusted(_drugId, drug.name, old, _newQuantity, _reason, msg.sender, block.timestamp);
    }

    /// @notice Remove expired stock from the available count. The record itself stays on chain.
    function writeOffExpired(uint256 _drugId) external onlyAdmin drugExists(_drugId) {
        Drug storage drug = drugs[_drugId];
        require(drug.expiryDate <= block.timestamp, "Drug has not expired");
        require(drug.quantity > 0, "Nothing to write off");
        uint256 written = drug.quantity;
        drug.quantity = 0;
        emit DrugWrittenOff(_drugId, drug.name, written, msg.sender, block.timestamp);
    }

    // ============ Staff: dispensing ============

    /**
     * @notice Dispense stock (authorized staff or admin).
     * @param _reason Where / why it went out (ward, department, prescription batch).
     *                Do NOT include patient names or IDs.
     */
    function dispenseDrug(
        uint256 _drugId,
        uint256 _quantity,
        string calldata _reason
    ) external onlyStaffOrAdmin drugExists(_drugId) {
        _checkReason(_reason);
        Drug storage drug = drugs[_drugId];

        require(_quantity > 0, "Quantity must be greater than 0");
        require(drug.expiryDate > block.timestamp, "Cannot dispense expired drugs");
        require(drug.quantity >= _quantity, "Insufficient quantity");

        drug.quantity -= _quantity;

        emit DrugDispensed(_drugId, drug.name, _quantity, _reason, msg.sender, block.timestamp);
    }

    // ============ Views ============

    function getDrug(uint256 _drugId)
        external
        view
        drugExists(_drugId)
        returns (Drug memory drug, bool expired)
    {
        drug = drugs[_drugId];
        expired = drug.expiryDate <= block.timestamp;
    }

    /// @notice Paginated read so the UI needs one call per page instead of one per drug.
    function getDrugs(uint256 _offset, uint256 _limit) external view returns (Drug[] memory page) {
        if (_offset >= drugCount || _limit == 0) {
            return new Drug[](0);
        }
        uint256 end = _offset + _limit;
        if (end > drugCount) end = drugCount;

        page = new Drug[](end - _offset);
        for (uint256 i = 0; i < page.length; i++) {
            page[i] = drugs[_offset + i + 1];
        }
    }

    function getTotalDrugs() external view returns (uint256) {
        return drugCount;
    }

    function isExpired(uint256 _drugId) external view drugExists(_drugId) returns (bool) {
        return drugs[_drugId].expiryDate <= block.timestamp;
    }

    function isAdmin(address _address) external view returns (bool) {
        return _address == admin;
    }

    /// @notice True only for wallets the admin explicitly authorized.
    function isPharmacyStaff(address _address) external view returns (bool) {
        return authorizedStaff[_address];
    }

    // ============ Internal ============

    function _addDrug(DrugInput memory d) internal {
        require(bytes(d.name).length > 0, "Drug name cannot be empty");
        require(bytes(d.name).length <= MAX_NAME_LENGTH, "Drug name too long");
        require(bytes(d.batchNumber).length > 0, "Batch number required");
        require(bytes(d.batchNumber).length <= MAX_REF_LENGTH, "Batch number too long");
        require(bytes(d.registrationNumber).length <= MAX_REF_LENGTH, "Registration number too long");
        require(d.quantity > 0, "Quantity must be greater than 0");
        require(d.expiryDate > block.timestamp, "Expiry date must be in the future");

        uint256 newId = ++drugCount;

        drugs[newId] = Drug({
            id: newId,
            name: d.name,
            batchNumber: d.batchNumber,
            registrationNumber: d.registrationNumber,
            quantity: d.quantity,
            expiryDate: d.expiryDate,
            addedBy: msg.sender,
            addedAt: block.timestamp,
            exists: true
        });

        emit DrugAdded(
            newId,
            d.name,
            d.batchNumber,
            d.registrationNumber,
            d.quantity,
            d.expiryDate,
            msg.sender,
            block.timestamp
        );
    }

    function _checkReason(string calldata _reason) internal pure {
        require(bytes(_reason).length > 0, "Reason required");
        require(bytes(_reason).length <= MAX_REASON_LENGTH, "Reason too long");
    }
}
