import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
  CognitoUserPool,
  type CognitoUserSession,
} from 'amazon-cognito-identity-js';

// README の接続情報。秘密ではない。環境変数があればそちらを使う。
const poolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'ap-northeast-1_AFaQnY16E';
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID || '4qfvcdn0pkrg5696vfrjmoo37r';

const pool = new CognitoUserPool({ UserPoolId: poolId, ClientId: clientId });

export type Session = { idToken: string; email: string };

function userOf(email: string): CognitoUser {
  return new CognitoUser({ Username: email, Pool: pool });
}

function sessionOf(session: CognitoUserSession, email: string): Session {
  return { idToken: session.getIdToken().getJwtToken(), email };
}

export function currentSession(): Promise<Session | null> {
  const user = pool.getCurrentUser();
  if (!user) return Promise.resolve(null);
  return new Promise((resolve) => {
    user.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session?.isValid()) resolve(null);
      else resolve(sessionOf(session, user.getUsername()));
    });
  });
}

export function signUp(email: string, password: string): Promise<void> {
  const attributes = [new CognitoUserAttribute({ Name: 'email', Value: email })];
  return new Promise((resolve, reject) => {
    pool.signUp(email, password, attributes, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).confirmRegistration(code, true, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function resendCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    userOf(email).resendConfirmationCode((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function signIn(email: string, password: string): Promise<Session> {
  const details = new AuthenticationDetails({ Username: email, Password: password });
  const user = userOf(email);
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve(sessionOf(session, email)),
      onFailure: (err) => reject(err),
    });
  });
}

export function signOut(): void {
  pool.getCurrentUser()?.signOut();
}

export function authMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
  if (code === 'UsernameExistsException') return 'このメールアドレスは登録済みです。ログインしてください';
  if (code === 'InvalidPasswordException') return 'パスワードは8文字以上で、大文字・小文字・数字・記号を含めてください';
  if (code === 'CodeMismatchException') return '確認コードが違います';
  if (code === 'ExpiredCodeException') return '確認コードの期限が切れました。もう一度送ってください';
  if (code === 'UserNotConfirmedException') return 'メールの確認コードがまだです';
  if (code === 'NotAuthorizedException') return 'メールアドレスかパスワードが違います';
  if (code === 'InvalidParameterException') return '入力の形を確認してください';
  if (err instanceof Error && err.message) return err.message;
  return 'うまくいきませんでした。もう一度試してください';
}
