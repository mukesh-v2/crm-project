import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

interface DataTableProps {
  data: any[];
  onEdit: (entry: any) => void;
  onDelete: (id: string) => void;
  onMarkConsumed: (id: string) => void;
  onMarkActive: (id: string) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  data,
  onEdit,
  onDelete,
  onMarkConsumed,
  onMarkActive,
}) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Select</TableHead>
          <TableHead>Lab Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Initial Quantity</TableHead>
          <TableHead>Available Quantity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Checkbox />
            </TableCell>
            <TableCell>{entry.labCode}</TableCell>
            <TableCell>{entry.name}</TableCell>
            <TableCell>{entry.version}</TableCell>
            <TableCell>{entry.expiryDate}</TableCell>
            <TableCell>{entry.quantity}</TableCell>
            <TableCell>{entry.availableQuantity || entry.quantity}</TableCell>
            <TableCell>{entry.status}</TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(entry)}>
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(entry.id)}
                >
                  Delete
                </Button>
                {entry.status === 'active' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkConsumed(entry.id)}
                  >
                    Mark Consumed
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkActive(entry.id)}
                  >
                    Mark Active
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default DataTable;