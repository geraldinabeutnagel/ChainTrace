import { groth16 } from 'snarkjs';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface ProofInputs {
  // Public inputs
  productHash: string;
  batchId: string;
  timestamp: string;
  integrityScore: number;
  
  // Private inputs (witnesses)
  manufacturerId: string;
  rawMaterialsHash: string;
  productionDataHash: string;
  qualityChecksHash: string;
  transportDataHash: string;
  storageDataHash: string;
}

export interface GeneratedProof {
  proof: {
    pi_a: [string, string, string];
    pi_b: [[string, string], [string, string], [string, string]];
    pi_c: [string, string, string];
  };
  publicSignals: string[];
  circuitHash: string;
  timestamp: string;
}

export class ProofGenerator {
  private wasmPath: string;
  private zkeyPath: string;
  private vkeyPath: string;

  constructor() {
    this.wasmPath = join(__dirname, '../../build/SupplyChainIntegrity.wasm');
    this.zkeyPath = join(__dirname, '../../build/SupplyChainIntegrity_0001.zkey');
    this.vkeyPath = join(__dirname, '../../build/verification_key.json');
  }

  /**
   * Generate a zero-knowledge proof for supply chain integrity
   * @param inputs The circuit inputs
   * @returns Generated proof and public signals
   */
  public async generateProof(inputs: ProofInputs): Promise<GeneratedProof> {
    try {
      logger.info('Starting proof generation for batch:', inputs.batchId);

      // Validate inputs
      this.validateInputs(inputs);

      // Prepare circuit inputs
      const circuitInputs = this.prepareCircuitInputs(inputs);

      // Generate proof
      const { proof, publicSignals } = await groth16.fullProve(
        circuitInputs,
        this.wasmPath,
        this.zkeyPath
      );

      // Generate circuit hash for verification
      const circuitHash = this.generateCircuitHash(inputs);

      const generatedProof: GeneratedProof = {
        proof: {
          pi_a: proof.pi_a,
          pi_b: proof.pi_b,
          pi_c: proof.pi_c,
        },
        publicSignals,
        circuitHash,
        timestamp: new Date().toISOString(),
      };

      logger.info('Proof generated successfully for batch:', inputs.batchId);
      return generatedProof;

    } catch (error) {
      logger.error('Error generating proof:', error);
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }

  /**
   * Verify a generated proof
   * @param proof The proof to verify
   * @param publicSignals The public signals
   * @returns True if proof is valid
   */
  public async verifyProof(proof: GeneratedProof['proof'], publicSignals: string[]): Promise<boolean> {
    try {
      const vkey = JSON.parse(readFileSync(this.vkeyPath, 'utf8'));
      
      const isValid = await groth16.verify(vkey, publicSignals, proof);
      
      logger.info('Proof verification result:', isValid);
      return isValid;

    } catch (error) {
      logger.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Generate proof for batch integrity verification
   * @param batchId Batch identifier
   * @param manufacturerId Manufacturer identifier
   * @param integrityData Integrity verification data
   * @returns Generated proof
   */
  public async generateBatchIntegrityProof(
    batchId: string,
    manufacturerId: string,
    integrityData: {
      productHash: string;
      rawMaterialsHash: string;
      productionDataHash: string;
      qualityChecksHash: string;
      transportDataHash: string;
      storageDataHash: string;
      integrityScore: number;
    }
  ): Promise<GeneratedProof> {
    const inputs: ProofInputs = {
      productHash: integrityData.productHash,
      batchId,
      timestamp: Date.now().toString(),
      integrityScore: integrityData.integrityScore,
      manufacturerId,
      rawMaterialsHash: integrityData.rawMaterialsHash,
      productionDataHash: integrityData.productionDataHash,
      qualityChecksHash: integrityData.qualityChecksHash,
      transportDataHash: integrityData.transportDataHash,
      storageDataHash: integrityData.storageDataHash,
    };

    return this.generateProof(inputs);
  }

  /**
   * Generate proof for product authenticity verification
   * @param productHash Product hash
   * @param manufacturerId Manufacturer identifier
   * @param authenticityData Authenticity verification data
   * @returns Generated proof
   */
  public async generateAuthenticityProof(
    productHash: string,
    manufacturerId: string,
    authenticityData: {
      batchId: string;
      rawMaterialsHash: string;
      productionDataHash: string;
      qualityChecksHash: string;
      integrityScore: number;
    }
  ): Promise<GeneratedProof> {
    const inputs: ProofInputs = {
      productHash,
      batchId: authenticityData.batchId,
      timestamp: Date.now().toString(),
      integrityScore: authenticityData.integrityScore,
      manufacturerId,
      rawMaterialsHash: authenticityData.rawMaterialsHash,
      productionDataHash: authenticityData.productionDataHash,
      qualityChecksHash: authenticityData.qualityChecksHash,
      transportDataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      storageDataHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    };

    return this.generateProof(inputs);
  }

  /**
   * Batch generate proofs for multiple batches
   * @param batchProofs Array of batch proof data
   * @returns Array of generated proofs
   */
  public async batchGenerateProofs(
    batchProofs: Array<{
      batchId: string;
      manufacturerId: string;
      integrityData: any;
    }>
  ): Promise<GeneratedProof[]> {
    const proofs: GeneratedProof[] = [];

    for (const batchProof of batchProofs) {
      try {
        const proof = await this.generateBatchIntegrityProof(
          batchProof.batchId,
          batchProof.manufacturerId,
          batchProof.integrityData
        );
        proofs.push(proof);
      } catch (error) {
        logger.error(`Failed to generate proof for batch ${batchProof.batchId}:`, error);
        // Continue with other proofs
      }
    }

    return proofs;
  }

  /**
   * Save proof to file system
   * @param proof Generated proof
   * @param filename Output filename
   */
  public saveProof(proof: GeneratedProof, filename: string): void {
    try {
      const outputPath = join(__dirname, '../../proofs', filename);
      writeFileSync(outputPath, JSON.stringify(proof, null, 2));
      logger.info(`Proof saved to: ${outputPath}`);
    } catch (error) {
      logger.error('Error saving proof:', error);
      throw error;
    }
  }

  /**
   * Load proof from file system
   * @param filename Proof filename
   * @returns Loaded proof
   */
  public loadProof(filename: string): GeneratedProof {
    try {
      const proofPath = join(__dirname, '../../proofs', filename);
      const proofData = readFileSync(proofPath, 'utf8');
      return JSON.parse(proofData);
    } catch (error) {
      logger.error('Error loading proof:', error);
      throw error;
    }
  }

  private validateInputs(inputs: ProofInputs): void {
    if (!inputs.productHash || inputs.productHash.length !== 66) {
      throw new Error('Invalid product hash');
    }
    if (!inputs.batchId || inputs.batchId.length === 0) {
      throw new Error('Invalid batch ID');
    }
    if (inputs.integrityScore < 80 || inputs.integrityScore > 100) {
      throw new Error('Integrity score must be between 80 and 100');
    }
    if (!inputs.manufacturerId || inputs.manufacturerId.length === 0) {
      throw new Error('Invalid manufacturer ID');
    }
  }

  private prepareCircuitInputs(inputs: ProofInputs): any {
    return {
      productHash: inputs.productHash,
      batchId: inputs.batchId,
      timestamp: inputs.timestamp,
      integrityScore: inputs.integrityScore,
      manufacturerId: inputs.manufacturerId,
      rawMaterialsHash: inputs.rawMaterialsHash,
      productionDataHash: inputs.productionDataHash,
      qualityChecksHash: inputs.qualityChecksHash,
      transportDataHash: inputs.transportDataHash,
      storageDataHash: inputs.storageDataHash,
    };
  }

  private generateCircuitHash(inputs: ProofInputs): string {
    // Generate a unique hash for this circuit execution
    const hashInput = `${inputs.productHash}-${inputs.batchId}-${inputs.timestamp}-${inputs.integrityScore}`;
    return Buffer.from(hashInput).toString('hex');
  }
}
