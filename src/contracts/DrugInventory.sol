// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DrugInventory
 * @notice Blockchain-based drug inventory management for hospitals
 * @dev Final Year Academic Project - Demonstrates immutable record keeping
 */
contract DrugInventory {
    // ============ State Variables ============

    address public admin;
    
    // Role definitions
    enum Role { None, Admin, Pharmacy }
    mapping(address => Role) public roles;
    
    // Drug structure
    struct Drug {
        uint256 id;
        string name;
        uint256 quantity;
        uint256 expiryDate;     // Unix timestamp
        address addedBy;
        uint256 addedAt;        // Unix timestamp
        bool exists;
    }
    
    // Storage
    mapping(uint256 => Drug) public drugs;
    uint256 public drugCount;
    uint256[] public drugIds;
    
    // ============ Events ============
    
    event DrugAdded(
        uint256 indexed id,
        string name,
        uint256 quantity,
        uint256 expiryDate,
        address indexed addedBy,
        uint256 timestamp
    );
    
    event DrugDispensed(
        uint256 indexed drugId,
        string drugName,
        uint256 quantity,
        address indexed dispensedBy,
        uint256 timestamp
    );
    
    event RoleAssigned(
        address indexed user,
        Role role,
        address indexed assignedBy
    );
    
    // ============ Modifiers ============
    
    modifier onlyAdmin() {
        require(roles[msg.sender] == Role.Admin, "Only admin can perform this action");
        _;
    }
    
    modifier onlyPharmacy() {
        require(roles[msg.sender] == Role.Pharmacy, "Only pharmacy staff can perform this action");
        _;
    }
    
    modifier drugExists(uint256 _drugId) {
        require(drugs[_drugId].exists, "Drug does not exist");
        _;
    }
    
    // ============ Constructor ============
    
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.Admin;
        emit RoleAssigned(msg.sender, Role.Admin, msg.sender);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Assign a role to a user
     * @param _user Address of the user
     * @param _role Role to assign (1 = Admin, 2 = Pharmacy)
     */
    function assignRole(address _user, Role _role) external onlyAdmin {
        require(_user != address(0), "Invalid address");
        roles[_user] = _role;
        emit RoleAssigned(_user, _role, msg.sender);
    }
    
    /**
     * @notice Add a new drug batch to inventory
     * @param _name Name of the drug
     * @param _quantity Initial quantity
     * @param _expiryDate Expiry date as Unix timestamp
     */
    function addDrug(
        string memory _name,
        uint256 _quantity,
        uint256 _expiryDate
    ) external onlyAdmin {
        require(bytes(_name).length > 0, "Drug name cannot be empty");
        require(_quantity > 0, "Quantity must be greater than 0");
        require(_expiryDate > block.timestamp, "Expiry date must be in the future");
        
        drugCount++;
        uint256 newDrugId = drugCount;
        
        drugs[newDrugId] = Drug({
            id: newDrugId,
            name: _name,
            quantity: _quantity,
            expiryDate: _expiryDate,
            addedBy: msg.sender,
            addedAt: block.timestamp,
            exists: true
        });
        
        drugIds.push(newDrugId);
        
        emit DrugAdded(
            newDrugId,
            _name,
            _quantity,
            _expiryDate,
            msg.sender,
            block.timestamp
        );
    }
    
    // ============ Pharmacy Functions ============
    
    /**
     * @notice Dispense drugs from inventory
     * @param _drugId ID of the drug to dispense
     * @param _quantity Quantity to dispense
     */
    function dispenseDrug(
        uint256 _drugId,
        uint256 _quantity
    ) external onlyPharmacy drugExists(_drugId) {
        Drug storage drug = drugs[_drugId];
        
        require(drug.expiryDate > block.timestamp, "Cannot dispense expired drugs");
        require(drug.quantity >= _quantity, "Insufficient quantity");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        drug.quantity -= _quantity;
        
        emit DrugDispensed(
            _drugId,
            drug.name,
            _quantity,
            msg.sender,
            block.timestamp
        );
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Get drug details by ID
     * @param _drugId ID of the drug
     */
    function getDrug(uint256 _drugId) external view drugExists(_drugId) returns (
        uint256 id,
        string memory name,
        uint256 quantity,
        uint256 expiryDate,
        address addedBy,
        uint256 addedAt,
        bool isExpired
    ) {
        Drug storage drug = drugs[_drugId];
        return (
            drug.id,
            drug.name,
            drug.quantity,
            drug.expiryDate,
            drug.addedBy,
            drug.addedAt,
            drug.expiryDate <= block.timestamp
        );
    }
    
    /**
     * @notice Get all drug IDs
     * @return Array of drug IDs
     */
    function getAllDrugIds() external view returns (uint256[] memory) {
        return drugIds;
    }
    
    /**
     * @notice Get total number of drugs
     */
    function getTotalDrugs() external view returns (uint256) {
        return drugCount;
    }
    
    /**
     * @notice Check if a drug is expired
     * @param _drugId ID of the drug
     */
    function isExpired(uint256 _drugId) external view drugExists(_drugId) returns (bool) {
        return drugs[_drugId].expiryDate <= block.timestamp;
    }
    
    /**
     * @notice Get user's role
     * @param _user Address to check
     */
    function getRole(address _user) external view returns (Role) {
        return roles[_user];
    }
}
