"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStubRouter = createStubRouter;
const express_1 = require("express");
function createStubRouter(moduleName) {
    const router = (0, express_1.Router)();
    router.all('*', (_req, res) => {
        res.status(501).json({
            success: false,
            message: `${moduleName} module is not yet implemented`,
        });
    });
    return router;
}
//# sourceMappingURL=stubRouter.js.map