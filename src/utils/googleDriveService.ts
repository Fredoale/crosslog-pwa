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
  const privateKey = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  console.log('[GoogleDrive] Client email configured:', !!clientEmail);
  console.log('[GoogleDrive] Private key configured:', !!privateKey);
  console.log('[GoogleDrive] Client email value:', clientEmail);

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Service Account credentials not configured. Please check environment variables.'
    );
  }

  // Replace \n literal strings with actual newlines
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  console.log('[GoogleDrive] Private key starts with:', formattedPrivateKey.substring(0, 50));
  console.log('[GoogleDrive] Private key contains newlines:', formattedPrivateKey.includes('\n'));

  return {
    client_email: clientEmail,
    private_key: formattedPrivateKey,
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
    scope: 'https://www.googleapis.com/auth/drive.file',
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
  // Import private key
  const pemContents = privateKeyPem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign data
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, dataBuffer);

  return signature;
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
