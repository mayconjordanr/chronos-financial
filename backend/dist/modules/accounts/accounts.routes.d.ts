import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AccountService } from './accounts.service';
export interface AccountRoutesOptions extends FastifyPluginOptions {
    accountService: AccountService;
}
export declare function accountRoutes(fastify: FastifyInstance, options: AccountRoutesOptions): Promise<void>;
export default function accountsPlugin(fastify: FastifyInstance, options: AccountRoutesOptions): Promise<void>;
export { AccountRoutesOptions };
//# sourceMappingURL=accounts.routes.d.ts.map