// Database Connection Constants
const CONN_TOKEN = ""; // Put your JsonPowerDB Connection Token here
const DB_NAME = "SCHOOL-DB";
const REL_NAME = "STUDENT-TABLE";
const JPDB_BASE_URL = "http://api.login2explore.com:5577";

let currentRecNo = null;

// DOM Elements
const form = document.getElementById('enrollmentForm');
const rollNoInput = document.getElementById('rollNo');
const fullNameInput = document.getElementById('fullName');
const classInput = document.getElementById('studentClass');
const birthDateInput = document.getElementById('birthDate');
const enrollmentDateInput = document.getElementById('enrollmentDate');
const addressInput = document.getElementById('address');

const btnSave = document.getElementById('btnSave');
const btnUpdate = document.getElementById('btnUpdate');
const btnReset = document.getElementById('btnReset');

// Form Input array for easy locking/unlocking
const inputFields = [fullNameInput, classInput, birthDateInput, enrollmentDateInput, addressInput];

// Toast Notification helper
let toastTimeout;
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Clear any existing timeout
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    // Auto hide after 3.5 seconds
    toastTimeout = setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3500);
}

// Set form to Step 2 initial state
function setInitialState() {
    form.reset();
    currentRecNo = null;
    
    // Enable Roll No, disable all other fields
    rollNoInput.disabled = false;
    inputFields.forEach(field => field.disabled = true);
    
    // Disable all control buttons
    btnSave.disabled = true;
    btnUpdate.disabled = true;
    btnReset.disabled = true;
    
    // Move cursor to Roll No field
    setTimeout(() => {
        rollNoInput.focus();
    }, 50);
}

// Check JsonPowerDB for existing Roll-No
async function checkRollNo() {
    const rollNo = rollNoInput.value.trim();
    if (!rollNo) return;

    // Prevent duplicate triggers if we have already unlocked the form
    if (rollNoInput.disabled || !btnSave.disabled || !btnUpdate.disabled) {
        return;
    }

    if (!CONN_TOKEN) {
        showToast("Please open app.js and paste your JsonPowerDB Connection Token at the top.", "error");
        return;
    }

    try {
        const getReq = {
            token: CONN_TOKEN,
            dbName: DB_NAME,
            rel: REL_NAME,
            cmd: "GET_BY_KEY",
            jsonStr: {
                rollNo: rollNo
            }
        };

        const response = await fetch(`${JPDB_BASE_URL}/api/irl`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(getReq)
        });

        const res = await response.json();
        
        if (res.status === 200) {
            // Case 1: Primary key exists in database
            // Parse data: JPDB returns a JSON string inside res.data, or direct object
            let recordData;
            if (typeof res.data === 'string') {
                const parsedData = JSON.parse(res.data);
                recordData = parsedData.record || parsedData;
                currentRecNo = parsedData.rec_no;
            } else if (res.data && res.data.record) {
                recordData = res.data.record;
                currentRecNo = res.data.rec_no;
            } else {
                recordData = res.data;
            }

            // Populate all fields
            fullNameInput.value = recordData.fullName || '';
            classInput.value = recordData.studentClass || '';
            birthDateInput.value = recordData.birthDate || '';
            enrollmentDateInput.value = recordData.enrollmentDate || '';
            addressInput.value = recordData.address || '';

            // Enable Update and Reset buttons
            btnUpdate.disabled = false;
            btnReset.disabled = false;
            btnSave.disabled = true;

            // Keep primary key disabled, enable other fields
            rollNoInput.disabled = true;
            inputFields.forEach(field => field.disabled = false);

            showToast('Student record found and loaded from JsonPowerDB.', 'success');
            
            // Move cursor to the next field (Full Name)
            setTimeout(() => {
                fullNameInput.focus();
            }, 50);
        } else {
            // Case 2: Primary key does NOT exist (status 400 or other errors)
            // Enable Save and Reset buttons
            btnSave.disabled = false;
            btnReset.disabled = false;
            btnUpdate.disabled = true;

            // Keep rollNo enabled, enable other fields
            rollNoInput.disabled = false;
            inputFields.forEach(field => field.disabled = false);

            showToast('Roll No does not exist in JPDB. Fill form to save new record.', 'info');
            
            // Move cursor to the next field (Full Name)
            setTimeout(() => {
                fullNameInput.focus();
            }, 50);
        }
    } catch (error) {
        showToast('Error querying JsonPowerDB: ' + error.message, 'error');
    }
}

// Validate inputs are not empty
function validateForm() {
    const rollNo = rollNoInput.value.trim();
    const fullName = fullNameInput.value.trim();
    const studentClass = classInput.value.trim();
    const birthDate = birthDateInput.value;
    const enrollmentDate = enrollmentDateInput.value;
    const address = addressInput.value.trim();

    if (!rollNo || !fullName || !studentClass || !birthDate || !enrollmentDate || !address) {
        showToast('All fields are required. Please fill in all details.', 'error');
        
        // Highlight empty fields
        if (!rollNo && !rollNoInput.disabled) rollNoInput.focus();
        else if (!fullName) fullNameInput.focus();
        else if (!studentClass) classInput.focus();
        else if (!birthDate) birthDateInput.focus();
        else if (!enrollmentDate) enrollmentDateInput.focus();
        else if (!address) addressInput.focus();
        
        return false;
    }
    return { rollNo, fullName, studentClass, birthDate, address, enrollmentDate };
}

// Save data to database
async function saveRecord() {
    const data = validateForm();
    if (!data) return;

    try {
        const putReq = {
            token: CONN_TOKEN,
            dbName: DB_NAME,
            rel: REL_NAME,
            cmd: "PUT",
            jsonStr: data
        };

        const response = await fetch(`${JPDB_BASE_URL}/api/iml`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(putReq)
        });

        const res = await response.json();
        
        if (res.status === 200) {
            showToast('Student record enrolled successfully in JsonPowerDB.', 'success');
            setInitialState();
        } else {
            throw new Error(res.message || 'Failed to save record.');
        }
    } catch (error) {
        showToast('Save failed: ' + error.message, 'error');
    }
}

// Update data in database
async function updateRecord() {
    const data = validateForm();
    if (!data || !currentRecNo) return;

    try {
        const updateReq = {
            token: CONN_TOKEN,
            dbName: DB_NAME,
            rel: REL_NAME,
            cmd: "UPDATE",
            jsonStr: {
                [currentRecNo]: data
            }
        };

        const response = await fetch(`${JPDB_BASE_URL}/api/iml`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateReq)
        });

        const res = await response.json();
        
        if (res.status === 200) {
            showToast('Student record updated successfully in JsonPowerDB.', 'success');
            setInitialState();
        } else {
            throw new Error(res.message || 'Failed to update record.');
        }
    } catch (error) {
        showToast('Update failed: ' + error.message, 'error');
    }
}

// Event Listeners
rollNoInput.addEventListener('blur', checkRollNo);
rollNoInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkRollNo();
    }
});

// If user edits Roll No after it was verified/unlocked, lock the form back
rollNoInput.addEventListener('input', () => {
    if (!btnSave.disabled || !btnUpdate.disabled) {
        inputFields.forEach(field => {
            field.value = '';
            field.disabled = true;
        });
        btnSave.disabled = true;
        btnUpdate.disabled = true;
        btnReset.disabled = true;
    }
});

btnSave.addEventListener('click', saveRecord);
btnUpdate.addEventListener('click', updateRecord);
btnReset.addEventListener('click', setInitialState);

// Set form to step 2 initial state on page load
window.addEventListener('DOMContentLoaded', () => {
    setInitialState();
});
