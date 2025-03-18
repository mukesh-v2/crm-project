export interface CRMEntry {
    id: string;
    labCode: string;
    version: string;
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
    availableQuantity: string;
    withdrawalHistory: {
      date: string;
      quantity: string;
      withdrawnBy: string;
    }[];
}