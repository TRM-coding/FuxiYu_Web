## 1. 凭据响应契约与错误脱敏

- [x] 1.1 Write failing tests: test-plan entries `test_credential_shape_and_counts`, `test_credential_legacy_and_empty`, `test_credential_error_sanitization`, `test_guard_rejection_and_unknown_result` in `src/test/credentialResponse.test.js` and `src/test/containerApiCredentials.test.js`; confirm they fail for missing parser/error-sanitization behavior.
- [x] 1.2 Implement `src/utils/credentialResponse.js` and safe credential response/error handling for create/add/reset/updateRole/resurrect; preserve safe message, strip secret/unsafe body, apply no-store, transfer_root shape rules.
- [x] 1.3 Refactor; run the targeted credential tests and keep them green.

## 2. 权限快照容器资源位

- [x] 2.1 Write failing test: test-plan entry `test_auth_container_resource_capability` in `src/test/ContainerResourcePermission.test.jsx`; confirm missing `containerResourceUnrestricted` fails.
- [x] 2.2 Implement `container_resource_unrestricted` normalization in `user_api`, `PermissionProvider`, and `permissionContextValue`; add `canResetContainerCredentials` guard helper.
- [x] 2.3 Refactor; run permission tests and keep them green.

## 3. 受控密码弹窗与不落盘

- [x] 3.1 Write failing tests: test-plan entries `test_credential_modal_render_copy_close`, `test_credential_no_persistence`, `test_credential_unified_entrances` in `src/test/CredentialModal.test.jsx` and `src/test/containerCredentialContract.test.js`; confirm component/storage assertions fail.
- [x] 3.2 Implement `src/components/CredentialModal.jsx` and shared rendering/copy/close/clear behavior; no showErrorModal, no storage/logging.
- [x] 3.3 Refactor; run modal/contract tests and keep them green.

## 4. 创建容器受理与密码展示

- [x] 4.1 Write failing tests: test-plan entries `test_create_accepts_credentials_and_navigation`, `test_create_error_safe_message` in `src/test/CreateContainerPassword.test.jsx`; confirm no modal/navigation behavior exists yet.
- [x] 4.2 Implement CreateContainer credential state, immediate modal, deferred navigation/heartbeat, safe error handling, and all-entry reuse.
- [x] 4.3 Refactor; run create tests and keep them green.

## 5. 详情页新增协作者、重置与 ROOT 提升

- [x] 5.1 Write failing tests: test-plan entries `test_detail_add_collaborator_credentials`, `test_detail_reset_permission_guards`, `test_detail_reset_request_and_result`, `test_detail_root_transfer_single_target`, `test_detail_root_transfer_one_credential`, `test_detail_main_flow_password_integration` in `src/test/ContainerDetailPasswords.test.jsx`; confirm missing buttons/flows fail.
- [x] 5.2 Implement detail-page add/reset/root flows, three-layer reset guard, bound user_id request, one credential for `transfer_root:false`, no optimistic role/account updates.
- [x] 5.3 Refactor; run detail tests and keep them green.

## 6. Home/EditUserModal 新增协作者与 ROOT 交接

- [x] 6.1 Write failing tests: test-plan entries `test_home_add_collaborator_credentials`, `test_home_root_transfer_request`, `test_home_root_transfer_credentials` in `src/test/EditUserModalPasswords.test.jsx`; confirm old multi-step/no-credential behavior fails.
- [x] 6.2 Implement Home-level credential modal, EditUserModal add credential handling, single `transfer_root:true` request, N+1 array rendering, no optimistic role update.
- [x] 6.3 Refactor; run Home/EditUserModal tests and keep them green.

## 7. 容器恢复 root 凭据

- [x] 7.1 Write failing test: test-plan entry `test_deleted_restore_root_credential` in `src/test/DeletedContainersRestorePassword.test.jsx`; confirm restore success currently drops credentials.
- [x] 7.2 Implement DeletedContainers restore credential modal, `requires_choice` bypass, safe error message without raw body; do not change other restore behavior.
- [x] 7.3 Refactor; run restore tests and keep them green.

## 8. 审计、no-store 与不重复日志契约

- [x] 8.1 Write failing tests: test-plan entries `test_audit_reuse_no_duplicate_logs` and remaining contract assertions in `src/test/containerCredentialContract.test.js`; confirm no password/no duplicate log/no-store assertions fail.
- [x] 8.2 Implement any missing request flags and ensure Web does not add password logs or operation-log calls.
- [x] 8.3 Refactor; run contract tests and keep them green.

## 9. 全量验证与记录

- [x] 9.1 Run `npm test` (Vitest + production-entry integration) and `npm run build`; record real counts and failures.
- [x] 9.2 Fix only change-introduced failures; do not weaken existing assertions.
- [x] 9.3 Update test-plan red→green with real evidence and prepare verify.
