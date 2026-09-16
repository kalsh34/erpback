import { EventEmitter } from 'events';

export interface DomainEvent {
  event: string;
  payload: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

class EventBus {
  private emitter = new EventEmitter();
  private handlers: Map<string, EventHandler[]> = new Map();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
    this.emitter.on(event, async (data: DomainEvent) => {
      try {
        await handler(data);
      } catch (err) {
        console.error(`[EventBus] Error in handler for "${event}":`, err);
      }
    });
  }

  async emit(event: string, payload: Record<string, unknown>, userId?: string): Promise<boolean> {
    const domainEvent: DomainEvent = {
      event,
      payload,
      userId,
      timestamp: new Date(),
    };
    return this.emitter.emit(event, domainEvent);
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

export const eventBus = new EventBus();
