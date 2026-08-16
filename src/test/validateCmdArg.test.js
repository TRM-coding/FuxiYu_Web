import { describe, it, expect } from 'vitest';
import { isUnsafeArg, isValidName, isValidImageName, anyUnsafe } from '../utils/validateCmdArg';

describe('isValidName', () => {
  it('允许字母数字下划线', () => {
    expect(isValidName('container_01')).toBe(true);
    expect(isValidName('abc123')).toBe(true);
  });

  it('拒绝非字符串与非法字符', () => {
    expect(isValidName(123)).toBe(false);
    expect(isValidName('')).toBe(false);
    expect(isValidName('中文名')).toBe(false);
    expect(isValidName('bad-name')).toBe(false);
    expect(isValidName('bad name')).toBe(false);
  });
});

describe('isValidImageName', () => {
  it('允许常见镜像名形态', () => {
    expect(isValidImageName('ubuntu:24.04')).toBe(true);
    expect(isValidImageName('nginx:latest')).toBe(true);
    expect(isValidImageName('registry.example.com/myorg/myimage:tag')).toBe(true);
  });

  it('拒绝空格与其他特殊字符', () => {
    expect(isValidImageName('bad image')).toBe(false);
    expect(isValidImageName('bad;rm')).toBe(false);
  });
});

describe('isUnsafeArg / anyUnsafe', () => {
  it('拒绝元字符与危险命令关键词', () => {
    expect(isUnsafeArg('a; rm -rf /')).toBe(true);
    expect(isUnsafeArg('$(whoami)')).toBe(true);
    expect(isUnsafeArg('curl http://evil')).toBe(true);
    expect(isUnsafeArg('line1\nline2')).toBe(true);
  });

  it('接受普通值', () => {
    expect(isUnsafeArg('container_01')).toBe(false);
    expect(isUnsafeArg('ubuntu:24.04')).toBe(false);
    expect(isUnsafeArg(null)).toBe(false);
    expect(isUnsafeArg(123)).toBe(false);
  });

  it('anyUnsafe 任一参数危险即真', () => {
    expect(anyUnsafe('safe_name', 'curl evil', 'ubuntu:24.04')).toBe(true);
    expect(anyUnsafe('safe_name', 'ubuntu:24.04')).toBe(false);
  });
});
