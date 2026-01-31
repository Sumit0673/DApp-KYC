import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { IExecDataProtectorDeserializer } from '@iexec/dataprotector-deserializer';
import winston from 'winston';

const main = async () => {
  const { IEXEC_OUT } = process.env;

  // Setup logger
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: path.join(IEXEC_OUT, 'app.log') }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  logger.info('Starting KYC Verification iApp', { argv: process.argv });

  let computedJsonObj = {};

  try {
    let verificationResults = [];
    let documentHashes = [];

    // Process protected KYC data in bulk
    const bulkSize = parseInt(process.env.IEXEC_BULK_SLICE_SIZE);
    if (bulkSize > 0) {
      logger.info(`Got ${bulkSize} protected KYC documents to process in bulk!`);
      for (let i = 1; i <= bulkSize; i++) {
        try {
          const deserializer = new IExecDataProtectorDeserializer({
            protectedDataPath: path.join(
              process.env.IEXEC_IN,
              process.env[`IEXEC_DATASET_${i}_FILENAME`]
            ),
          });

          // Extract KYC document data
          const documentData = await deserializer.getValue('documentData', 'string');
          const documentType = await deserializer.getValue('documentType', 'string');
          const userId = await deserializer.getValue('userId', 'string');

          logger.info(`Processing KYC document ${i} for user: ${userId}`, { userId, documentType });

          // Calculate document hash for verification
          const docHash = crypto.createHash('sha256').update(documentData).digest('hex');

          // Perform basic KYC verification
          const verification = await performKYCVerification({
            documentData,
            documentType,
            userId,
            documentHash: docHash
          });

          verificationResults.push({
            userId,
            documentType,
            documentHash: docHash,
            verificationStatus: verification.status,
            verificationDetails: verification.details,
            timestamp: new Date().toISOString()
          });

          documentHashes.push(docHash);

        } catch (e) {
          logger.error(`Error processing KYC document ${i}`, { error: e.message, documentIndex: i });
          verificationResults.push({
            documentIndex: i,
            error: e.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Process input files (additional documents)
    const { IEXEC_INPUT_FILES_NUMBER, IEXEC_IN } = process.env;
    logger.info(`Received ${IEXEC_INPUT_FILES_NUMBER} additional input files`);
    for (let i = 1; i <= IEXEC_INPUT_FILES_NUMBER; i++) {
      const inputFileName = process.env[`IEXEC_INPUT_FILE_NAME_${i}`];
      const inputFilePath = `${IEXEC_IN}/${inputFileName}`;
      logger.info(`Processing input file ${i}: ${inputFileName}`);

      // Read and hash the input file
      const fileData = await fs.readFile(inputFilePath);
      const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

      // Copy file to output for reference
      await fs.copyFile(inputFilePath, `${IEXEC_OUT}/processed_${inputFileName}`);

      documentHashes.push(fileHash);
    }

    // Handle secrets (API keys, verification keys, etc.)
    const { IEXEC_APP_DEVELOPER_SECRET } = process.env;
    let verificationKey = null;
    if (IEXEC_APP_DEVELOPER_SECRET) {
      verificationKey = IEXEC_APP_DEVELOPER_SECRET;
      logger.info('Using app developer secret for enhanced verification');
    }

    const { IEXEC_REQUESTER_SECRET_1 } = process.env;
    let complianceApiKey = null;
    if (IEXEC_REQUESTER_SECRET_1) {
      complianceApiKey = IEXEC_REQUESTER_SECRET_1;
      logger.info('Using requester secret for compliance checks');
    }

    // Generate comprehensive KYC verification report
    const kycReport = {
      verificationId: crypto.randomUUID(),
      totalDocuments: verificationResults.length,
      verifiedDocuments: verificationResults.filter(r => r.verificationStatus === 'VERIFIED').length,
      failedDocuments: verificationResults.filter(r => r.verificationStatus === 'FAILED').length,
      documentHashes,
      verificationResults,
      overallStatus: verificationResults.every(r => r.verificationStatus === 'VERIFIED') ? 'ALL_VERIFIED' : 'PARTIAL_VERIFICATION',
      processedAt: new Date().toISOString()
    };

    // Write KYC verification result
    await fs.writeFile(`${IEXEC_OUT}/kyc-verification-result.json`, JSON.stringify(kycReport, null, 2));

    // Build the "computed.json" object
    computedJsonObj = {
      'deterministic-output-path': `${IEXEC_OUT}/kyc-verification-result.json`,
    };
  } catch (e) {
    // Handle errors
    logger.error('An error occurred during KYC verification', { error: e.message, stack: e.stack });

    // Build the "computed.json" object with an error message
    computedJsonObj = {
      'deterministic-output-path': IEXEC_OUT,
      'error-message': 'Oops something went wrong',
    };
  } finally {
    // Save the "computed.json" file
    await fs.writeFile(
      `${IEXEC_OUT}/computed.json`,
      JSON.stringify(computedJsonObj)
    );
  }
};

// KYC Verification function
const performKYCVerification = async (documentInfo) => {
  const { documentData, documentType, userId, documentHash } = documentInfo;

  try {
    // Basic validation checks
    const checks = {
      hasData: documentData && documentData.length > 0,
      validType: ['passport', 'id_card', 'drivers_license', 'utility_bill'].includes(documentType),
      validUserId: userId && userId.length > 0,
      dataIntegrity: documentHash && documentHash.length === 64
    };

    // Document format validation
    let formatValid = false;
    if (documentType === 'passport') {
      formatValid = validatePassportFormat(documentData);
    } else if (documentType === 'id_card') {
      formatValid = validateIdCardFormat(documentData);
    } else {
      formatValid = true; // Basic check for other document types
    }

    checks.formatValid = formatValid;

    // Determine verification status
    const allChecksPass = Object.values(checks).every(check => check === true);

    return {
      status: allChecksPass ? 'VERIFIED' : 'FAILED',
      details: {
        checks,
        documentType,
        userId,
        documentHash
      }
    };

  } catch (error) {
    return {
      status: 'ERROR',
      details: {
        error: error.message,
        documentType,
        userId
      }
    };
  }
};

// Basic document format validators
const validatePassportFormat = (data) => {
  // Basic passport validation - check for common passport elements
  const hasPassportNumber = /[A-Z0-9]{6,9}/.test(data);
  const hasName = /[A-Z][a-z]+ [A-Z][a-z]+/.test(data);
  const hasDate = /\d{2}\/\d{2}\/\d{4}/.test(data);

  return hasPassportNumber && hasName && hasDate;
};

const validateIdCardFormat = (data) => {
  // Basic ID card validation
  const hasIdNumber = /[A-Z0-9]{8,12}/.test(data);
  const hasName = /[A-Z][a-z]+ [A-Z][a-z]+/.test(data);

  return hasIdNumber && hasName;
};

main();
