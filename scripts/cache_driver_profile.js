const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/DriverProfile.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Replace fetchEntriesData
const oldFetchEntriesData = `    const fetchEntriesData = async () => {
        try {
            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(\`\${BASE_URL}/hotel/get-all-driver-entry?driverId=\${driverId}\`, {
                method: "GET",
                headers: {
                    "Authorization": \`Bearer \${token}\`
                }
            });
            const data = await response.json();
            if (response.ok && data.drivers) {
                const sortedEntries = data.drivers.sort((a: any, b: any) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
                setEntries(sortedEntries);
            }
        } catch (error) {
            console.error("Error fetching entries:", error);
        } finally {
            setEntriesLoading(false);
        }
    };`;

const newFetchEntriesData = `    const fetchEntriesData = async () => {
        try {
            const cacheKey = \`driver_entries_\${driverId}\`;
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
                setEntries(JSON.parse(cached));
                setEntriesLoading(false);
            }

            const token = await AsyncStorage.getItem("userToken");
            const response = await fetch(\`\${BASE_URL}/hotel/get-all-driver-entry?driverId=\${driverId}\`, {
                method: "GET",
                headers: {
                    "Authorization": \`Bearer \${token}\`
                }
            });
            const data = await response.json();
            if (response.ok && data.drivers) {
                const sortedEntries = data.drivers.sort((a: any, b: any) => new Date(b.entryDate || b.createdAt).getTime() - new Date(a.entryDate || a.createdAt).getTime());
                setEntries(sortedEntries);
                await AsyncStorage.setItem(cacheKey, JSON.stringify(sortedEntries));
            }
        } catch (error) {
            console.error("Error fetching entries:", error);
        } finally {
            setEntriesLoading(false);
        }
    };`;
content = content.replace(oldFetchEntriesData, newFetchEntriesData);


// 2. Replace fetchDriverData
const oldFetchDriverData = `        const fetchDriverData = async () => {
            try {
                const token = await AsyncStorage.getItem("userToken");
                const response = await fetch(\`\${BASE_URL}/hotel/get-all-driver\`, {
                    method: "GET",
                    headers: {
                        "Authorization": \`Bearer \${token}\`
                    }
                });
                const data = await response.json();
                if (response.ok && data.drivers) {
                    const foundDriver = data.drivers.find((d: any) => d._id === driverId || d.driverId === driverId);
                    if (foundDriver) {
                        setDriver(foundDriver);
                    }
                }
            } catch (error) {
                console.error("Error fetching driver profile:", error);
            } finally {
                setLoading(false);
            }
        };`;

const newFetchDriverData = `        const fetchDriverData = async () => {
            try {
                const cacheKey = \`driver_profile_\${driverId}\`;
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    setDriver(JSON.parse(cached));
                    setLoading(false);
                }

                const token = await AsyncStorage.getItem("userToken");
                const response = await fetch(\`\${BASE_URL}/hotel/get-all-driver\`, {
                    method: "GET",
                    headers: {
                        "Authorization": \`Bearer \${token}\`
                    }
                });
                const data = await response.json();
                if (response.ok && data.drivers) {
                    const foundDriver = data.drivers.find((d: any) => d._id === driverId || d.driverId === driverId);
                    if (foundDriver) {
                        setDriver(foundDriver);
                        await AsyncStorage.setItem(cacheKey, JSON.stringify(foundDriver));
                    }
                }
            } catch (error) {
                console.error("Error fetching driver profile:", error);
            } finally {
                setLoading(false);
            }
        };`;
content = content.replace(oldFetchDriverData, newFetchDriverData);

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Caching added to DriverProfile.tsx");
