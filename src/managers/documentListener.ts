import { ManagerTool } from "../basic";

export class DocumentListenerManager extends ManagerTool {
    protected readonly listeners = new Array<{
        target: EventTarget;
        type: string;
        listener: EventListenerOrEventListenerObject;
    }>();

    register<T extends EventTarget, K extends keyof GlobalEventHandlersEventMap>(
        target: T,
        type: K,
        listener: (this: T, ev: GlobalEventHandlersEventMap[K]) => any,
        options?: AddEventListenerOptions | boolean
    ) {
        if (typeof target?.addEventListener != "function")
            return false;
        target.addEventListener(type, listener as EventListener, options);
        this.listeners.push({ target, type, listener: listener as EventListener});
        return true;
    }

    unregister(target: EventTarget): number;
    unregister(type: keyof GlobalEventHandlersEventMap): number;
    unregister(listener: EventListenerOrEventListenerObject): number;
    unregister(value: any) {
        const listeners = this.listeners.filter(
            x => Object.values(x).includes(value)
        );
        for (const { target, type, listener } of listeners) {
            target.removeEventListener(type, listener);
            this.listeners.splice(this.listeners.indexOf({ target, type, listener }), 1);
        }
        return listeners.length;
    }

    unregisterAll() {
        for (const { target, type, listener } of this.listeners)
            target.removeEventListener(type, listener);
        this.listeners.length = 0;
    }
}
