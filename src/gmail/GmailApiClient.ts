const GMAIL_API_ORIGIN = 'https://gmail.googleapis.com/gmail/v1';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PAGE_SIZE = 500;

export type GmailApiConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
};

export type GmailSpamMessage = {
  id: string;
  subject: string;
};

type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type MessageListResponse = {
  messages?: Array<{ id: string }>;
  nextPageToken?: string;
};
type MessageMetadataResponse = {
  payload?: { headers?: Array<{ name: string; value: string }> };
};

const requiredEnvironmentVariables = [
  'GMAIL_CLIENT_ID',
  'GMAIL_CLIENT_SECRET',
  'GMAIL_REFRESH_TOKEN',
] as const;

export const hasGmailApiCredentials = (): boolean =>
  requiredEnvironmentVariables.every((name) => Boolean(process.env[name]));

export const getGmailApiConfig = (): GmailApiConfig => {
  const missing = requiredEnvironmentVariables.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing Gmail API environment variable(s): ${missing.join(', ')}`);
  }

  return {
    clientId: process.env.GMAIL_CLIENT_ID!,
    clientSecret: process.env.GMAIL_CLIENT_SECRET!,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
  };
};

export class GmailApiClient {
  private constructor(private readonly accessToken: string) {}

  static async create(config: GmailApiConfig): Promise<GmailApiClient> {
    const response = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const body = (await response.json()) as TokenResponse;

    if (!response.ok || !body.access_token) {
      throw new Error(
        `Could not refresh the Gmail API access token: ${body.error_description ?? body.error ?? response.statusText}`,
      );
    }

    return new GmailApiClient(body.access_token);
  }

  async listSpamMessageIds(): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const query = new URLSearchParams({
        labelIds: 'SPAM',
        includeSpamTrash: 'true',
        maxResults: String(PAGE_SIZE),
      });
      if (pageToken) query.set('pageToken', pageToken);

      const page = await this.request<MessageListResponse>(
        `/users/me/messages?${query.toString()}`,
      );
      ids.push(...(page.messages ?? []).map((message) => message.id));
      pageToken = page.nextPageToken;
    } while (pageToken);

    return ids;
  }

  /** Lists Spam message IDs and their Subject headers, without reading message bodies. */
  async listSpamMessages(): Promise<GmailSpamMessage[]> {
    const ids = await this.listSpamMessageIds();
    const messages: GmailSpamMessage[] = [];

    for (const id of ids) {
      const query = new URLSearchParams({
        format: 'metadata',
        metadataHeaders: 'Subject',
      });
      const metadata = await this.request<MessageMetadataResponse>(
        `/users/me/messages/${encodeURIComponent(id)}?${query.toString()}`,
      );
      const subject = metadata.payload?.headers?.find(
        (header) => header.name.toLowerCase() === 'subject',
      )?.value;
      messages.push({ id, subject: subject || '(no subject)' });
    }

    return messages;
  }

  /** Permanently deletes every message currently labeled SPAM. */
  async emptySpam(): Promise<number> {
    const ids = await this.listSpamMessageIds();

    for (let index = 0; index < ids.length; index += PAGE_SIZE) {
      await this.request<void>('/users/me/messages/batchDelete', {
        method: 'POST',
        body: JSON.stringify({ ids: ids.slice(index, index + PAGE_SIZE) }),
      });
    }

    return ids.length;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${GMAIL_API_ORIGIN}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.accessToken}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Gmail API request failed (${response.status}): ${await response.text()}`);
    }

    const responseBody = await response.text();
    if (!responseBody) return undefined as T;
    return JSON.parse(responseBody) as T;
  }
}
