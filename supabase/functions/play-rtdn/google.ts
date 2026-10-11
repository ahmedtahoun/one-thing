/**
 * The two things this webhook needs from Google: proof that a push really
 * came from our Pub/Sub subscription, and the Play Developer API.
 *
 * Neither has a stand-in in the tests — they are the parts that cannot be
 * exercised without a service account — so both are kept thin and all the
 * decisions live in handler.ts and _shared/store-contract.ts.
 */
import { JWT, OAuth2Client } from 'google-auth-library';

const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';

/**
 * Whether this request is Google's.
 *
 * A Pub/Sub push subscription configured with a service account signs every
 * delivery with an OIDC token. Verifying it is what makes a public function
 * URL safe: without this, anyone who learned the URL could post a refund.
 *
 * @param authorization the request's Authorization header
 * @param audience      the audience configured on the push subscription
 * @param email         the service account the push subscription runs as
 */
export async function pushIsGoogle(
  authorization: string | null,
  audience: string,
  email: string
): Promise<boolean> {
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  try {
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    // Google signed it, it was meant for us, and it came from the account we
    // configured — all three, or it is not ours.
    return payload?.email === email && payload.email_verified === true;
  } catch {
    return false;
  }
}

export type PlayApi = {
  subscription(purchaseToken: string): Promise<Record<string, unknown>>;
  product(productId: string, purchaseToken: string): Promise<Record<string, unknown>>;
};

/**
 * `purchases.subscriptionsv2.get` and `purchases.products.get`, which are the
 * only authority on what a Play purchase is currently worth — the
 * notification itself carries no state.
 */
export function playApi(serviceAccountJson: string, packageName: string): PlayApi {
  const creds = JSON.parse(serviceAccountJson) as { client_email?: string; private_key?: string };
  if (!creds.client_email || !creds.private_key) throw new Error('service account has no client_email or private_key');
  const jwt = new JWT({ email: creds.client_email, key: creds.private_key, scopes: [SCOPE] });

  const get = async (path: string): Promise<Record<string, unknown>> => {
    const { token } = await jwt.getAccessToken();
    if (!token) throw new Error('no access token for the Play API');
    const response = await fetch(`${API}/${packageName}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      // The body carries Google's own reason, which is what a support
      // question will need.
      throw new Error(`Play API ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    return (await response.json()) as Record<string, unknown>;
  };

  return {
    subscription: (purchaseToken) => get(`purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`),
    product: (productId, purchaseToken) =>
      get(`purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`),
  };
}
