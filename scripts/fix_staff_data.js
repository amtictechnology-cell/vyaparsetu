const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/staffmanagment.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix fetchStaff
const oldFetchStaff = `            if (response.ok && data && Array.isArray(data.staffList)) {
                const formattedStaff = data.staffList.map((s: any) => ({
                    id: s._id || s.id || Math.random().toString(),
                    staffId: s.staffId || s._id || s.id || "",
                    firstName: s.firstName || "",
                    lastName: s.lastName || "",
                    mobile: s.mobile || "",
                    role: s.role || "",
                    salary: Number(s.salary) || 0,
                    profileImage: s.profileImage,
                    city: s.address?.city || s.city || "",
                    room: s.room || "",
                }));
                setStaffList(formattedStaff);
            }`;

const newFetchStaff = `            // Handle API returning data in data.data or data.staffList
            const staffArray = Array.isArray(data.data) ? data.data : (Array.isArray(data.staffList) ? data.staffList : []);
            if (response.ok && staffArray.length > 0) {
                const formattedStaff = staffArray.map((s: any) => {
                    // split name into first and last if needed
                    let fName = s.firstName || "";
                    let lName = s.lastName || "";
                    if (s.name) {
                        const parts = s.name.split(' ');
                        fName = parts[0];
                        lName = parts.slice(1).join(' ');
                    }
                    return {
                        id: s._id || s.id || Math.random().toString(),
                        staffId: s.staffId || s._id || s.id || "",
                        firstName: fName,
                        lastName: lName,
                        mobile: s.mobile || "",
                        role: s.role || "staff",
                        salary: Number(s.salary) || 0,
                        profileImage: s.profileImage,
                        city: typeof s.address === 'string' ? s.address : (s.address?.city || s.city || ""),
                        room: s.room || "",
                    };
                });
                setStaffList(formattedStaff);
            }`;
content = content.replace(oldFetchStaff, newFetchStaff);

// 2. Fix Add Staff (handleSubmit)
const oldSubmitFields = `            formData.append("firstName", firstName);
            formData.append("lastName", lastName);
            formData.append("mobile", mobile);
            formData.append("adharNumber", adharNumber);
            formData.append("salary", salary);
            formData.append("role", role);
            formData.append("DOB", dob);
            formData.append("address[city]", city);
            if (email) formData.append("email", email);`;

const newSubmitFields = `            // Map to what backend likely expects based on GET response
            formData.append("name", \`\${firstName} \${lastName}\`.trim());
            // also keep firstName and lastName just in case
            formData.append("firstName", firstName);
            formData.append("lastName", lastName);
            
            formData.append("mobile", mobile);
            formData.append("adharNumber", adharNumber);
            formData.append("salary", salary);
            formData.append("role", role);
            formData.append("DOB", dob);
            
            // Backend returns address as string, so send address and address[city]
            formData.append("address", city);
            formData.append("address[city]", city);
            if (email) formData.append("email", email);`;
content = content.replace(oldSubmitFields, newSubmitFields);

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Updated staff data mapping");
