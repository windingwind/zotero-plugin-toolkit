<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [BasicTool](./zotero-plugin-toolkit.basictool.md) &gt; [removeListenerCallback](./zotero-plugin-toolkit.basictool.removelistenercallback.md)

## BasicTool.removeListenerCallback() method

Remove a Zotero event listener callback

**Signature:**

```typescript
removeListenerCallback<T extends keyof ListenerCallbackMap>(type: T, callback: ListenerCallbackMap[T]): void;
```

## Parameters

<table><thead><tr><th>

Parameter


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

type


</td><td>

T


</td><td>

Event type


</td></tr>
<tr><td>

callback


</td><td>

ListenerCallbackMap\[T\]


</td><td>

Event callback


</td></tr>
</tbody></table>
**Returns:**

void

