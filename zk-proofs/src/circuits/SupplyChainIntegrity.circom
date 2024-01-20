pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

// Supply Chain Integrity Verification Circuit
// This circuit proves that a product has maintained integrity throughout the supply chain
// without revealing sensitive commercial information

template SupplyChainIntegrity() {
    // Public inputs
    signal input productHash;           // Hash of product information
    signal input batchId;              // Batch identifier
    signal input timestamp;            // Verification timestamp
    signal input integrityScore;       // Overall integrity score (0-100)
    
    // Private inputs (witnesses)
    signal private input manufacturerId;     // Manufacturer identifier
    signal private input rawMaterialsHash;   // Hash of raw materials
    signal private input productionDataHash; // Hash of production data
    signal private input qualityChecksHash;  // Hash of quality checks
    signal private input transportDataHash;  // Hash of transport data
    signal private input storageDataHash;    // Hash of storage data
    
    // Intermediate signals
    signal temp1;
    signal temp2;
    signal temp3;
    signal finalHash;
    
    // Component instances
    component poseidon1 = Poseidon(3);
    component poseidon2 = Poseidon(3);
    component poseidon3 = Poseidon(4);
    component poseidon4 = Poseidon(2);
    
    component gt = GreaterThan(32);
    component lt = LessThan(32);
    
    // Step 1: Verify manufacturer authenticity
    // Hash manufacturer ID with product hash
    poseidon1.inputs[0] <== manufacturerId;
    poseidon1.inputs[1] <== productHash;
    poseidon1.inputs[2] <== batchId;
    temp1 <== poseidon1.out;
    
    // Step 2: Verify raw materials integrity
    // Hash raw materials with production data
    poseidon2.inputs[0] <== rawMaterialsHash;
    poseidon2.inputs[1] <== productionDataHash;
    poseidon2.inputs[2] <== temp1;
    temp2 <== poseidon2.out;
    
    // Step 3: Verify quality and transport integrity
    // Hash quality checks with transport data
    poseidon3.inputs[0] <== qualityChecksHash;
    poseidon3.inputs[1] <== transportDataHash;
    poseidon3.inputs[2] <== storageDataHash;
    poseidon3.inputs[3] <== temp2;
    temp3 <== poseidon3.out;
    
    // Step 4: Generate final integrity hash
    poseidon4.inputs[0] <== temp3;
    poseidon4.inputs[1] <== timestamp;
    finalHash <== poseidon4.out;
    
    // Step 5: Verify integrity score constraints
    // Integrity score must be >= 80 (high quality threshold)
    gt.a <== integrityScore;
    gt.b <== 80;
    
    // Integrity score must be <= 100 (maximum score)
    lt.a <== integrityScore;
    lt.b <== 100;
    
    // Constraints
    gt.out === 1;  // integrityScore >= 80
    lt.out === 1;   // integrityScore <= 100
    
    // Output the final hash
    signal output finalIntegrityHash <== finalHash;
}

// Main component
component main = SupplyChainIntegrity();
