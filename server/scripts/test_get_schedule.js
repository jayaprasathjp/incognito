
// Using native fetch in Node.js (v18+)

async function testGetSchedule() {
    try {
        console.log("1. Logging in as admin...");
        // Assuming auth endpoint needs to be full path or similar to other script
        // The other script used http://localhost:5000/api/auth/login
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@test.com", password: "password" })
        });
        
        if (!loginRes.ok) {
            console.error("Login failed with status:", loginRes.status);
            console.error(await loginRes.text());
            return;
        }

        const loginData = await loginRes.json();
        if (!loginData.token) {
            console.error("Login successful but no token returned:", loginData);
            return;
        }
        
        console.log("2. Fetching schedule with token...");
        const response = await fetch('http://localhost:5000/api/admin/tournaments/control', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginData.token}`
            }
        });
        
        console.log("Status:", response.status);
        
        if (response.ok) {
            const data = await response.json();
            // console.log("Data:", JSON.stringify(data, null, 2));

            if (data.rounds_config) {
                console.log("SUCCESS: rounds_config is present.");
                console.log("Type:", data.rounds_config.type);
                console.log("Rounds Count:", data.rounds_config.rounds ? data.rounds_config.rounds.length : 0);
                if (data.rounds_config.rounds && data.rounds_config.rounds.length > 0) {
                     console.log("First Round Date:", data.rounds_config.rounds[0].date);
                }
            } else {
                console.log("FAILURE: rounds_config is MISSING or null in response.");
                console.log("Raw Data:", JSON.stringify(data, null, 2));
            }
        } else {
            console.log("Error Response Text:", await response.text());
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testGetSchedule();
