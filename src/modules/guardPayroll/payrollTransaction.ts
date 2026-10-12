import mongoose from 'mongoose';
import { ApiError } from '../../common/ApiError';

// Mongoose 8 propagates the transaction session to queries inside this callback.
mongoose.set('transactionAsyncLocalStorage', true);

export async function payrollTransaction<T>(operation: () => Promise<T>): Promise<T> {
  const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') {
    throw ApiError.conflict('This action requires a MongoDB replica set for safe transactional payroll and assignment history. Configure transactions before proceeding; no records were changed.');
  }
  return mongoose.connection.transaction(operation);
}
