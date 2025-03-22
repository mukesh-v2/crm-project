import React, { useState, useEffect, JSX } from 'react';
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";
import { Checkbox } from "./components/ui/checkbox";
import * as XLSX from 'xlsx';
import { Login } from './components/Login';

const API_URL = 'http://localhost:5000/api';

const fetchCrmData = async () => {
  const response = await fetch(`${API_URL}/crm`);
  return response.json();
};

const createCrmEntry = async (entry: CRMEntry) => {
  const response = await fetch(`${API_URL}/crm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  return response.json();
};

const updateCrmEntry = async (id: string, entry: CRMEntry) => {
  const response = await fetch(`${API_URL}/crm/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry)
  });
  return response.json();
};

const deleteCrmEntry = async (id: string) => {
  await fetch(`${API_URL}/crm/${id}`, { method: 'DELETE' });
};

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

interface Order {
  id: string;
  items: CRMEntry[];
  orderDateTime: string;
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
const getBaseLabCode = (labCode: string) => {
  return labCode.replace(/\s*[A-Z]$/, '').trim();
};

const getNextLabCode = (baseCode: string, existingCodes: string[]) => {
  const suffixes = existingCodes
    .filter(code => getBaseLabCode(code) === baseCode)
    .map(code => {
      const suffix = code.match(/[A-Z]$/);
      return suffix ? suffix[0] : '';
    })
    .filter(Boolean);

  if (suffixes.length === 0) return baseCode;
  
  const lastSuffix = suffixes.sort().pop() || '';
  const nextChar = String.fromCharCode(lastSuffix.charCodeAt(0) + 1);
  return `${baseCode} ${nextChar}`;
};
export default function CRMManager(): JSX.Element{
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [crmData, setCrmData] = useState<CRMEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<CRMEntry | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedForOrder, setSelectedForOrder] = useState<string[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [currentTab, setCurrentTab] = useState('all-crms');
  const [selectedCrm, setSelectedCrm] = useState<CRMEntry | null>(null);
  const [crmNames, setCrmNames] = useState<string[]>([]);
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const sections = ['HPLC', 'GCMS', 'GC', 'ICP', 'LCMSMS'];
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchCrmData();
        setCrmData(data);
        setCrmNames(data.map((item: CRMEntry) => item.name));
      } catch (error) {
        console.error('Error loading CRM data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const savedData = localStorage.getItem('crmData');
    const savedHistory = localStorage.getItem('orderHistory');

    if (savedData) {
      const parsedSavedData = JSON.parse(savedData);
      setCrmData(parsedSavedData);
      setCrmNames(parsedSavedData.map((item: CRMEntry) => item.name));
    } else {
      const baseUrl = window.location.origin;
      fetch(`${baseUrl}/CRM_data.xlsx`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch Excel file');
          }
          return response.arrayBuffer();
        })
        .then(buffer => {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet);
  
          // In the Excel import section
          const parsedData: CRMEntry[] = rows.map((row: any, index: number) => {
            console.log('Excel Row Data:', row);
            let expiryDate = '';
            // Fix: Check for both possible column names and handle Excel date formats
            const dateValue = row['Expiry date'] || row['Expiry Date'];
            let labCode = String(row['Lab Code'] || '');
            if (labCode) {
    // If the code ends with a letter without space, add the space
            labCode = labCode.replace(/([A-Z])$/, ' $1');
            }
            
            if (dateValue) {
              try {
                if (typeof dateValue === 'number') {
                  // Handle Excel date number format
                  const jsDate = new Date((dateValue - 25569) * 86400 * 1000);
                  expiryDate = jsDate.toISOString().split('T')[0];
                } else if (typeof dateValue === 'string') {
                  // Handle string date format
                  const [day, month, year] = dateValue.split(/[-/.]/);
                  const parsedDate = new Date(
                    parseInt(year),
                    parseInt(month) - 1,
                    parseInt(day)
                  );
                  if (!isNaN(parsedDate.getTime())) {
                    expiryDate = parsedDate.toISOString().split('T')[0];
                  }
                }
              } catch (error) {
                console.error('Error parsing date:', dateValue, error);
              }
            }
          
            return {
              id: `imported-${index}`,
              labCode: String(row['Lab Code'] || ''),
              name: String(row['Name'] || ''),
              expiryDate: expiryDate,
              make: String(row['Make'] || ''),
              quantity: String(row['Quantity'] || ''),
              purity: String(row['Purity '] || ''),
              productCode: String(row['Product Code'] || ''),
              casNo: String(row['CAS no.'] || row['CAS No.'] || row['CAS No'] || ''),
              section: String(row['Section'] || ''),
              location: String(row['Location'] || ''),
              boxNo: String(row['Box No.'] || row['Box No'] || row['Box Number'] || ''),
              remarks: String(row['Remarks'] || ''),
              status: 'active' as const,
              orderPlaced: false
            };
          });
          
          setCrmData(parsedData);
          setCrmNames(parsedData.map(item => item.name));
          localStorage.setItem('crmData', JSON.stringify(parsedData));
        })
        .catch(error => {
          console.error('Error loading CRM data:', error);
          alert('Failed to load CRM data. Please check if the file exists and try again.');
        });
    }

    if (savedHistory) {
      setOrderHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleLogin = (username: string, password: string) => {
    setIsAuthenticated(true);
    // You might want to store the authentication state in localStorage
    localStorage.setItem('isAuthenticated', 'true');
  };

  useEffect(() => {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Modify the return statement at the start of the component
  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

   // Remove crmNames from dependency array as it's updated within the effect
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  const handleCreateNew = () => {
    setIsCreatingNew(true);
    setEditingEntry({
      id: `new-${Date.now()}`,
      labCode: '',
      name: '',
      expiryDate: '',
      make: '',
      quantity: '',
      purity: '',
      productCode: '',
      casNo: '',
      section: '',
      location: '',
      boxNo: '',
      remarks: '',
      status: 'active' as const,
      orderPlaced: false,
    });
  };

  const handleEdit = (entry: CRMEntry) => {
    setIsCreatingNew(false);
    setEditingEntry(entry);
  };

  const handleOrderSelection = (id: string, checked: boolean) => {
    setSelectedForOrder(prev =>
      checked ? [...prev, id] : prev.filter(item => item !== id)
    );
  };
  // Update handlers to persist changes
  const handleSave = async (updatedEntry: CRMEntry) => {
    try {
      const newData = isCreatingNew
        ? [...crmData, { ...updatedEntry, id: `new-${Date.now()}` }]
        : crmData.map(entry => entry.id === updatedEntry.id ? updatedEntry : entry);
  
      setCrmData(newData);
      localStorage.setItem('crmData', JSON.stringify(newData));
      
      // Update crmNames with the new entry if it's a new standard
      if (isCreatingNew) {
        const uniqueNames = [...new Set([...crmNames, updatedEntry.name])];
        setCrmNames(uniqueNames);
      }
      
      setEditingEntry(null);
      setIsCreatingNew(false);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save the entry. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCrmEntry(id);
      setCrmData(crmData.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleMarkConsumed = (id: string) => {
    const newData = crmData.map((entry) =>
      entry.id === id ? { ...entry, status: 'consumed' as const } : entry
    );
    setCrmData(newData);
    localStorage.setItem('crmData', JSON.stringify(newData));
  };

  const handleMarkActive = (id: string) => {
    const newData = crmData.map((entry: CRMEntry) =>
      entry.id === id ? { ...entry, status: 'active' as const } : entry
    );
    setCrmData(newData);
    localStorage.setItem('crmData', JSON.stringify(newData));
  };
  
  const handlePlaceOrder = () => {
    const orderItems = crmData.filter((entry: CRMEntry) =>
      selectedForOrder.includes(entry.id)
    );

    const newOrder: Order = {
      id: `order-${Date.now()}`,
      items: orderItems,
      orderDateTime: new Date().toLocaleString(),
    };
    const newHistory = [newOrder, ...orderHistory];
    setOrderHistory(newHistory);
    localStorage.setItem('orderHistory', JSON.stringify(newHistory));

    const newData = crmData.map((entry) => {
      if (selectedForOrder.includes(entry.id)) {
        const isExpired = entry.expiryDate && new Date(entry.expiryDate) < new Date();
        return {
          ...entry,
          status: isExpired ? 'active' as const : 'consumed' as const,
          orderPlaced: true
        };
      }
      return entry;
    });
    
    setCrmData(newData);
    localStorage.setItem('crmData', JSON.stringify(newData));
    setSelectedForOrder([]);

    // Generate CSV content
    const csvContent = [
      'Lab Code,Name,Expiry Date,Make,Quantity,Purity,Product Code,CAS No,Section,Location,Box No,Remarks',
      ...orderItems.map(
        (item: CRMEntry) =>
          `${item.labCode},${item.name},${item.expiryDate},${item.make},${item.quantity},${item.purity},${item.productCode},${item.casNo},${item.section},${item.location},${item.boxNo},${item.remarks}`
      ),
    ].join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CRM_Order_List.csv`;
    link.click();
  };

  const handleDownloadMIS = () => {
    // Prepare data for export with additional audit fields
    const exportData = crmData.map(entry => ({
      'Lab Code': entry.labCode,
      'Name': entry.name,
      'Expiry Date': entry.expiryDate,
      'Make': entry.make,
      'Quantity': entry.quantity,
      'Purity': entry.purity,
      'Product Code': entry.productCode,
      'CAS No': entry.casNo,
      'Section': entry.section,
      'Location': entry.location,
      'Box No': entry.boxNo,
      'Remarks': entry.remarks,
      'Current Status': entry.status === 'active' 
        ? (entry.expiryDate && new Date(entry.expiryDate) < new Date() ? 'Expired' : 'Active')
        : 'Consumed',
      'Order Placed': entry.orderPlaced ? 'Yes' : 'No',
      'Export Date': new Date().toLocaleDateString(),
      'Export Time': new Date().toLocaleTimeString()
    }));
  
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'CRM MIS Data');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `CRM_MIS_Data_${date}.xlsx`;
    
    // Save the file
    XLSX.writeFile(wb, filename);
  };

  const filteredData = crmData.filter((entry: CRMEntry) => {
    const searchLower = searchQuery.toLowerCase();
    const labCode = String(entry.labCode || '');
    const name = String(entry.name || '');
    const productCode = String(entry.productCode || '');
    
    const matchesSearch = 
      labCode.toLowerCase().includes(searchLower) ||
      name.toLowerCase().includes(searchLower) ||
      productCode.toLowerCase().includes(searchLower);

    const matchesSection = sectionFilter === 'all' || entry.section === sectionFilter;
    
    let matchesStatus = statusFilter === 'all';
    if (statusFilter === 'active') {
      matchesStatus = Boolean(entry.status === 'active' && (!entry.expiryDate || new Date(entry.expiryDate) >= new Date()));
    } else if (statusFilter === 'expired') {
      matchesStatus = Boolean(entry.status === 'active' && entry.expiryDate && new Date(entry.expiryDate) < new Date());
    } else if (statusFilter === 'consumed') {
      matchesStatus = entry.status === 'consumed';
    }
    
    return matchesSearch && matchesSection && matchesStatus;
  });

  const allCRMs = filteredData;
  const consumedCRMs = filteredData.filter(
    (entry: CRMEntry) => entry.status === 'consumed'
  );
  const expiringSoon = crmData.filter((entry: CRMEntry) => {
    if (!entry.expiryDate) return false;
    
    try {
      const expiryDate = new Date(entry.expiryDate);
      if (isNaN(expiryDate.getTime())) return false;
  
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const threeMonthsFromNow = new Date(today);
      threeMonthsFromNow.setMonth(today.getMonth() + 3);
      threeMonthsFromNow.setHours(23, 59, 59, 999);
      
      return (
        // Include items that are expired or expiring in 3 months
        ((expiryDate <= threeMonthsFromNow) || expiryDate < today) && 
        entry.status === 'active' &&
        !entry.orderPlaced
      );
    } catch (error) {
      console.error('Invalid date:', entry.expiryDate, error);
      return false;
    }
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Company Logo" 
            className="h-16 w-auto"
          />
          <h1 className="text-2xl font-bold">CRM Management System</h1>
        </div>
        <Button 
          variant="outline"
          onClick={() => {
            setIsAuthenticated(false);
            localStorage.removeItem('isAuthenticated');
          }}
          className="bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </Button>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
    <Button onClick={handleCreateNew}>Create New CRM Entry</Button>
    <Input
      type="text"
      placeholder="Search CRM entries..."
      value={searchQuery}
      onChange={handleSearch}
      className="max-w-md"
    />
    <select
      value={sectionFilter}
      onChange={(e) => setSectionFilter(e.target.value)}
      className="px-4 py-2 border rounded-md"
    >
      <option value="all">All Sections</option>
      {sections.map((section) => (
        <option key={section} value={section}>
          {section}
        </option>
      ))}
    </select>
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="px-4 py-2 border rounded-md"
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="expired">Expired</option>
      <option value="consumed">Consumed</option>
    </select>
  </div>

      {editingEntry ? (
        <EditForm
          entry={editingEntry}
          onSave={handleSave}
          onCancel={() => setEditingEntry(null)}
          isCreatingNew={isCreatingNew}
          crmNames={crmNames}
          selectedCrm={selectedCrm}
          setSelectedCrm={setSelectedCrm}
        />
      ) : (
        <div>
          <div className="flex space-x-4 mb-4">
            <button
              className={`px-4 py-2 rounded-md ${
                currentTab === 'all-crms' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => setCurrentTab('all-crms')}
            >
              All CRMs
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                currentTab === 'expiring' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => setCurrentTab('expiring')}
            >
              Expiring in 3 Months
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                currentTab === 'consumed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => setCurrentTab('consumed')}
            >
              Consumed CRMs
            </button>
            <button
              className={`px-4 py-2 rounded-md ${
                currentTab === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
              }`}
              onClick={() => setCurrentTab('history')}
            >
              Order History
            </button>
          </div>

          {currentTab === 'all-crms' && (
            <div>
              <h2 className="text-xl font-bold mb-4">All CRMs</h2>
              <DataTable
                data={allCRMs}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMarkConsumed={handleMarkConsumed}
                onMarkActive={handleMarkActive}
              />
            </div>
          )}

{currentTab === 'expiring' && (
            <div>
              <h2 className="text-xl font-bold mb-4">CRMs Expiring in Next 3 Months</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={expiringSoon.every((entry) => selectedForOrder.includes(entry.id))}
                        onCheckedChange={(checked: boolean | 'indeterminate') => {
                          if (checked === true) {
                            expiringSoon.forEach((entry) => handleOrderSelection(entry.id, true));
                          } else {
                            expiringSoon.forEach((entry) => handleOrderSelection(entry.id, false));
                          }
                        }}
                      />
                      Select All
                    </TableHead>
                    <TableHead>Expiry Status</TableHead>
                    <TableHead>Lab Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Product Code</TableHead>
                    <TableHead>CAS No</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Box No</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {expiringSoon
          .filter(entry => !entry.notRequired)
          .map((entry) => {
            const expiryDate = new Date(entry.expiryDate);
            const today = new Date();
            const diffTime = expiryDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const isExpired = diffDays < 0;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedForOrder.includes(entry.id)}
                            onCheckedChange={(checked: boolean | 'indeterminate') => 
                              handleOrderSelection(entry.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {isExpired ? (
                            <span className="blink-red">
                              Expired {Math.abs(diffDays)} days ago
                            </span>
                          ) : (
                            <span className="text-yellow-400">
                              Expiring in {diffDays} days
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{entry.labCode}</TableCell>
                        <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.expiryDate}</TableCell>
                      <TableCell>{entry.make}</TableCell>
                      <TableCell>{entry.quantity}</TableCell>
                      <TableCell>{entry.purity}</TableCell>
                      <TableCell>{entry.productCode}</TableCell>
                      <TableCell>{entry.casNo}</TableCell>
                      <TableCell>{entry.section}</TableCell>
                      <TableCell>{entry.location}</TableCell>
                      <TableCell>{entry.boxNo}</TableCell>
                      <TableCell>{entry.remarks}</TableCell>
                      <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const newData = crmData.map(item => 
                        item.id === entry.id 
                          ? { ...item, notRequired: true }
                          : item
                      );
                      setCrmData(newData);
                      localStorage.setItem('crmData', JSON.stringify(newData));
                    }}
                  >
                    Remove
                  </Button>
                </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          )}

          {currentTab === 'consumed' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Consumed CRMs</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Checkbox
                        checked={consumedCRMs.every((entry) => selectedForOrder.includes(entry.id))}
                        onCheckedChange={(checked: boolean | 'indeterminate') => {
                          if (checked === true) {
                            consumedCRMs.forEach((entry) => handleOrderSelection(entry.id, true));
                          } else {
                            consumedCRMs.forEach((entry) => handleOrderSelection(entry.id, false));
                          }
                        }}
                      />
                      Select All
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lab Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Make</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Purity</TableHead>
                    <TableHead>Product Code</TableHead>
                    <TableHead>CAS No</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Box No</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consumedCRMs.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Checkbox
                         checked={selectedForOrder.includes(entry.id)}
                         onCheckedChange={(checked: boolean | 'indeterminate') => 
                           handleOrderSelection(entry.id, checked === true)
                         }
                        />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-sm ${
                            entry.orderPlaced
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.orderPlaced ? 'Order Placed' : 'Not Ordered'}
                        </span>
                      </TableCell>
                      <TableCell>{entry.labCode}</TableCell>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell>{entry.expiryDate}</TableCell>
                      <TableCell>{entry.make}</TableCell>
                      <TableCell>{entry.quantity}</TableCell>
                      <TableCell>{entry.purity}</TableCell>
                      <TableCell>{entry.productCode}</TableCell>
                      <TableCell>{entry.casNo}</TableCell>
                      <TableCell>{entry.section}</TableCell>
                      <TableCell>{entry.location}</TableCell>
                      <TableCell>{entry.boxNo}</TableCell>
                      <TableCell>{entry.remarks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {currentTab === 'history' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Order History</h2>
              {orderHistory.length > 0 ? (
                orderHistory.map((order) => (
                  <div key={order.id} className="mb-6">
                    <div className="text-sm text-muted-foreground mb-2">
                      Order Date & Time: {order.orderDateTime}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lab Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Make</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Purity</TableHead>
                          <TableHead>Product Code</TableHead>
                          <TableHead>CAS No</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Box No</TableHead>
                          <TableHead>Remarks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.labCode}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.expiryDate}</TableCell>
                            <TableCell>{item.make}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.purity}</TableCell>
                            <TableCell>{item.productCode}</TableCell>
                            <TableCell>{item.casNo}</TableCell>
                            <TableCell>{item.section}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>{item.boxNo}</TableCell>
                            <TableCell>{item.remarks}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))
              ) : (
                <p>No order history available</p>
              )}
            </div>
          )}
        </div>
      )}

<div className="mt-4 space-x-4">
  <Button
    onClick={handlePlaceOrder}
    disabled={selectedForOrder.length === 0}
  >
    Place Order for Selected CRMs
  </Button>
  <Button
    onClick={handleDownloadMIS}
    variant="outline"
    className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
  >
    <svg 
      className="w-4 h-4 mr-2" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
      />
    </svg>
    Download MIS Data
  </Button>
</div>
    </div>
  );
}

function DataTable({
  data,
  onEdit,
  onDelete,
  onMarkConsumed,
  onMarkActive,
}: {
  data: CRMEntry[];
  onEdit: (entry: CRMEntry) => void;
  onDelete: (id: string) => void;
  onMarkConsumed: (id: string) => void;
  onMarkActive: (id: string) => void;
}):React.JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Lab Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Expiry Date</TableHead>
          <TableHead>Make</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Purity</TableHead>
          <TableHead>Product Code</TableHead>
          <TableHead>CAS No</TableHead>
          <TableHead>Section</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Box No</TableHead>
          <TableHead>Remarks</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  entry.status === 'active'
                    ? entry.expiryDate && new Date(entry.expiryDate) < new Date()
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {entry.status === 'active'
                  ? entry.expiryDate && new Date(entry.expiryDate) < new Date()
                    ? 'expired'
                    : 'active'
                  : entry.status}
              </span>
            </TableCell>
            <TableCell>{entry.labCode}</TableCell>
            <TableCell>{entry.name}</TableCell>
            <TableCell>{entry.expiryDate}</TableCell>
            <TableCell>{entry.make}</TableCell>
            <TableCell>{entry.quantity}</TableCell>
            <TableCell>{entry.purity}</TableCell>
            <TableCell>{entry.productCode}</TableCell>
            <TableCell>{entry.casNo}</TableCell>
            <TableCell>{entry.section}</TableCell>
            <TableCell>{entry.location}</TableCell>
            <TableCell>{entry.boxNo}</TableCell>
            <TableCell>{entry.remarks}</TableCell>
            <TableCell className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(entry)}
              >
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(entry.id)}
              >
                Delete
              </Button>
              {entry.status === 'active' ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onMarkConsumed(entry.id)}
                >
                  Mark Consumed
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onMarkActive(entry.id)}
                >
                  Mark Active
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EditForm({
  entry,
  onSave,
  onCancel,
  isCreatingNew,
  crmNames,
  selectedCrm,
  setSelectedCrm,
}: EditFormProps): React.JSX.Element {
  const [formData, setFormData] = useState<CRMEntry>(entry);
  const [isNewStandard, setIsNewStandard] = useState(false);
  const sections = ['HPLC', 'GCMS', 'GC', 'ICP', 'LCMSMS'];

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newName = e.target.value;
    setFormData(prev => ({ ...prev, name: newName }));
    setIsNewStandard(e.target.value === 'new');

    // Auto-fill CAS No if selecting existing standard
    if (newName !== 'new') {
      const savedData = localStorage.getItem('crmData');
      if (savedData) {
        const data: CRMEntry[] = JSON.parse(savedData);
        const matchingEntry = data.find(entry => entry.name === newName);
        if (matchingEntry) {
          setFormData(prev => ({
            ...prev,
            name: newName,
            casNo: matchingEntry.casNo
          }));
        }
      }
    }
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
    
    // Validate required fields
    const requiredFields = ['name', 'labCode', 'expiryDate', 'section'] as const;
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
  
    // Create new entry with all required fields
    const newEntry = {
      ...formData,
      status: 'active' as const,
      orderPlaced: false,
      notRequired: false
    };
  
    onSave(newEntry);
  };

  
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">
        {isCreatingNew ? 'Create New CRM Entry' : 'Edit CRM Entry'}
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div>
        <label className="block text-sm font-medium mb-1">Name of the Standard</label>
          <div className="space-y-2">
            <select
              name="name"
              value={isNewStandard ? 'new' : formData.name}
              onChange={handleNameChange}
              className="w-full p-2 border border-gray-200 rounded-md"
              required
            >
              <option value="">Select Standard</option>
              {crmNames
                .filter((name, index, self) => self.indexOf(name) === index)
                .sort()
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
              ))}
              <option value="new">+ Add New Standard</option>
            </select>

            {isNewStandard && (
              <Input
                name="newName"
                placeholder="Enter new standard name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            )}
          </div>
        </div>
        <div>
        <label className="block text-sm font-medium mb-1">Lab Code</label>
        <div className="flex gap-2">
          <Input
            name="labCode"
            value={formData.labCode}
            onChange={(e) => {
              const savedData = localStorage.getItem('crmData');
              if (savedData) {
                const data: CRMEntry[] = JSON.parse(savedData);
                const exists = data.some(entry => 
                  entry.id !== formData.id &&
                  entry.labCode.toLowerCase() === e.target.value.toLowerCase()
                );
                if (exists) {
                  alert('This Lab Code is already in use. Please use a unique code.');
                  return;
                }
              }
              handleChange(e);
            }}
            required
            className="flex-1"
          />
          {isCreatingNew && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-[120px] bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
              onClick={() => {
                const savedData = localStorage.getItem('crmData');
                if (savedData && formData.name) {
                  const data: CRMEntry[] = JSON.parse(savedData);
                  const matchingEntries = data.filter(
                    entry => entry.name.toLowerCase() === formData.name.toLowerCase()
                  );

                  let suggestedLabCode = '';
                  if (matchingEntries.length > 0) {
                    const baseCode = matchingEntries[0].labCode.replace(/\s*[A-Z]$/, '');
                    const existingCodes = matchingEntries.map(entry => entry.labCode);
                    suggestedLabCode = getNextLabCode(baseCode, existingCodes);
                  } else {
                    const maxNumber = Math.max(
                      ...data
                        .map(entry => {
                          const match = entry.labCode.match(/^H-(\d+)/);
                          return match ? parseInt(match[1]) : 0;
                        })
                        .filter(num => !isNaN(num))
                    );
                    suggestedLabCode = `H-${maxNumber + 1}`;
                  }

                  if (suggestedLabCode) {
                    alert(`Suggested Lab Code: ${suggestedLabCode}\nYou can use this code or enter a different one.`);
                  }
                } else if (!formData.name) {
                  alert('Please enter the Name of the Standard first');
                }
              }}
            >
              Suggest Code
            </Button>
          )}
        </div>
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
            required
            className="block w-full p-2 pl-10 text-sm text-gray-700 border border-gray-200 rounded-md focus:ring-primary-500 focus:border-primary-500"
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
            required
          />
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="default">
            {isCreatingNew ? 'Create' : 'Save'}
          </Button>
        </div>
      </form>
    </div>
  );
}