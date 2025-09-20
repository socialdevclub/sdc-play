import React from 'react';
import {
  ColumnDef,
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { css } from '@linaria/core';
import { StockSchemaWithId } from 'shared~type-stock';
import RemoveStockSessionButton from '../../component/RemoveStockSessionButton';
import { Query } from '../../hook';
import StockCreateForm from './component/StockCreate';
import StockDetail from '../../component/StockDetail';

const columnHelper = createColumnHelper<StockSchemaWithId>();
const columns = [
  {
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <button
          {...{
            onClick: row.getToggleExpandedHandler(),
            style: { cursor: 'pointer' },
          }}
        >
          {row.getIsExpanded() ? '👇' : '👉'}
        </button>
      ) : (
        '🔵'
      );
    },
    enableSorting: false,
    header: () => null,
    id: 'expander',
  },
  columnHelper.accessor('_id', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('startedTime', {
    cell: (v) => v.getValue(),
    header: ({ column }) => {
      return (
        <button className={cssSortButton} onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          시작 시간
          {{
            asc: ' 🔼',
            desc: ' 🔽',
          }[column.getIsSorted() as string] ?? null}
        </button>
      );
    },
  }),
  columnHelper.accessor('stockPhase', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('round', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('isVisibleRank', {
    cell: (v) => `${v.getValue()}`,
  }),
  columnHelper.accessor('isTransaction', {
    cell: (v) => `${v.getValue()}`,
  }),
  columnHelper.accessor('transactionInterval', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('fluctuationsInterval', {
    cell: (v) => v.getValue(),
  }),
  {
    cell: ({ row }) => {
      return <RemoveStockSessionButton stockId={row.original._id} />;
    },
    enableSorting: false,
    header: () => null,
    id: 'remove',
  },
] as ColumnDef<StockSchemaWithId>[];

const BackofficeStock = () => {
  const { data } = Query.Stock.useQueryStockList();

  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    getRowCanExpand: () => true,
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [
        {
          desc: true,
          id: 'startedTime',
        },
      ],
    },
  });

  if (!data) return <></>;

  return (
    <>
      <StockCreateForm />
      <table
        className={cssTable}
        style={{
          width: table.getCenterTotalSize(),
        }}
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  className={cssTh}
                  key={header.id}
                  colSpan={header.colSpan}
                  style={{ width: header.getSize() }}
                  data-f="FT-a81d"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <React.Fragment key={row.id}>
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} style={{ width: cell.column.getSize() }} data-f="FT-fb92">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
              {row.getIsExpanded() && (
                <tr>
                  <td colSpan={row.getVisibleCells().length}>
                    <StockDetail stockId={row.original._id} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
};

const cssTable = css`
  & th {
    text-align: left;
  }
  & th,
  & td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  border: 1px solid #ddd;
  border-collapse: collapse;
  border-spacing: 0;
  width: fit-content;
`;

const cssTh = css`
  padding: 2px 4px;
  position: relative;
  font-weight: bold;
  text-align: center;
  height: 30px;
`;

const cssSortButton = css`
  background: none;
  border: none;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  font-size: inherit;

  &:hover {
    text-decoration: underline;
  }
`;

export default BackofficeStock;
