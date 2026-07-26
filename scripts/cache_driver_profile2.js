const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../app/DriverProfile.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// fetchEntriesData regex replace
const fetchEntriesRegex = /const fetchEntriesData = async \(\) => \{\s*try \{\s*const token = await AsyncStorage\.getItem\("userToken"\);\s*const response = await fetch\(`\$\{BASE_URL\}\/hotel\/get-all-driver-entry\?driverId=\$\{driverId\}`,\s*\{\s*method: "GET",\s*headers: \{\s*"Authorization": `Bearer \$\{token\}`\s*\}\s*\}\);\s*const data = await response\.json\(\);\s*if \(response\.ok && data\.drivers\) \{\s*const sortedEntries = data\.drivers\.sort\(\(a: any, b: any\) => new Date\(b\.entryDate \|\| b\.createdAt\)\.getTime\(\) - new Date\(a\.entryDate \|\| a\.createdAt\)\.getTime\(\)\);\s*setEntries\(sortedEntries\);\s*\}\s*\} catch \(error\) \{\s*console\.error\("Error fetching entries:", error\);\s*\} finally \{\s*setEntriesLoading\(false\);\s*\}\s*\};/;

const newFetchEntries = `const fetchEntriesData = async () => {
        try {
            const cacheKey = \`driver_entries_\${driverId}\`;
            try {
                const cached = await AsyncStorage.getItem(cacheKey);
                if (cached) {
                    setEntries(JSON.parse(cached));
                    setEntriesLoading(false);
                }
            } catch (e) {
                console.log("Cache error", e);
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

content = content.replace(fetchEntriesRegex, newFetchEntries);

// fetchDriverData regex replace
const fetchDriverRegex = /const fetchDriverData = async \(\) => \{\s*try \{\s*const token = await AsyncStorage\.getItem\("userToken"\);\s*const response = await fetch\(`\$\{BASE_URL\}\/hotel\/get-all-driver`,\s*\{\s*method: "GET",\s*headers: \{\s*"Authorization": `Bearer \$\{token\}`\s*\}\s*\}\);\s*const data = await response\.json\(\);\s*if \(response\.ok && data\.drivers\) \{\s*const foundDriver = data\.drivers\.find\(\(d: any\) => d\._id === driverId \|\| d\.driverId === driverId\);\s*if \(foundDriver\) \{\s*setDriver\(foundDriver\);\s*\}\s*\}\s*\} catch \(error\) \{\s*console\.error\("Error fetching driver profile:", error\);\s*\} finally \{\s*setLoading\(false\);\s*\}\s*\};/;

const newFetchDriver = `const fetchDriverData = async () => {
            try {
                const cacheKey = \`driver_profile_\${driverId}\`;
                try {
                    const cached = await AsyncStorage.getItem(cacheKey);
                    if (cached) {
                        setDriver(JSON.parse(cached));
                        setLoading(false);
                    }
                } catch(e){}

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

content = content.replace(fetchDriverRegex, newFetchDriver);

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Regex replacement done");
