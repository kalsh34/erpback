"use strict";
/**
 * Pure scheduling engine types. No mongoose, no I/O — unit-testable in isolation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineConfigError = exports.ALGORITHM_VERSION = void 0;
exports.ALGORITHM_VERSION = 'engine-1.0.0';
class EngineConfigError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EngineConfigError';
    }
}
exports.EngineConfigError = EngineConfigError;
//# sourceMappingURL=types.js.map