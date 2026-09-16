"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
const events_1 = require("events");
class EventBus {
    constructor() {
        this.emitter = new events_1.EventEmitter();
        this.handlers = new Map();
        this.emitter.setMaxListeners(50);
    }
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
        this.emitter.on(event, async (data) => {
            try {
                await handler(data);
            }
            catch (err) {
                console.error(`[EventBus] Error in handler for "${event}":`, err);
            }
        });
    }
    async emit(event, payload, userId) {
        const domainEvent = {
            event,
            payload,
            userId,
            timestamp: new Date(),
        };
        return this.emitter.emit(event, domainEvent);
    }
    getRegisteredEvents() {
        return Array.from(this.handlers.keys());
    }
}
exports.eventBus = new EventBus();
//# sourceMappingURL=EventBus.js.map