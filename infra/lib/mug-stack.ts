import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

// mug のAWSリソースをまとめるスタック。
// 今はひな形なので中身は空。Lambda・DynamoDB・Cognito などをここに足していく。
export class MugStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
}
