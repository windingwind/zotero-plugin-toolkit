<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [ShortcutManager](./zotero-plugin-toolkit.shortcutmanager.md) &gt; [unregister](./zotero-plugin-toolkit.shortcutmanager.unregister.md)

## ShortcutManager.unregister() method

Unregister a key.

**Signature:**

```typescript
unregister(keyOptions: Key): Promise<boolean>;
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

keyOptions


</td><td>

Key


</td><td>


</td></tr>
</tbody></table>
**Returns:**

Promise&lt;boolean&gt;

`true` for success and `false` for failure.

## Remarks

`builtin` keys cannot be unregistered.

