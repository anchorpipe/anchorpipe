/**
 * Integration tests for storage operations (put/get/delete)
 * Run with: MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_ACCESS_KEY=minioadmin MINIO_SECRET_KEY=minioadminpassword ts-node src/__tests__/storage.test.ts
 */
// cSpell:ignore minioadmin minioadminpassword
import { createMinioClient, uploadFile, downloadFile, deleteFile } from '../index';

const BUCKET = 'test-bucket';
const TEST_OBJECT = 'test/test-file.txt';
const TEST_CONTENT = 'Hello, AnchorPipe Storage!';

function createTestClient() {
  return createMinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
  });
}

async function testUpload(client: any) {
  console.log('1. Testing uploadFile (put)...');
  await uploadFile(client, {
    bucketName: BUCKET,
    objectName: TEST_OBJECT,
    data: TEST_CONTENT,
    contentType: 'text/plain',
  });
  console.log('   ✅ Upload successful\n');
}

async function testDownload(client: any) {
  console.log('2. Testing downloadFile (get)...');
  const downloaded = await downloadFile(client, BUCKET, TEST_OBJECT);
  const content = downloaded.toString('utf-8');
  if (content !== TEST_CONTENT) {
    throw new Error(`Content mismatch: expected "${TEST_CONTENT}", got "${content}"`);
  }
  console.log('   ✅ Download successful, content matches\n');
}

async function testDelete(client: any) {
  console.log('3. Testing deleteFile...');
  await deleteFile(client, BUCKET, TEST_OBJECT);
  console.log('   ✅ Delete successful\n');
}

async function verifyDeletion(client: any) {
  try {
    await downloadFile(client, BUCKET, TEST_OBJECT);
    throw new Error('File still exists after deletion');
  } catch (err: any) {
    if (err.code === 'NoSuchKey' || err.message?.includes('not found')) {
      console.log('   ✅ Deletion verified (file no longer exists)\n');
    } else {
      throw err;
    }
  }
}

async function runTests() {
  const client = createTestClient();
  console.log('🧪 Testing storage operations...\n');

  try {
    await testUpload(client);
    await testDownload(client);
    await testDelete(client);
    await verifyDeletion(client);

    console.log('✅ All tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

export { runTests };
