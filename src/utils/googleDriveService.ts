// Google Drive API using Service Account
// This allows uploads without user OAuth popup

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

interface UploadResult {
  fileId: string;
  webViewLink: string;
}

/**
 * Upload file to Google Drive using Service Account
 */
export async function uploadToGoogleDrive(
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<UploadResult> {
  console.log('[GoogleDrive] Starting upload with Service Account');
  console.log('[GoogleDrive] File:', fileName, 'Size:', blob.size, 'bytes');

  try {
    // Get access token using Service Account
    const accessToken = await getServiceAccountToken();

    // Upload file to Google Drive
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', blob);

    console.log('[GoogleDrive] Uploading to folder:', folderId);

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[GoogleDrive] Upload failed:', uploadResponse.status, errorText);
      console.error('[GoogleDrive] Folder ID used:', folderId);
      console.error('[GoogleDrive] File name:', fileName);
      throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    const result = await uploadResponse.json();
    console.log('[GoogleDrive] Upload successful:', result.id);

    return {
      fileId: result.id,
      webViewLink: result.webViewLink,
    };
  } catch (error: any) {
    console.error('[GoogleDrive] Error uploading file:', error);
    throw new Error(`Error al subir archivo a Google Drive: ${error.message}`);
  }
}

/**
 * Get access token for Service Account using JWT
 */
async function getServiceAccountToken(): Promise<string> {
  console.log('[GoogleDrive] Getting Service Account token');

  // Get credentials from environment variables
  const credentials = getServiceAccountCredentials();

  // Create JWT
  const jwt = await createJWT(credentials);

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('[GoogleDrive] Token request failed:', tokenResponse.status, errorText);
    console.error('[GoogleDrive] JWT used:', jwt);
    throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  console.log('[GoogleDrive] Access token obtained successfully');
  console.log('[GoogleDrive] Token expires in:', tokenData.expires_in, 'seconds');

  return tokenData.access_token;
}

/**
 * Get Service Account credentials from environment
 */
function getServiceAccountCredentials(): ServiceAccountCredentials {
  const clientEmail = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  console.log('[GoogleDrive] Client email configured:', !!clientEmail);
  console.log('[GoogleDrive] Private key configured:', !!privateKey);
  console.log('[GoogleDrive] Client email value:', clientEmail);

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Service Account credentials not configured. Please check environment variables.'
    );
  }

  // Clean up the private key - handle various formats
  // Remove quotes if present
  privateKey = privateKey.trim().replace(/^["']|["']$/g, '');

  // Replace literal \n strings with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n');

  // Ensure proper formatting
  if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
    console.error('[GoogleDrive] ❌ Private key does not start with BEGIN marker');
    console.error('[GoogleDrive] First 100 chars:', privateKey.substring(0, 100));
    throw new Error('Private key format is invalid - missing BEGIN marker');
  }

  if (!privateKey.endsWith('-----END PRIVATE KEY-----\n') && !privateKey.endsWith('-----END PRIVATE KEY-----')) {
    console.error('[GoogleDrive] ⚠️ Private key does not end with END marker properly');
    // Add ending marker if missing
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      privateKey += '\n-----END PRIVATE KEY-----\n';
    } else if (!privateKey.endsWith('\n')) {
      privateKey += '\n';
    }
  }

  console.log('[GoogleDrive] Private key starts with:', privateKey.substring(0, 50));
  console.log('[GoogleDrive] Private key ends with:', privateKey.substring(privateKey.length - 50));
  console.log('[GoogleDrive] Private key contains newlines:', privateKey.includes('\n'));
  console.log('[GoogleDrive] Private key line count:', privateKey.split('\n').length);

  return {
    client_email: clientEmail,
    private_key: privateKey,
  };
}

/**
 * Create JWT for Service Account authentication
 */
async function createJWT(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const claimSetBase64 = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${headerBase64}.${claimSetBase64}`;

  // Sign using Web Crypto API
  const signature = await signWithPrivateKey(signatureInput, credentials.private_key);
  const signatureBase64 = base64UrlEncode(signature);

  return `${signatureInput}.${signatureBase64}`;
}

/**
 * Sign data with RSA private key
 */
async function signWithPrivateKey(data: string, privateKeyPem: string): Promise<ArrayBuffer> {
  try {
    // Import private key
    const pemContents = privateKeyPem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');

    console.log('[GoogleDrive] PEM contents length after cleanup:', pemContents.length);
    console.log('[GoogleDrive] PEM contents first 50 chars:', pemContents.substring(0, 50));

    // Decode base64
    let binaryDer: Uint8Array;
    try {
      binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
      console.log('[GoogleDrive] ✓ Successfully decoded base64, length:', binaryDer.length);
    } catch (atobError: any) {
      console.error('[GoogleDrive] ❌ atob() failed:', atobError.message);
      console.error('[GoogleDrive] This usually means the private key is not valid base64');
      console.error('[GoogleDrive] PEM contents (first 200):', pemContents.substring(0, 200));
      throw new Error(`Failed to decode private key: ${atobError.message}`);
    }

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer.buffer as ArrayBuffer,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    console.log('[GoogleDrive] ✓ Successfully imported crypto key');

    // Sign data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBuffer);

    console.log('[GoogleDrive] ✓ Successfully signed data');

    return signature;
  } catch (error: any) {
    console.error('[GoogleDrive] ❌ Error in signWithPrivateKey:', error);
    throw error;
  }
}

/**
 * Base64 URL encode (without padding)
 */
function base64UrlEncode(input: string | ArrayBuffer): string {
  let base64: string;

  if (typeof input === 'string') {
    base64 = btoa(input);
  } else {
    const bytes = new Uint8Array(input);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
    base64 = btoa(binary);
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
