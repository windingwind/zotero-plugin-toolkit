<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [ReaderInstanceManager](./zotero-plugin-toolkit.readerinstancemanager.md) &gt; [register](./zotero-plugin-toolkit.readerinstancemanager.register.md)

## ReaderInstanceManager.register() method

> Warning: This API is now obsolete.
> 
> 

Register a reader instance hook

**Signature:**

```typescript
register(type: "initialized", id: string, hook: readerInstanceHook): void;
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

"initialized"


</td><td>

hook type


</td></tr>
<tr><td>

id


</td><td>

string


</td><td>

hook id


</td></tr>
<tr><td>

hook


</td><td>

readerInstanceHook


</td><td>


</td></tr>
</tbody></table>
**Returns:**

void

## Remarks

initialized: called when reader instance is ready

