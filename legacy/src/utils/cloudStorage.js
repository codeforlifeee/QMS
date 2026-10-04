/**
 * Cloud Storage Integration for QMS Quotations
 * 
 * RECOMMENDED SOLUTIONS:
 * 
 * 1. ✅ FIREBASE STORAGE (BEST FOR YOUR PROJECT)
 *    - Free tier: 5GB storage, 1GB/day downloads
 *    - Easy authentication with Firebase Auth
 *    - Real-time database for metadata
 *    - Direct integration with React
 *    - Setup time: 30 minutes
 *    - Cost: FREE for small/medium projects
 * 
 * 2. AWS S3 + DynamoDB
 *    - Highly scalable, enterprise-grade
 *    - Pay-as-you-go pricing
 *    - More complex setup
 *    - Best for large-scale deployments
 * 
 * 3. Cloudinary
 *    - Specialized for documents/images
 *    - Free tier: 25GB storage
 *    - Easy API, built-in CDN
 *    - Good for PDF previews
 * 
 * 4. MongoDB Atlas + GridFS
 *    - Store PDFs directly in database
 *    - Good if you're already using MongoDB
 *    - Free tier: 512MB
 * 
 * IMPLEMENTATION GUIDE:
 * 
 * Step 1: Install Firebase
 * npm install firebase
 * 
 * Step 2: Create Firebase project at https://console.firebase.google.com
 * 
 * Step 3: Enable Firebase Storage and Authentication
 * 
 * Step 4: Use the functions below
 */

// Use dynamic imports for firebase to avoid bundler errors when firebase is not installed

// Firebase configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (call this once in your app)
let app, storage, db, auth;
let firebaseStorageFns = {};
let firebaseFirestoreFns = {};
let firebaseInitialized = false;
let firebaseInitError = null;

export const isCloudAvailable = () => firebaseInitialized;

export const initializeCloudStorage = async () => {
  if (firebaseInitialized) return true;

  try {
    // Check if Firebase is configured
    if (firebaseConfig.apiKey === 'YOUR_API_KEY' || !firebaseConfig.apiKey) {
      console.warn('[Cloud Storage] Firebase not configured. Update firebaseConfig in cloudStorage.js');
      throw new Error('Please configure Firebase first. See src/utils/cloudStorage.js');
    }

    // Dynamic imports: these will only attempt to load if the package exists / is installed
    const firebaseApp = await import('firebase/app');
    const firebaseStorage = await import('firebase/storage');
    const firebaseFirestore = await import('firebase/firestore');
    const firebaseAuth = await import('firebase/auth');

    const { initializeApp: initializeFn } = firebaseApp;
    const { getStorage: getStorageFn, ref, uploadBytes, getDownloadURL, listAll, deleteObject } = firebaseStorage;
    const { getFirestore: getFirestoreFn, collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } = firebaseFirestore;
    const { getAuth: getAuthFn } = firebaseAuth;

    app = initializeFn(firebaseConfig);
    storage = getStorageFn(app);
    db = getFirestoreFn(app);
    firebaseStorageFns = { ref, uploadBytes, getDownloadURL, listAll, deleteObject };
    firebaseFirestoreFns = { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc };
    auth = getAuthFn(app);

    firebaseInitialized = true;
    firebaseInitError = null;
    console.log('[Cloud Storage] ✅ Firebase initialized successfully');
    console.log('[Cloud Storage] Storage and Firestore ready for use');
    return true;
  } catch (error) {
    firebaseInitError = error;
    console.error('[Cloud Storage] ❌ Initialization failed:', error.message || error);
    
    if (error.message.includes('configure')) {
      console.log('[Cloud Storage] 📋 Setup Steps:');
      console.log('   1. Create Firebase project at https://console.firebase.google.com');
      console.log('   2. Enable Storage and Firestore');
      console.log('   3. Get your config from Project Settings');
      console.log('   4. Update firebaseConfig in src/utils/cloudStorage.js');
    }
    
    // Do not throw - keep it friendly; callers should guard using isCloudAvailable()
    return false;
  }
};

/**
 * Upload PDF to Firebase Storage
 * @param {Blob} pdfBlob - PDF file as blob
 * @param {Object} metadata - Quotation metadata
 * @returns {Promise<Object>} - Upload result with URL and metadata
 */
export const uploadQuotationToCloud = async (pdfBlob, metadata = {}) => {
  try {
    if (!storage || !db) {
      throw new Error('Cloud storage not initialized. Call initializeCloudStorage() first.');
    }

    const timestamp = new Date().toISOString();
    const filename = metadata.filename || `quotation_${Date.now()}.pdf`;
    
    // Create storage reference
    const storageRef = firebaseStorageFns.ref(storage, `quotations/${filename}`);
    
    // Upload file
    console.log('[Cloud Storage] Uploading PDF to Firebase...');
    const snapshot = await firebaseStorageFns.uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        guestName: metadata.guestName || '',
        destination: metadata.destination || '',
        uploadDate: timestamp
      }
    });
    
    // Get download URL
    const downloadURL = await firebaseStorageFns.getDownloadURL(snapshot.ref);
    
    // Save metadata to Firestore
    const quotationData = {
      filename,
      downloadURL,
      guestName: metadata.guestName || 'Unknown',
      destination: metadata.destination || 'Unknown',
      packageTitle: metadata.packageTitle || '',
      totalCost: metadata.totalCost || 0,
      numberOfPax: metadata.numberOfPax || 1,
      uploadDate: timestamp,
      fileSize: pdfBlob.size,
      status: 'active'
    };
    
    const docRef = await firebaseFirestoreFns.addDoc(firebaseFirestoreFns.collection(db, 'quotations'), quotationData);
    
    console.log('[Cloud Storage] Upload successful!', {
      id: docRef.id,
      url: downloadURL,
      size: (pdfBlob.size / 1024).toFixed(2) + ' KB'
    });
    
    return {
      success: true,
      id: docRef.id,
      downloadURL,
      filename,
      size: pdfBlob.size
    };
    
  } catch (error) {
    console.error('[Cloud Storage] Upload failed:', error);
    throw new Error(`Failed to upload to cloud: ${error.message}`);
  }
};

/**
 * Get all quotations from cloud
 * @param {Object} filters - Optional filters (guestName, destination, etc.)
 * @returns {Promise<Array>} - Array of quotation records
 */
export const getQuotationsFromCloud = async (filters = {}) => {
  try {
    if (!db) {
      throw new Error('Cloud storage not initialized');
    }

    let q = firebaseFirestoreFns.collection(db, 'quotations');
    
    // Apply filters
    if (filters.guestName) {
      q = firebaseFirestoreFns.query(q, firebaseFirestoreFns.where('guestName', '==', filters.guestName));
    }
    if (filters.destination) {
      q = firebaseFirestoreFns.query(q, firebaseFirestoreFns.where('destination', '==', filters.destination));
    }
    
    // Order by upload date (newest first)
    q = firebaseFirestoreFns.query(q, firebaseFirestoreFns.orderBy('uploadDate', 'desc'));
    
    const snapshot = await firebaseFirestoreFns.getDocs(q);
    const quotations = [];
    
    snapshot.forEach((doc) => {
      quotations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`[Cloud Storage] Retrieved ${quotations.length} quotations`);
    return quotations;
    
  } catch (error) {
    console.error('[Cloud Storage] Failed to retrieve quotations:', error);
    throw error;
  }
};

/**
 * Delete quotation from cloud
 * @param {string} quotationId - Firestore document ID
 * @param {string} filename - Storage filename
 */
export const deleteQuotationFromCloud = async (quotationId, filename) => {
  try {
    if (!storage || !db) {
      throw new Error('Cloud storage not initialized');
    }

    // Delete file from storage
    const storageRef = firebaseStorageFns.ref(storage, `quotations/${filename}`);
    await firebaseStorageFns.deleteObject(storageRef);
    
    // Delete metadata from Firestore
    await firebaseFirestoreFns.updateDoc(firebaseFirestoreFns.doc(db, 'quotations', quotationId), {
      status: 'deleted',
      deletedDate: new Date().toISOString()
    });
    
    console.log('[Cloud Storage] Quotation deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('[Cloud Storage] Delete failed:', error);
    throw error;
  }
};

/**
 * ALTERNATIVE: Cloudinary Integration (simpler, no auth needed)
 * Uncomment if you prefer Cloudinary
 */

// import axios from 'axios';
// 
// const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload';
// const UPLOAD_PRESET = 'YOUR_UPLOAD_PRESET'; // Create in Cloudinary dashboard
// 
// export const uploadToCloudinary = async (pdfBlob, filename) => {
//   const formData = new FormData();
//   formData.append('file', pdfBlob, filename);
//   formData.append('upload_preset', UPLOAD_PRESET);
//   formData.append('resource_type', 'raw'); // For PDFs
//   
//   const response = await axios.post(CLOUDINARY_URL, formData);
//   return {
//     success: true,
//     url: response.data.secure_url,
//     publicId: response.data.public_id
//   };
// };

/**
 * COST COMPARISON (as of 2024):
 * 
 * Firebase Storage:
 * - FREE: 5GB storage, 1GB/day downloads
 * - PAID: $0.026/GB storage, $0.12/GB downloads
 * 
 * AWS S3:
 * - Storage: $0.023/GB
 * - Downloads: $0.09/GB
 * - More complex pricing with tiers
 * 
 * Cloudinary:
 * - FREE: 25GB storage, 25GB bandwidth
 * - PAID: $99/month for 100GB
 * 
 * MongoDB Atlas:
 * - FREE: 512MB total
 * - PAID: $57/month for 10GB
 * 
 * RECOMMENDATION: Start with Firebase (FREE tier is generous)
 */

export default {
  initializeCloudStorage,
  uploadQuotationToCloud,
  getQuotationsFromCloud,
  deleteQuotationFromCloud
};
