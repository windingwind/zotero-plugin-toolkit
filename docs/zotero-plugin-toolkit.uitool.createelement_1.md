<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [zotero-plugin-toolkit](./zotero-plugin-toolkit.md) &gt; [UITool](./zotero-plugin-toolkit.uitool.md) &gt; [createElement](./zotero-plugin-toolkit.uitool.createelement_1.md)

## UITool.createElement() method

Create `HTMLElement`<!-- -->.

<b>Signature:</b>

```typescript
createElement<HTML_TAG extends keyof HTMLElementTagNameMap, T extends HTMLElementTagNameMap[HTML_TAG]>(doc: Document, tagName: HTML_TAG, props?: HTMLElementProps): T;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  doc | Document |  |
|  tagName | HTML\_TAG |  |
|  props | HTMLElementProps | <i>(Optional)</i> See [ElementProps](./zotero-plugin-toolkit.elementprops.md) |

<b>Returns:</b>

T

## Example 1


```ts
const div: HTMLDivElement = ui.createElement(document, "div");
```

## Example 2

Attributes(for `elem.setAttribute()`<!-- -->), properties(for `elem.prop=`<!-- -->), listeners, and children.

```ts
const div: HTMLDivElement = ui.createElement(
  document, "div",
  {
    id: "hi-div",
    skipIfExists: true,
    listeners:
    [
      { type: "click", listener: (e)=>ui.log("Clicked!") }
    ],
    children:
    [
      { tag: "h1", properties: { innerText: "Hello World!" } },
      { tag: "a", attributes: { href: "https://www.zotero.org" } },
    ]
  }
);
```

