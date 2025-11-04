/**
 * Integration tests for storage operations (put/get/delete)
 * Run with: MINIO_ENDPOINT=localhost MINIO_PORT=9000 MINIO_ACCESS_KEY=minioadmin MINIO_SECRET_KEY=minioadminpassword ts-node src/__tests__/storage.test.ts
 */
import { createMinioClient, uploadFile, downloadFile, deleteFile } from '../index';

const BUCKET = 'test-bucket';
const TEST_OBJECT = 'test/test-file.txt';
const TEST_CONTENT = 'Hello, AnchorPipe Storage!';

async function runTests() {
  const client = createMinioClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadminpassword',
  });

  console.log('🧪 Testing storage operations...\n');

  try {
    // Test 1: Upload (put)
    console.log('1. Testing uploadFile (put)...');
    await uploadFile(client, BUCKET, TEST_OBJECT, TEST_CONTENT, 'text/plain');
    console.log('   ✅ Upload successful\n');

    // Test 2: Download (get)
    console.log('2. Testing downloadFile (get)...');
    const downloaded = await downloadFile(client, BUCKET, TEST_OBJECT);
    const content = downloaded.toString('utf-8');
    if (content === TEST_CONTENT) {
      console.log('   ✅ Download successful, content matches\n');
    } else {
      throw new Error(`Content mismatch: expected "${TEST_CONTENT}", got "${content}"`);
    }

    // Test 3: Delete
    console.log('3. Testing deleteFile...');
    await deleteFile(client, BUCKET, TEST_OBJECT);
    console.log('   ✅ Delete successful\n');

    // Verify deletion
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
