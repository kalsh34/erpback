"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payrollTransaction = payrollTransaction;
const mongoose_1 = __importDefault(require("mongoose"));
const ApiError_1 = require("../../common/ApiError");
// Mongoose 8 propagates the transaction session to queries inside this callback.
mongoose_1.default.set('transactionAsyncLocalStorage', true);
async function payrollTransaction(operation) {
    const hello = await mongoose_1.default.connection.db.admin().command({ hello: 1 });
    if (!hello.setName && hello.msg !== 'isdbgrid') {
        throw ApiError_1.ApiError.conflict('This action requires a MongoDB replica set for safe transactional payroll and assignment history. Configure transactions before proceeding; no records were changed.');
    }
    return mongoose_1.default.connection.transaction(operation);
}
//# sourceMappingURL=payrollTransaction.js.map