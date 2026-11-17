import { randomInt } from 'node:crypto';
import {
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  ListUsersCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { config } from '../seed.config.ts';

// ダミーのユーザーは管理者用のAPIで作る。メールは送らない（MessageAction: SUPPRESS）。
// パスワードは実行のたびにここで作り、メモリの中だけで使う（ファイル・ログ・エラーメッセージに出さない）。

export const cognito = new CognitoIdentityProviderClient({ region: config.region });

export function isSeedEmail(email: string | undefined): email is string {
  return !!email && /^seed-[0-9a-z-]+@example\.com$/.test(email);
}

// Cognito の初期設定のパスワード条件（8文字以上・大文字・小文字・数字・記号）を必ず満たす
export function randomPassword(length = 24): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!#$%&*+-=?@^_'];
  const all = sets.join('');
  const chars = sets.map((s) => s[randomInt(s.length)]);
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// ユーザーがいなければ作り、新しいパスワードを設定してログインする。sub と IDトークンを返す
export async function ensureUserAndLogin(userPoolId: string, clientId: string, email: string) {
  if (!isSeedEmail(email)) throw new Error(`ダミーのユーザーのメールアドレスは seed-…@example.com にしてください：${email}`);

  let sub: string | undefined;
  let created = false;
  try {
    const u = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: email }));
    sub = u.UserAttributes?.find((a) => a.Name === 'sub')?.Value;
  } catch (e) {
    if (!(e instanceof UserNotFoundException)) throw e;
    const u = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS', // 招待メールを送らない
      }),
    );
    sub = u.User?.Attributes?.find((a) => a.Name === 'sub')?.Value;
    created = true;
  }
  if (!sub) throw new Error(`${email} の sub が取れませんでした`);

  const password = randomPassword();
  await cognito.send(
    new AdminSetUserPasswordCommand({ UserPoolId: userPoolId, Username: email, Password: password, Permanent: true }),
  );
  const auth = await cognito.send(
    new AdminInitiateAuthCommand({
      UserPoolId: userPoolId,
      ClientId: clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  const idToken = auth.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error(`${email} でログインできませんでした（${auth.ChallengeName ?? '理由不明'}）`);
  return { sub, idToken, created };
}

// seed- で始まり @example.com で終わるユーザーを全部探す
export async function listSeedUsers(userPoolId: string): Promise<{ email: string; sub: string }[]> {
  const found: { email: string; sub: string }[] = [];
  let token: string | undefined;
  do {
    const res = await cognito.send(
      new ListUsersCommand({ UserPoolId: userPoolId, Filter: 'email ^= "seed-"', PaginationToken: token }),
    );
    for (const u of res.Users ?? []) {
      const email = u.Attributes?.find((a) => a.Name === 'email')?.Value;
      const sub = u.Attributes?.find((a) => a.Name === 'sub')?.Value;
      if (isSeedEmail(email) && sub) found.push({ email, sub });
    }
    token = res.PaginationToken;
  } while (token);
  return found;
}

export async function deleteUser(userPoolId: string, email: string) {
  if (!isSeedEmail(email)) throw new Error(`ダミーではないユーザーは消しません：${email}`);
  await cognito.send(new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: email }));
}
