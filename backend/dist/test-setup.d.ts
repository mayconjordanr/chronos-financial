export declare const mockTenantId = "test_tenant_123";
export declare const mockUserId = "test_user_123";
export declare const mockAccountId = "test_account_123";
export declare const createMockPrismaClient: () => {
    account: {
        create: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        findMany: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        findFirst: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        update: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        delete: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        count: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    };
    user: {
        findFirst: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    };
    balanceHistory: {
        create: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
        findMany: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    };
    $transaction: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
};
//# sourceMappingURL=test-setup.d.ts.map