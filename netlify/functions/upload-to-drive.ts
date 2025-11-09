import { Handler } from '@netlify/functions';

interface UploadRequest {
  fileData: string; // base64
  fileName: string;
  folderId: string;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const body: UploadRequest = JSON.parse(event.body || '{}');
    const { fileData, fileName, folderId } = body;

    if (!fileData || !fileName || !folderId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: fileData, fileName, folderId' }),
      };
    }

    console.log('[Netlify Function] Starting upload for:', fileName);

    // Get credentials from environment
    const clientEmail = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.VITE_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      console.error('[Netlify Function] Missing credentials');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Service Account credentials not configured' }),
      };
    }

    // Get access token
    const accessToken = await getServiceAccountToken(clientEmail, privateKey);
    console.log('[Netlify Function] Access token obtained');

    // Upload file to Google Drive
    const result = await uploadToDrive(accessToken, fileData, fileName, folderId);
    console.log('[Netlify Function] Upload successful:', result.id);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        fileId: result.id,
        webViewLink: result.webViewLink,
      }),
    };
  } catch (error: any) {
    console.error('[Netlify Function] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
    };
  }
};

async function getServiceAccountToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600; // 1 hour

  // Clean up private key
  let cleanPrivateKey = privateKey.trim().replace(/^["']|["']$/g, '');
  cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, '\n');

  // Create JWT
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const headerBase64 = base64UrlEncode(JSON.stringify(header));
  const claimSetBase64 = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${headerBase64}.${claimSetBase64}`;

  // Sign using Node.js crypto (server-side)
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(cleanPrivateKey);
  const signatureBase64 = base64UrlEncode(signature);

  const jwt = `${signatureInput}.${signatureBase64}`;

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
    throw new Error(`Failed to get access token: ${tokenResponse.status} - ${errorText}`);
  }

  const tokenData: GoogleTokenResponse = await tokenResponse.json();
  return tokenData.access_token;
}

async function uploadToDrive(
  accessToken: string,
  fileData: string,
  fileName: string,
  folderId: string
): Promise<{ id: string; webViewLink: string }> {
  // Convert base64 to Buffer
  const buffer = Buffer.from(fileData, 'base64');

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  // Create multipart request
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    buffer.toString('base64') +
    closeDelimiter;

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
  }

  return await uploadResponse.json();
}

function base64UrlEncode(input: string | Buffer): string {
  let base64: string;

  if (typeof input === 'string') {
    base64 = Buffer.from(input).toString('base64');
  } else {
    base64 = input.toString('base64');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
