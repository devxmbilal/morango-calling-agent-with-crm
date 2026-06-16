const encoder = new TextEncoder();

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64urlDecode(str: string): string {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  return atob(padded);
}

export async function signJWT(payload: any, secret: string, expiresInSeconds = 86400): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = base64urlEncodeBytes(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncodeBytes(encoder.encode(JSON.stringify(fullPayload)));

  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput));
  const signatureB64 = base64urlEncodeBytes(new Uint8Array(signatureBuffer));

  return `${signingInput}.${signatureB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const signingInput = `${headerB64}.${payloadB64}`;
    const key = await getCryptoKey(secret);

    // Decode signature
    const binarySign = base64urlDecode(signatureB64);
    const sigBytes = new Uint8Array(binarySign.length);
    for (let i = 0; i < binarySign.length; i++) {
      sigBytes[i] = binarySign.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signingInput));
    if (!isValid) return null;

    // Decode payload
    const binaryPayload = base64urlDecode(payloadB64);
    const payloadBytes = new Uint8Array(binaryPayload.length);
    for (let i = 0; i < binaryPayload.length; i++) {
      payloadBytes[i] = binaryPayload.charCodeAt(i);
    }
    
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}
