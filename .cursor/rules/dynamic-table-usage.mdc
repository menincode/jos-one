---
description: Always use DynamicTable component for data tables in the frontend
globs: apps/frontend/**/*.tsx
alwaysApply: false
---

# DynamicTable Usage for Data Tables

- **Use `DynamicTable` for all new data table UIs** in the frontend instead of building raw `<table>` structures or ad-hoc list/card grids.
- **Prefer reusing the shared component** at `apps/frontend/src/components/custom/table/DynamicTable.tsx` (and its related helpers) whenever the UI represents tabular, pageable, sortable or filterable data.

## When to Use

- **Use `DynamicTable`** when:
  - Displaying lists of domain entities (orders, products, prices, users, etc.) in rows/columns.
  - You need sorting, pagination, row selection, global search/filtering, or expandable row content.
  - You need list, card, or kanban style views for the same dataset.
- **Only avoid `DynamicTable`** when:
  - The layout is clearly not tabular (e.g. pure forms, simple static grids, or highly custom marketing layouts).

## Implementation Guidelines

- **Column configuration**
  - Define column configs using `DynamicTableColumnConfig<T>` and pass them via the `columns` prop.
  - Use `accessorKey` for simple field access and `cell` renderers for custom content.
  - Use `columnType: 'badge'` and `DynamicTableValueRenderers` when status/label badges are needed.

- **Rows and controllers**
  - Pass data and row helpers through the `rows` prop (`data`, `getRowId`, optional `onRowClick`, `expandableContent`, `getRowRef`).
  - For sortable/paginated/filtered tables, wire the corresponding `controllers` (`sort`, `pagination`, `selection`, `globalFilter`) instead of reimplementing this logic.

- **Features**
  - Use the `features` prop to toggle:
    - `sorting`, `pagination`, `globalFilter`, `rowSelection`, `expandableRows`, `stripedRows`, `viewModeSwitch`, `fontSize`, etc.
  - Prefer **manual controllers + `manualPagination` / `manualSorting`** when data comes from the backend APIs.

## Migration Guidance

- When modifying or extending existing pages that show tabular data (e.g. prices dashboards, exports, listings), **refactor them to use `DynamicTable`** instead of custom table/list implementations whenever it is reasonable and does not break UX requirements.

