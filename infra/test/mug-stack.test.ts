import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { MugStack } from '../lib/mug-stack';

test('MugStack をテンプレートに変換できる', () => {
  const app = new cdk.App();
  const stack = new MugStack(app, 'TestStack');
  const template = Template.fromStack(stack);
  expect(template.toJSON()).toBeDefined();
});
