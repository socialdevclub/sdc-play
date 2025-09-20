import React, { useEffect } from 'react';
import { ColumnDef, createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { PartySchemaWithId } from 'shared~type-party';
import { css } from '@linaria/core';
import BackofficePartyDetail from '../../component/BackofficePartyDetail';
import { Query } from '../../hook';
import PartyCreate from './component/PartyCreate';

const columnHelper = createColumnHelper<PartySchemaWithId>();
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
    header: () => null,
    id: 'expander',
  },
  columnHelper.accessor('_id', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('title', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('limitAllCount', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('limitMaleCount', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('limitFemaleCount', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('activityId', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('activityName', {
    cell: (v) => v.getValue(),
  }),
  columnHelper.accessor('createdAt', {
    cell: (v) => v.getValue(),
  }),
] as ColumnDef<PartySchemaWithId>[];

const BackofficeParty = () => {
  const { data } = Query.Party.useQueryPartyList();

  const table = useReactTable({
    columns,
    data: data ?? [],
    getCoreRowModel: getCoreRowModel(),
    getRowCanExpand: () => true,
  });

  useEffect(() => {
    table.resetExpanded();
  }, [data, table]);

  if (!data) return <></>;

  return (
    <>
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
                    <BackofficePartyDetail party={row.original} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <h2>파티 생성</h2>
      <PartyCreate />
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

export default BackofficeParty;
