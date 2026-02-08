// import fetch from "node-fetch"; // Node 18+ has native fetch

async function trigger() {
    try {
        console.log("1. Logging in as admin...");
        const loginRes = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "admin@test.com", password: "password" })
        });
        const loginData = await loginRes.json();
        
        if (!loginData.token) {
            console.error("Login failed:", loginData);
            return;
        }
        console.log("Logged in. Token received.");

        console.log("2. Fetching tournament ID...");
        // Assuming we want to start the latest one
        const tourneyRes = await fetch("http://localhost:5000/api/admin/tournaments/control", {
            headers: { "Authorization": `Bearer ${loginData.token}` }
        });
        const tourneyData = await tourneyRes.json();
        console.log("Tournament Found:", tourneyData.id, tourneyData.title);

        console.log("3. Triggering START...");
        const startRes = await fetch("http://localhost:5000/api/admin/tournaments/control", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${loginData.token}`
            },
            body: JSON.stringify({ action: "start", id: tourneyData.id })
        });
        const startData = await startRes.json();
        
        console.log("--- RESULT ---");
        console.log(JSON.stringify(startData, null, 2));

    } catch (err) {
        console.error(err);
    }
}

trigger();
