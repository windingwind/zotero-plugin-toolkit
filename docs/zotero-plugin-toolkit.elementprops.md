<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [ElementProps](./zotero-plugin-toolkit.elementprops.md)

## ElementProps interface

`props` of `UITool.createElement`<!-- -->. See [UITool](./zotero-plugin-toolkit.uitool.md)

**Signature:**

```typescript
export interface ElementProps 
```

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

[attributes?](./zotero-plugin-toolkit.elementprops.attributes.md)


</td><td>


</td><td>

{ \[key: string\]: string \| boolean \| number \| null \| undefined; }


</td><td>

_(Optional)_ Set with `elem.setAttribute()`


</td></tr>
<tr><td>

[checkExistenceParent?](./zotero-plugin-toolkit.elementprops.checkexistenceparent.md)


</td><td>


</td><td>

HTMLElement


</td><td>

_(Optional)_ Existence check will be processed under this element, default `document`


</td></tr>
<tr><td>

[children?](./zotero-plugin-toolkit.elementprops.children.md)


</td><td>


</td><td>

Array&lt;TagElementProps&gt;


</td><td>

_(Optional)_ Child elements. Will be created and appended to this element.


</td></tr>
<tr><td>

[classList?](./zotero-plugin-toolkit.elementprops.classlist.md)


</td><td>


</td><td>

Array&lt;string&gt;


</td><td>

_(Optional)_ classList


</td></tr>
<tr><td>

[customCheck?](./zotero-plugin-toolkit.elementprops.customcheck.md)


</td><td>


</td><td>

(doc: Document, options: [ElementProps](./zotero-plugin-toolkit.elementprops.md)<!-- -->) =&gt; boolean


</td><td>

_(Optional)_ Custom check hook. If it returns false, return undefined and do not do anything.


</td></tr>
<tr><td>

[directAttributes?](./zotero-plugin-toolkit.elementprops.directattributes.md)


</td><td>


</td><td>

{ \[key: string\]: string \| boolean \| number \| null \| undefined; }


</td><td>

_(Optional)_


</td></tr>
<tr><td>

[enableElementDOMLog?](./zotero-plugin-toolkit.elementprops.enableelementdomlog.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Enable elements to be printed to console &amp; Zotero.debug.


</td></tr>
<tr><td>

[enableElementJSONLog?](./zotero-plugin-toolkit.elementprops.enableelementjsonlog.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Enable elements to be printed to console &amp; Zotero.debug.


</td></tr>
<tr><td>

[enableElementRecord?](./zotero-plugin-toolkit.elementprops.enableelementrecord.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Enable elements to be recorded by the toolkit so it can be removed when calling `unregisterAll`<!-- -->.


</td></tr>
<tr><td>

[id?](./zotero-plugin-toolkit.elementprops.id.md)


</td><td>


</td><td>

string


</td><td>

_(Optional)_ id


</td></tr>
<tr><td>

[ignoreIfExists?](./zotero-plugin-toolkit.elementprops.ignoreifexists.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Set true to check if the element exists using `id`<!-- -->. If exists, return this element and do not do anything.


</td></tr>
<tr><td>

[listeners?](./zotero-plugin-toolkit.elementprops.listeners.md)


</td><td>


</td><td>

Array&lt;{ type: string; listener: EventListenerOrEventListenerObject \| ((e: Event) =&gt; void) \| null \| undefined; options?: boolean \| AddEventListenerOptions; }&gt;


</td><td>

_(Optional)_ Event listeners


</td></tr>
<tr><td>

[namespace?](./zotero-plugin-toolkit.elementprops.namespace.md)


</td><td>


</td><td>

string


</td><td>

_(Optional)_ xul \| html \| svg


</td></tr>
<tr><td>

[properties?](./zotero-plugin-toolkit.elementprops.properties.md)


</td><td>


</td><td>

{ \[key: string\]: unknown; }


</td><td>

_(Optional)_ Set with `elem.prop =`


</td></tr>
<tr><td>

[removeIfExists?](./zotero-plugin-toolkit.elementprops.removeifexists.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Set true to check if the element exists using `id`<!-- -->. If exists, remove and re-create it, then continue with props/attrs/children.


</td></tr>
<tr><td>

[skipIfExists?](./zotero-plugin-toolkit.elementprops.skipifexists.md)


</td><td>


</td><td>

boolean


</td><td>

_(Optional)_ Set true to check if the element exists using `id`<!-- -->. If exists, skip element creation and continue with props/attrs/children.


</td></tr>
<tr><td>

[styles?](./zotero-plugin-toolkit.elementprops.styles.md)


</td><td>


</td><td>

Partial&lt;CSSStyleDeclaration&gt;


</td><td>

_(Optional)_ styles


</td></tr>
<tr><td>

[subElementOptions?](./zotero-plugin-toolkit.elementprops.subelementoptions.md)


</td><td>


</td><td>

Array&lt;TagElementProps&gt;


</td><td>

_(Optional)_


</td></tr>
<tr><td>

[tag?](./zotero-plugin-toolkit.elementprops.tag.md)


</td><td>


</td><td>

string


</td><td>

_(Optional)_ tagName


</td></tr>
</tbody></table>
