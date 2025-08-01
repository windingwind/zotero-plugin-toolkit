<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [DialogHelper](./zotero-plugin-toolkit.dialoghelper.md) &gt; [addButton](./zotero-plugin-toolkit.dialoghelper.addbutton.md)

## DialogHelper.addButton() method

Add a control button to the bottom of the dialog.

**Signature:**

```typescript
addButton(label: string, id?: string, options?: {
        noClose?: boolean;
        callback?: (ev: Event) => any;
    }): this;
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

label


</td><td>

string


</td><td>

Button label


</td></tr>
<tr><td>

id


</td><td>

string


</td><td>

_(Optional)_ Button id. The corresponding id of the last button user clicks before window exit will be set to `dialogData._lastButtonId`<!-- -->.


</td></tr>
<tr><td>

options


</td><td>

{ noClose?: boolean; callback?: (ev: Event) =&gt; any; }


</td><td>

_(Optional)_ Options


</td></tr>
</tbody></table>
**Returns:**

this

