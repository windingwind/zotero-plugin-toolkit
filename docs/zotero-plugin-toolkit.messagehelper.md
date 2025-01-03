<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [MessageHelper](./zotero-plugin-toolkit.messagehelper.md)

## MessageHelper class

> This API is provided as a beta preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Helper class to manage messages between workers/iframes and their parent

**Signature:**

```typescript
export declare class MessageHelper<_TargetHandlers extends MessageHandlers> 
```

## Example 1

Use the `MessageHelper` to create a server that can be used to communicate between workers or iframes and their parent.

In the child `worker.js`<!-- -->:

```typescript
const handlers = {
  async test() {
    return "test";
  },
};
// Create a new server
const server = new MessageHelper({
  name: "child",
  handlers,
  canBeDestroyed: true,
});
// Start the listener
server.start();
// Export the handlers for type hinting
export { handlers };
```
In the parent:

```typescript
// Import the handlers
import type { handlers } from "./worker.js";
// Create a new worker
const worker = new Worker("worker.js");
// Create a new server with the type from the target handlers
const server = new MessageHelper<typeof handlers>({
  name: "worker",
  handlers: {
    async test() {
      return "test";
    },
  },
  target: worker,
});
server.start();
// Execute the handlers defined in the worker as if they were local
ztoolkit.log(await server.proxy.test());
// ...
// Stop the server, can be restarted with server.start()
server.stop();
// Destroy the server and the worker
server.destroy();
```

## Example 2

Evaluate code in the other side of the server

```typescript
await server.eval("self.firstName = 'John';");
```

## Example 3

Get a property from the other side of the server, can be nested.

Only works if the property is a primitive or a serializable object

```typescript
ztoolkit.log(await server.get("self.firstName"));
```

## Example 4

Set a property from the other side of the server, can be nested.

Only works if the property is a primitive or a serializable object

```typescript
await server.set("self.firstName", "Alice");
```

## Example 5

Check if the target is alive

```typescript
ztoolkit.log(await server.isTargetAlive());
// Alternatively, send a ping message
ztoolkit.log(await server.proxy._ping());
```

## Constructors

<table><thead><tr><th>

Constructor


</th><th>

Modifiers


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[(constructor)(config)](./zotero-plugin-toolkit.messagehelper._constructor_.md)


</td><td>


</td><td>

**_(BETA)_** Constructs a new instance of the `MessageHelper` class


</td></tr>
</tbody></table>

## Properties

<table><thead><tr><th>

Property


</th><th>

Modifiers


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[config](./zotero-plugin-toolkit.messagehelper.config.md)


</td><td>

`protected`


</td><td>

Required&lt;MessageServerConfig&gt;


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[env](./zotero-plugin-toolkit.messagehelper.env.md)


</td><td>

`protected`


</td><td>

"webworker" \| "chromeworker" \| "browser" \| "content"


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[listener?](./zotero-plugin-toolkit.messagehelper.listener.md)


</td><td>

`protected`


</td><td>

any


</td><td>

**_(BETA)_** _(Optional)_


</td></tr>
<tr><td>

[privileged](./zotero-plugin-toolkit.messagehelper.privileged.md)


</td><td>

`readonly`


</td><td>

boolean


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[proxy](./zotero-plugin-toolkit.messagehelper.proxy.md)


</td><td>


</td><td>

PromisedMessageHandlers&lt;\_TargetHandlers &amp; BuiltInMessageHandlers&gt;


</td><td>

**_(BETA)_** Proxy object to call the message handlers


</td></tr>
<tr><td>

[running](./zotero-plugin-toolkit.messagehelper.running.md)


</td><td>


</td><td>

boolean


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[target](./zotero-plugin-toolkit.messagehelper.target.md)


</td><td>

`readonly`


</td><td>

Window \| Worker


</td><td>

**_(BETA)_**


</td></tr>
</tbody></table>

## Methods

<table><thead><tr><th>

Method


</th><th>

Modifiers


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[call(func, args)](./zotero-plugin-toolkit.messagehelper.call.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[destroy()](./zotero-plugin-toolkit.messagehelper.destroy.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[eval(code)](./zotero-plugin-toolkit.messagehelper.eval.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[exec(name, params, options)](./zotero-plugin-toolkit.messagehelper.exec.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[get(key)](./zotero-plugin-toolkit.messagehelper.get.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[isTargetAlive()](./zotero-plugin-toolkit.messagehelper.istargetalive.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[send(options)](./zotero-plugin-toolkit.messagehelper.send.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[set(key, value)](./zotero-plugin-toolkit.messagehelper.set.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[start()](./zotero-plugin-toolkit.messagehelper.start.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
<tr><td>

[stop()](./zotero-plugin-toolkit.messagehelper.stop.md)


</td><td>


</td><td>

**_(BETA)_**


</td></tr>
</tbody></table>
