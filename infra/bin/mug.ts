#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { MugStack } from '../lib/mug-stack';

const app = new cdk.App();

// あとで一括で片付けるためのタグ（AGENTS.md）。ここで1回だけ付け、個別のリソースで上書きしない。
cdk.Tags.of(app).add('Project', 'mug');
cdk.Tags.of(app).add('Owner', 'Jiji824');
cdk.Tags.of(app).add('Purpose', 'hackathon-2026');
cdk.Tags.of(app).add('DeleteAfter', '2026-11-30');

new MugStack(app, 'MugStack', {
  // 東京リージョン。アカウントは実行するときのAWSの認証情報から決まる。
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'ap-northeast-1' },
});
