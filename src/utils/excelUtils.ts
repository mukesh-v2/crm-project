import { read, utils, write } from 'xlsx';
import type { CRMEntry } from '../types';

export const appendToExcel = async (newEntry: CRMEntry) => {
    try {
        const response = await fetch('/data/crm-data.xlsx');
        const arrayBuffer = await response.arrayBuffer();
        const workbook = read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData = utils.sheet_to_json(worksheet);
        
        // Check if entry with same Lab Code exists
        const existingIndex = jsonData.findIndex(
            (item: any) => item['Lab Code'] === newEntry.labCode
        );

        const newData = {
            'Lab Code': newEntry.labCode,
            'Version': newEntry.version,
            'Name': newEntry.name,
            'Expiry Date': newEntry.expiryDate,
            'Make': newEntry.make,
            'Quantity': newEntry.quantity,
            'Purity': newEntry.purity,
            'Product Code': newEntry.productCode,
            'CAS No': newEntry.casNo,
            'Section': newEntry.section,
            'Location': newEntry.location,
            'Box No': newEntry.boxNo,
            'Remarks': newEntry.remarks,
            'Status': newEntry.status
        };

        if (existingIndex !== -1) {
            jsonData[existingIndex] = newData;
        } else {
            jsonData.push(newData);
        }

        const newWorksheet = utils.json_to_sheet(jsonData);
        workbook.Sheets[workbook.SheetNames[0]] = newWorksheet;
        
        const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        const formData = new FormData();
        formData.append('file', blob, 'crm-data.xlsx');

        await fetch('http://172.16.0.148:3005/api/save-excel', {
            method: 'POST',
            body: formData
        });

        // Update localStorage
        localStorage.setItem('crmData', JSON.stringify(jsonData));
        
        return true;
    } catch (error) {
        console.error('Error updating Excel file:', error);
        return false;
    }
};