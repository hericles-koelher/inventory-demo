# Inventory Demo design

## Direction

A light workspace with graphite navigation, visible filters, and clear stock indicators. The overview opens directly on the inventory. A prospective client should be able to spot a product that needs attention and register a stock movement on the first visit. Use Brazilian Portuguese for all visible text.

## Color

Use these named values as the starting palette. The application defines them as custom properties in [src/styles.css](src/styles.css).

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F5F6F8` | Workspace background |
| `surface` | `#FFFFFF` | Cards, tables, fields, and dialogs |
| `text` | `#192330` | Primary text |
| `text-muted` | `#516070` | Secondary text and field hints |
| `border` | `#DCE2E9` | Quiet separators and card outlines |
| `control-border` | `#788493` | Field and control boundaries on light surfaces |
| `action` | `#2454C6` | Primary buttons, links, and focus on light surfaces |
| `action-hover` | `#1B429D` | Primary button hover and press states |
| `nav` | `#202833` | Navigation background |
| `nav-active` | `#2C3848` | Selected and hovered navigation items |
| `nav-text` | `#F4F7FB` | Selected item and navigation heading |
| `nav-muted` | `#C3CDDB` | Other navigation items and secondary links |
| `nav-focus` | `#B8CAFF` | Focus outline and selected-item marker on dark surfaces |

Use white text on filled primary buttons. Use the following text and background pairs for stock labels.

| Label | Text | Background |
| --- | --- | --- |
| **Em estoque** | `#176344` | `#E7F5ED` |
| **Estoque baixo** | `#854700` | `#FFF1D6` |
| **Sem estoque** | `#9A3038` | `#FDEBEC` |

## Type and spacing

- Start with the system sans-serif stack. Use semibold headings and tabular numerals for stock quantities and indicator values. Align quantities to the right in tables.
- Use 28/36 px for desktop page titles, 24/32 px on mobile, 18/26 px for section headings, 14/22 px for body and table text, and 16/24 px for mobile form inputs. Use 32/40 px for indicator values.
- Use 4, 8, 12, 16, 24, and 32 px spacing. Align the page header, cards, filter bar, and data sections to the same content edges. Use an 8 px radius for controls and 12 px for cards and dialogs.
- Use a consistent set of simple outline icons for navigation and actions. Let tables, stock labels, and forms carry the visual detail.

## Screens

- **Visão geral** opens with a title and **Registrar movimentação**. Show three cards for **Produtos cadastrados**, **Estoque baixo**, and **Sem estoque**. Keep the number and its label prominent. Place products needing attention immediately below, with their name, quantity, and situation.
- **Produtos** puts **Novo produto** in the page header and keeps search and filters directly above the table. Use visible column headings and keep row actions separate from stock labels. Keep the desktop table compact and readable with a starting row height of 48 px.
- **Movimentações** shows the newest entries first, including the date and time, product, type (**Entrada** or **Saída**), and quantity. Use the same **Registrar movimentação** form available from the overview. For a stock issue, show the available quantity next to the quantity field before confirmation.

## Components and feedback

- Use a filled blue button for the primary action in a view and an outlined button for secondary actions. Pair potentially destructive actions with explicit labels and confirm the removal of a product or restoration of sample data. Restoration should describe which local changes will be replaced.
- Keep form labels visible, with validation messages next to the relevant field. For example, show **A saída não pode exceder o saldo de 4 unidades.** when someone tries to issue more than four units from a product with that balance.
- After a save, update affected quantities and indicators immediately. Show a brief confirmation and announce it to assistive technology. Distinguish an empty dataset from a search with zero matches. Offer **Limpar filtros** when filters exclude every result.
- Identify the app as a demo and explain local storage in a short line, such as **Demonstração · Alterações salvas neste navegador**. Group it with **Restaurar dados de demonstração** and the secondary commercial link **Quero um sistema para minha empresa** at the end of the sidebar on desktop and below the page content on smaller screens. The commercial link points to the developer's GitHub Pages site.
- Use 150 ms color and border transitions for hover and press feedback. Keep table rows, indicators, and form content stable as values update. Respect `prefers-reduced-motion`.

## Responsive behavior

- Use a 224 px sidebar at widths of 960 px and above. Below that, move the three labeled destinations into a compact graphite header. Mark the current destination with a visible marker and `aria-current="page"`.
- Below 640 px, stack filters and indicator cards. Present products in a compact list with the name, quantity, and situation visible. Keep SKU, category, minimum stock, and row actions available in product details. Use labeled rows for the movement history.
- Fit dialogs to the viewport, let the dialog body scroll when needed, and keep confirmation and cancel actions reachable. Provide 44 × 44 px targets for mobile controls.

## Accessibility checks

- Verify text contrast of at least 4.5:1 and meaningful control boundaries and focus indicators at 3:1 or above. Use visible labels for every status and a persistent outline for keyboard focus. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- Check keyboard navigation, visible focus, programmatically associated field errors, modal focus and return to the triggering control, and announcements after registration and reset. Use semantic tables for tabular desktop views.
- Check the overview, product list, movement form, and history at 390, 768, 1024, and 1440 px, and at 200% zoom. Verify that labels, quantities, and actions remain visible and usable without horizontal page overflow.

## References

- **SAP Fiori** informs the hierarchy of the light workspace, the visible filter bar, and the separation between table data and actions. [Morning Horizon product list](https://community.sap.com/t5/technology-blog-posts-by-sap/horizon-theme-of-sap-fiori-update-on-productive-usage-for-web-applications/ba-p/13531459)
- **Shopify Admin** informs the summary cards and compact status labels that help visitors scan the inventory. [Shopify Admin product-list example](https://apps.shopify.com/petdropshipper)
- **Linear** informs the graphite navigation, compact navigation controls, and restrained separators. [Linear interface design notes](https://linear.app/now/behind-the-latest-design-refresh)
