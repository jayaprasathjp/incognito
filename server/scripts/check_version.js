
const checkVersion = async () => {
    const url = 'http://localhost:5000/api/auth/version';
    try {
        console.log(`Sending GET to ${url}`);
        const response = await fetch(url);
        if (response.status === 404) {
            console.log("Endpoint not found (404). Server is STALE.");
        } else {
            const data = await response.json();
            console.log('Status:', response.status);
            console.log('Version:', data);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
};

checkVersion();
