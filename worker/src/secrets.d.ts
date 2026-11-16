// Secrets（wrangler secret put で登録するもの）の型。
// wrangler.jsonc には書かないので、wrangler types では自動で作られない。値はここに書かない。
interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
}
