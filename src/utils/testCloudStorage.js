/**
 * Quick Test Script for Cloud Storage
 * 
 * This helps you verify Firebase is configured correctly
 * Run this in your browser console (F12) after importing it
 */

import { initializeCloudStorage, uploadQuotationToCloud } from './cloudStorage';

export const testCloudStorage = async () => {
  console.log('🧪 Testing Cloud Storage Setup...\n');
  
  try {
    // Test 1: Initialize
    console.log('1️⃣ Testing Firebase Initialization...');
    const initialized = await initializeCloudStorage();
    
    if (!initialized) {
      console.error('❌ Firebase initialization failed!');
      console.log('👉 Fix: Update firebaseConfig in src/utils/cloudStorage.js');
      return false;
    }
    console.log('✅ Firebase initialized successfully!\n');
    
    // Test 2: Create test PDF
    console.log('2️⃣ Creating test PDF blob...');
    const testContent = 'This is a test PDF from QMS';
    const blob = new Blob([testContent], { type: 'application/pdf' });
    console.log('✅ Test blob created\n');
    
    // Test 3: Upload
    console.log('3️⃣ Testing upload to cloud...');
    const result = await uploadQuotationToCloud(blob, {
      filename: `test_${Date.now()}.pdf`,
      guestName: 'Test Guest',
      destination: 'Test Destination',
      packageTitle: 'Test Package',
      totalCost: 1000,
      numberOfPax: 2
    });
    
    if (result.success) {
      console.log('✅ Upload successful!');
      console.log('📄 File ID:', result.id);
      console.log('🔗 Download URL:', result.downloadURL);
      console.log('📊 File Size:', (result.size / 1024).toFixed(2), 'KB\n');
      
      console.log('🎉 ALL TESTS PASSED!');
      console.log('👉 You can now use cloud storage in your app');
      console.log('👉 Check Firebase Console to see your test file');
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('Firebase')) {
      console.log('\n📋 FIREBASE SETUP CHECKLIST:');
      console.log('□ Created Firebase project');
      console.log('□ Enabled Firebase Storage');
      console.log('□ Enabled Firestore Database');
      console.log('□ Got firebaseConfig from project settings');
      console.log('□ Updated src/utils/cloudStorage.js with config');
      console.log('□ Ran: npm install firebase');
    }
    
    return false;
  }
};

/**
 * Test just Firebase initialization
 */
export const testInit = async () => {
  console.log('🧪 Testing Firebase Init Only...');
  const result = await initializeCloudStorage();
  
  if (result) {
    console.log('✅ Firebase is configured correctly!');
  } else {
    console.log('❌ Firebase configuration failed');
    console.log('👉 Update firebaseConfig in src/utils/cloudStorage.js');
  }
  
  return result;
};

/**
 * Usage:
 * 
 * In your browser console (F12):
 * 
 * import { testCloudStorage } from './utils/testCloudStorage';
 * testCloudStorage();
 * 
 * Or just test initialization:
 * 
 * import { testInit } from './utils/testCloudStorage';
 * testInit();
 */

export default {
  testCloudStorage,
  testInit
};
