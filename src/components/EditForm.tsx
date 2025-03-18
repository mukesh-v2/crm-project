import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface CRMEntry {
  id: string;
  labCode: string;
  name: string;
  expiryDate: string;
  make: string;
  quantity: string;
  purity: string;
  productCode: string;
  casNo: string;
  section: string;
  location: string;
  boxNo: string;
  remarks: string;
  status: 'active' | 'consumed';
  orderPlaced?: boolean;
  notRequired?: boolean;
}

interface EditFormProps {
  entry: CRMEntry;
  onSave: (entry: CRMEntry) => void;
  onCancel: () => void;
  isCreatingNew: boolean;
  crmNames: string[];
  selectedCrm: CRMEntry | null;
  setSelectedCrm: (crm: CRMEntry | null) => void;
}

export function EditForm({
  entry,
  onSave,
  onCancel,
  isCreatingNew,
  crmNames,
  selectedCrm,
  setSelectedCrm,
}: EditFormProps) {
  const [formData, setFormData] = useState<CRMEntry>(entry);
  const sections = ['HPLC', 'GCMS', 'GC', 'ICP', 'LCMSMS'];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData(prev => ({ ...prev, name: newName }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {isCreatingNew ? 'Create New CRM Entry' : 'Edit CRM Entry'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name of the Standard</label>
          <Input
            name="name"
            value={formData.name}
            onChange={handleNameChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Lab Code</label>
          <Input
            name="labCode"
            value={formData.labCode}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Expiry Date</label>
          <Input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Make</label>
          <Input
            name="make"
            value={formData.make}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <Input
            name="quantity"
            value={formData.quantity}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Purity</label>
          <Input
            name="purity"
            value={formData.purity}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Product Code</label>
          <Input
            name="productCode"
            value={formData.productCode}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">CAS No</label>
          <Input
            name="casNo"
            value={formData.casNo}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Section</label>
          <select
            name="section"
            value={formData.section}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          >
            <option value="">Select Section</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <Input
            name="location"
            value={formData.location}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Box No</label>
          <Input
            name="boxNo"
            value={formData.boxNo}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Remarks</label>
          <Input
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
          />
        </div>
        <div className="col-span-2 flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {isCreatingNew ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}