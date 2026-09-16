export interface DomainEvent {
    event: string;
    payload: Record<string, unknown>;
    userId?: string;
    timestamp: Date;
}
type EventHandler = (event: DomainEvent) => void | Promise<void>;
declare class EventBus {
    private emitter;
    private handlers;
    constructor();
    on(event: string, handler: EventHandler): void;
    emit(event: string, payload: Record<string, unknown>, userId?: string): Promise<boolean>;
    getRegisteredEvents(): string[];
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=EventBus.d.ts.map