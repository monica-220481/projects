// Database constants
const DB_NAME = 'SCHOOL-DB';
const DB_VERSION = 1;
const STORE_NAME = 'STUDENT-TABLE';

let db = null;

// Initialize Database on Page Load
function initDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            showToast('Database failed to open: ' + event.target.errorCode, 'error');
            reject(event.target.errorCode);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            showToast('Connected to SCHOOL-DB database locally.', 'info');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'rollNo' });
            }
        };
    });
}

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

// Check database for existing Roll-No
function checkRollNo() {
    const rollNo = rollNoInput.value.trim();
    if (!rollNo) return;

    // Prevent duplicate triggers if we have already unlocked the form
    if (rollNoInput.disabled || !btnSave.disabled || !btnUpdate.disabled) {
        return;
    }

    if (!db) {
        showToast('Database is not initialized yet.', 'error');
        return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.get(rollNo);

    request.onsuccess = (event) => {
        const student = event.target.result;
        
        if (student) {
            // Case 1: Primary key exists in database
            // Populate all fields
            fullNameInput.value = student.fullName;
            classInput.value = student.studentClass;
            birthDateInput.value = student.birthDate;
            enrollmentDateInput.value = student.enrollmentDate;
            addressInput.value = student.address;

            // Enable Update and Reset buttons
            btnUpdate.disabled = false;
            btnReset.disabled = false;
            btnSave.disabled = true;

            // Keep primary key disabled, enable other fields
            rollNoInput.disabled = true;
            inputFields.forEach(field => field.disabled = false);

            showToast('Student record found and loaded.', 'success');
            
            // Move cursor to the next field (Full Name)
            setTimeout(() => {
                fullNameInput.focus();
            }, 50);
        } else {
            // Case 2: Primary key does NOT exist
            // Enable Save and Reset buttons
            btnSave.disabled = false;
            btnReset.disabled = false;
            btnUpdate.disabled = true;

            // Keep rollNo enabled, enable other fields
            rollNoInput.disabled = false;
            inputFields.forEach(field => field.disabled = false);

            showToast('Roll No does not exist. Fill form to save new record.', 'info');
            
            // Move cursor to the next field (Full Name)
            setTimeout(() => {
                fullNameInput.focus();
            }, 50);
        }
    };

    request.onerror = () => {
        showToast('Error querying database.', 'error');
    };
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
    return { rollNo, fullName, studentClass, birthDate, enrollmentDate, address };
}

// Save data to database
function saveRecord() {
    const data = validateForm();
    if (!data) return;

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(data);

    request.onsuccess = () => {
        showToast('Student record enrolled successfully.', 'success');
        setInitialState();
    };

    request.onerror = (event) => {
        showToast('Failed to save record: ' + event.target.error.message, 'error');
    };
}

// Update data in database
function updateRecord() {
    const data = validateForm();
    if (!data) return;

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.put(data);

    request.onsuccess = () => {
        showToast('Student record updated successfully.', 'success');
        setInitialState();
    };

    request.onerror = (event) => {
        showToast('Failed to update record: ' + event.target.error.message, 'error');
    };
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

// Initialize database and set form to step 2 on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDb();
    } catch (err) {
        console.error('Failed to init DB:', err);
    }
    setInitialState();
});
